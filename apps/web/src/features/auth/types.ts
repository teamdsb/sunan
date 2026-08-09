export interface CurrentUser {
  userId: string;
  name: string;
  avatar?: string | null;
  departmentIds?: number[];
  department: string[];
  position?: string;
  roles: string[];
}

export interface AuthState {
  token: string | null;
  tokenExpiresAt: string | null;
  currentUser: CurrentUser | null;
  authStatus: 'idle' | 'authorizing' | 'authenticated' | 'unauthenticated';
  jssdkStatus: 'idle' | 'loading' | 'ready' | 'failed';
}

export interface AuthSuccessPayload {
  accessToken: string;
  expiresIn: number;
  privateInfoAuthorized?: boolean;
  user: CurrentUser;
}

export interface JssdkSignature {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}
