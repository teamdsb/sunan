import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> { data: T }

export interface UserSettings {
  id: string;
  userId: string;
  defaultModule: 'my';
  reminderViewMode: 'dashboard' | 'list';
  certificateGroupBy: 'owner' | 'type';
  enablePushNotifications: boolean;
  theme: 'light';
  updatedAt: string;
}

export interface NotificationConfigView {
  corpId: string;
  mainCorpId: string;
  mainAgentId: string;
  configured: boolean;
  source: 'env_main' | 'admin_override';
  agentId: string;
  configVersion: number;
  secretStored: boolean;
  encryptionKeyAvailable: boolean;
  configurationError: boolean;
  encryptionKeyRotationAvailable: boolean;
  updatedAt: string | null;
}

export interface NotificationDelivery {
  id: string;
  sourceType: string;
  sourceId: string;
  recipientUserId: string;
  agentId: string | null;
  configSource: 'env_main' | 'admin_override' | 'test_draft' | 'unresolved';
  configVersion: number | null;
  status: 'sending' | 'sent' | 'failed' | 'uncertain' | 'skipped';
  attemptCount: number;
  wecomErrcode: number | null;
  attemptHistory: Array<Record<string, unknown>>;
  failureReason: string | null;
  reconciledBy: string | null;
  reconciledAt: string | null;
  updatedAt: string;
}

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<ApiEnvelope<UserSettings>, void>({
      query: () => ({ url: '/settings' }),
      providesTags: ['UserSettings'],
    }),
    updateSettings: builder.mutation<ApiEnvelope<UserSettings>, Partial<UserSettings>>({
      query: (data) => ({ url: '/settings', method: 'PATCH', data }),
      invalidatesTags: ['UserSettings', 'Certificate', 'ReminderDashboard'],
    }),
    getNotificationConfig: builder.query<ApiEnvelope<NotificationConfigView>, void>({
      query: () => ({ url: '/settings/notification' }),
      providesTags: ['NotificationConfig'],
    }),
    updateNotificationConfig: builder.mutation<ApiEnvelope<NotificationConfigView>, Record<string, unknown>>({
      query: (data) => ({ url: '/settings/notification', method: 'PATCH', data }),
      invalidatesTags: ['NotificationConfig'],
    }),
    rotateNotificationEncryptionKey: builder.mutation<ApiEnvelope<{ rotated: boolean; configVersion: number }>, void>({
      query: () => ({ url: '/settings/notification/encryption-key/rotate', method: 'POST' }),
      invalidatesTags: ['NotificationConfig'],
    }),
    testNotificationConnection: builder.mutation<ApiEnvelope<Record<string, unknown>>, Record<string, unknown>>({
      query: (data) => ({ url: '/settings/notification/connection-test', method: 'POST', data }),
    }),
    sendNotificationDraftTest: builder.mutation<ApiEnvelope<Record<string, unknown>>, Record<string, unknown>>({
      query: (data) => ({ url: '/settings/notification/draft-test', method: 'POST', data }),
      invalidatesTags: ['NotificationDelivery'],
    }),
    getNotificationDeliveries: builder.query<ApiEnvelope<NotificationDelivery[]>, void>({
      query: () => ({ url: '/settings/notification/deliveries' }),
      providesTags: ['NotificationDelivery'],
    }),
    reconcileNotificationDelivery: builder.mutation<ApiEnvelope<unknown>, { id: string; delivered: boolean }>({
      query: ({ id, delivered }) => ({ url: `/settings/notification/deliveries/${id}/reconcile`, method: 'POST', data: { delivered } }),
      invalidatesTags: ['NotificationDelivery'],
    }),
    retryNotificationDelivery: builder.mutation<ApiEnvelope<Record<string, unknown>>, string>({
      query: (id) => ({ url: `/settings/notification/deliveries/${id}/retry`, method: 'POST' }),
      invalidatesTags: ['NotificationDelivery'],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useGetNotificationConfigQuery,
  useUpdateNotificationConfigMutation,
  useRotateNotificationEncryptionKeyMutation,
  useTestNotificationConnectionMutation,
  useSendNotificationDraftTestMutation,
  useGetNotificationDeliveriesQuery,
  useReconcileNotificationDeliveryMutation,
  useRetryNotificationDeliveryMutation,
} = settingsApi;

