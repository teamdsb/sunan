import type { AppDispatch } from '../../app/store';
import { bootstrapFromStorage, loginSucceeded, setAuthStatus } from './authSlice';
import { getStoredToken } from './oauth';

function shouldBypassAuthForLocalPreview(): boolean {
  return import.meta.env.VITE_LOCAL_BYPASS_AUTH === 'true';
}

export function bootstrapAuth(dispatch: AppDispatch): void {
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
