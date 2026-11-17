// Explicit local browser fixture: real application modules and migrated PG;
// only WeCom/Redis transports are synthetic. No .env files or AppModule DB URL.
import { Module } from '@nestjs/common';
import { appEnv } from 'src/config/env';
import { HealthController } from 'src/health/health.controller';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { EnterprisePolicyModule } from 'src/modules/enterprise-policy/enterprise-policy.module';
import { EnterpriseProfileModule } from 'src/modules/enterprise-profile/enterprise-profile.module';
import { FilesModule } from 'src/modules/files/files.module';
import { InspectionCapaModule } from 'src/modules/inspection-capa/inspection-capa.module';
import { MasterDataModule } from 'src/modules/master-data/master-data.module';
import { OfficeModule } from 'src/modules/office/office.module';
import { ShipMonitorModule } from 'src/modules/ship-monitor/ship-monitor.module';
import { WorkbenchModule } from 'src/modules/workbench/workbench.module';
import { createM9Wave5Rehearsal } from 'test/m9-wave5-rehearsal';

@Module({
  imports: [FilesModule, CertificateModule, EnterpriseProfileModule, EnterprisePolicyModule, InspectionCapaModule, MasterDataModule, OfficeModule, ShipMonitorModule, WorkbenchModule],
  controllers: [HealthController],
})
class BrowserBusinessModule {}

export async function createFullSystemRehearsal() {
  if (process.env.NODE_ENV !== 'test') throw new Error('Full-system rehearsal requires NODE_ENV=test');
  appEnv.WEB_PUBLIC_URL = 'http://127.0.0.1:5174';
  return createM9Wave5Rehearsal([BrowserBusinessModule]);
}

if (require.main === module) {
  void createFullSystemRehearsal().then(async (rehearsal) => {
    await rehearsal.app.listen(4320, '127.0.0.1');
    console.log('Full-system synthetic API ready: http://127.0.0.1:4320');
    const close = () => { void rehearsal.close().then(() => process.exit(0)); };
    process.once('SIGTERM', close);
    process.once('SIGINT', close);
  }).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
