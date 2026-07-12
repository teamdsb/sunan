import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskDetailPage } from './TaskDetailPage';

const perform = vi.fn();
const retry = vi.fn();

vi.mock('./taskApi', () => ({
  useGetTaskQuery: () => ({
    data: {
      data: {
        id: 'task-1', title: '船舶月度检查', status: 'pending', responsibleUserId: 'crew-old',
        scheduledAt: '2026-07-01T01:00:00.000Z', dueAt: '2026-07-01T02:00:00.000Z', isOverdue: false,
        availableActions: ['start', 'transfer'], actionLogs: [], transfers: [], delegations: [], participants: [{ id: 'p1', userId: 'crew-old', role: 'executor', status: 'active' }],
        notificationDeliveries: [{ id: 'delivery-1', messageType: 'reminder', status: 'failed', attemptCount: 1, failureReason: '超时' }],
      },
    },
    isLoading: false,
    isError: false,
  }),
  usePerformTaskActionMutation: () => [perform, { isLoading: false }],
  useRetryTaskDeliveryMutation: () => [retry, { isLoading: false }],
}));

describe('TaskDetailPage', () => {
  beforeEach(() => {
    perform.mockReset();
    retry.mockReset();
    perform.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('submits transfer parameters and exposes failed message retry', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/workbench/tasks/task-1']}>
        <Routes><Route path="/workbench/tasks/:taskId" element={<TaskDetailPage />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /转\s*移/ }));
    fireEvent.change(screen.getByLabelText('原因'), { target: { value: '轮班交接' } });
    fireEvent.change(screen.getByLabelText('新负责人 ID'), { target: { value: 'crew-new' } });
    fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(perform).toHaveBeenCalledWith({ id: 'task-1', actionType: 'transfer', reason: '轮班交接', transferToUserId: 'crew-new' }));

    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(retry).toHaveBeenCalledWith({ taskId: 'task-1', deliveryId: 'delivery-1' });
  });
});
