import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';

const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...(actual as object),
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('./settingsApi', () => ({
  useGetSettingsQuery: () => mockGet(),
  useUpdateSettingsMutation: () => [mockUpdate],
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue({
      data: { data: { reminderViewMode: 'dashboard', certificateGroupBy: 'owner', enablePushNotifications: true } },
      isLoading: false,
    });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('saves settings and shows feedback', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
  });

  it('shows rollback error when save fails', async () => {
    mockUpdate.mockReturnValue({ unwrap: () => Promise.reject(new Error('boom')) });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.getByText(/boom|保存失败/)).toBeInTheDocument());
  });
});
