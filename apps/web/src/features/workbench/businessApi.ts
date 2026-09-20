import { baseApi } from '../../app/baseApi';
export interface Learner {
  userId: string;
  name: string;
  completedMaterialIds: string[];
  completedAt: string | null;
  progressPercent: number;
  completedHours: number;
}
export interface Learning {
  publishedAt: string;
  hours: number;
  materials: Array<{ id: string; title: string; fileId?: string }>;
  learners: Learner[];
  totalPeople: number;
  completedPeople: number;
  completionRate: number;
}
export interface LearningStatistics {
  courses: Array<
    Partial<Learning> & { recordId: string; title: string; moduleCode: string }
  >;
  people: Array<{
    userId: string;
    name: string;
    assigned: number;
    completed: number;
    completionRate: number;
    completedHours: number;
  }>;
}
export interface FuelRow {
  vesselId: string;
  vesselName: string;
  fuelType: string;
  unit: 'L' | 't';
  openingBalance: number | null;
  bunkeredAmount: number;
  closingBalance: number | null;
  consumedAmount: number | null;
  lowFuelThreshold: number | null;
  lowFuel: boolean;
  issues: string[];
}
export interface FuelStatistics {
  month: string;
  rows: FuelRow[];
  receipts: Array<{ recordId: string; amount: number }>;
  unconfirmed: Array<{ recordId: string; title: string; vesselId: string }>;
  canMeasure: boolean;
}
export interface FuelActual {
  amount: number;
  occurredAt: string;
  fuelType: string;
  unit: 'L' | 't';
}
export interface FuelMeasurement {
  vesselId: string;
  month: string;
  fuelType: string;
  unit: 'L' | 't';
  openingBalance?: number;
  closingBalance: number;
  lowFuelThreshold?: number;
}
interface Envelope<T> {
  data: T;
}
export const businessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    learningPeople: builder.query<
      Envelope<Array<{ userId: string; name: string }>>,
      void
    >({ query: () => ({ url: '/workbench/learning/people' }) }),
    learningStatistics: builder.query<
      Envelope<LearningStatistics>,
      string | void
    >({
      query: (month) => ({
        url: '/workbench/statistics/learning',
        params: month ? { month } : undefined,
      }),
      providesTags: ['WorkbenchRecord'],
    }),
    publishLearning: builder.mutation<
      Envelope<Learning>,
      { recordId: string; userIds: string[]; hours: number }
    >({
      query: ({ recordId, ...data }) => ({
        url: `/workbench/records/${recordId}/learning/publish`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['WorkbenchRecord', 'Workbench'],
    }),
    confirmLearning: builder.mutation<
      Envelope<Learning>,
      { recordId: string; materialId: string }
    >({
      query: ({ recordId, ...data }) => ({
        url: `/workbench/records/${recordId}/learning/confirm`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['WorkbenchRecord', 'Workbench'],
    }),
    fuelStatistics: builder.query<Envelope<FuelStatistics>, string>({
      query: (month) => ({
        url: '/workbench/statistics/fuel',
        params: { month },
      }),
      providesTags: ['WorkbenchRecord'],
    }),
    saveFuelActual: builder.mutation<
      Envelope<FuelActual>,
      { recordId: string; data: FuelActual }
    >({
      query: ({ recordId, data }) => ({
        url: `/workbench/records/${recordId}/fuel-actual`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['WorkbenchRecord'],
    }),
    saveFuelMeasurement: builder.mutation<
      Envelope<{ id: string }>,
      FuelMeasurement
    >({
      query: (data) => ({
        url: '/workbench/fuel/measurements',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['WorkbenchRecord'],
    }),
    exportBusiness: builder.mutation<
      Envelope<{ downloadUrl: string }>,
      { kind: 'learning' | 'fuel'; month?: string }
    >({
      query: ({ kind, ...params }) => ({
        url: `/workbench/statistics/${kind}/export`,
        params,
      }),
    }),
    exportAttendance: builder.mutation<
      Envelope<{ exportJobId: string }>,
      { month: string; departmentCode?: string; exportFormat: 'xlsx' | 'pdf' }
    >({
      query: (params) => ({
        url: '/workbench/statistics/attendance/export',
        params,
      }),
    }),
    exportJob: builder.query<
      Envelope<{ id: string; status: string; failureMessage: string | null }>,
      string
    >({ query: (id) => ({ url: `/workbench/export-jobs/${id}` }) }),
    exportDownload: builder.query<Envelope<{ downloadUrl: string }>, string>({
      query: (id) => ({ url: `/workbench/export-jobs/${id}/download-url` }),
    }),
    retryExport: builder.mutation<Envelope<{ id: string }>, string>({
      query: (id) => ({
        url: `/workbench/export-jobs/${id}/retry`,
        method: 'POST',
      }),
    }),
  }),
});
export const {
  useLearningPeopleQuery,
  useLearningStatisticsQuery,
  usePublishLearningMutation,
  useConfirmLearningMutation,
  useFuelStatisticsQuery,
  useSaveFuelActualMutation,
  useSaveFuelMeasurementMutation,
  useExportBusinessMutation,
  useExportAttendanceMutation,
  useExportJobQuery,
  useLazyExportDownloadQuery,
  useRetryExportMutation,
} = businessApi;
