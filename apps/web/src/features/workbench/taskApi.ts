import { baseApi } from '../../app/baseApi';

export type TaskActionType =
  | 'start' | 'complete' | 'block' | 'reschedule' | 'cancel'
  | 'remind' | 'escalate' | 'delegate' | 'transfer';

export type Task = {
  id: string;
  title: string;
  status: string;
  responsibleUserId: string;
  scheduledAt: string;
  dueAt: string;
  isOverdue: boolean;
  availableActions?: TaskActionType[];
};

export type PlanItemInput = {
  title: string;
  responsibleUserId: string;
  participantUserIds?: string[];
  completionRule: 'all' | 'any' | 'quorum';
  quorumCount?: number;
  dueOffsetMinutes: number;
  recurrence: {
    kind: 'annual' | 'monthly' | 'periodic' | 'one_time';
    startAt: string;
    month?: number;
    dayOfMonth?: number;
    intervalDays?: number;
  };
  enabled?: boolean;
};

export type Plan = {
  id: string;
  title: string;
  planType: 'annual' | 'monthly' | 'periodic' | 'one_time';
  status: string;
  completionRate?: number;
  ownerUserId: string;
  vesselId?: string | null;
  items?: Array<PlanItemInput & { id: string; ruleVersion: number }>;
};

export type NotificationDelivery = {
  id: string;
  messageType: string;
  status: string;
  attemptCount: number;
  failureReason?: string | null;
  sentAt?: string | null;
};

export type TaskDetail = Task & {
  participants: Array<{ id: string; userId: string; role: string; status: string; completedAt?: string | null }>;
  actionLogs: Array<{ id: string; actionType: string; createdAt: string; reason?: string }>;
  transfers: Array<{ id: string; fromUserId: string; toUserId: string; reason: string; createdAt: string }>;
  delegations: Array<{ id: string; delegatorUserId: string; delegateUserId: string; effectiveUntil: string; status: string }>;
  notificationDeliveries: NotificationDelivery[];
};

export type GenerationRun = { id: string; status: string; mode: string; createdCount: number; skippedCount: number; failedCount: number; requestedAt: string; failureMessage?: string | null };

export type TaskActionInput = {
  id: string;
  actionType: TaskActionType;
  reason?: string;
  scheduledAt?: string;
  dueAt?: string;
  recipientUserId?: string;
  delegateUserId?: string;
  delegateUntil?: string;
  transferToUserId?: string;
};

export const taskApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPlans: build.query<{ data: Plan[] }, void>({
      query: () => ({ url: '/plans' }),
      providesTags: ['Workbench'],
    }),
    getPlan: build.query<{ data: Plan }, string>({
      query: (id) => ({ url: `/plans/${id}` }),
      providesTags: ['Workbench'],
    }),
    createPlan: build.mutation<{ data: Plan }, { title: string; planType: Plan['planType']; timeZone: string }>({
      query: (data) => ({ url: '/plans', method: 'POST', data }),
      invalidatesTags: ['Workbench'],
    }),
    addPlanItem: build.mutation<{ data: PlanItemInput & { id: string } }, { planId: string; item: PlanItemInput }>({
      query: ({ planId, item }) => ({ url: `/plans/${planId}/items`, method: 'POST', data: item }),
      invalidatesTags: ['Workbench'],
    }),
    planAction: build.mutation<{ data: Plan }, { id: string; actionType: string; reason?: string }>({
      query: ({ id, ...data }) => ({ url: `/plans/${id}/actions`, method: 'POST', data }),
      invalidatesTags: ['Workbench'],
    }),
    generatePlan: build.mutation<{ data: unknown }, { id: string; windowStart: string; windowEnd: string; mode?: 'generate' | 'reconcile' }>({
      query: ({ id, ...data }) => ({
        url: `/plans/${id}/generation-runs`,
        method: 'POST',
        data,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
      invalidatesTags: ['Workbench'],
    }),
    getGenerationRuns: build.query<{ data: GenerationRun[] }, string>({
      query: (id) => ({ url: `/plans/${id}/generation-runs` }),
      providesTags: ['Workbench'],
    }),
    getTasks: build.query<{ data: Task[]; meta?: { total: number } }, { view: string; startAt?: string; endAt?: string; pageSize?: number }>({
      query: (params) => ({ url: '/tasks', params }),
      providesTags: ['Workbench'],
    }),
    getTask: build.query<{ data: TaskDetail }, string>({
      query: (id) => ({ url: `/tasks/${id}` }),
      providesTags: ['Workbench'],
    }),
    performTaskAction: build.mutation<{ data: TaskDetail }, TaskActionInput>({
      query: ({ id, ...data }) => ({
        url: `/tasks/${id}/actions`,
        method: 'POST',
        data,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
      invalidatesTags: ['Workbench'],
    }),
    retryTaskDelivery: build.mutation<{ data: NotificationDelivery }, { taskId: string; deliveryId: string }>({
      query: ({ taskId, deliveryId }) => ({
        url: `/tasks/${taskId}/notification-deliveries/${deliveryId}/retry`,
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
      invalidatesTags: ['Workbench'],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetPlanQuery,
  useCreatePlanMutation,
  useAddPlanItemMutation,
  usePlanActionMutation,
  useGeneratePlanMutation,
  useGetGenerationRunsQuery,
  useGetTasksQuery,
  useGetTaskQuery,
  usePerformTaskActionMutation,
  useRetryTaskDeliveryMutation,
} = taskApi;
