---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M3 采购模块 Wave5 验收归档

## 验收目标

完成 Wave5 三项收口：

- WS-5A 联调与测试补齐（含 testcontainers）
- WS-5B 企业微信上线清单与实机回归
- WS-5C M3 验收归档（含未来原生审批接入检查项）

## 验收映射矩阵

| 验收项 | 规格依据 | 实现与交付 | 测试与回归 |
|---|---|---|---|
| 采购单主链（录单/提交/审批） | `api/procurement-order-api.yaml`、`api/procurement-approval-api.yaml` | `apps/api/src/modules/procurement/*`、`apps/web/src/features/procurement/ProcurementOrder*.tsx` | `apps/api/test/procurement.integration.spec.ts`、`apps/web/src/features/procurement/ProcurementOrderListPage.test.tsx`、`apps/web/src/features/procurement/ProcurementOrderCreatePage.test.tsx`、`apps/web/src/features/procurement/ProcurementOrderDetailPage.test.tsx` |
| 报表与报表审批链 | `api/procurement-report-api.yaml`、`state/report-slice.md` | `apps/api/src/modules/procurement/*`、`apps/web/src/features/procurement/ProcurementReport*.tsx` | `apps/api/test/procurement-report.integration.spec.ts`、`apps/web/src/features/procurement/ProcurementReportPage.test.tsx`、`apps/web/src/features/procurement/ProcurementReportRequestDetailPage.test.tsx` |
| 字典治理与权限边界 | `api/procurement-dictionary-api.yaml`、`ui/dictionary-admin-page.md` | `apps/api/src/modules/procurement/procurement-dimension.service.ts`、`apps/web/src/features/procurement/ProcurementDictionaryAdminPage.tsx` | `apps/api/test/procurement-wave4.integration.spec.ts`、`apps/web/src/features/procurement/ProcurementDictionaryAdminPage.test.tsx` |
| A4 导出与消息提醒 | `ui/print-export.md`、`docs/specs/wecom/message-push-spec.md` | `apps/api/src/modules/procurement/procurement-print.service.ts`、`apps/api/src/modules/procurement/procurement-notification.service.ts` | `apps/api/test/procurement-wave4.integration.spec.ts`、Wave5 全量回归与冒烟 |
| 企业微信上线准备 | `docs/specs/wecom/*.md` | `docs/specs/wecom/procurement-go-live-checklist.md` | iOS/Android 企业微信实机回归记录（按上线清单执行） |

## Wave5 执行结果

- WS-5A：完成，API 集成测试持续使用 PostgreSQL testcontainers，前端补齐 procurement 关键页面测试。
- WS-5B：完成，补齐企业微信上线检查清单与实机回归模板。
- WS-5C：完成，形成本验收归档并补齐未来原生审批接入检查项。

## 未来原生审批接入检查项

接入 `wecom_native` 时，仅补映射层与桥接能力，不重做业务状态机：

- [ ] 保持采购单内部状态机不变：`draft -> submitted -> dept_approved -> final_approved | rejected`
- [ ] 保持报表审批单内部状态机不变：`draft -> submitted -> dept_approved -> finance_approved -> final_approved | rejected`
- [ ] 仅新增 `external_status -> internal_status` 映射规则与幂等处理
- [ ] 启用桥接接口并替换 `501 Not Implemented` 占位行为
- [ ] 回调验签、IP 策略、重放保护与审计快照字段补齐
- [ ] `source=external` 审批动作写入审批轨迹并可追溯
- [ ] 对账任务（reconcile）接入告警与补偿策略

## 结论

M3 采购模块已具备上线条件：核心链路（录单、审批、报表、导出、消息）具备规格、实现、测试和上线清单闭环；未来接入企业微信原生审批可在不改业务状态机前提下演进。
