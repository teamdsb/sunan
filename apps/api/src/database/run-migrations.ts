import 'reflect-metadata';

import dataSource from './data-source';

async function runMigrations(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Migration run failed', error);
  process.exit(1);
});
