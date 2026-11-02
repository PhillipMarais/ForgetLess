import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { purgeDeletedPhotos } from '@/lib/photos';

import { migrate } from './migrations';

export const DATABASE_NAME = 'forgetless.db';

async function initialize(db: SQLiteDatabase) {
  await migrate(db);
  // Housekeeping only; never hold up startup or fail it.
  purgeDeletedPhotos(db).catch((error) => console.warn('Could not remove deleted photos', error));
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initialize}>
      {children}
    </SQLiteProvider>
  );
}
