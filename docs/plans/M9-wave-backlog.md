---
status: current-spec
owner: planning
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M9 分 Wave 实施清单

## 1. 使用说明

M9 以 M8 生产基线为前置。所有专业领域必须复用 M8 的权限、任务、证据、消息、导出和 CAPA，不允许建设平行底座。

当前调度：M9 已顺延。只有在 M7 修复验收完成、M8 重新排期并通过总体验收后，才能使用本清单启动 M9。

## 2. Wave 1：规格冻结与 M8 回归

| ID | 优先级 | 工作项 | 主要产出 | 验收 |
|---|---|---|---|---|
| `M9-W1A-1` | P0 | 回归 M8 核心链路 | 自动化和真机报告 | 无未关闭 P0；包含采购执行清单附件上传、预览、下载和受审计解除关联 |
| `M9-W1A-2` | P0 | 主数据质量核查 | 缺失、重复、失效报告 | 达到后续 Wave 门槛 |
| `M9-W1B-1` | P0 | 冻结六组专业规格 | API/DB/state/UI 清单 | 无重叠对象 |
| `M9-W1B-2` | P0 | 冻结跨域关联 | 资格、采购、CAPA、档案矩阵 | 来源和真源明确 |
| `M9-W1C-1` | P0 | 冻结迁移与回滚 | 各领域迁移矩阵 | 可分 Wave 演练 |
| `M9-W1C-2` | P0 | 冻结验收与提示词 | 8 个 Wave 门禁 | 可独立执行 |

## 3. Wave 2：人员安全与培训资格

### 规格组

- `personnel-safety-api.yaml`
- `personnel-safety-schema.md`
- `personnel-safety-lifecycle.md`
- `personnel-safety-pages.md`

### 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W2A-1` | P0 | DB/API | 任职、调配、上下船 | 有效期和岗位唯一性 |
| `M9-W2A-2` | P0 | DB/API | 健康和资格 | 到期、限制和例外审批 |
| `M9-W2A-3` | P0 | Workflow | 交接和未结事项转移 | 待办、问题、设备责任 |
| `M9-W2A-4` | P1 | UI | 人员安全档案 | 权限化展示 |
| `M9-W2B-1` | P0 | DB/API | 培训需求与计划 | 部门、船舶、个人汇总 |
| `M9-W2B-2` | P0 | Workflow | 签到、学习、考试、补考 | 个人结果 |
| `M9-W2B-3` | P0 | Rule | 培训评价和完成门槛 | 多人全部完成 |
| `M9-W2C-1` | P0 | Workflow | 熟悉职责 | 清单、签认、审核 |
| `M9-W2C-2` | P0 | Rule | 岗位资格判断 | 证书、健康、培训、熟悉 |
| `M9-W2C-3` | P0 | Snapshot | 开航资格快照 | 历史可复原 |
| `M9-W2C-4` | P0 | Test | 日期边界与交接测试 | 到期日、并发转移 |

## 4. Wave 3：航次与船舶高风险作业

### 规格组

- `ship-operation-api.yaml`
- `ship-operation-schema.md`
- `ship-operation-lifecycle.md`
- `ship-operation-pages.md`

### 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W3A-1` | P0 | Rule | 航次安全校验 | 人员、证书、重大问题 |
| `M9-W3A-2` | P0 | Checklist | 开航前多人检查 | 未通过可阻断 |
| `M9-W3A-3` | P0 | Automation | 燃油审批生成检查任务 | 幂等和回写 |
| `M9-W3B-1` | P0 | Workflow | 有限空间许可 | 气体检测、监护、进出 |
| `M9-W3B-2` | P0 | Workflow | 明火作业许可 | 消防、监护、结束复查 |
| `M9-W3B-3` | P0 | Workflow | 危险货物许可 | 货物、隔离、应急措施 |
| `M9-W3B-4` | P0 | Workflow | 高空舷外许可 | 防坠落、救生、监护 |
| `M9-W3C-1` | P1 | Workflow | 岸电和环保作业 | 数量、接收方、单证 |
| `M9-W3C-2` | P0 | Task | 值守、巡查和交接 | 漏检提醒 |
| `M9-W3C-3` | P1 | Master | 海图通告和版本核验 | 来源和适用船舶 |
| `M9-W3C-4` | P0 | Test | 作业前置和证据测试 | 不可绕过 |

## 5. Wave 4：应急、事故险情与防台

### 规格组

- `emergency-incident-api.yaml`
- `emergency-incident-schema.md`
- `emergency-incident-lifecycle.md`
- `emergency-incident-pages.md`

### 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W4A-1` | P0 | Plan | 应急年度计划 | 自动生成任务 |
| `M9-W4A-2` | P0 | Workflow | 船舶、岸基、联合演习 | 角色和过程证据 |
| `M9-W4A-3` | P0 | Evaluation | 演习评价 | 改进项进入任务/CAPA |
| `M9-W4B-1` | P0 | Workflow | 应急事件 | 启动、指挥、日志、结案 |
| `M9-W4B-2` | P0 | Workflow | 事故险情快报和调查 | 损失、原因、责任 |
| `M9-W4B-3` | P0 | Governance | 人工上报留痕 | 渠道、时间、回执 |
| `M9-W4C-1` | P0 | Workflow | 防台预警和会议 | 船舶范围 |
| `M9-W4C-2` | P0 | Checklist | 防台检查和部署 | 阶段任务 |
| `M9-W4C-3` | P0 | Workflow | 动态、解除和小结 | 全过程时间线 |
| `M9-W4C-4` | P0 | Test | 应急和防台跨任务测试 | 计划、评价、CAPA |

## 6. Wave 5：设备维护、修理、备件与采购

### 规格组

