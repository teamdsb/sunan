import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> { data: T }
export interface MonitorItem {
  id: string;
  vesselId: string;
  monitorName: string;
  endpointUrl: string;
  accessMode: 'external' | 'embed';
  sortOrder: number;
  isActive: boolean;
}

export const monitorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShipMonitors: builder.query<ApiEnvelope<MonitorItem[]>, { vesselId?: string; activeOnly?: boolean } | void>({
      query: (params) => ({ url: '/ship-monitors', params }),
      providesTags: ['ShipMonitor'],
    }),
    getShipMonitorsByVessel: builder.query<ApiEnvelope<MonitorItem[]>, string>({
      query: (vesselId) => ({ url: `/ship-monitors/vessels/${vesselId}` }),
      providesTags: ['ShipMonitor'],
    }),
    createShipMonitor: builder.mutation<ApiEnvelope<MonitorItem>, Partial<MonitorItem>>({
      query: (data) => ({ url: '/ship-monitors', method: 'POST', data }),
      invalidatesTags: ['ShipMonitor'],
    }),
    updateShipMonitor: builder.mutation<ApiEnvelope<MonitorItem>, { id: string; data: Partial<MonitorItem> }>({
      query: ({ id, data }) => ({ url: `/ship-monitors/${id}`, method: 'PATCH', data }),
      invalidatesTags: ['ShipMonitor'],
    }),
    deleteShipMonitor: builder.mutation<void, string>({
      query: (id) => ({ url: `/ship-monitors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ShipMonitor'],
    }),
  }),
});

export const {
  useGetShipMonitorsQuery,
  useGetShipMonitorsByVesselQuery,
  useCreateShipMonitorMutation,
  useUpdateShipMonitorMutation,
  useDeleteShipMonitorMutation,
} = monitorApi;

