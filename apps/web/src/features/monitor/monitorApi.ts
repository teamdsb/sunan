import { baseApi } from '../../app/baseApi';

interface ApiEnvelope<T> {
  data: T;
}
export interface MonitorItem {
  id: string;
  vesselId: string;
  vesselName?: string | null;
  vesselCode?: string | null;
  monitorName: string;
  endpointUrl: string;
  accessMode: 'external' | 'embed';
  sortOrder: number;
  isActive: boolean;
}

export type MonitorInput = Pick<
  MonitorItem,
  'vesselId' | 'monitorName' | 'endpointUrl'
> &
  Partial<Pick<MonitorItem, 'accessMode' | 'sortOrder' | 'isActive'>>;

export const monitorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShipMonitors: builder.query<
      ApiEnvelope<MonitorItem[]>,
      { vesselId?: string; activeOnly?: boolean } | void
    >({
      query: (params) => ({ url: '/ship-monitors', params }),
      providesTags: ['ShipMonitor', 'MasterData'],
    }),
    getShipMonitorsByVessel: builder.query<ApiEnvelope<MonitorItem[]>, string>({
      query: (vesselId) => ({ url: `/ship-monitors/vessels/${vesselId}` }),
      providesTags: ['ShipMonitor', 'MasterData'],
    }),
    createShipMonitor: builder.mutation<ApiEnvelope<MonitorItem>, MonitorInput>(
      {
        query: (data) => ({ url: '/ship-monitors', method: 'POST', data }),
        invalidatesTags: ['ShipMonitor'],
      },
    ),
    updateShipMonitor: builder.mutation<
      ApiEnvelope<MonitorItem>,
      { id: string; data: Partial<MonitorInput> }
    >({
      query: ({ id, data }) => ({
        url: `/ship-monitors/${id}`,
        method: 'PATCH',
        data,
      }),
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
