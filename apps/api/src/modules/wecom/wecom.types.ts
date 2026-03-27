export interface WecomUserInfoResponse {
  UserId?: string;
  userid?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WecomUserDetailResponse {
  userid: string;
  name: string;
  avatar?: string;
  department?: number[];
  position?: string;
  errcode?: number;
  errmsg?: string;
}

export interface WecomDepartment {
  id: number;
  name: string;
}

export interface WecomDepartmentListResponse {
  department: WecomDepartment[];
  errcode?: number;
  errmsg?: string;
}

export interface WecomTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

export interface WecomTicketResponse {
  ticket: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

export interface WecomMediaResponse {
  buffer: Buffer;
  contentType: string;
}
