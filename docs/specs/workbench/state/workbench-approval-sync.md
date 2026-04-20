# 工作平台审批同步状态规格

## 1. 目标

定义工作平台审批类模块在前端和后端视角下的同步状态边界，确保企业微信审批为真源时，业务页面仍能稳定展示进度和异常状态。

## 2. 审批相关状态

### `workbenchApproval`

职责：

- 发起审批请求的前端提交态
- 审批实例镜像状态展示
- 回调未达、同步失败、对账中等异常态展示
- 审批时间线展示

建议状态：

```ts
interface WorkbenchApprovalState {
  currentInstance: {
    processInstanceId: string | null;
    externalStatus: string | null;
    mirrorStatus: string | null;
    lastSyncedAt: string | null;
  } | null;
  launching: boolean;
  reconciling: boolean;
  timeline: ApprovalTimelineEvent[];
  error: string | null;
}
```

## 3. 展示规则

- 审批类详情页必须同时展示：
  - 业务记录状态
  - 企业微信审批状态
  - 最近一次同步时间
- 若二者不一致，以企业微信审批状态为准，并提示“状态同步中”或“等待回调”。

## 4. 异常处理

- `approval_sync_failed`：显示重试或联系管理员提示。
- 回调延迟：前端允许主动刷新审批状态。
- 对账处理中：禁止重复发起审批。
