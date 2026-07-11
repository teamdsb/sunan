import { baseApi } from '../../app/baseApi';

export interface MasterDataItem { id: string; code?: string; name: string; status?: string; employmentStatus?: string; vesselId?: string; }
interface Envelope<T> { data: T; }

export const masterDataApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMasterDataSelector: builder.query<Envelope<MasterDataItem[]>, { type: 'vessels' | 'personnel' | 'equipment'; keyword?: string }>({ query: ({ type, ...params }) => ({ url: `/master-data/selectors/${type}`, params }), providesTags: ['MasterData'] }),
    getMasterDataVessels: builder.query<Envelope<MasterDataItem[]>, void>({ query: () => ({ url: '/master-data/vessels' }), providesTags: ['MasterData'] }),
    getMasterDataPersonnel: builder.query<Envelope<MasterDataItem[]>, void>({ query: () => ({ url: '/master-data/personnel' }), providesTags: ['MasterData'] }),
    getMasterDataEquipment: builder.query<Envelope<MasterDataItem[]>, void>({ query: () => ({ url: '/master-data/equipment' }), providesTags: ['MasterData'] }),
  }),
});
export const { useGetMasterDataSelectorQuery, useGetMasterDataVesselsQuery, useGetMasterDataPersonnelQuery, useGetMasterDataEquipmentQuery } = masterDataApi;
