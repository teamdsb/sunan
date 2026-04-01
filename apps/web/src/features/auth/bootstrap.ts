import type { AppDispatch } from '../../app/store';
import { env } from '../../app/env';
import {
  bootstrapFromStorage,
  bootstrapMockAuth,
  loginSucceeded,
  setAuthStatus,
} from './authSlice';
import { getStoredToken } from './oauth';

function shouldBypassAuthForLocalPreview(): boolean {
  return import.meta.env.VITE_LOCAL_BYPASS_AUTH === 'true';
}

export async function bootstrapAuth(dispatch: AppDispatch): Promise<void> {
  if (env.mockMode) {
    const { mockAuthPayload } = await import('../../mocks/fixtures/auth');
    dispatch(bootstrapMockAuth(mockAuthPayload));
    return;
  }

  dispatch(bootstrapFromStorage());

  if (!getStoredToken() && shouldBypassAuthForLocalPreview()) {
    dispatch(
      loginSucceeded({
        accessToken: 'local-preview-token',
        expiresIn: 8 * 60 * 60,
        user: {
          userId: 'local-preview-user',
          name: '本地预览用户',
          department: ['本地预览'],
          roles: ['all_authenticated', 'shipping'],
        },
      }),
    );
    return;
  }

  dispatch(setAuthStatus('idle'));
}
