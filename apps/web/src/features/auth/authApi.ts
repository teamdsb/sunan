import { baseApi } from '../../app/baseApi';
import type { AuthSuccessPayload, CurrentUser, JssdkSignature } from './types';

interface ApiEnvelope<T> {
  data: T;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    wecomCallback: builder.query<
      ApiEnvelope<AuthSuccessPayload>,
      { code: string; state: string }
    >({
      query: ({ code, state }) => ({
        url: '/auth/wecom/callback',
        params: { code, state },
      }),
      providesTags: ['Auth', 'CurrentUser'],
    }),
    refreshToken: builder.mutation<ApiEnvelope<AuthSuccessPayload>, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'CurrentUser'],
    }),
    getCurrentUser: builder.query<ApiEnvelope<CurrentUser>, void>({
      query: () => ({
        url: '/auth/me',
      }),
      providesTags: ['CurrentUser'],
    }),
    getJssdkSignature: builder.query<
      ApiEnvelope<JssdkSignature>,
      { url: string; type: 'corp' | 'agent' }
    >({
      query: ({ url, type }) => ({
        url: '/auth/jssdk/signature',
        params: { url, type },
      }),
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useLazyGetJssdkSignatureQuery,
  useLazyWecomCallbackQuery,
} = authApi;
