import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskCenterPage } from './TaskCenterPage';

const getTasks = vi.fn();

vi.mock('./taskApi', () => ({
  useGetTasksQuery: (query: unknown) => getTasks(query),
}));

describe('TaskCenterPage', () => {
  beforeEach(() => {
    getTasks.mockReset();
    getTasks.mockReturnValue({
      data: {
        data: [{
          id: 'task-1',
          title: '真实月度检查',
          status: 'pending',
          responsibleUserId: 'crew-1',
          scheduledAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + 3600_000).toISOString(),
          isOverdue: false,
        }],
      },
      isLoading: false,
      isError: false,
    });
  });

  it('uses the selected view and the same real task source for list and calendar', () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TaskCenterPage /></MemoryRouter>);

    expect(screen.getByRole('link', { name: '真实月度检查' })).toHaveAttribute('href', '/workbench/tasks/task-1');
    fireEvent.click(screen.getByText('我参与'));
    expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ view: 'participated' }));
    fireEvent.click(screen.getByText('日历'));
    expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ view: 'participated', startAt: expect.any(String), endAt: expect.any(String) }));
    expect(screen.getByRole('button', { name: '真实月度检查' })).toBeInTheDocument();
  });
});
