---
status: current-spec
owner: workbench
updated: 2026-08-04
replaces: []
replaced_by: []
---

# 工作平台记录状态规格

## 1. 目标

定义工作平台记录列表、详情、动作、附件、导出和打印相关的前端状态边界，确保 M5 从样例态切换为持久化运行态后，前端仍保持统一交互与异常处理。

## 2. 状态切片

### `workbenchRecords`

职责：

- 记录列表与分页
- 记录详情与步骤明细
- 动作提交
- 附件上传、拍照、签名、定位、受审计解除关联与下载
- 打印预览与打印快照读取
- 月度导出任务跟踪
- 财务对账提交与结果提示

建议状态：

```ts
interface WorkbenchRecordsState {
  list: BusinessRecordSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: {
    moduleCode?: string;
    status?: string[];
    vesselId?: string;
    ownerUserId?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  detail: BusinessRecordDetail | null;
  actionSubmitting: boolean;
  attachmentQueue: UploadQueueItem[];
  printPreview: PrintSnapshot | null;
  exportJobs: ExportJobSummary[];
  activeExportJobId: string | null;
  reconcileSubmitting: boolean;
  reconcileResult: AttendanceReconcileResult | null;
  loadingList: boolean;
  loadingDetail: boolean;
  loadingPrint: boolean;
  error: string | null;
}
```

## 3. 记录来源

M5 新增 `record_source` 概念，前端至少要能识别：

- `manual`：用户主动录入
- `callback`：来自审批回调同步
- `reconcile`：来自对账补偿或系统修复

展示规则：

- 普通用户页面默认只提示“系统同步生成”或“对账补录”，不暴露底层技术术语。
- 管理员诊断页可直接展示 `record_source` 原值。

## 4. 动作规范

通用动作由 `POST /workbench/records/:id/actions` 统一提交，前端动作按钮应根据模板和状态渲染，不允许写死到单一模块页面中。

常见动作：

- `submit`
- `assign`
- `start`
- `complete_step`
- `submit_review`
- `request_rework`
- `close_record`
- `archive`
- `update_payload`（用于台账类字段更新）

异常动作：

- `retry_export`
- `reconcile_record`
- `refresh_print_snapshot`

总经办培训自动审批规则：

- 模块 `goa_training` 执行 `update_payload` 后，若学习状态达到完成条件（例如 `learningStatus=completed` 或进度 >= 100），
  系统自动发起审批并把记录状态切换到 `approval_pending`。
- 前端动作成功后应立即刷新详情，展示 `externalProcessInstanceId`、`approvalChannel=wecom_native` 和最新状态。

## 5. 附件上传

- 图片上传优先走企业微信拍照/选图。
- 长传文件、单证、导出文件复用通用文件上传能力。
- 整改前后照片必须带 `category`，例如：
  - `before_rectification`
  - `after_rectification`
  - `meeting_photo`
  - `evidence`
  - `print_export`
  - `export_file`
- 若上传失败，失败态必须保留在 `attachmentQueue` 中，允许用户重试。
- 文件选择前展示后端策略返回的允许格式和单文件大小限制；长传文件默认上限 20MB。
- 已绑定附件必须通过记录级附件下载接口获取短期 URL，并在应用内统一预览弹窗展示 PDF、图片、HEIC、TXT 和 CSV；其他格式展示下载回退。

## 6. 打印预览

- 打印预览只读取后端生成的快照数据，不直接用前端当前编辑态拼装。
- 若记录已归档，则默认显示最新一次打印快照。
- 若快照生成失败，前端应展示“重新生成快照”入口，并标记最近失败时间。

## 7. 导出任务态

M5 新增导出任务态：

```ts
type ExportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
```

要求：

- 导出触发后前端进入异步任务跟踪，而不是假设立即返回文件。
- 成功态展示导出时间、导出范围、下载入口。
- 失败态展示失败原因与重试入口。
- `queued` 和 `running` 均不是成功态，不展示伪造 fileId 或下载入口；成功下载前仍由服务端重新验证考勤范围/源记录权限。

## 8. 对账态

财务对账能力由 `POST /workbench/statistics/attendance/reconcile` 触发。

前端需支持：

- 提交中的 loading 态
- 对账结果概览
- 差异明细入口
- 对账失败后的重试提示
- 管理员场景下的原始口径说明

## 9. M8 Wave 6 检查整改来源关联

对四类 `inspection_rectification` 记录，详情响应可包含受权的 `issueLinks`。它只表示安全领域 `issue_sources` 的双向引用，不改变工作平台记录自身 `draft/assigned/checking/pending_review/rework_required/closed` 状态机，也不允许通过通用 `complete_step` 绕过 CAPA 关闭门槛。

点击关联问题后由安全问题 API 重新执行 ABAC；问题关闭、返工或重开只更新安全领域状态和审计，不回写原记录的 `payload`。403 不显示问题数量、标题或等级。
