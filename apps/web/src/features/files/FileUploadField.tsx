import { Alert, Button, Progress, Space, Typography } from 'antd';
import { useRef, useState } from 'react';

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
  const { file, status, progress, error, uploadFile, uploadFromWecom, previewFile } =
    useFileUpload({ category, wecomReady });
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

  return (
    <Space direction="vertical" size={8}>
      <input
        ref={inputRef}
        type="file"
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
          loading={status === 'uploading'}
          onClick={() => inputRef.current?.click()}
        >
          上传文件
        </Button>
        {enableWecomCapture ? (
          <Button onClick={() => void handleWecomUpload()} disabled={!wecomReady}>
            拍照上传
          </Button>
        ) : null}
        {currentFile ? (
          <Button onClick={() => void previewFile(currentFile)}>预览文件</Button>
        ) : null}
      </Space>

      {status === 'uploading' ? <Progress percent={progress} size="small" /> : null}
      {currentFile ? <Typography.Text>{currentFile.fileName}</Typography.Text> : null}
      {error ? (
        <Alert
          type="error"
          message={error}
          showIcon
          action={
            lastSelectedFile ? (
              <Button size="small" onClick={() => void handleNativeUpload(lastSelectedFile)}>
                重试
              </Button>
            ) : undefined
          }
        />
      ) : null}
    </Space>
  );
}
