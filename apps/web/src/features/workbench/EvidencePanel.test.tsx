import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvidencePanel } from './EvidencePanel';

const getAttachmentDownloadUrl = vi.fn();
const downloadFile = vi.fn();
vi.mock('../files/fileDownload', () => ({ downloadFileFromUrl: (...args: unknown[]) => downloadFile(...args) }));

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: ({
    onChange,
    value,
  }: {
    onChange: (file: { id: string }) => void;
    value?: { id: string } | null;
  }) => <><button onClick={() => onChange({ id: 'file-1' })}>上传文件</button>{value ? <span data-testid="pending-file">{value.id}</span> : null}</>,
}));
vi.mock('../files/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn().mockResolvedValue({ id: 'signature-file' }),
  }),
}));
vi.mock('./workbenchApi', () => ({
  useLazyGetWorkbenchAttachmentDownloadUrlQuery: () => [getAttachmentDownloadUrl],
}));

describe('EvidencePanel', () => {
  it('binds an uploaded file and saves a canvas signature hash', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const onSignature = vi.fn().mockResolvedValue(undefined);
    render(
      <EvidencePanel
        recordId="record-1"
        summary="摘要"
        attachments={[]}
        onUpload={onUpload}
        onSignature={onSignature}
        onLocation={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '上传文件' }));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file-1' }),
      ),
    );
    await waitFor(() => expect(screen.queryByTestId('pending-file')).not.toBeInTheDocument());
    HTMLCanvasElement.prototype.toBlob = (callback) =>
      callback(new Blob(['signature'], { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: '确认并保存签名' }));
    await waitFor(() =>
      expect(onSignature).toHaveBeenCalledWith(
        'signature-file',
        expect.stringMatching(/^[a-f0-9]{64}$/),
      ),
    );
  });

  it('shows a saved signature and downloads it through its business record', async () => {
    getAttachmentDownloadUrl.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ data: { downloadUrl: 'https://synthetic.invalid/signature' } }) });
    render(<EvidencePanel recordId="record-1" summary="摘要" attachments={[]} signatureEvidence={[{ id: 'evidence-1', category: 'signature', fileId: 'signature-file', fileName: '已保存签名.png', mimeType: 'image/png', fileSize: 100, uploadedAt: '2026-11-17T00:00:00Z' }]} onUpload={vi.fn()} onSignature={vi.fn()} onLocation={vi.fn()} />);
    expect(screen.getByText('已保存签名.png')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下载' }));
    await waitFor(() => expect(getAttachmentDownloadUrl).toHaveBeenCalledWith({ recordId: 'record-1', fileId: 'signature-file' }));
    await waitFor(() => expect(downloadFile).toHaveBeenCalledWith('https://synthetic.invalid/signature', '已保存签名.png'));
  });

  it('keeps a failed attachment binding available for retry and clears it after success', async () => {
    const onUpload = vi.fn().mockRejectedValueOnce(new Error('synthetic bind failure')).mockResolvedValue(undefined);
    render(<EvidencePanel recordId="record-1" summary="摘要" attachments={[]} onUpload={onUpload} onSignature={vi.fn()} onLocation={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '上传文件' }));
    await screen.findByRole('button', { name: '重试关联附件' });
    expect(screen.getByTestId('pending-file')).toHaveTextContent('file-1');
    fireEvent.click(screen.getByRole('button', { name: '重试关联附件' }));
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('pending-file')).not.toBeInTheDocument());
  });
});
