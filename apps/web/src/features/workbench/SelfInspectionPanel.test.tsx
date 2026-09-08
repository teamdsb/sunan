import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelfInspectionPanel } from './SelfInspectionPanel';
import type { WorkbenchRecordDetail } from './workbenchApi';

const action = vi.fn();
vi.mock('./workbenchApi', () => ({
  usePerformWorkbenchRecordActionMutation: () => [action, { isLoading: false }],
  useUploadWorkbenchRecordAttachmentMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useLazyGetWorkbenchAttachmentDownloadUrlQuery: () => [vi.fn()],
  useGetInspectionPeopleQuery: () => ({ data: { data: [] } }),
}));
vi.mock('../files/FileUploadField', () => ({
  FileUploadField: () => <span>照片上传</span>,
}));
vi.mock('../files/FileAttachmentList', () => ({
  FileAttachmentList: () => <span>照片清单</span>,
}));
const record: WorkbenchRecordDetail = {
  id: 'self-1',
  moduleCode: 'shipping_self_inspection',
  title: '自查',
  summary: '护栏检查',
  status: 'pending_review',
  vesselId: 'v1',
  occurredAt: '2026-09-07T09:00:00+08:00',
  approvalChannel: 'internal',
  externalProcessInstanceId: null,
  externalStatus: null,
  assigneeUserId: 'crew',
  reviewerUserId: 'manager',
  assigneeName: '张船员',
  reviewerName: '李审核',
  steps: [
    {
      stepCode: 'review_close',
      stepName: '审核关闭',
      status: 'in_progress',
      rectificationRequired: true,
      rectificationStatus: 'submitted',
    },
  ],
  attachments: [],
  actionLogs: [],
  payload: {},
  availableActions: ['request_rework', 'close_record'],
};

describe('自查操作区', () => {
  beforeEach(() => {
    action.mockReset();
    action.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });
  it('审核说明必填，并把审核动作及说明发送给后端', async () => {
    render(<SelfInspectionPanel record={record} />);
    fireEvent.click(screen.getByRole('button', { name: '审核通过并关闭' }));
    expect(action).not.toHaveBeenCalled();
    fireEvent.change(
      screen.getByRole('textbox', { name: '审核意见' }),
      { target: { value: '复核照片，整改合格' } },
    );
    fireEvent.click(screen.getByRole('button', { name: '审核通过并关闭' }));
    await waitFor(() =>
      expect(action).toHaveBeenCalledWith({
        recordId: 'self-1',
        data: { actionType: 'close_record', comment: '复核照片，整改合格' },
      }),
    );
    expect(
      screen.queryByRole('button', { name: '提交检查结果' }),
    ).not.toBeInTheDocument();
  });
  it('执行人看到检查操作，不显示审核按钮', () => {
    render(
      <SelfInspectionPanel
        record={{
          ...record,
          status: 'in_progress',
          steps: [
            {
              ...record.steps[0],
              stepCode: 'on_site_inspection',
              stepName: '现场检查',
            },
          ],
          availableActions: ['complete_step', 'upload_attachment'],
        }}
      />,
    );
    expect(
      screen.getByRole('button', { name: '提交检查结果' }),
    ).toBeInTheDocument();
    expect(screen.getByText('照片上传')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '审核通过并关闭' }),
    ).not.toBeInTheDocument();
  });
  it('已关闭记录只读，保留结果和证据查看', () => {
    render(
      <SelfInspectionPanel
        record={{ ...record, status: 'closed', availableActions: [] }}
      />,
    );
    expect(
      screen.getByText('已审核关闭，记录与证据只读，可生成完整打印件。'),
    ).toBeInTheDocument();
    expect(screen.queryByText('照片上传')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('查看检查、整改与审核记录')).toBeInTheDocument();
  });
});
