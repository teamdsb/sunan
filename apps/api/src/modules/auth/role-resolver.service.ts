import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleResolverService {
  resolveRoles(params: {
    departmentNames: string[];
    position: string | null;
    isSystemAdmin: boolean;
  }): string[] {
    const roles = new Set<string>(['all_authenticated']);
    const mapping = new Map<string, string>([
      ['总经办', 'general_office'],
      ['财务部', 'finance'],
      ['业务部', 'business'],
      ['船务部', 'shipping'],
      ['后勤部', 'logistics'],
    ]);

    params.departmentNames.forEach((departmentName) => {
      const mappedRole = mapping.get(departmentName);
      if (mappedRole) {
        roles.add(mappedRole);
      }
    });

    if (params.position && /(船员|船长)/.test(params.position)) {
      roles.add('crew');
    }

    if (params.isSystemAdmin) {
      roles.add('system_admin');
    }

    return [...roles];
  }

  resolveDepartmentCodes(names: string[]): string[] {
    const mapping = new Map<string, string>([
      ['总经办', 'general_office'],
      ['财务部', 'finance_dept'],
      ['业务部', 'business_dept'],
      ['船务部', 'shipping_dept'],
      ['后勤部', 'logistics_dept'],
      ['中船工作组', 'zhongchuan_group'],
      ['平陆运河工作组', 'pinglu_canal_group'],
    ]);

    return names
      .map((name) => mapping.get(name))
      .filter((value): value is string => Boolean(value));
  }
}
