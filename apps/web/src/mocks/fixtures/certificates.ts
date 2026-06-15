import type {
  CertificateItem,
  CertificateOwnerItem,
  CertificateTypeItem,
} from '../../features/certificate/certificateApi';
import type { FileRecord } from '../../features/files/types';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

export interface CertificateFileAttachment {
  id: string;
  fileName: string;
  ossKey: string;
  mimeType?: string;
  fileSize?: number;
  fileRole?: string;
}

export interface CertificateMockRecord extends CertificateItem {
  files: CertificateFileAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CertificatesMockState {
  certificates: CertificateMockRecord[];
  nextCertificateId: number;
}

export interface CertificateRecordSeed {
  id: string;
  certificateTypeId: string;
  ownerType: CertificateItem['ownerType'];
  ownerId: string;
  title: string;
  expiryDate: string;
  advanceDays?: number;
  status?: CertificateItem['status'];
  certificateTypeName?: string;
  ownerName?: string;
  files?: CertificateFileAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

const CERTIFICATE_TYPE_NAMES: Record<string, string> = {
  nationality_cert: '国籍证书',
  ownership_cert: '所有权证书',
  inspection_cert: '船检证书',
  min_crew_cert: '最低配员证',
  radio_license: '电台执照',
  equipment_report: '设施设备检测报告',
  chart_update: '海图更新',
  annual_inspection: '年度检验',
  insurance: '保险',
  personnel_cert: '人员证书',
};

export const certificateTypeFixtures: CertificateTypeItem[] = [
  {
    id: 'nationality_cert',
    code: 'nationality_cert',
    name: '国籍证书',
    ownerScope: 'vessel',
    reminderCategory: 'certificate',
    defaultAdvanceDays: 30,
    requiresAttachment: true,
  },
  {
    id: 'inspection_cert',
    code: 'inspection_cert',
    name: '船检证书',
    ownerScope: 'vessel',
    reminderCategory: 'certificate',
    defaultAdvanceDays: 45,
    requiresAttachment: true,
  },
  {
    id: 'insurance',
    code: 'insurance',
    name: '保险',
    ownerScope: 'mixed',
    reminderCategory: 'certificate',
    defaultAdvanceDays: 30,
    requiresAttachment: true,
  },
  {
    id: 'personnel_cert',
    code: 'personnel_cert',
    name: '人员证书',
    ownerScope: 'personnel',
    reminderCategory: 'certificate',
    defaultAdvanceDays: 30,
    requiresAttachment: true,
  },
];

export const certificateOwnerFixtures: Record<
  CertificateItem['ownerType'],
  CertificateOwnerItem[]
> = {
  vessel: [
    { id: 'vessel-012', name: '苏南012', code: 'SN012', status: 'active' },
    { id: 'vessel-018', name: '苏南018', code: 'SN018', status: 'active' },
  ],
  vehicle: [
    { id: 'vehicle-001', name: '桂A1001', code: '桂A1001', status: 'active' },
  ],
  personnel: [
    { id: 'personnel-001', name: '张三', code: 'zhangsan', status: 'active' },
  ],
};

function timestamp(offsetMinutes: number): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

export function resolveCertificateTypeName(certificateTypeId: string): string {
  return CERTIFICATE_TYPE_NAMES[certificateTypeId] ?? certificateTypeId;
}

export function resolveOwnerName(ownerType: CertificateItem['ownerType'], ownerId: string): string {
  const suffix = ownerId.trim() || 'unknown';
  return ownerType === 'personnel' ? `人员-${suffix}` : `对象-${suffix}`;
}

export function createCertificateAttachment(
  file: Pick<FileRecord, 'id' | 'fileName' | 'ossKey' | 'mimeType' | 'fileSize'>,
  fileRole = 'primary',
): CertificateFileAttachment {
  return {
    id: file.id,
    fileName: file.fileName,
    ossKey: file.ossKey,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    fileRole,
  };
}

export function createMockCertificateRecord(
  seed: CertificateRecordSeed,
): CertificateMockRecord {
  return {
    id: seed.id,
    certificateTypeId: seed.certificateTypeId,
    certificateTypeName:
      seed.certificateTypeName ?? resolveCertificateTypeName(seed.certificateTypeId),
    ownerType: seed.ownerType,
    ownerId: seed.ownerId,
    ownerName: seed.ownerName ?? resolveOwnerName(seed.ownerType, seed.ownerId),
    title: seed.title,
    expiryDate: seed.expiryDate,
    advanceDays: seed.advanceDays ?? 30,
    status: seed.status ?? 'active',
    files: (seed.files ?? []).map((file) => ({ ...file })),
    createdAt: seed.createdAt ?? timestamp(0),
    updatedAt: seed.updatedAt ?? timestamp(0),
  };
}

export function createCertificatesMockState(): CertificatesMockState {
  const initialCertificates: CertificateMockRecord[] = [
    createMockCertificateRecord({
      id: '1',
      certificateTypeId: 'nationality_cert',
      certificateTypeName: '国籍证书',
      ownerType: 'vessel',
      ownerId: 'vessel-012',
      ownerName: '苏南012',
      title: '国籍证书',
      expiryDate: '2027-12-31',
      advanceDays: 30,
      status: 'active',
      files: [
        createCertificateAttachment({
          id: 'file-1',
          fileName: '国籍证书.pdf',
          ossKey: 'certificates/2026/03/file-1.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        }),
      ],
      createdAt: timestamp(0),
      updatedAt: timestamp(0),
    }),
    createMockCertificateRecord({
      id: '2',
      certificateTypeId: 'inspection_cert',
      certificateTypeName: '船检证书',
      ownerType: 'vessel',
      ownerId: 'vessel-018',
      ownerName: '苏南018',
      title: '船检证书',
      expiryDate: '2026-11-30',
      advanceDays: 45,
      status: 'active',
      files: [],
      createdAt: timestamp(8),
      updatedAt: timestamp(8),
    }),
  ];

  return {
    certificates: initialCertificates,
    nextCertificateId: 3,
  };
}
