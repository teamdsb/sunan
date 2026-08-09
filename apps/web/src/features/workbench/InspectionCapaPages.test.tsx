import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InspectionDetailPage,
  InspectionListPage,
  InspectionTemplatePage,
  IssueCenterPage,
  IssueDetailPage,
} from './InspectionCapaPages';

const getInspections = vi.fn();
const getInspection = vi.fn();
const getIssues = vi.fn();
const getIssue = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock('../../app/hooks', () => ({
  useAppSelector: (
    selector: (state: {
      auth: { currentUser: { userId: string; roles: string[] } | null };
    }) => unknown,
  ) => selector({ auth: { currentUser: mockCurrentUser() } }),
}));

vi.mock('../files/FileUploadField', () => ({ FileUploadField: () => <button type="button">上传文件</button> }));
vi.mock('./inspectionCapaApi', () => ({
  useGetInspectionTemplatesQuery: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useCreateInspectionTemplateMutation: () => [vi.fn(), { isLoading: false }],
  useGetInspectionPlansQuery: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useCreateInspectionPlanMutation: () => [vi.fn(), { isLoading: false }],
  useGetInspectionsQuery: () => getInspections(),
  useGetInspectionQuery: () => getInspection(),
  useSaveInspectionResultMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitInspectionMutation: () => [vi.fn(), { isLoading: false }],
  useSummarizeInspectionMutation: () => [vi.fn(), { isLoading: false }],
  useGetIssuesQuery: () => getIssues(),
  useGetIssueQuery: () => getIssue(),
  useCreateCapaMutation: () => [vi.fn(), { isLoading: false }],
  useSaveRootCauseMutation: () => [vi.fn(), { isLoading: false }],
  useCreateCapaActionMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitCapaActionMutation: () => [vi.fn(), { isLoading: false }],
  useAcceptCapaActionMutation: () => [vi.fn(), { isLoading: false }],
  useVerifyCapaMutation: () => [vi.fn(), { isLoading: false }],
  useRequestVerificationMutation: () => [vi.fn(), { isLoading: false }],
  useCloseIssueMutation: () => [vi.fn(), { isLoading: false }],
}));

