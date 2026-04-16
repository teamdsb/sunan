import type { OfficeCategory } from './officeApi';

export function canManageOffice(categories: OfficeCategory[] | undefined): boolean {
  return (categories ?? []).some((category) => category.canManage);
}
