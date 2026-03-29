import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, AuthSuccessPayload, CurrentUser } from './types';
import {
  clearToken,
  getStoredToken,
  getStoredTokenExpiresAt,
  persistToken,
} from './oauth';

const initialState: AuthState = {
  token: null,
  tokenExpiresAt: null,
  currentUser: null,
  authStatus: 'idle',
  jssdkStatus: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    bootstrapFromStorage(state) {
      const token = getStoredToken();
      const tokenExpiresAt = getStoredTokenExpiresAt();
      state.token = token;
      state.tokenExpiresAt = tokenExpiresAt;
      state.authStatus = token ? 'authenticated' : 'unauthenticated';
    },
    loginSucceeded(state, action: PayloadAction<AuthSuccessPayload>) {
      state.token = action.payload.accessToken;
      state.tokenExpiresAt = persistToken(
        action.payload.accessToken,
        action.payload.expiresIn,
      );
      state.currentUser = action.payload.user;
      state.authStatus = 'authenticated';
    },
    bootstrapMockAuth(state, action: PayloadAction<AuthSuccessPayload>) {
      state.token = action.payload.accessToken;
      state.tokenExpiresAt = new Date(Date.now() + action.payload.expiresIn * 1000).toISOString();
      state.currentUser = action.payload.user;
      state.authStatus = 'authenticated';
    },
    logout(state) {
      clearToken();
      state.token = null;
      state.tokenExpiresAt = null;
      state.currentUser = null;
      state.authStatus = 'unauthenticated';
      state.jssdkStatus = 'idle';
    },
    setCurrentUser(state, action: PayloadAction<CurrentUser | null>) {
      state.currentUser = action.payload;
      state.authStatus = action.payload ? 'authenticated' : state.authStatus;
    },
    setAuthStatus(state, action: PayloadAction<AuthState['authStatus']>) {
      state.authStatus = action.payload;
    },
    setJssdkStatus(state, action: PayloadAction<AuthState['jssdkStatus']>) {
      state.jssdkStatus = action.payload;
    },
  },
});

export const {
  bootstrapFromStorage,
  bootstrapMockAuth,
  loginSucceeded,
  logout,
  setAuthStatus,
  setCurrentUser,
  setJssdkStatus,
} = authSlice.actions;

export const authReducer = authSlice.reducer;
