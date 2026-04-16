import type { NavigateFunction } from 'react-router-dom';
import type { OfficeOpenResult } from './officeApi';

export function launchOfficeEntry(navigate: NavigateFunction, entry: OfficeOpenResult): void {
  if (entry.targetType === 'internal_route') {
    navigate(entry.targetValue);
    return;
  }

  if (entry.openMode === 'new_window') {
    window.open(entry.targetValue, '_blank', 'noopener,noreferrer');
    return;
  }

  window.location.assign(entry.targetValue);
}
