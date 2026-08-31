import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ReminderDashboardSummary {
  totalPending: number;
  totalOverdue: number;
  totalAcknowledged: number;
  byOwnerType: Array<{ ownerType: string; count: number }>;
  byCertificateType: Array<{ certificateTypeName: string; count: number }>;
}

export interface ReminderItem {
  id: string;
  certificateId: string;
  certificateTitle: string;
  certificateTypeId?: string;
  certificateTypeName?: string;
  certificateNo?: string | null;
  issueDate?: string | null;
  expiryDate?: string;
  ownerType: 'vessel' | 'vehicle' | 'personnel' | 'equipment';
  ownerName: string;
  recipientUserId: string;
  reminderType: 'upcoming' | 'overdue';
  status: 'pending' | 'dispatching' | 'sent' | 'acknowledged' | 'failed';
  scheduledDate: string;
  daysBeforeExpiry: number;
  sentAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  files?: Array<{
    id: string;
    fileName: string;
    ossKey: string;
    mimeType: string;
    fileSize: number;
  }>;
}

export interface ReminderListQuery {
  page?: number;
  pageSize?: number;
  status?: ReminderItem['status'];
  reminderType?: ReminderItem['reminderType'];
  ownerType?: ReminderItem['ownerType'];
}

export interface ReminderScanJob {
  jobId: string;
  acceptedAt: string;
}

export interface ReminderScanJobStatus extends ReminderScanJob {
  source: 'manual' | 'cron';
  status: 'queued' | 'running' | 'retryable' | 'completed' | 'failed';
  startedAt: string | null;
  finishedAt: string | null;
  createdCount: number;
  sentCount: number;
  failedCount: number;
  error: string | null;
  retryCount: number;
}

type ReminderEnvelope<T> = ApiEnvelope<T>;

function toReminderTags(reminders?: ReminderItem[]) {
  return reminders ? reminders.map((reminder) => ({ type: 'Reminder' as const, id: reminder.id })) : [];
}

export const reminderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReminderDashboard: builder.query<ReminderEnvelope<ReminderDashboardSummary>, void>({
      query: () => ({ url: '/certificate-reminders/dashboard' }),
      providesTags: ['ReminderDashboard'],
      keepUnusedDataFor: 600,
    }),
    getReminderList: builder.query<ReminderEnvelope<ReminderItem[]>, ReminderListQuery | void>({
      query: (params) => ({ url: '/certificate-reminders', params }),
      providesTags: (result) => ['Reminder', ...toReminderTags(result?.data)],
      keepUnusedDataFor: 60,
    }),
    getReminderById: builder.query<ReminderEnvelope<ReminderItem>, string>({
      query: (id) => ({ url: `/certificate-reminders/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Reminder', id }, 'Reminder'],
      keepUnusedDataFor: 60,
    }),
    acknowledgeReminder: builder.mutation<ReminderEnvelope<ReminderItem>, { id: string; comment?: string }>({
      query: ({ id, comment }) => ({
        url: `/certificate-reminders/${id}/acknowledge`,
        method: 'POST',
        data: comment ? { comment } : undefined,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            reminderApi.util.updateQueryData('getReminderById', id, (draft) => {
              draft.data = data.data;
            }),
          );
        } catch {
          // Let the page decide how to handle 409/other failures.
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'Reminder', id: arg.id }, 'Reminder', 'ReminderDashboard'],
    }),
    triggerReminderScan: builder.mutation<ReminderEnvelope<ReminderScanJob>, void>({
      query: () => ({ url: '/certificate-reminders/actions/scan', method: 'POST' }),
      invalidatesTags: ['ReminderDashboard', 'Reminder'],
    }),
    getReminderScanJob: builder.query<ReminderEnvelope<ReminderScanJobStatus | null>, string>({
      query: (jobId) => ({ url: `/certificate-reminders/actions/scan/${jobId}` }),
    }),
  }),
});

export const {
  useGetReminderDashboardQuery,
  useGetReminderListQuery,
  useGetReminderByIdQuery,
  useAcknowledgeReminderMutation,
  useTriggerReminderScanMutation,
  useGetReminderScanJobQuery,
} = reminderApi;
