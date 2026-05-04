import 'reflect-metadata';

import dataSource from '../data-source';
import { CertificateTypeEntity } from '../entities/certificate-type.entity';
import { OfficeCategoryEntity } from '../entities/office-category.entity';
import { VesselEntity } from '../entities/vessel.entity';
import { VehicleEntity } from '../entities/vehicle.entity';
import { OFFICE_CATEGORY_DEFINITIONS } from 'src/modules/office/office.constants';

const vessels = [
  {
    code: 'SN012',
    name: '苏南012',
    category: 'main_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SN022',
    name: '苏南022',
    category: 'main_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF002',
    name: '苏南辅2',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF003',
    name: '苏南辅3',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF005',
    name: '苏南辅5',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF006',
    name: '苏南辅6',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF007',
    name: '苏南辅7',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF008',
    name: '苏南辅8',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF009',
    name: '苏南辅9',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF010',
    name: '苏南辅10',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
  {
    code: 'SNF016',
    name: '苏南辅16',
    category: 'auxiliary_vessel' as const,
    status: 'active' as const,
  },
];

const vehicles = [
  {
    plateNumber: '桂E06207',
    vehicleType: 'service_vehicle',
    status: 'active' as const,
  },
];

const certificateTypes = [
  {
    code: 'nationality_cert',
    name: '国籍证书',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 10,
  },
  {
    code: 'ownership_cert',
    name: '所有权证书',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 20,
  },
  {
    code: 'inspection_cert',
    name: '船检证书',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 30,
  },
  {
    code: 'min_crew_cert',
    name: '最低配员证',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 40,
  },
  {
    code: 'radio_license',
    name: '电台执照',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 50,
  },
  {
    code: 'equipment_report',
    name: '设施设备检测报告',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 60,
  },
  {
    code: 'chart_update',
    name: '海图更新',
    ownerScope: 'vessel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 70,
  },
  {
    code: 'annual_inspection',
    name: '年度检验',
    ownerScope: 'mixed' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 80,
  },
  {
    code: 'insurance',
    name: '保险',
    ownerScope: 'mixed' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 90,
  },
  {
    code: 'personnel_cert',
    name: '人员证书',
    ownerScope: 'personnel' as const,
    reminderCategory: 'certificate' as const,
    defaultAdvanceDays: 30,
    sortOrder: 100,
  },
  {
    code: 'personnel_contract',
    name: '人员合同',
    ownerScope: 'personnel' as const,
    reminderCategory: 'contract' as const,
    defaultAdvanceDays: 90,
    sortOrder: 110,
  },
  {
    code: 'service_contract',
    name: '服务合同',
    ownerScope: 'mixed' as const,
    reminderCategory: 'contract' as const,
    defaultAdvanceDays: 90,
    sortOrder: 120,
  },
];

const seed = async (): Promise<void> => {
  await dataSource.initialize();

  try {
    await dataSource
      .getRepository(VesselEntity)
      .createQueryBuilder()
      .insert()
      .values(vessels)
      .orIgnore()
      .execute();
    await dataSource
      .getRepository(VehicleEntity)
      .createQueryBuilder()
      .insert()
      .values(vehicles)
      .orIgnore()
      .execute();
    await dataSource
      .getRepository(CertificateTypeEntity)
      .createQueryBuilder()
      .insert()
      .values(certificateTypes)
      .orIgnore()
      .execute();
    await dataSource
      .getRepository(OfficeCategoryEntity)
      .createQueryBuilder()
      .insert()
      .values(
        OFFICE_CATEGORY_DEFINITIONS.map((category) => ({
          code: category.code,
          name: category.name,
          sortOrder: category.sortOrder,
          isEnabled: category.isEnabled,
        })),
      )
      .orIgnore()
      .execute();
  } finally {
    await dataSource.destroy();
  }
};

seed().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
