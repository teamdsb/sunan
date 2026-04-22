# M6 Wave D 治理收口报告（D-1 / D-2 / D-3）

## 1. 范围与结论
- 执行日期：2026-04-22
- 执行范围：`D-1 采购 3 年查询窗口`、`D-2 上线证据归档`、`D-3 可观测与告警阈值回归`
- 结论：Wave D 目标已完成，具备可执行、可追溯、可审计的交付物。

## 2. D-1 采购“3 年查询窗口”规则化

### 2.1 代码落地
- 后端：
  - `apps/api/src/modules/procurement/procurement.service.ts`
  - 新增 `normalizeSubmittedDateRange` 与 `buildThreeYearWindow`，统一校验：
    - 采购单列表 `submittedFrom/submittedTo`
    - 报表明细 `startDate/endDate`
  - 超窗返回明确 `400` 错误。
- 前端：
  - `apps/web/src/features/procurement/ProcurementOrderListPage.tsx`
  - 新增提交起止日期查询控件，限制仅可选择近 3 年日期。
  - 页面新增查询窗口提示文案。
- API 类型：
  - `apps/web/src/features/procurement/procurementApi.ts`
  - `ProcurementOrderListQuery` 增加 `submittedFrom/submittedTo`。

### 2.2 测试与契约
- 集成测试：
  - `apps/api/test/procurement.integration.spec.ts`
  - `apps/api/test/procurement-report.integration.spec.ts`
  - 覆盖“合法窗口通过 / 超窗拒绝”。
- OpenAPI：
  - `docs/specs/procurement/api/procurement-order-api.yaml`
  - `docs/specs/procurement/api/procurement-report-api.yaml`
  - 已补充近 3 年窗口约束说明。

## 3. D-2 企业微信上线证据归档

### 3.1 归档规范
- 统一归档批次号：`M6-WD-YYYYMMDD-<env>-<seq>`
- 统一目录结构：`go-live/<batchId>/{screenshots,videos,checklists,rollback,drill}/`
- 统一命名格式：`<date>_<platform>_<module>_<scene>_<owner>.<ext>`

### 3.2 最低归档清单
- 真机截图与录屏
- 企业微信后台配置截图
- 模板绑定清单
- 发布单与回滚演练记录
- 值班与联系人清单
- 缺陷闭环记录

> 实操入口：`docs/specs/wecom/go-live-materials-checklist.md`

## 4. D-3 可观测与告警阈值回归校准

### 4.1 关键链路
- OAuth2 回调
- JS-SDK 签名
- 审批发起 / 回调
- 消息发送
- 文件回调
- 导出任务
- 打印快照

### 4.2 回归校准结果
- 告警阈值、失败分级、值班角色、恢复 SOP 已统一收口。
- 新增“失败注入演练”执行模板与记录要求，确保可以按班次复用。

> 实操入口：`docs/specs/common/operations-observability-m6.md`

## 5. 验收入口
- 验收文档：`docs/specs/common/acceptance-m6-waved.md`
- 执行计划：`docs/execplans.md`、`docs/M6-execplans.md`
- 修复清单：`docs/specs/common/M6-优先级修复清单（分wave）.md`

