import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '../../app/store';
import { setCurrentUser } from '../auth/authSlice';
import { SettingsPage } from './SettingsPage';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockNotificationConfig = vi.fn();
const mockDeliveries = vi.fn();
const mockUpdateNotification = vi.fn();
const mockTestConnection = vi.fn();
const mockDraftTest = vi.fn();
const mockReconcile = vi.fn();
const mockRetry = vi.fn();
const mockRotate = vi.fn();

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...(actual as object),
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  };
});

vi.mock('./settingsApi', () => ({
  useGetSettingsQuery: () => mockGet(),
  useUpdateSettingsMutation: () => [mockUpdate],
  useGetNotificationConfigQuery: () => mockNotificationConfig(),
  useGetNotificationDeliveriesQuery: () => mockDeliveries(),
  useUpdateNotificationConfigMutation: () => [mockUpdateNotification, { isLoading: false }],
  useRotateNotificationEncryptionKeyMutation: () => [mockRotate, { isLoading: false }],
  useTestNotificationConnectionMutation: () => [mockTestConnection, { isLoading: false }],
  useSendNotificationDraftTestMutation: () => [mockDraftTest, { isLoading: false }],
  useReconcileNotificationDeliveryMutation: () => [mockReconcile],
  useRetryNotificationDeliveryMutation: () => [mockRetry],
}));

describe('SettingsPage', () => {
  const renderPage = () => render(
    <Provider store={store}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </Provider>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    store.dispatch(setCurrentUser(null));
    mockGet.mockReturnValue({
      data: { data: { reminderViewMode: 'dashboard', certificateGroupBy: 'owner', enablePushNotifications: true } },
      isLoading: false,
    });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockNotificationConfig.mockReturnValue({ data: undefined, isLoading: false });
    mockDeliveries.mockReturnValue({ data: { data: [] }, isLoading: false });
    mockUpdateNotification.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('saves settings and shows feedback', async () => {
    renderPage();
    fireEvent.mouseDown(screen.getByLabelText('提醒视图'));
    fireEvent.click(await screen.findByText('列表'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ reminderViewMode: 'list' }));
  });

  it('shows rollback error when save fails', async () => {
    mockUpdate.mockReturnValue({ unwrap: () => Promise.reject(new Error('boom')) });
    renderPage();
    fireEvent.mouseDown(screen.getByLabelText('提醒视图'));
    fireEvent.click(await screen.findByText('列表'));
    await waitFor(() => expect(screen.getByText(/boom|保存失败/)).toBeInTheDocument());
  });

  it('does not offer a personal switch that cannot control mandatory business notifications', () => {
    renderPage();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('证照、采购和任务通知由业务规则控制。')).toBeInTheDocument();
  });

  it('shows read-only main app details and an empty saved-secret field to administrators', () => {
    store.dispatch(setCurrentUser({ userId: 'admin', name: '管理员', department: [], roles: ['system_admin'], isAdmin: true }));
    mockNotificationConfig.mockReturnValue({
      data: { data: {
        corpId: 'corp-1', mainCorpId: 'corp-1', mainAgentId: '1000001', configured: true,
        source: 'admin_override', agentId: '2000002', configVersion: 3, secretStored: true,
        encryptionKeyAvailable: true, configurationError: false, updatedAt: null,
      } },
      isLoading: false,
    });
    renderPage();

    expect(screen.getByText('主应用 CorpID').parentElement).toHaveTextContent('corp-1');
    expect(screen.getByText('主应用 AgentID').parentElement).toHaveTextContent('1000001');
    expect(screen.getByRole('button', { name: /打开用户管理/ })).toBeInTheDocument();
    expect(screen.getByLabelText('通知应用 Secret')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('已保存，留空表示保留')).toHaveValue('');
  });

  it('does not describe a failed configuration or delivery read as an empty env default', () => {
    store.dispatch(setCurrentUser({ userId: 'admin', name: '管理员', department: [], roles: ['system_admin'], isAdmin: true }));
    mockNotificationConfig.mockReturnValue({ isError: true, isLoading: false, refetch: vi.fn() });
    mockDeliveries.mockReturnValue({ isError: true, isLoading: false, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('推送配置读取失败，当前生效应用未知。')).toBeInTheDocument();
    expect(screen.getByText('投递记录读取失败，不能确定是否存在待处理消息。')).toBeInTheDocument();
    expect(screen.queryByText('暂无待处理投递')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存覆盖/ })).toBeDisabled();
  });

  it('keeps a blank Secret out of a save and preserves the optimistic version', async () => {
    store.dispatch(setCurrentUser({ userId: 'admin', name: '管理员', department: [], roles: ['system_admin'], isAdmin: true }));
    const config = { configured: true, source: 'admin_override', agentId: '2000002', configVersion: 3, secretStored: true, encryptionKeyAvailable: true };
    mockNotificationConfig.mockReturnValue({ data: { data: config }, isLoading: false });
    mockUpdateNotification.mockReturnValue({ unwrap: () => Promise.resolve({ data: { ...config, configVersion: 4 } }) });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /保存覆盖/ }));
    await waitFor(() => expect(mockUpdateNotification).toHaveBeenCalledWith({ expectedConfigVersion: 3, agentId: '2000002', secret: undefined }));
  });

  it('reloads the optimistic version even when the server returns the same configuration object', async () => {
    store.dispatch(setCurrentUser({ userId: 'admin', name: '管理员', department: [], roles: ['system_admin'], isAdmin: true }));
    const config = { configured: true, source: 'admin_override', agentId: '2000002', configVersion: 3, secretStored: true, encryptionKeyAvailable: true };
    const response = { data: config };
    const refetch = vi.fn(() => ({ unwrap: () => Promise.resolve(response) }));
    mockNotificationConfig.mockReturnValue({ data: response, isLoading: false, refetch });
    mockUpdateNotification.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('version conflict')) }).mockReturnValue({ unwrap: () => Promise.resolve(response) });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /保存覆盖/ }));
    await screen.findByText('version conflict');
    fireEvent.click(screen.getByRole('button', { name: '重新加载配置' }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /保存覆盖/ }));
    await waitFor(() => expect(mockUpdateNotification).toHaveBeenLastCalledWith({ expectedConfigVersion: 3, agentId: '2000002', secret: undefined }));
  });

  it('keeps invalid draft input local without sending connection or message requests', async () => {
    store.dispatch(setCurrentUser({ userId: 'admin', name: '管理员', department: [], roles: ['system_admin'], isAdmin: true }));
    mockNotificationConfig.mockReturnValue({ data: { data: { configured: false, configVersion: 0, encryptionKeyAvailable: true } }, isLoading: false });
    renderPage();
    fireEvent.change(screen.getByLabelText('通知应用 AgentID'), { target: { value: 'bad-id' } });
    fireEvent.click(screen.getByRole('button', { name: /验证连接/ }));
    await screen.findByText('AgentID 必须是数字');
    fireEvent.click(screen.getByRole('button', { name: /发送定向测试/ }));
    await screen.findByText('请填写选定测试人员的 UserID');
    expect(mockTestConnection).not.toHaveBeenCalled();
    expect(mockDraftTest).not.toHaveBeenCalled();
  });
});
