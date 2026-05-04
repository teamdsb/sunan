---
status: current-spec
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台审批同步状态规格

## 1. 目标

定义工作平台审批类模块在前端和后端视角下的同步状态边界，确保企业微信审批为真源时，业务页面仍能稳定展示进度、异常、重试和管理员诊断信息。

## 2. 审批相关状态

### `workbenchApproval`

职责：

- 发起审批请求的前端提交态
- 审批实例镜像状态展示
- 回调未达、同步失败、对账中等异常态展示
- 审批时间线展示
- 管理员重试、管理员诊断与异常列表查询

建议状态：

```ts
interface WorkbenchApprovalState {
  currentInstance: {
    processInstanceId: string | null;
    externalStatus: string | null;
    mirrorStatus: string | null;
    approvalSyncStatus: ApprovalSyncStatus | null;
    lastSyncedAt: string | null;
    lastCallbackAt: string | null;
    lastReconciledAt: string | null;
    retryCount: number;
    syncErrorCode: string | null;
    syncErrorMessage: string | null;
  } | null;
  launching: boolean;
  reconciling: boolean;
  retrying: boolean;
  loadingInstances: boolean;
  timeline: ApprovalTimelineEvent[];
  anomalyList: ApprovalInstanceSummary[];
  error: string | null;
}

type ApprovalSyncStatus =
  | 'pending'
  | 'callback_received'
  | 'reconciled'
  | 'retrying'
  | 'failed';
```

## 3. 展示规则

- 审批类详情页必须同时展示：
  - 业务记录状态
  - 企业微信审批状态
  - 审批同步状态
  - 最近一次同步时间
- 若业务状态与企业微信审批状态不一致，以企业微信审批状态为准，并提示“状态同步中”或“等待回调”。
- 管理员场景下应额外展示：
  - `approvalSyncStatus`
  - `retryCount`
  - `syncErrorCode`
  - `syncErrorMessage`

## 4. 异常处理

- `approval_sync_failed`：显示重试或联系管理员提示。
- `approvalSyncStatus=failed`：普通用户展示“审批状态同步异常”；管理员展示错误码和最近失败原因。
- 回调延迟：前端允许主动刷新审批状态。
- 对账处理中：禁止重复发起审批。
- 重试处理中：展示 `retrying` 状态并禁用重复点击。

## 5. 管理员处理动作

M5 新增管理员诊断动作：

- 查看异常审批实例列表
- 对指定实例触发重试
- 对指定实例触发对账
- 按 `processInstanceId` / `businessRecordId` 检索

前端约束：

- 普通业务用户不展示管理员诊断动作。
- 管理员诊断页允许分页、状态筛选、错误码筛选和时间范围筛选。
- 管理员重试成功后必须刷新当前实例和异常列表。
