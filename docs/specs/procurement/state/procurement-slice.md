# 采购模块状态规格

## 范围

用于采购单录单、详情、列表与审批动作状态管理。

## 状态内容

- 列表筛选：`keyword`、`departmentCode`、`dimensionType`、`dimensionKey`、`status`
- 列表分页：`page`、`pageSize`、`total`
- 详情缓存：`orderById`
- 编辑态：`draft`、`dirtyFields`
- 提交态：`submitting`、`submitError`
- 审批态：`approvalActionLoading`、`approvalActionError`
- 附件态：`attachmentUploading`、`attachmentBinding`

## 关键动作

- `fetchOrders`
- `fetchOrderDetail`
- `createOrderDraft`
- `updateOrderDraft`
- `submitOrder`
- `resubmitOrder`
- `bindOrderAttachments`
- `approveOrder` / `rejectOrder` / `returnOrder`

## 兼容约束

- `approvalChannel` 默认 `internal`。
- 如服务端返回外部流程字段（`external*`），前端仅透传展示，不参与本期流程判断。
