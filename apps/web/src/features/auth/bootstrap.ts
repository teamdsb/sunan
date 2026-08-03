import type { AppDispatch } from '../../app/store';
import { bootstrapFromStorage } from './authSlice';

export function bootstrapAuth(dispatch: AppDispatch): void {
  dispatch(bootstrapFromStorage());
}
