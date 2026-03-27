import axios from 'axios';
import { startTransition, useState } from 'react';

import {
  useCreateFileCallbackMutation,
  useCreateFileFromWecomMutation,
  useCreateFilePresignMutation,
  useLazyGetFileDownloadUrlQuery,
} from './filesApi';
import type { FileCategory, FileRecord } from './types';

export interface UseFileUploadOptions {
  category: FileCategory;
  wecomReady?: boolean;
}

export interface FileUploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  file: FileRecord | null;
  error: string | null;
}

const INITIAL_STATE: FileUploadState = {
  status: 'idle',
  progress: 0,
  file: null,
  error: null,
};

function toErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '上传失败，请稍后重试。';
}

function chooseImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    window.wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: ({ localIds }) => resolve(localIds[0] ?? ''),
      fail: reject,
    });
  });
}

function uploadImage(localId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    window.wx.uploadImage({
      localId,
      isShowProgressTips: 1,
      success: ({ serverId }) => resolve(serverId),
      fail: reject,
    });
  });
}

export function useFileUpload({
  category,
  wecomReady = false,
}: UseFileUploadOptions) {
  const [state, setState] = useState<FileUploadState>(INITIAL_STATE);
  const [createPresign] = useCreateFilePresignMutation();
  const [createCallback] = useCreateFileCallbackMutation();
  const [createFromWecom] = useCreateFileFromWecomMutation();
  const [getDownloadUrl] = useLazyGetFileDownloadUrlQuery();

  const setPartialState = (partial: Partial<FileUploadState>) => {
    startTransition(() => {
      setState((current) => ({ ...current, ...partial }));
    });
  };

  const uploadFile = async (file: File): Promise<FileRecord | null> => {
    try {
      setPartialState({
        status: 'uploading',
        progress: 0,
        error: null,
      });

      const presign = await createPresign({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        category,
      }).unwrap();

      await axios.put(presign.data.uploadUrl, file, {
        headers: presign.data.headers,
        onUploadProgress: (event) => {
          const total = event.total ?? file.size;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          setPartialState({ progress });
        },
      });

      const callback = await createCallback({
        ossKey: presign.data.ossKey,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        category,
      }).unwrap();

      setPartialState({
        status: 'success',
        progress: 100,
        file: callback.data,
      });

      return callback.data;
    } catch (error) {
      setPartialState({
        status: 'error',
        error: toErrorMessage(error),
      });
      return null;
    }
  };

  const uploadFromWecom = async (): Promise<FileRecord | null> => {
    if (!wecomReady) {
      setPartialState({
        status: 'error',
        error: '企业微信能力尚未就绪。',
      });
      return null;
    }

    if (!window.wx) {
      setPartialState({
        status: 'error',
        error: '企业微信 JS-SDK 未注入。',
      });
      return null;
    }

    try {
      setPartialState({
        status: 'uploading',
        progress: 10,
        error: null,
      });

      const localId = await chooseImage();
      const mediaId = await uploadImage(localId);
      const response = await createFromWecom({ mediaId, category }).unwrap();

      setPartialState({
        status: 'success',
        progress: 100,
        file: response.data,
      });

      return response.data;
    } catch (error) {
      setPartialState({
        status: 'error',
        error: toErrorMessage(error),
      });
      return null;
    }
  };

  const previewFile = async (file: FileRecord): Promise<void> => {
    if (!window.wx) {
      throw new Error('企业微信 JS-SDK 未注入。');
    }

    const response = await getDownloadUrl({ ossKey: file.ossKey }).unwrap();
    window.wx.previewFile({
      url: response.data.downloadUrl,
      name: file.fileName,
    });
  };

  const reset = () => {
    setState(INITIAL_STATE);
  };

  return {
    ...state,
    reset,
    previewFile,
    uploadFile,
    uploadFromWecom,
  };
}