- `equipment-maintenance-api.yaml`
- `equipment-maintenance-schema.md`
- `equipment-maintenance-lifecycle.md`
- `equipment-maintenance-pages.md`
- 更新采购来源关联规格

### 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W5A-1` | P0 | Master | 船舶设备树和周期模板 | 编码唯一、版本化 |
| `M9-W5A-2` | P0 | Plan | 年度和月度维护计划 | 幂等拆分 |
| `M9-W5A-3` | P0 | Workflow | 多人执行、船长和岸基确认 | 角色隔离 |
| `M9-W5B-1` | P0 | Issue | 设备缺陷 | 来源和严重度 |
| `M9-W5B-2` | P0 | Workflow | 修理和厂修 | 报价、进度、验收 |
| `M9-W5B-3` | P1 | Report | 完成率和可靠性统计 | 可追溯 |
| `M9-W5C-1` | P0 | Inventory | 备件字典和库存流水 | 事务与锁 |
| `M9-W5C-2` | P0 | Workflow | 申领、发放、领用、退库 | 不允许非法负库存 |
| `M9-W5C-3` | P0 | Inventory | 盘点和结存 | 差异审批 |
| `M9-W5C-4` | P0 | Integration | 采购关联与回写 | 不复制采购审批 |

## 7. Wave 6：安全责任、费用与管理复查

### 规格组

- `safety-governance-api.yaml`
- `safety-governance-schema.md`
- `safety-governance-lifecycle.md`
- `safety-governance-pages.md`

### 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W6A-1` | P0 | Document | 安全责任模板与版本 | 适用岗位 |
| `M9-W6A-2` | P0 | Workflow | 年度签订与签名 | 身份和版本快照 |
| `M9-W6A-3` | P0 | Inspection | 履职检查 | 问题进入 CAPA |
| `M9-W6B-1` | P0 | Budget | 安全费用计划和类别 | 年度预算 |
| `M9-W6B-2` | P0 | Integration | 采购预算占用与释放 | 状态一致 |
| `M9-W6B-3` | P0 | Report | 费用登记和统计 | 不重复记账 |
| `M9-W6C-1` | P0 | Plan | 指定人员监督计划 | 周期和多人检查 |
| `M9-W6C-2` | P0 | Workflow | 船长复查、会议和报告 | 岸基审阅 |
| `M9-W6C-3` | P0 | Review | 管理评审和行动项 | 进入统一任务 |
| `M9-W6C-4` | P0 | Test | 预算、签名和复查测试 | 并发和权限 |

## 8. Wave 7：受控文件、内审、统计与档案

### 规格组

- `document-audit-archive-api.yaml`
- `document-audit-archive-schema.md`
- `document-audit-archive-lifecycle.md`
- `document-audit-archive-pages.md`

### 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W7A-1` | P0 | Workflow | 内部文件变更 | 审批、版本、替换 |
| `M9-W7A-2` | P0 | Registry | 外来文件登记 | 适用性和更新 |
| `M9-W7A-3` | P0 | Distribution | 分发、阅读确认和撤回 | 催办与统计 |
| `M9-W7A-4` | P0 | PDF | 水印和受控副本 | 版本唯一 |
| `M9-W7B-1` | P0 | Plan | 内审计划和审核组 | 对象、范围、分工 |
| `M9-W7B-2` | P0 | Workflow | 首末次会议、方案和底稿 | 签名与证据 |
| `M9-W7B-3` | P0 | CAPA | 内审不符合项 | 自动转单 |
| `M9-W7B-4` | P0 | Report | 船舶和公司报告 | 数据可追溯 |
| `M9-W7C-1` | P1 | Analytics | 全域统计 | 人员、问题、设备、文件 |
| `M9-W7C-2` | P0 | Governance | 人工监管上报 | 明确人工来源 |
| `M9-W7C-3` | P0 | Archive | 保管、冻结、借阅和审计 | 到期策略 |
| `M9-W7C-4` | P0 | Export | 异步导出和报告归档 | 权限继承 |

## 9. Wave 8：全域联调、上线与验收

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M9-W8A-1` | P0 | Integration | 人员到航次资格链 | 快照与阻断 |
| `M9-W8A-2` | P0 | Integration | 作业/应急/设备/内审到 CAPA | 来源完整 |
| `M9-W8A-3` | P0 | Integration | 设备到采购到验收 | 双向追踪 |
| `M9-W8A-4` | P0 | Migration | 分域迁移和回滚 | 自动核对 |
| `M9-W8B-1` | P0 | Test | 全量测试和构建 | 零 P0 失败 |
| `M9-W8B-2` | P0 | Performance | 待办、档案、统计和导出 | 达到规格阈值 |
| `M9-W8B-3` | P0 | Device | iOS/Android/桌面真机 | 核心专业链路 |
| `M9-W8B-4` | P0 | Security | 越权、签名、文件和审计 | 无高风险缺陷 |
| `M9-W8C-1` | P0 | Docs | 操作手册和培训材料 | 与生产一致 |
| `M9-W8C-2` | P0 | Release | 发布、回滚和监控 | 可直接执行 |
| `M9-W8C-3` | P0 | Acceptance | Wave 1-8 证据和上线包 | 可独立复核 |
| `M9-W8C-4` | P1 | Audit | 更新平台能力对比评级 | 结论有证据 |

## 10. M9 最低验证命令

最终 Wave 必须完整执行：

```bash
node scripts/generate-doc-inventory.mjs
node scripts/check-doc-index.mjs
pnpm --filter api lint
pnpm --filter api test:unit
pnpm --filter api test:integration
pnpm --filter web test
pnpm --filter api build
pnpm --filter web build
```

所有 OpenAPI 文件逐个执行：

```bash
npx swagger-cli validate <openapi-file>
```
