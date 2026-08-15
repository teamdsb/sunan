import { Alert, Button, Progress, Space, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';

import { downloadFileFromUrl } from './fileDownload';
import { FilePreviewModal } from './FilePreviewModal';
import type { FileCategory, FileRecord } from './types';
import { useFileUpload } from './useFileUpload';

interface FileUploadFieldProps {
  category: FileCategory;
  value?: FileRecord | null;
  onChange?: (file: FileRecord | null) => void;
  enableWecomCapture?: boolean;
  wecomReady?: boolean;
}

export function FileUploadField({
  category,
  value = null,
  onChange,
  enableWecomCapture = false,
  wecomReady = false,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const {
    file,
    status,
    progress,
    error,
    policy,
    isPolicyLoading,
    policyError,
    refetchPolicy,
    uploadFile,
    uploadFromWecom,
    getFileDownloadUrl,
  } = useFileUpload({ category, wecomReady });
  const currentFile = value ?? file;

  const handleNativeUpload = async (selectedFile: File | null) => {
    if (!selectedFile) {
      return;
    }

    setLastSelectedFile(selectedFile);
    const uploaded = await uploadFile(selectedFile);
    if (uploaded) {
      onChange?.(uploaded);
    }
  };

  const handleWecomUpload = async () => {
    const uploaded = await uploadFromWecom();
    if (uploaded) {
      onChange?.(uploaded);
    }
  };

  const handleDownload = async () => {
    if (!currentFile) {
      return;
    }

    setDownloading(true);
    setDownloadError(null);
    try {
      const downloadUrl = await getFileDownloadUrl(currentFile);
      await downloadFileFromUrl(downloadUrl, currentFile.fileName);
    } catch (downloadFailure) {
      setDownloadError(
        downloadFailure instanceof Error
          ? downloadFailure.message
          : '文件下载失败，请稍后重试',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {policy ? (
        <Alert
          type="info"
          showIcon
          message="上传前请确认"
          description={
            <Space direction="vertical" size={2}>
              <Typography.Text>
                支持格式：
                {policy.extensions.map((item) => item.toUpperCase()).join('、')}
              </Typography.Text>
              <Typography.Text>
                单个文件不超过 {Math.round(policy.maxSize / 1024 / 1024)}MB
              </Typography.Text>
            </Space>
          }
        />
      ) : null}
      {policyError ? (
        <Alert
          type="error"
          showIcon
          message={policyError}
          action={
            <Button size="small" onClick={() => void refetchPolicy()}>
              重新加载
            </Button>
          }
        />
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={policy?.accept}
        hidden
        data-testid="file-input"
        onChange={(event) => {
          void handleNativeUpload(event.target.files?.[0] ?? null);
          event.currentTarget.value = '';
        }}
      />

      <Space wrap>
        <Button
          type="primary"
          loading={status === 'uploading' || isPolicyLoading}
          disabled={!policy || Boolean(policyError)}
          onClick={() => inputRef.current?.click()}
        >
          上传文件
        </Button>
        {enableWecomCapture ? (
          <Button
            onClick={() => void handleWecomUpload()}
            disabled={!wecomReady}
          >
            拍照上传
          </Button>
        ) : null}
        {currentFile ? (
          <Button onClick={() => setPreviewOpen(true)}>预览文件</Button>
        ) : null}
        {currentFile ? (
          <Button
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={() => void handleDownload()}
          >
            下载文件
          </Button>
        ) : null}
      </Space>

      {status === 'uploading' ? (
        <Progress percent={progress} size="small" />
      ) : null}
      {currentFile ? (
        <Typography.Text>{currentFile.fileName}</Typography.Text>
      ) : null}
      {error ? (
        <Alert
          type="error"
          message={error}
          showIcon
          action={
            lastSelectedFile ? (
              <Button
                size="small"
                onClick={() => void handleNativeUpload(lastSelectedFile)}
              >
                重试
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {downloadError ? (
        <Alert type="error" message={downloadError} showIcon />
      ) : null}
      <FilePreviewModal
        open={previewOpen}
        file={currentFile}
        getUrl={() => {
          if (!currentFile) return Promise.reject(new Error('文件不存在'));
          return getFileDownloadUrl(currentFile);
        }}
        onClose={() => setPreviewOpen(false)}
      />
    </Space>
  );
}