describe('InspectionCapaPages', () => {
  beforeEach(() => {
    getInspections.mockReset(); getInspection.mockReset(); getIssues.mockReset(); getIssue.mockReset();
    getInspection.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    getIssue.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    mockCurrentUser.mockReturnValue({
      userId: 'shipping-1',
      roles: ['all_authenticated', 'shipping'],
    });
  });

  it('renders inspection loading, empty and source-backed issue drill-down states', () => {
    getInspections.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { rerender } = render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><InspectionListPage /></MemoryRouter>);
    expect(screen.getByText('检查加载中...')).toBeInTheDocument();
    getInspections.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false });
    rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><InspectionListPage /></MemoryRouter>);
    expect(screen.getByText('暂无可执行检查')).toBeInTheDocument();
    getIssues.mockReturnValue({ data: { data: [{ id: 'issue-1', title: '救生设备不符合', severity: 'major', status: 'pending_verification', responsibleUserId: 'crew-a', dueAt: '2026-07-20T00:00:00.000Z' }] }, isLoading: false, isError: false });
    rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><IssueCenterPage /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'CAPA 详情' })).toHaveAttribute('href', '/workbench/issues/issue-1');
    expect(screen.getByText('major')).toBeInTheDocument();
  });

  it('shows a safe error state without inspection data', () => {
    getInspections.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><InspectionListPage /></MemoryRouter>);
    expect(screen.getByText('检查加载失败，请重试')).toBeInTheDocument();
  });

  it('does not render a fake source link when the backend has no source URL', () => {
    getIssue.mockReturnValue({
      data: {
        data: {
          id: 'issue-1',
          title: '救生设备不符合',
          issueType: 'inspection',
          severity: 'major',
          status: 'open',
          responsibleUserId: 'crew-a',
          dueAt: '2026-07-20T00:00:00.000Z',
          sources: [{ sourceType: 'inspection', sourceId: 'inspection-1', sourceItemKey: 'item-1', sourceHref: null }],
          capa: null,
          availableActions: ['read'],
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><IssueDetailPage /></MemoryRouter>);

    expect(screen.getByText('inspection item-1')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'inspection item-1' })).not.toBeInTheDocument();
    expect(screen.queryByText('建立 CAPA')).not.toBeInTheDocument();
  });

  it('keeps a read-only inspection free of result and signing controls', () => {
    getInspection.mockReturnValue({
      data: {
        data: {
          id: 'inspection-1',
          taskId: 'task-1',
          status: 'submitted',
          templateVersionId: 'version-1',
          templateSnapshot: { items: [{ snapshotKey: 'item-1', title: '救生设备', resultRequired: true, evidenceRequiredOnFailure: true }] },
          results: [],
          availableActions: ['read'],
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><InspectionDetailPage /></MemoryRouter>);

    expect(screen.getByText('救生设备')).toBeInTheDocument();
    expect(screen.queryByText('保存本人结果')).not.toBeInTheDocument();
    expect(screen.queryByText('提交本人检查')).not.toBeInTheDocument();
    expect(screen.queryByText('上传文件')).not.toBeInTheDocument();
  });

  it('shows only verifier actions on a CAPA awaiting verification', () => {
    getIssue.mockReturnValue({
      data: {
        data: {
          id: 'issue-1',
          title: '救生设备不符合',
          issueType: 'inspection',
          severity: 'major',
          status: 'pending_verification',
          responsibleUserId: 'crew-a',
          dueAt: '2026-07-20T00:00:00.000Z',
          sources: [],
          availableActions: ['read', 'verify'],
          capa: {
            id: 'capa-1',
            issueId: 'issue-1',
            status: 'pending_verification',
            verifierUserId: 'verifier-1',
            rootCause: { method: 'five_whys', conclusion: '维护周期过长' },
            actions: [{ id: 'action-1', actionType: 'corrective', title: '更换设备', responsibleUserId: 'crew-a', dueAt: '2026-07-20T00:00:00.000Z', status: 'accepted', evidenceFileIds: ['file-1'], availableActions: [] }],
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><IssueDetailPage /></MemoryRouter>);

    expect(screen.getByText('验证通过')).toBeInTheDocument();
    expect(screen.getByText('退回返工')).toBeInTheDocument();
    expect(screen.queryByText('保存根因')).not.toBeInTheDocument();
    expect(screen.queryByText('新增措施')).not.toBeInTheDocument();
    expect(screen.queryByText('提交完成证据')).not.toBeInTheDocument();
    expect(screen.queryByText('验证关闭')).not.toBeInTheDocument();
  });

  it('shows action submission only to the responsible member', () => {
    getIssue.mockReturnValue({
      data: {
        data: {
          id: 'issue-1',
          title: '救生设备不符合',
          issueType: 'inspection',
          severity: 'major',
          status: 'action_in_progress',
          responsibleUserId: 'manager-1',
          dueAt: '2026-07-20T00:00:00.000Z',
          sources: [],
          availableActions: ['read'],
          capa: {
            id: 'capa-1',
            issueId: 'issue-1',
            status: 'in_progress',
            verifierUserId: 'verifier-1',
            rootCause: { method: 'five_whys', conclusion: '维护周期过长' },
            actions: [{ id: 'action-1', actionType: 'corrective', title: '更换设备', responsibleUserId: 'crew-a', dueAt: '2026-07-20T00:00:00.000Z', status: 'assigned', evidenceFileIds: [], availableActions: ['submit'] }],
          },
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><IssueDetailPage /></MemoryRouter>);

    expect(screen.getByText('提交完成证据')).toBeInTheDocument();
    expect(screen.getByText('上传文件')).toBeInTheDocument();
    expect(screen.queryByText('接受措施')).not.toBeInTheDocument();
    expect(screen.queryByText('验证通过')).not.toBeInTheDocument();
  });

  it('does not render safety template creation to a member without safety management permission', () => {
    mockCurrentUser.mockReturnValue({
      userId: 'crew-1',
      roles: ['all_authenticated', 'crew'],
    });

    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><InspectionTemplatePage /></MemoryRouter>);

    expect(screen.queryByText('新建模板')).toBeNull();
    expect(screen.getByText('你没有管理检查模板的权限。')).toBeInTheDocument();
  });
});
