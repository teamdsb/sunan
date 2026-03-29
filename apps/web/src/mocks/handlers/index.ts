import { mockAuthPayload } from '../fixtures/auth';
import { certificateHandlers } from './certificates';
import { filesHandlers } from './files';
import { enterpriseHandlers } from './enterprise';
import { monitorHandlers } from './monitor';
import { settingsHandlers } from './settings';
import type { MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

export const mockHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/auth/me',
    handler: () =>
      createMockResponse({
        data: mockAuthPayload.user,
      }),
  },
  ...filesHandlers,
  ...certificateHandlers,
  ...enterpriseHandlers,
  ...monitorHandlers,
  ...settingsHandlers,
];
