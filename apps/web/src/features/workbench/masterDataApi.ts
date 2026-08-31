import { baseApi } from '../../app/baseApi';

export interface MasterDataItem { id: string; code?: string; name: string; plateNumber?: string; vehicleType?: string | null; status?: string; employmentStatus?: string; vesselId?: string; category?: string; departmentCode?: string; }
interface Envelope<T> { data: T; }
export interface MasterDataListOptions { includeInactive?: boolean; }
export interface MasterDataInput { code?: string; name?: string; category?: string; status?: string; mmsi?: string; remarks?: string; departmentCode?: string; wecomUserId?: string; position?: string; mobile?: string; employmentStatus?: string; categoryCode?: string; vesselId?: string; serialNo?: string; plateNumber?: string; vehicleType?: string; }

export const masterDataApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMasterDataSelector: builder.query<Envelope<MasterDataItem[]>, { type: 'vessels' | 'vehicles' | 'personnel' | 'equipment'; keyword?: string }>({ query: ({ type, ...params }) => ({ url: `/master-data/selectors/${type}`, params }), providesTags: ['MasterData'] }),
    getMasterDataVessels: builder.query<Envelope<MasterDataItem[]>, MasterDataListOptions | void>({ query: (options) => ({ url: '/master-data/vessels', params: options?.includeInactive ? { includeInactive: 'true' } : undefined }), providesTags: ['MasterData'] }),
    getMasterDataPersonnel: builder.query<Envelope<MasterDataItem[]>, MasterDataListOptions | void>({ query: (options) => ({ url: '/master-data/personnel', params: options?.includeInactive ? { includeInactive: 'true' } : undefined }), providesTags: ['MasterData'] }),
    getMasterDataEquipment: builder.query<Envelope<MasterDataItem[]>, MasterDataListOptions | void>({ query: (options) => ({ url: '/master-data/equipment', params: options?.includeInactive ? { includeInactive: 'true' } : undefined }), providesTags: ['MasterData'] }),
    getMasterDataVehicles: builder.query<Envelope<MasterDataItem[]>, MasterDataListOptions | void>({ query: (options) => ({ url: '/master-data/vehicles', params: options?.includeInactive ? { includeInactive: 'true' } : undefined }), providesTags: ['MasterData'] }),
    createMasterDataVessel: builder.mutation<Envelope<MasterDataItem>, MasterDataInput>({ query: (data) => ({ url: '/master-data/vessels', method: 'POST', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    updateMasterDataVessel: builder.mutation<Envelope<MasterDataItem>, { id: string; data: MasterDataInput }>({ query: ({ id, data }) => ({ url: `/master-data/vessels/${id}`, method: 'PATCH', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    createMasterDataPersonnel: builder.mutation<Envelope<MasterDataItem>, MasterDataInput>({ query: (data) => ({ url: '/master-data/personnel', method: 'POST', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    updateMasterDataPersonnel: builder.mutation<Envelope<MasterDataItem>, { id: string; data: MasterDataInput }>({ query: ({ id, data }) => ({ url: `/master-data/personnel/${id}`, method: 'PATCH', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    createMasterDataEquipment: builder.mutation<Envelope<MasterDataItem>, MasterDataInput>({ query: (data) => ({ url: '/master-data/equipment', method: 'POST', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    updateMasterDataEquipment: builder.mutation<Envelope<MasterDataItem>, { id: string; data: MasterDataInput }>({ query: ({ id, data }) => ({ url: `/master-data/equipment/${id}`, method: 'PATCH', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    createMasterDataVehicle: builder.mutation<Envelope<MasterDataItem>, MasterDataInput>({ query: (data) => ({ url: '/master-data/vehicles', method: 'POST', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
    updateMasterDataVehicle: builder.mutation<Envelope<MasterDataItem>, { id: string; data: MasterDataInput }>({ query: ({ id, data }) => ({ url: `/master-data/vehicles/${id}`, method: 'PATCH', data }), invalidatesTags: ['MasterData', 'CertificateOwner'] }),
  }),
});
export const { useGetMasterDataSelectorQuery, useGetMasterDataVesselsQuery, useGetMasterDataPersonnelQuery, useGetMasterDataEquipmentQuery, useGetMasterDataVehiclesQuery, useCreateMasterDataVesselMutation, useUpdateMasterDataVesselMutation, useCreateMasterDataPersonnelMutation, useUpdateMasterDataPersonnelMutation, useCreateMasterDataEquipmentMutation, useUpdateMasterDataEquipmentMutation, useCreateMasterDataVehicleMutation, useUpdateMasterDataVehicleMutation } = masterDataApi;
