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
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;

