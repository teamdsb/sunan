import { baseApi } from '../../app/baseApi';
import type {
  ApiEnvelope,
  FileCategory,
  FileDownloadPayload,
  FilePolicy,
  FilePresignPayload,
  FileRecord,
} from './types';

export const filesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFilePolicy: builder.query<ApiEnvelope<FilePolicy>, FileCategory>({
      query: (category) => ({
        url: `/files/policies/${encodeURIComponent(category)}`,
      }),
      providesTags: ['File'],
    }),
    createFilePresign: builder.mutation<
      ApiEnvelope<FilePresignPayload>,
      {
        fileName: string;
        mimeType: string;
        fileSize: number;
        category: FileCategory;
      }
    >({
      query: (body) => ({
        url: '/files/presign',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['File'],
    }),
    createFileCallback: builder.mutation<
      ApiEnvelope<FileRecord>,
      {
        ossKey: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        category: FileCategory;
      }
    >({
      query: (body) => ({
        url: '/files/callback',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['File'],
    }),
    getFileDownloadUrl: builder.query<
      ApiEnvelope<FileDownloadPayload>,
      { ossKey: string }
    >({
      query: ({ ossKey }) => ({
        url: `/files/${encodeURIComponent(ossKey)}/download-url`,
      }),
      providesTags: ['File'],
    }),
    createFileFromWecom: builder.mutation<
      ApiEnvelope<FileRecord>,
      { mediaId: string; category: FileCategory }
    >({
      query: (body) => ({
        url: '/files/from-wecom',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['File'],
    }),
  }),
});

export const {
  useGetFilePolicyQuery,
  useCreateFileCallbackMutation,
  useCreateFileFromWecomMutation,
  useCreateFilePresignMutation,
  useLazyGetFileDownloadUrlQuery,
} = filesApi;
