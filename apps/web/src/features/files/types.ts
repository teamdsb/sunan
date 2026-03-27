export type FileCategory =
  | 'certificates'
  | 'enterprise-profiles'
  | 'enterprise-policies'
  | 'inspection-photos'
  | 'meeting-records';

export interface FileRecord {
  id: string;
  ossKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  downloadUrl: string;
  createdAt: string;
}

export interface FilePresignPayload {
  uploadUrl: string;
  ossKey: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface FileDownloadPayload {
  downloadUrl: string;
  expiresAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
}
