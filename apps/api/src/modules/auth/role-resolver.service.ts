import { Injectable } from '@nestjs/common';

interface WecomDepartmentMapping {
  name: string;
  departmentCode?: string;
  role?: string;
}

const DEPARTMENT_BY_ID = new Map<number, WecomDepartmentMapping>([
  [1, { name: '公司成员' }],
  [2, { name: '待设置部门' }],
  [
    3,
    {
      name: '总经办',
      departmentCode: 'general_office',
      role: 'general_office',
    },
  ],
  [
    4,
    { name: '财务部', departmentCode: 'finance_dept', role: 'finance' },
  ],
  [
    5,
    { name: '业务部', departmentCode: 'business_dept', role: 'business' },
  ],
  [
    6,
    { name: '船务部', departmentCode: 'shipping_dept', role: 'shipping' },
  ],
  [
    7,
    { name: '后勤部', departmentCode: 'logistics_dept', role: 'logistics' },
  ],
  [8, { name: '船员', departmentCode: 'shipping_dept', role: 'crew' }],
]);

const ROLE_BY_DEPARTMENT_NAME = new Map<string, string>([
  ['总经办', 'general_office'],
  ['财务部', 'finance'],
  ['业务部', 'business'],
  ['船务部', 'shipping'],
  ['后勤部', 'logistics'],
  ['船员', 'crew'],
]);

const CODE_BY_DEPARTMENT_NAME = new Map<string, string>([
  ['总经办', 'general_office'],
  ['财务部', 'finance_dept'],
  ['业务部', 'business_dept'],
  ['船务部', 'shipping_dept'],
  ['后勤部', 'logistics_dept'],
  ['船员', 'shipping_dept'],
  ['中船工作组', 'zhongchuan_group'],
  ['平陆运河工作组', 'pinglu_canal_group'],
]);

@Injectable()
export class RoleResolverService {
  resolveRoles(params: {
    departmentIds?: number[];
    departmentNames: string[];
    position: string | null;
    isSystemAdmin: boolean;
  }): string[] {
    const roles = new Set<string>(['all_authenticated']);

    if (params.departmentIds?.length) {
      params.departmentIds.forEach((departmentId) => {
        const role = DEPARTMENT_BY_ID.get(departmentId)?.role;
        if (role) {
          roles.add(role);
        }
      });
    } else {
      params.departmentNames.forEach((departmentName) => {
        const role = ROLE_BY_DEPARTMENT_NAME.get(departmentName);
        if (role) {
          roles.add(role);
        }
      });
    }

    if (params.position && /(船员|船长)/.test(params.position)) {
      roles.add('crew');
    }

    if (params.isSystemAdmin) {
      roles.add('system_admin');
    }

    return [...roles];
  }

  resolveDepartmentCodes(params: {
    departmentIds?: number[];
    departmentNames: string[];
  }): string[] {
    const codes = new Set<string>();

    if (params.departmentIds?.length) {
      params.departmentIds.forEach((departmentId) => {
        const code = DEPARTMENT_BY_ID.get(departmentId)?.departmentCode;
        if (code) {
          codes.add(code);
        }
      });
    } else {
      params.departmentNames.forEach((departmentName) => {
        const code = CODE_BY_DEPARTMENT_NAME.get(departmentName);
        if (code) {
          codes.add(code);
        }
      });
    }

    return [...codes];
  }

  resolveFallbackDepartmentName(departmentId: number): string {
    return DEPARTMENT_BY_ID.get(departmentId)?.name ?? `部门 ${departmentId}`;
  }

  normalizeDepartmentIds(departmentIds: number[]): number[] {
    const normalized = new Set<number>();

    departmentIds.forEach((departmentId) => {
      if (Number.isSafeInteger(departmentId) && departmentId > 0) {
        normalized.add(departmentId);
      }
    });

    return [...normalized];
  }
}
