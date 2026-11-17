import {
  Alert,
  Button,
  Divider,
  Input,
  Space,
  Typography,
  message,
} from 'antd';
import { useRef, useState } from 'react';
import { FileUploadField } from '../files/FileUploadField';
import { FileAttachmentList } from '../files/FileAttachmentList';
import type { FileRecord } from '../files/types';
import {
  type WorkbenchAttachment,
  useLazyGetWorkbenchAttachmentDownloadUrlQuery,
} from './workbenchApi';
import { useFileUpload } from '../files/useFileUpload';

export function EvidencePanel({
  recordId,
  summary,
  attachments,
  signatureEvidence = [],
  onUpload,
  onSignature,
  onLocation,
}: {
  recordId: string;
  summary: string;
  attachments: WorkbenchAttachment[];
  signatureEvidence?: WorkbenchAttachment[];
  onUpload: (file: FileRecord) => Promise<void>;
  onSignature: (fileId: string, hash: string) => Promise<void>;
  onLocation: (body: {
    captureStatus: string;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    failureReason?: string;
    addressText?: string;
  }) => Promise<void>;
}) {
  const [messageApi, holder] = message.useMessage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [locationError, setLocationError] = useState('');
  const [addressText, setAddressText] = useState('');
  const [pendingFile, setPendingFile] = useState<FileRecord | null>(null);
  const [binding, setBinding] = useState(false);
  const [bindError, setBindError] = useState('');
  const { uploadFile } = useFileUpload({ category: 'workbench-attachments' });
  const [getAttachmentDownloadUrl] =
    useLazyGetWorkbenchAttachmentDownloadUrlQuery();
  const bindFile = async (file: FileRecord) => {
    setBinding(true);
    setBindError('');
    try {
      await onUpload(file);
      setPendingFile((current) => current?.id === file.id ? null : current);
      messageApi.success('附件已关联');
    } catch {
      setBindError('附件关联失败，请重试');
    } finally { setBinding(false); }
  };
  const fileUrl = async (file: { id: string }) => {
    const response = await getAttachmentDownloadUrl({ recordId, fileId: file.id }).unwrap();
    return response.data.downloadUrl;
  };
  const hash = async () => {
    if (!crypto?.subtle) return '0'.repeat(64);
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(summary),
        ),
      ),
    )
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
  };
  return (
    <>
      <>{holder}</>
      <Typography.Title level={5}>证据与附件</Typography.Title>
      <FileUploadField
        category="workbench-attachments"
        enableWecomCapture
        wecomReady={Boolean(window.wx)}
        value={pendingFile}
        onChange={(file) => {
          setPendingFile(file);
          if (file) void bindFile(file);
        }}
      />
      {bindError && pendingFile ? <Alert type="error" message={bindError} action={<Button loading={binding} onClick={() => void bindFile(pendingFile)}>重试关联附件</Button>} /> : null}
      <FileAttachmentList
        files={attachments.map((item) => ({
          id: item.fileId,
          fileName: item.fileName,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
        }))}
        getUrl={fileUrl}
      />
      <Divider />
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>手写签名</Typography.Text>
        <FileAttachmentList files={signatureEvidence.map((item) => ({ id: item.fileId, fileName: item.fileName, mimeType: item.mimeType, fileSize: item.fileSize }))} getUrl={fileUrl} emptyText="暂无已保存签名" />
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          style={{ border: '1px solid #91caff', touchAction: 'none' }}
          onPointerDown={(e) => {
            drawing.current = true;
            const c = canvasRef.current!;
            const x = e.nativeEvent.offsetX;
            const y = e.nativeEvent.offsetY;
            c.getContext('2d')?.moveTo(x, y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const c = canvasRef.current!;
            const ctx = c.getContext('2d');
            ctx?.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            if (ctx) {
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
        />
        <Space>
          <Button
            onClick={() =>
              canvasRef.current?.getContext('2d')?.clearRect(0, 0, 480, 160)
            }
          >
            清空
          </Button>
          <Button
            type="primary"
            onClick={() =>
              canvasRef.current?.toBlob((blob) => {
                if (!blob) return;
                void uploadFile(
                  new File([blob], 'signature.png', { type: 'image/png' }),
                ).then(async (file) => {
                  if (file) await onSignature(file.id, await hash());
                });
              })
            }
          >
            确认并保存签名
          </Button>
        </Space>
      </Space>
      <Divider />
      <Space direction="vertical">
        <Typography.Text>定位证据</Typography.Text>
        <Button
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) =>
                void onLocation({
                  captureStatus: 'captured',
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                  accuracyMeters: p.coords.accuracy,
                }),
              (e) => setLocationError(e.message),
            )
          }
        >
          采集定位
        </Button>
        <Input
          placeholder="无法定位时，输入手动地图地址/链接"
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
        />
        {locationError ? (
          <Alert
            type="warning"
            message="定位未成功"
            description={
              <Space>
                <span>{locationError}</span>
                <Button
                  size="small"
                  onClick={() =>
                    void onLocation({
                      captureStatus: 'manual',
                      failureReason: locationError,
                      addressText,
                    })
                  }
                >
                  保存手动位置说明
                </Button>
              </Space>
            }
          />
        ) : null}
      </Space>
    </>
  );
}
