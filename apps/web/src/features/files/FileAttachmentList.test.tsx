import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileAttachmentList } from './FileAttachmentList';

describe('FileAttachmentList', () => {
  const attachment = { id: 'file-1', fileName: '附件.pdf', mimeType: 'application/pdf', fileSize: 1024 };

  it('requires a business deletion handler and only submits after confirmation', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(<FileAttachmentList files={[attachment]} getUrl={vi.fn()} allowDelete onDelete={onDelete} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: /删\s*除/ }).at(-1)!);
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(attachment));
    expect(onDeleted).toHaveBeenCalledWith(attachment.id);
    expect(await screen.findByText('附件已移除，无其他引用的文件将在 24 小时后回收')).toBeInTheDocument();
  });

  it('shows server failure without reporting successful removal', async () => {
    const onDelete = vi.fn().mockRejectedValue({ data: { message: '权限不足，附件保留' } });
    const onDeleted = vi.fn();
    render(<FileAttachmentList files={[attachment]} getUrl={vi.fn()} allowDelete onDelete={onDelete} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    fireEvent.click(screen.getAllByRole('button', { name: /删\s*除/ }).at(-1)!);
    expect(await screen.findByText('权限不足，附件保留')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('does not expose a generic deletion button without a business handler', () => {
    render(<FileAttachmentList files={[attachment]} getUrl={vi.fn()} allowDelete />);
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

  it('keeps confirmation on the same file after an earlier row disappears', async () => {
    const second = { ...attachment, id: 'file-2', fileName: 'second.pdf' };
    const third = { ...attachment, id: 'file-3', fileName: 'third.pdf' };
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const props = { getUrl: vi.fn(), allowDelete: true, onDelete };
    const { rerender } = render(<FileAttachmentList {...props} files={[attachment, second, third]} />);
    fireEvent.click(screen.getAllByRole('button', { name: '删除' })[1]!);
    rerender(<FileAttachmentList {...props} files={[second, third]} />);
    fireEvent.click(screen.getAllByRole('button', { name: /删\s*除/ }).at(-1)!);
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(second));
  });

  it('opens a bound attachment in the shared preview modal', async () => {
    const getUrl = vi
      .fn()
      .mockResolvedValue('https://oss.example.com/file.pdf');
    render(
      <FileAttachmentList
        files={[
          {
            id: 'file-1',
            fileName: '附件.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
          },
        ]}
        getUrl={getUrl}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '预览' }));

    expect(await screen.findByTitle('附件.pdf 预览')).toHaveAttribute(
      'src',
      'https://oss.example.com/file.pdf',
    );
    expect(getUrl).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'file-1' }),
    );
  });
});
