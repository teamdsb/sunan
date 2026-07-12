import 'reflect-metadata';

import dataSource from './data-source';
import { LegacySafetyMigrator } from './legacy-safety-migrator';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const migrator = new LegacySafetyMigrator(dataSource);
    const [mode = 'classify', value] = process.argv.slice(2).filter((argument) => argument !== '--');
    if (mode === 'classify') console.log(JSON.stringify(await migrator.classify(), null, 2));
    else if (mode === 'run') console.log(JSON.stringify(await migrator.run(process.env.MIGRATION_ACTOR ?? 'wave7-migration', value ?? `wave7-${new Date().toISOString()}`), null, 2));
    else if (mode === 'verify' && value) console.log(JSON.stringify(await migrator.verify(value), null, 2));
    else if (mode === 'rollback' && value) console.log(JSON.stringify(await migrator.rollback(value), null, 2));
    else throw new Error('usage: migration:safety <classify|run|verify|rollback> [request-or-batch-id]');
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error('Legacy safety migration failed', error);
  process.exit(1);
});
