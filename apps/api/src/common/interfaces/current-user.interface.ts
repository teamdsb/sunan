export interface CurrentUser {
  userId: string;
  corpId: string;
  name: string;
  avatar: string | null;
  departments: string[];
  position: string | null;
  roles: string[];
  isAdmin: boolean;
}
