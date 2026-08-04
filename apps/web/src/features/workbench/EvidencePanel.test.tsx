import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvidencePanel } from './EvidencePanel';

vi.mock('../files/FileUploadField', () => ({
  FileUploadField: ({
    onChange,
  }: {
    onChange: (file: { id: string }) => void;
  }) => <button onClick={() => onChange({ id: 'file-1' })}>上传文件</button>,
}));
vi.mock('../files/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn().mockResolvedValue({ id: 'signature-file' }),
  }),
}));
vi.mock('./workbenchApi', () => ({
  useLazyGetWorkbenchAttachmentDownloadUrlQuery: () => [vi.fn()],
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
});
