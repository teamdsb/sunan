import type { AppDispatch } from '../../app/store';
import { env } from '../../app/env';
import { bootstrapFromStorage, bootstrapMockAuth, setAuthStatus } from './authSlice';

export async function bootstrapAuth(dispatch: AppDispatch): Promise<void> {
  if (import.meta.env.DEV && env.mockMode) {
    const { mockAuthPayload } = await import('../../mocks/fixtures/auth');
    dispatch(bootstrapMockAuth(mockAuthPayload));
    return;
  }

  dispatch(bootstrapFromStorage());
  dispatch(setAuthStatus('idle'));
}
