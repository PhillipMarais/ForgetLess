import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { migrate } from './migrations';

export const DATABASE_NAME = 'forgetless.db';

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      {children}
    </SQLiteProvider>
  );
}
