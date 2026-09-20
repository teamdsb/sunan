import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceDetailsPanel } from './AttendanceDetailsPanel';
import { LearningPanel } from './LearningPanel';
import { FuelStatisticsPanel } from './FuelPanel';
import type { WorkbenchRecordDetail } from './workbenchApi';
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  exportAttendance: vi.fn(),
  saveMeasurement: vi.fn(),
  fuel: vi.fn(),
  job: vi.fn(),
}));
vi.mock('../../app/hooks', () => ({
  useAppSelector: (select: (s: unknown) => unknown) =>
    select({ auth: { currentUser: { userId: 'me' } } }),
}));
vi.mock('./businessApi', () => ({
  useLearningPeopleQuery: () => ({ data: { data: [] } }),
  usePublishLearningMutation: () => [vi.fn(), {}],
  useConfirmLearningMutation: () => [mocks.confirm, {}],
  useExportAttendanceMutation: () => [mocks.exportAttendance, {}],
  useExportJobQuery: () => mocks.job(),
  useLazyExportDownloadQuery: () => [vi.fn()],
  useRetryExportMutation: () => [vi.fn(), {}],
  useFuelStatisticsQuery: () => mocks.fuel(),
  useSaveFuelMeasurementMutation: () => [mocks.saveMeasurement, {}],
  useExportBusinessMutation: () => [vi.fn(), {}],
}));
vi.mock('./workbenchApi', () => ({
  useLazyGetWorkbenchAttachmentDownloadUrlQuery: () => [vi.fn()],
}));
vi.mock('./masterDataApi', () => ({
  useGetMasterDataSelectorQuery: () => ({
    data: { data: [{ id: 'v1', name: '测试船' }] },
  }),
}));
const emptyRecord: WorkbenchRecordDetail = {
  id: '', moduleCode: 'shipping_case_study', title: '案例学习', status: 'assigned',
  summary: '学习内容', vesselId: null, occurredAt: '2026-09-01T00:00:00Z',
  approvalChannel: 'internal', externalProcessInstanceId: null, externalStatus: null,
  payload: {}, steps: [], attachments: [], actionLogs: [],
};
const renderPage = (node: React.ReactNode) =>
  render(<MemoryRouter>{node}</MemoryRouter>);
describe('business report and learning panels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.job.mockReturnValue({});
    mocks.fuel.mockReturnValue({
      currentData: { data: { rows: [], unconfirmed: [], canMeasure: false } },
    });
  });
  it('submits the displayed attendance scope and shows missing hours distinctly', async () => {
    mocks.exportAttendance.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { exportJobId: 'j1' } }),
    });
    renderPage(
      <AttendanceDetailsPanel
        month="2026-09"
        departmentCode="shipping"
        report={{
          month: '2026-09',
          summary: {} as never,
          moduleTotals: [],
          canExport: true,
          people: [],
          details: [
            {
              recordId: 'r1',
              recordNo: 'SN1',
              personKey: 'p1',
              personName: '张三',
              departmentCode: 'shipping',
              vesselName: '测试船',
              occurredAt: '2026-09-01 08:00',
              period: 'am',
              workHours: null,
              status: 'submitted',
            },
          ],
        }}
      />,
    );
    expect(screen.getByText('未登记')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导出 Excel 明细' }));
    await waitFor(() =>
      expect(mocks.exportAttendance).toHaveBeenCalledWith({
        month: '2026-09',
        departmentCode: 'shipping',
        exportFormat: 'xlsx',
      }),
    );
    expect(screen.getByText('正在生成考勤报表…')).toBeInTheDocument();
  });
  it('only lets the current learner confirm their own unfinished materials', async () => {
    mocks.confirm.mockReturnValue({
      unwrap: () => Promise.resolve({ data: {} }),
    });
    const record: WorkbenchRecordDetail = {
      ...emptyRecord,
      id: 'course1',
      payload: {},
      learning: {
        publishedAt: '2026-09-01T00:00:00Z',
        hours: 2,
        totalPeople: 1,
        completedPeople: 0,
        completionRate: 0,
        materials: [
          { id: 'content', title: '安全要求' },
          { id: 'done', title: '已学材料' },
        ],
        learners: [
          {
            userId: 'me',
            name: '自己',
            progressPercent: 50,
            completedHours: 0,
            completedAt: null,
            completedMaterialIds: ['done'],
          },
        ],
      },
    };
    renderPage(<LearningPanel record={record} />);
    expect(screen.getByRole('button', { name: '已完成' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '确认已学习' }));
    await waitFor(() =>
      expect(mocks.confirm).toHaveBeenCalledWith({
        recordId: 'course1',
        materialId: 'content',
      }),
    );
  });
  it('does not expose another learner confirmation button to a manager', () => {
    const record: WorkbenchRecordDetail = {
      ...emptyRecord,
      id: 'course2',
      payload: {},
      canManageLearning: true,
      learning: {
        publishedAt: '2026-09-01T00:00:00Z',
        hours: 2,
        totalPeople: 1,
        completedPeople: 0,
        completionRate: 0,
        materials: [{ id: 'content', title: '安全要求' }],
        learners: [
          {
            userId: 'other',
            name: '别人',
            progressPercent: 0,
            completedHours: 0,
            completedAt: null,
            completedMaterialIds: [],
          },
        ],
      },
    };
    renderPage(<LearningPanel record={record} />);
    expect(
      screen.queryByRole('button', { name: '确认已学习' }),
    ).not.toBeInTheDocument();
  });
  it('shows fuel data gaps and low balance instead of fabricated consumption', () => {
    mocks.fuel.mockReturnValue({
      currentData: {
        data: {
          rows: [
            {
              vesselId: 'v1',
              vesselName: '测试船',
              fuelType: '柴油',
              unit: 'L',
              openingBalance: null,
              bunkeredAmount: 5,
              consumedAmount: null,
              closingBalance: 2,
              lowFuel: true,
              issues: ['缺少期初余量'],
            },
          ],
          unconfirmed: [{ recordId: 'r1', title: '等待实绩的申请' }],
          canMeasure: false,
        },
      },
    });
    renderPage(<FuelStatisticsPanel />);
    expect(screen.getByText('待核对')).toBeInTheDocument();
    expect(screen.getByText('缺少期初余量')).toBeInTheDocument();
    expect(screen.getByText('余量低于或等于提醒值')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '等待实绩的申请' }),
    ).toHaveAttribute('href', '/workbench/records/r1');
  });
});
