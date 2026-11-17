import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createStore } from '../../app/store';
import { baseApi } from '../../app/baseApi';
import { setCurrentUser } from '../auth/authSlice';
import { UserManagementPage } from './UserManagementPage';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return { ...actual, default: { ...actual.default, create: () => ({ request }) } };
});

const store = createStore();
beforeEach(() => {
  request.mockReset();
  store.dispatch(setCurrentUser({ userId: 'admin', name: '管理员', department: [], roles: ['system_admin'], isAdmin: true }));
});
afterEach(() => {
  cleanup();
  store.dispatch(baseApi.util.resetApiState());
});

it('stops polling a completed directory batch while retaining its result on screen', async () => {
  request.mockImplementation(async ({ url }: { url: string }) => {
    if (url === '/admin/wecom-departments') return { data: { data: {
      items: [], scope: { batchId: 'completed-batch', batchStatus: 'succeeded', coverageStatus: 'unverified' },
    } } };
    if (url.includes('/wecom-directory-sync/')) return { data: { data: {
      id: 'completed-batch', status: 'succeeded', readCount: 3, createdCount: 2, updatedCount: 1, failedCount: 0,
      coverageNote: '合成范围未验证',
    } } };
    return { data: { data: { items: [], total: 0, page: 1, pageSize: 20, scope: { coverageStatus: 'unverified' } } } };
  });
  render(<Provider store={store}><UserManagementPage /></Provider>);
  await screen.findByText('同步正常');
  await waitFor(() => expect(request.mock.calls.filter(([arg]) => arg.url === '/admin/wecom-departments').length).toBeGreaterThanOrEqual(2));
  const batchReads = () => request.mock.calls.filter(([arg]) => arg.url.includes('/wecom-directory-sync/')).length;
  // Wait beyond the actual 1500ms polling interval, not just one React render.
  const completedReads = batchReads();
  await new Promise((resolve) => setTimeout(resolve, 1800));
  expect(batchReads()).toBe(completedReads);
  expect(screen.getByText(/读取 3，新增 2，更新 1，失败 0/)).toBeInTheDocument();
});
