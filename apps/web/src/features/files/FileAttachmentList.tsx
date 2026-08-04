import { Button, List, message } from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  FilePreviewModal,
  type PreviewFileDescriptor,
} from './FilePreviewModal';
import { downloadFileFromUrl } from './fileDownload';

export interface AttachmentFileDescriptor extends PreviewFileDescriptor {
  id: string;
}

interface FileAttachmentListProps {
  files: AttachmentFileDescriptor[];
  getUrl: (file: AttachmentFileDescriptor) => Promise<string>;
  emptyText?: string;
  extraActions?: (file: AttachmentFileDescriptor) => ReactNode[];
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '大小未知';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function FileAttachmentList({
  files,
  getUrl,
  emptyText = '暂无附件',
  extraActions,
}: FileAttachmentListProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedFile, setSelectedFile] =
    useState<AttachmentFileDescriptor | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (file: AttachmentFileDescriptor) => {
    setDownloadingId(file.id);
    try {
      const url = await getUrl(file);
      await downloadFileFromUrl(url, file.fileName);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '文件下载失败，请稍后重试',
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      {contextHolder}
      <List
        dataSource={files}
        locale={{ emptyText }}
        renderItem={(file) => (
          <List.Item
            actions={[
              <Button
                key="preview"
                type="link"
                onClick={() => setSelectedFile(file)}
              >
                预览
              </Button>,
              <Button
                key="download"
                type="link"
                loading={downloadingId === file.id}
                onClick={() => void handleDownload(file)}
              >
                下载
              </Button>,
              ...(extraActions?.(file) ?? []),
            ]}
          >
            <List.Item.Meta
              title={file.fileName}
              description={`${file.mimeType || '未知类型'} · ${formatFileSize(file.fileSize)}`}
            />
          </List.Item>
        )}
      />
      <FilePreviewModal
        open={Boolean(selectedFile)}
        file={selectedFile}
        getUrl={() => {
          if (!selectedFile) return Promise.reject(new Error('文件不存在'));
          return getUrl(selectedFile);
        }}
        onClose={() => setSelectedFile(null)}
      />
    </>
  );
}
