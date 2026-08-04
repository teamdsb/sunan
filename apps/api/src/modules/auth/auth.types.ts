export interface JwtPayload {
  sub: string;
  corpId: string;
  name: string;
}

export interface AuthenticatedUserResponse {
  userId: string;
  name: string;
  avatar: string | null;
  departmentIds: number[];
  department: string[];
  position: string | null;
  roles: string[];
  isAdmin: boolean;
}
