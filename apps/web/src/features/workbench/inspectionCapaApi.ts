import { baseApi } from '../../app/baseApi';

export type Template = { id: string; code: string; name: string; sourceType: string; currentVersionId: string | null };
export type InspectionPlan = { id: string; title: string; planId: string; planItemId: string; templateVersionId: string };
export type SnapshotItem = { snapshotKey: string; title: string; resultRequired: boolean; evidenceRequiredOnFailure: boolean };
export type Inspection = { id: string; taskId: string; status: string; templateVersionId: string; templateSnapshot: { items: SnapshotItem[] }; results: Array<{ id: string; inspectorUserId: string; templateItemSnapshotKey: string; conclusion: string; remark?: string | null; status: string }>; availableActions: string[] };
export type Issue = { id: string; title: string; issueType: string; severity: string; status: string; responsibleUserId: string; dueAt: string; sources: Array<{ sourceType: string; sourceId: string; sourceItemKey?: string | null; sourceHref?: string | null }>; capa?: Capa | null; availableActions: string[] };
export type Capa = { id: string; issueId: string; status: string; verifierUserId: string; rootCause?: { method: string; conclusion: string } | null; actions: CapaAction[] };
export type CapaAction = { id: string; actionType: string; title: string; responsibleUserId: string; dueAt: string; status: string; evidenceFileIds: string[]; availableActions: string[] };

const mutationHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() });

export const inspectionCapaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInspectionTemplates: build.query<{ data: Template[] }, void>({ query: () => ({ url: '/inspection-templates' }), providesTags: ['Workbench'] }),
    createInspectionTemplate: build.mutation<{ data: Template }, { code: string; name: string; sourceType: string; items: Array<{ itemCode: string; title: string; resultRequired: boolean; evidenceRequiredOnFailure: boolean; sequenceNo: number }> }>({ query: (data) => ({ url: '/inspection-templates', method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    getInspectionPlans: build.query<{ data: InspectionPlan[] }, void>({ query: () => ({ url: '/inspection-plans' }), providesTags: ['Workbench'] }),
    createInspectionPlan: build.mutation<{ data: InspectionPlan }, { title: string; templateVersionId: string; responsibleUserId: string; participantUserIds?: string[]; completionRule: string; recurrence: { kind: 'one_time'; startAt: string }; dueOffsetMinutes: number }>({ query: (data) => ({ url: '/inspection-plans', method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    getInspections: build.query<{ data: Inspection[] }, void>({ query: () => ({ url: '/inspections' }), providesTags: ['Workbench'] }),
    getInspection: build.query<{ data: Inspection }, string>({ query: (id) => ({ url: `/inspections/${id}` }), providesTags: ['Workbench'] }),
    saveInspectionResult: build.mutation<{ data: Inspection['results'][number] }, { inspectionId: string; templateItemSnapshotKey: string; conclusion: string; remark?: string; evidenceFileIds?: string[] }>({ query: ({ inspectionId, ...data }) => ({ url: `/inspections/${inspectionId}/results`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    submitInspection: build.mutation<{ data: Inspection }, { inspectionId: string; signatureFileId: string }>({ query: ({ inspectionId, ...data }) => ({ url: `/inspections/${inspectionId}/submit`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    summarizeInspection: build.mutation<{ data: Inspection }, string>({ query: (id) => ({ url: `/inspections/${id}/summaries`, method: 'POST', headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    getIssues: build.query<{ data: Issue[] }, void>({ query: () => ({ url: '/issues' }), providesTags: ['Workbench'] }),
    getIssue: build.query<{ data: Issue }, string>({ query: (id) => ({ url: `/issues/${id}` }), providesTags: ['Workbench'] }),
    createCapa: build.mutation<{ data: Capa }, { issueId: string; verifierUserId: string }>({ query: ({ issueId, ...data }) => ({ url: `/issues/${issueId}/capa`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    saveRootCause: build.mutation<{ data: Capa }, { capaId: string; method: string; conclusion: string }>({ query: ({ capaId, ...data }) => ({ url: `/capas/${capaId}/root-cause`, method: 'PUT', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    createCapaAction: build.mutation<{ data: CapaAction }, { capaId: string; actionType: string; title: string; responsibleUserId: string; dueAt: string }>({ query: ({ capaId, ...data }) => ({ url: `/capas/${capaId}/actions`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    submitCapaAction: build.mutation<{ data: CapaAction }, { actionId: string; completionStatement: string; evidenceFileIds: string[] }>({ query: ({ actionId, ...data }) => ({ url: `/capa-actions/${actionId}/submit`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    acceptCapaAction: build.mutation<{ data: CapaAction }, { actionId: string; comment: string }>({ query: ({ actionId, ...data }) => ({ url: `/capa-actions/${actionId}/accept`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    verifyCapa: build.mutation<{ data: { result: string } }, { capaId: string; result: string; conclusion: string; effectivenessEvaluation: string; reworkReason?: string }>({ query: ({ capaId, ...data }) => ({ url: `/capas/${capaId}/verifications`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    requestVerification: build.mutation<{ data: Capa }, string>({ query: (capaId) => ({ url: `/capas/${capaId}/request-verification`, method: 'POST', headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
    closeIssue: build.mutation<{ data: Issue }, { issueId: string; comment: string }>({ query: ({ issueId, ...data }) => ({ url: `/issues/${issueId}/close`, method: 'POST', data, headers: mutationHeaders() }), invalidatesTags: ['Workbench'] }),
  }),
});

export const {
  useGetInspectionTemplatesQuery, useCreateInspectionTemplateMutation, useGetInspectionPlansQuery, useCreateInspectionPlanMutation,
  useGetInspectionsQuery, useGetInspectionQuery, useSaveInspectionResultMutation, useSubmitInspectionMutation, useSummarizeInspectionMutation,
  useGetIssuesQuery, useGetIssueQuery, useCreateCapaMutation, useSaveRootCauseMutation, useCreateCapaActionMutation, useSubmitCapaActionMutation,
  useAcceptCapaActionMutation, useVerifyCapaMutation, useRequestVerificationMutation, useCloseIssueMutation,
} = inspectionCapaApi;
