import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FileAttachmentList } from './FileAttachmentList';

describe('FileAttachmentList', () => {
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
