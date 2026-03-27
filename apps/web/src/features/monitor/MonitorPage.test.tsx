import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MonitorPage } from './MonitorPage';

const mockList = vi.fn();
const mockByVessel = vi.fn();
const mockCreate = vi.fn();
const mockSelector = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: () => mockSelector(),
}));

vi.mock('./monitorApi', () => ({
  useGetShipMonitorsQuery: () => mockList(),
  useGetShipMonitorsByVesselQuery: () => mockByVessel(),
  useCreateShipMonitorMutation: () => [mockCreate],
}));

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelector.mockReturnValue(['shipping']);
    mockList.mockReturnValue({ data: { data: [{ id: '1', monitorName: '主监控', endpointUrl: 'https://x.example.com', isActive: true }] }, isLoading: false });
    mockByVessel.mockReturnValue({ data: { data: [{ id: '2', monitorName: '船舶监控', endpointUrl: 'https://v.example.com', isActive: true }] }, isLoading: false });
    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('renders manager form and creates monitor', async () => {
    render(
      <MemoryRouter>
        <MonitorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('管理员可新增与配置监控入口。')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('船舶ID'), { target: { value: 'v1' } });
    fireEvent.change(screen.getByPlaceholderText('监控名称'), { target: { value: '副监控' } });
    fireEvent.change(screen.getByPlaceholderText('监控地址'), { target: { value: 'https://x.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '新增监控' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  });

  it('loads vessel specific route', () => {
    render(
      <MemoryRouter initialEntries={['/my/monitors/vessel-1']}>
        <Routes>
          <Route path="/my/monitors/:vesselId" element={<MonitorPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(mockByVessel).toHaveBeenCalled();
  });
});
