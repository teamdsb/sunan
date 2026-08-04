import { describe, expect, it } from 'vitest';
import { formatDepartmentNames } from './userPresentation';

describe('formatDepartmentNames', () => {
  it('shows all specific departments and hides generic memberships', () => {
    expect(
      formatDepartmentNames({
        departmentIds: [1, 6, 4, 2],
        department: ['公司成员', '船务部', '财务部', '待设置部门'],
        roles: ['all_authenticated', 'shipping', 'finance'],
      }),
    ).toBe('船务部 / 财务部');
  });

  it('deduplicates department names while preserving order', () => {
    expect(
      formatDepartmentNames({
        departmentIds: [6, 8, 4],
        department: ['船务部', '船务部', '财务部'],
        roles: ['all_authenticated', 'shipping', 'crew', 'finance'],
      }),
    ).toBe('船务部 / 财务部');
  });

  it('shows generic departments when there is no specific membership', () => {
    expect(
      formatDepartmentNames({
        departmentIds: [1, 2],
        department: ['公司成员', '待设置部门'],
        roles: ['all_authenticated'],
      }),
    ).toBe('公司成员 / 待设置部门');
  });

  it('supports legacy profiles without department ids', () => {
    expect(
      formatDepartmentNames({
        department: ['船务部', '财务部'],
        roles: ['all_authenticated', 'shipping', 'finance'],
      }),
    ).toBe('船务部 / 财务部');
  });

  it('falls back to the first business role when names are unavailable', () => {
    expect(
      formatDepartmentNames({
        departmentIds: [],
        department: [],
        roles: ['all_authenticated', 'business', 'finance'],
      }),
    ).toBe('业务部');
  });
});
