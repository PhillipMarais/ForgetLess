import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { migrate } from '../migrations';

type Params = SQLInputValue[] | [SQLInputValue[]];

function flatten(params: Params): SQLInputValue[] {
  return params.length === 1 && Array.isArray(params[0]) ? params[0] : (params as SQLInputValue[]);
}

/**
 * An in-memory SQLite database (Node's built-in `node:sqlite`) exposing the subset of
 * expo-sqlite's async API that the repositories use. Tests run real SQL against the real schema.
 */
export function createTestDatabase(): SQLiteDatabase {
  const sqlite = new DatabaseSync(':memory:');

  const db = {
    async execAsync(source: string) {
      sqlite.exec(source);
    },
    async runAsync(source: string, ...params: Params) {
      const result = sqlite.prepare(source).run(...flatten(params));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync(source: string, ...params: Params) {
      return sqlite.prepare(source).all(...flatten(params));
    },
    async getFirstAsync(source: string, ...params: Params) {
      return sqlite.prepare(source).get(...flatten(params)) ?? null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      sqlite.exec('BEGIN');
      try {
        await task();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    async closeAsync() {
      sqlite.close();
    },
  };

  return db as unknown as SQLiteDatabase;
}

/** A test database with the app's schema applied. */
export async function createMigratedTestDatabase() {
  const db = createTestDatabase();
  await migrate(db);
  return db;
}
