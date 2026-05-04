---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M5 Wave 3 验收归档（审批桥强化与上线留痕）

## 1. 验收范围

- WS-3A 审批桥验签、幂等、重试、对账能力实现
- WS-3B 企业微信真机回归留痕与上线材料收口
- WS-3C 权限矩阵自动化校验与异常诊断能力实现

## 2. 交付产物

### 2.1 审批桥后端能力

- `apps/api/src/modules/workbench/workbench-approval.controller.ts`
- `apps/api/src/modules/workbench/workbench.service.ts`
- `apps/api/src/modules/workbench/dto/workbench-approval-instance-list-query.dto.ts`
- `apps/api/src/modules/workbench/dto/workbench-approval-retry.dto.ts`
- `apps/api/src/modules/workbench/dto/workbench-approval-callback.dto.ts`
- `apps/api/src/modules/workbench/dto/workbench-approval-reconcile.dto.ts`

实现点：

- 新增管理员诊断分页接口：`GET /api/v1/wecom/approval/instances`
- 新增管理员重试接口：`POST /api/v1/wecom/approval/retry`
- 强化回调处理：验签、时间窗校验、回调事件去重、版本幂等
- 对账与重试权限收敛为 `system_admin`
- 审批实例详情返回 `approvalSyncStatus/callbackVersion/retryCount/syncError*`

### 2.2 回调重放保护存储

- `apps/api/src/database/entities/wecom-approval-callback-event.entity.ts`
- `apps/api/src/database/migrations/1710000012000-wave5-workbench-approval-ops.ts`
- `apps/api/src/database/typeorm.config.ts`
- `apps/api/test/pg-test-container.ts`

实现点：

- 新增 `wecom_approval_callback_events` 去重表
- 唯一约束：`event_id` 与 `process_instance_id + callback_version`
- 用于回调重放/重复投递保护与审计留痕

### 2.3 权限矩阵自动化回归

- `apps/api/test/workbench.integration.spec.ts`

新增覆盖：

- 非管理员访问审批实例列表返回 `403`
- 管理员可检索审批实例并触发重试/对账
- 角色可见模块校验（`finance` 不可见 `business_operation_flow` / `shipping_voyage_approval`）
- 越权创建记录返回 `403`

## 3. WS 验收结论

### WS-3A

- 结论：完成。
- 依据：审批回调验签+幂等+重放保护、管理员重试与对账接口已实现并经过集成测试。

### WS-3B

- 结论：完成（材料与执行边界收口）。
- 依据：
  - 真机回归与留痕模板已冻结：`docs/archive/superseded/wecom/workbench-real-device-regression.md`
  - 上线检查清单已冻结：`docs/specs/wecom/workbench-go-live-checklist.md`
- 备注：真机执行证据（截图/录屏）需由业务测试设备按模板补录。

### WS-3C

- 结论：完成。
- 依据：审批运维接口权限收敛到 `system_admin`，并新增权限矩阵自动化测试用例。

## 4. 验证记录

- `pnpm --filter api build`：通过。
- `pnpm --filter api test -- workbench.integration.spec.ts`：通过（单元+集成）。

## 5. 风险与后续动作

- 真机回归执行与上线证据归档依赖业务设备与企业微信真实账号。
- 进入 Wave4 前建议完成：
  - iOS/Android 真机执行记录补录
  - 审批异常告警面板字段与阈值落地
