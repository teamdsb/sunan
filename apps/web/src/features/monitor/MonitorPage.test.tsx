import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MonitorPage } from './MonitorPage';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSelector = vi.fn();
const mockVessels = vi.fn();
const mockRefetch = vi.fn();
const vesselId = '12345678-1234-4234-8234-123456789abc';
const monitor = {
  id: 'm1',
  vesselId,
  vesselName: '苏南012',
  monitorName: '主监控',
  endpointUrl: 'https://monitor.example.com',
  accessMode: 'external',
  sortOrder: 0,
  isActive: true,
};

vi.mock('../../app/hooks', () => ({ useAppSelector: () => mockSelector() }));
vi.mock('../workbench/masterDataApi', () => ({
  useGetMasterDataSelectorQuery: (...args: unknown[]) => mockVessels(...args),
}));
vi.mock('./monitorApi', () => ({
  useGetShipMonitorsQuery: (...args: unknown[]) => mockList(...args),
  useCreateShipMonitorMutation: () => [mockCreate, { isLoading: false }],
  useUpdateShipMonitorMutation: () => [mockUpdate, { isLoading: false }],
  useDeleteShipMonitorMutation: () => [mockDelete, { isLoading: false }],
}));
function page(path = '/my/monitors') {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      initialEntries={[path]}
    >
      <Routes>
        <Route path="/my/monitors" element={<MonitorPage />} />
        <Route path="/my/monitors/:vesselId" element={<MonitorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function fillCreate(url = 'http://192.168.1.10:8080/live') {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '船舶' }));
  fireEvent.click(await screen.findByText('苏南012 (SN012)'));
  fireEvent.change(screen.getByRole('textbox', { name: '监控名称' }), {
    target: { value: '副监控' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: '监控地址' }), {
    target: { value: url },
  });
}

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSelector.mockReturnValue(['all_authenticated', 'system_admin']);
    const query = {
      currentData: { data: [monitor] },
      isLoading: false,
      refetch: mockRefetch,
    };
    mockList.mockReturnValue(query);
    mockVessels.mockReturnValue({
      data: { data: [{ id: vesselId, name: '苏南012', code: 'SN012' }] },
      isLoading: false,
      refetch: mockRefetch,
    });
    for (const mock of [mockCreate, mockUpdate, mockDelete])
      mock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });
  it('creates using a selected vessel UUID and supports intranet monitoring URLs', async () => {
    page();
    expect(screen.queryByPlaceholderText('船舶ID')).toBeNull();
    await fillCreate();
    fireEvent.click(screen.getByRole('button', { name: '新增监控' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          vesselId,
          monitorName: '副监控',
          endpointUrl: 'http://192.168.1.10:8080/live',
        }),
      ),
    );
    expect(await screen.findByText('监控入口已新增')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '监控名称' })).toHaveValue('');
  });
  it('shows creation errors and retains input for correction', async () => {
    mockCreate.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: '该船舶已存在同名监控入口' } }),
    });
    page();
    await fillCreate();
    fireEvent.click(screen.getByRole('button', { name: '新增监控' }));
    expect(
      await screen.findByText('该船舶已存在同名监控入口'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '监控名称' })).toHaveValue(
      '副监控',
    );
  });
  it('edits existing fields and cancels back to clean create defaults', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByRole('textbox', { name: '监控名称' })).toHaveValue(
      '主监控',
    );
    fireEvent.change(screen.getByRole('textbox', { name: '监控名称' }), {
      target: { value: '改名' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存监控' }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'm1',
        data: expect.objectContaining({ monitorName: '改名', vesselId }),
      }),
    );
    expect(await screen.findByText('监控入口已更新')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '新增监控' }),
    ).toBeInTheDocument();
  });
  it('reports update failures without discarding edits', async () => {
    mockUpdate.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: '船舶已停用' } }),
    });
    page();
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.click(screen.getByRole('button', { name: '保存监控' }));
    expect(await screen.findByText('船舶已停用')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '监控名称' })).toHaveValue(
      '主监控',
    );
    fireEvent.click(screen.getByRole('button', { name: '取消编辑' }));
    expect(screen.getByRole('textbox', { name: '监控名称' })).toHaveValue('');
  });
  it('can disable and re-enable monitors', async () => {
    const view = page();
    fireEvent.click(screen.getByRole('button', { name: '停用' }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'm1',
        data: { isActive: false },
      }),
    );
    view.unmount();
    mockList.mockReturnValue({
      currentData: { data: [{ ...monitor, isActive: false }] },
    });
    page();
    fireEvent.click(screen.getByRole('button', { name: '启用' }));
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'm1',
        data: { isActive: true },
      }),
    );
    expect(screen.queryByRole('link', { name: '打开' })).toBeNull();
  });
  it('requires deletion confirmation and shows failures', async () => {
    mockDelete.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: '删除请求失败' } }),
    });
    page();
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(mockDelete).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('tooltip');
    fireEvent.click(within(dialog).getByRole('button', { name: /删\s*除/ }));
    expect(await screen.findByText('删除请求失败')).toBeInTheDocument();
    expect(mockDelete).toHaveBeenCalledWith('m1');
  });
  it.each(['shipping', 'general_office', 'crew'])(
    'keeps %s read-only',
    (role) => {
      mockSelector.mockReturnValue(['all_authenticated', role]);
      page();
      expect(screen.queryByTestId('monitor-create-form')).toBeNull();
      for (const name of ['编辑', '停用', '删除', '新增监控'])
        expect(screen.queryByRole('button', { name })).toBeNull();
      expect(screen.getByRole('link', { name: '打开' })).toHaveAttribute(
        'href',
        monitor.endpointUrl,
      );
      expect(mockList).toHaveBeenCalledWith({
        vesselId: undefined,
        activeOnly: true,
      });
      expect(mockVessels).toHaveBeenCalledWith(
        { type: 'vessels' },
        { skip: true },
      );
    },
  );
  it('loads the vessel route and preselects that vessel on create', () => {
    page(`/my/monitors/${vesselId}`);
    expect(mockList).toHaveBeenCalledWith({ vesselId, activeOnly: false });
    expect(screen.getByText('苏南012 (SN012)')).toBeInTheDocument();
  });
  it('shows list failures with retry instead of an empty-state success', () => {
    mockList.mockReturnValue({ isError: true, refetch: mockRefetch });
    page();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(mockRefetch).toHaveBeenCalled();
    expect(screen.queryByText('暂无监控入口')).toBeNull();
  });
  it('shows selector failures with retry and prevents invalid creation', () => {
    mockVessels.mockReturnValue({ isError: true, refetch: mockRefetch });
    page();
    expect(screen.getByText('船舶列表加载失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增监控' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重试船舶列表' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
  it('hides disabled cached rows immediately when management permission is removed', () => {
    mockSelector.mockReturnValue(['shipping']);
    mockList.mockReturnValue({
      currentData: { data: [{ ...monitor, isActive: false }] },
    });
    page(`/my/monitors/${vesselId}`);
    expect(screen.queryByText('主监控')).toBeNull();
    expect(mockList).toHaveBeenCalledWith({ vesselId, activeOnly: true });
  });
  it('does not expose old vessel rows while the current route query is pending', () => {
    mockList.mockReturnValue({
      data: { data: [monitor] },
      currentData: undefined,
      isFetching: true,
      isLoading: false,
    });
    page('/my/monitors/22345678-1234-4234-8234-123456789abc');
    expect(screen.queryByText('主监控')).toBeNull();
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
  });
  it('opens embed monitors in a preview with an external fallback', async () => {
    mockList.mockReturnValue({
      currentData: { data: [{ ...monitor, accessMode: 'embed' }] },
    });
    page();
    fireEvent.click(screen.getByRole('button', { name: '查看监控' }));
    expect(await screen.findByTitle('主监控')).toHaveAttribute(
      'src',
      monitor.endpointUrl,
    );
    expect(screen.getByRole('link', { name: '外部打开' })).toHaveAttribute(
      'href',
      monitor.endpointUrl,
    );
  });
});
