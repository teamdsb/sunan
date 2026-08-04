export interface CurrentUser {
  userId: string;
  corpId: string;
  name: string;
  avatar: string | null;
  departmentIds?: number[];
  departments: string[];
  position: string | null;
  roles: string[];
  isAdmin: boolean;
}
