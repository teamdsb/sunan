export type FileCategory =
  | 'certificates'
  | 'enterprise-profiles'
  | 'enterprise-policies'
  | 'inspection-photos'
  | 'meeting-records'
  | 'procurement-attachments'
  | 'workbench-attachments';

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
  mimeType: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface FilePolicy {
  category: FileCategory;
  maxSize: number;
  extensions: string[];
  accept: string;
  mimeTypes: Record<string, string>;
}

export interface FileDownloadPayload {
  downloadUrl: string;
  expiresAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
}
