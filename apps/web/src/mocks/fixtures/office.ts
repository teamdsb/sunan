import type { OfficeAdminEntry, OfficeCategory } from '../../features/office/officeApi';
import type { OfficeAuditRecord } from '../../features/office/officeApi';

export interface OfficeMockState {
  categories: OfficeCategory[];
  entries: OfficeAdminEntry[];
  audits: OfficeAuditRecord[];
  nextEntryId: number;
  nextAuditId: number;
}

export function createOfficeMockState(): OfficeMockState {
  return {
    categories: [
      { code: 'maritime', name: '海事', sortOrder: 10, isEnabled: true, canManage: true },
      { code: 'customs', name: '海关', sortOrder: 20, isEnabled: true, canManage: true },
      { code: 'border_inspection', name: '边检', sortOrder: 30, isEnabled: true, canManage: true },
      { code: 'vessel_inspection', name: '船检', sortOrder: 40, isEnabled: true, canManage: true },
      { code: 'environment', name: '环保', sortOrder: 50, isEnabled: true, canManage: true },
      { code: 'other', name: '其他', sortOrder: 60, isEnabled: true, canManage: true },
      { code: 'petrochemical_park', name: '石化园区', sortOrder: 70, isEnabled: true, canManage: true },
    ],
    entries: [
      {
        id: 'office-1',
        categoryCode: 'maritime',
        title: '海事申报入口',
        summary: '处理海事相关办事端口。',
        iconType: 'maritime',
        targetType: 'external_url',
        targetValue: 'https://office.example.com/maritime',
        openMode: 'current_webview',
        visibilityRoles: ['all_authenticated'],
        managerRoles: ['shipping', 'general_office'],
        sortOrder: 10,
        status: 'published',
        canManage: true,
        createdBy: 'mock-admin',
        updatedBy: 'mock-admin',
        createdAt: new Date('2026-04-01T08:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-04-01T08:00:00.000Z').toISOString(),
      },
      {
        id: 'office-2',
        categoryCode: 'customs',
        title: '海关访问地址',
        summary: '查看海关业务入口。',
        iconType: 'customs',
        targetType: 'external_url',
        targetValue: 'https://office.example.com/customs',
        openMode: 'new_window',
        visibilityRoles: ['all_authenticated'],
        managerRoles: ['business', 'general_office'],
        sortOrder: 20,
        status: 'draft',
        canManage: true,
        createdBy: 'mock-admin',
        updatedBy: 'mock-admin',
        createdAt: new Date('2026-04-02T08:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-04-02T08:00:00.000Z').toISOString(),
      },
    ],
    audits: [
      {
        id: 'office-audit-1',
        entryId: 'office-1',
        entryTitle: '海事申报入口',
        categoryCode: 'maritime',
        action: 'open',
        operatorUserId: 'mock-admin',
        payloadSnapshot: { source: 'mock-seed' },
        createdAt: new Date('2026-04-10T08:00:00.000Z').toISOString(),
      },
    ],
    nextEntryId: 3,
    nextAuditId: 2,
  };
}
