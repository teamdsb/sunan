---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M6 Wave D 验收记录（治理与上线证据收口）

## 1. 验收范围
- 对应修复清单：`D-1`、`D-2`、`D-3`
- 依据文档：
  - `docs/archive/backlogs/common/M6-优先级修复清单（分wave）.md`
  - `docs/archive/acceptance/common/m6-waved-governance-closure.md`

## 2. 验收条目
| 条目 | 结果 | 证据 |
|---|---|---|
| D-1 采购列表与报表明细 3 年查询窗口校验 | 通过 | `apps/api/src/modules/procurement/procurement.service.ts` |
| D-1 前端查询控件范围限制与提示 | 通过 | `apps/web/src/features/procurement/ProcurementOrderListPage.tsx` |
| D-1 边界测试（合法/超窗） | 通过 | `apps/api/test/procurement.integration.spec.ts`、`apps/api/test/procurement-report.integration.spec.ts` |
| D-1 OpenAPI 约束说明同步 | 通过 | `docs/specs/procurement/api/procurement-order-api.yaml`、`docs/specs/procurement/api/procurement-report-api.yaml` |
| D-2 上线材料归档可审计规则 | 通过 | `docs/specs/wecom/go-live-materials-checklist.md` |
| D-3 可观测字段与失败注入演练模板 | 通过 | `docs/specs/common/operations-observability-m6.md` |

## 3. 验收结论
- Wave D：**通过**。
- 说明：治理侧收口以“规则可执行 + 证据可追溯 + 演练可复用”为完成标准。

