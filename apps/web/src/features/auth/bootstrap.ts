import type { AppDispatch } from '../../app/store';
import { bootstrapFromStorage, setAuthStatus } from './authSlice';

export function bootstrapAuth(dispatch: AppDispatch): void {
  dispatch(bootstrapFromStorage());
  dispatch(setAuthStatus('idle'));
}
