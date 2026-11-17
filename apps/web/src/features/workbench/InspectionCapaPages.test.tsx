import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InspectionDetailPage,
  InspectionListPage,
  InspectionPlanPage,
  InspectionTemplatePage,
  IssueCenterPage,
  IssueDetailPage,
} from './InspectionCapaPages';

const getTemplates = vi.fn();
const getVersions = vi.fn();
const getPlans = vi.fn();
const publish = vi.fn();
const generate = vi.fn();
const getInspections = vi.fn();
const getInspection = vi.fn();
const getIssues = vi.fn();
const getIssue = vi.fn();
const getInspectionDownloadUrl = vi.fn();
const getCapaDownloadUrl = vi.fn();
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
  useGetInspectionTemplatesQuery: () => getTemplates(),
  useGetInspectionTemplateVersionsQuery: () => getVersions(),
  usePublishInspectionTemplateVersionMutation: () => [publish, { isLoading: false }],
  useGenerateInspectionPlanMutation: () => [generate, { isLoading: false }],
  useCreateInspectionTemplateMutation: () => [vi.fn(), { isLoading: false }],
  useGetInspectionPlansQuery: () => getPlans(),
  useCreateInspectionPlanMutation: () => [vi.fn(), { isLoading: false }],
  useGetInspectionsQuery: () => getInspections(),
  useGetInspectionQuery: () => getInspection(),
  useSaveInspectionResultMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitInspectionMutation: () => [vi.fn(), { isLoading: false }],
  useLazyGetInspectionFileDownloadUrlQuery: () => [getInspectionDownloadUrl],
  useLazyGetCapaActionFileDownloadUrlQuery: () => [getCapaDownloadUrl],
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
    getTemplates.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false });
    getVersions.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false });
    getPlans.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false });
    publish.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
    generate.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ data: { createdCount: 1, failedCount: 0 } }) });
    getInspections.mockReset(); getInspection.mockReset(); getIssues.mockReset(); getIssue.mockReset();
    getInspection.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    getIssue.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    getInspectionDownloadUrl.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ data: { downloadUrl: 'https://storage.test/inspection-photo' } }) });
    getCapaDownloadUrl.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ data: { downloadUrl: 'https://storage.test/capa-photo' } }) });
    mockCurrentUser.mockReturnValue({
      userId: 'shipping-1',
      roles: ['all_authenticated', 'shipping'],
    });
  });

  it('publishes a visible draft and offers inspection generation for the selected window', async () => {
    getTemplates.mockReturnValue({ data: { data: [{ id: 'template', code: 'LSA', name: '救生检查', sourceType: 'company', currentVersionId: null }] } });
    getVersions.mockReturnValue({ data: { data: [{ id: 'draft', versionNo: 1, status: 'draft' }] } });
    const view = render(<MemoryRouter><InspectionTemplatePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '发布版本 V1' }));
    await waitFor(() => expect(publish).toHaveBeenCalledWith('draft'));
    getPlans.mockReturnValue({ data: { data: [{ id: 'plan', planId: 'generic-plan', title: '本月救生检查' }] } });
    view.rerender(<MemoryRouter><InspectionPlanPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '生成检查任务' }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith(expect.objectContaining({ id: 'plan', windowStart: expect.any(String), windowEnd: expect.any(String) })));
    expect(screen.getByRole('link', { name: '进入现场检查' })).toHaveAttribute('href', '/workbench/inspections');
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

  it('previews saved inspection evidence and signatures through the inspection download route', async () => {
    getInspection.mockReturnValue({ data: { data: {
      id: 'inspection-1', taskId: 'task-1', status: 'submitted', templateVersionId: 'version-1',
      templateSnapshot: { items: [{ snapshotKey: 'item-1', title: '救生设备', resultRequired: true, evidenceRequiredOnFailure: true }] },
      results: [{ id: 'result-1', inspectorUserId: 'crew-a', templateItemSnapshotKey: 'item-1', conclusion: 'nonconforming', status: 'submitted',
        evidenceFiles: [{ id: 'photo-1', fileName: '现场证据.jpg', mimeType: 'image/jpeg', fileSize: 100 }],
        signatureFile: { id: 'signature-1', fileName: '签认照片.jpg', mimeType: 'image/jpeg', fileSize: 100 } }],
      availableActions: ['read'],
    } }, isLoading: false, isError: false });
    render(<MemoryRouter initialEntries={['/inspections/inspection-1']}><Routes><Route path="/inspections/:inspectionId" element={<InspectionDetailPage />} /></Routes></MemoryRouter>);
    expect(screen.getByText('现场证据.jpg')).toBeInTheDocument();
    expect(screen.getByText('签认照片.jpg')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '预览' })[0]!);
    await waitFor(() => expect(getInspectionDownloadUrl).toHaveBeenCalledWith({ inspectionId: 'inspection-1', fileId: 'photo-1' }));
    expect(await screen.findByRole('img', { name: '现场证据.jpg' })).toHaveAttribute('src', 'https://storage.test/inspection-photo');
  });

  it('lets a verifier inspect submitted CAPA photos through the action download route', async () => {
    getIssue.mockReturnValue({ data: { data: {
      id: 'issue-1', title: '证据复核', issueType: 'inspection', severity: 'minor', status: 'pending_verification',
      responsibleUserId: 'crew-a', dueAt: '2026-12-01T00:00:00.000Z', sources: [], availableActions: ['read', 'verify'],
      capa: { id: 'capa-1', issueId: 'issue-1', status: 'pending_verification', verifierUserId: 'verifier', actions: [{
        id: 'action-1', actionType: 'corrective', title: '更换设备', responsibleUserId: 'crew-a', dueAt: '2026-12-01T00:00:00.000Z', status: 'accepted',
        evidenceFileIds: ['photo-1'], evidenceFiles: [{ id: 'photo-1', fileName: '整改证据.jpg', mimeType: 'image/jpeg', fileSize: 100 }], availableActions: [],
      }] },
    } }, isLoading: false, isError: false });
    render(<MemoryRouter initialEntries={['/issues/issue-1']}><Routes><Route path="/issues/:issueId" element={<IssueDetailPage />} /></Routes></MemoryRouter>);
    expect(screen.getByText('整改证据.jpg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    await waitFor(() => expect(getCapaDownloadUrl).toHaveBeenCalledWith({ actionId: 'action-1', fileId: 'photo-1' }));
    expect(await screen.findByRole('img', { name: '整改证据.jpg' })).toHaveAttribute('src', 'https://storage.test/capa-photo');
  });
});
