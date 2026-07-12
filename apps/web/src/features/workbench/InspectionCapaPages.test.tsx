import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InspectionListPage, IssueCenterPage } from './InspectionCapaPages';

const getInspections = vi.fn();
const getIssues = vi.fn();

vi.mock('../files/FileUploadField', () => ({ FileUploadField: () => <button type="button">上传文件</button> }));
vi.mock('./inspectionCapaApi', () => ({
  useGetInspectionTemplatesQuery: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useCreateInspectionTemplateMutation: () => [vi.fn(), { isLoading: false }],
  useGetInspectionPlansQuery: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useCreateInspectionPlanMutation: () => [vi.fn(), { isLoading: false }],
  useGetInspectionsQuery: () => getInspections(),
  useGetInspectionQuery: () => ({ data: undefined, isLoading: false, isError: true }),
  useSaveInspectionResultMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitInspectionMutation: () => [vi.fn(), { isLoading: false }],
  useSummarizeInspectionMutation: () => [vi.fn(), { isLoading: false }],
  useGetIssuesQuery: () => getIssues(),
  useGetIssueQuery: () => ({ data: undefined, isLoading: false, isError: true }),
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
    getInspections.mockReset(); getIssues.mockReset();
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
});
