---
status: current-spec
owner: planning
updated: 2026-07-04
replaces: []
replaced_by: []
---
# M8 分 Wave 实施清单

## 1. 使用说明

本清单是 `docs/plans/M8-execplans.md` 的工程展开。实施者必须先读取对应 Wave 提示词，再按任务顺序更新规格、测试、实现和验收证据。

当前调度：M8 已顺延到 M7 修复 Wave 6 验收之后。未满足 `docs/plans/M7-execplans.md` 的 M8/M9 重启门禁前，本清单不得作为当前开发任务启动。

优先级：

- `P0`：不完成则当前 Wave 不得验收。
- `P1`：主链路必须完成，允许将非关键体验项带入下一 Wave。
- `P2`：增强项，不得影响 P0/P1 交付。

## 2. Wave 1：文档、架构与规格基线

| ID | 优先级 | 工作项 | 主要产出 | 验收 |
|---|---|---|---|---|
| `M8-W1A-1` | P0 | 冻结 M8 需求与总路线 | requirements、roadmap、execplan、backlog | 文档无范围冲突 |
| `M8-W1A-2` | P0 | 代码差距复核 | 按 API/DB/UI/测试列出现状证据 | 每项有文件或接口证据 |
| `M8-W1B-1` | P0 | 冻结安全领域边界 | `domain-boundaries.md` | 无第五一级导航、无外部接口 |
| `M8-W1B-2` | P0 | 冻结术语和状态 | `terminology-and-status.md` | 任务、问题、CAPA 等定义唯一 |
| `M8-W1B-3` | P0 | 建立规格目录 | safety README 与计划文件清单 | 每个后续 Wave 有规格入口 |
| `M8-W1C-1` | P0 | 冻结测试矩阵 | 单元、集成、组件、真机、迁移测试计划 | PostgreSQL testcontainers 明确 |
| `M8-W1C-2` | P0 | 冻结迁移原则 | 存量来源、兼容、回滚和核对规则 | 不覆盖原始数据 |
| `M8-W1C-3` | P1 | 建立验收模板和提示词 | Wave 模板、M8 prompts | 可由独立实施者执行 |

## 3. Wave 2：数据权限与流程状态链

### 3.1 规格

- `docs/specs/safety/api/workflow-and-permission-api.yaml`
- `docs/specs/safety/db/workflow-and-permission-schema.md`
- `docs/specs/safety/state/workflow-lifecycle.md`
- `docs/specs/safety/ui/permission-and-action-rules.md`
- 更新 `docs/specs/common/auth-spec.md`
- 更新 `docs/specs/workbench/state/workbench-records.md`

### 3.2 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M8-W2A-1` | P0 | DB | 记录数据范围与任务参与人关系 | 外键、索引、有效期和软删除 |
| `M8-W2A-2` | P0 | API | 统一授权上下文和策略服务 | 列表、详情、附件、打印、导出一致 |
| `M8-W2A-3` | P0 | API | 船舶、本人、部门和参与人过滤 | crew 跨船舶拒绝 |
| `M8-W2A-4` | P1 | UI | 权限不足和受限数据反馈 | 不泄露记录摘要 |
| `M8-W2B-1` | P0 | DB | 执行人、协作人、审核人和观察人 | 每个参与关系可审计 |
| `M8-W2B-2` | P0 | State | 多人完成规则 | all/any/quorum 状态转换 |
| `M8-W2B-3` | P0 | API | 动作级授权 | 非执行人不能推进 |
| `M8-W2B-4` | P1 | UI | 仅展示当前用户可执行动作 | 与后端拒绝规则一致 |
| `M8-W2C-1` | P0 | State | 退回、终止、作废、重开 | 非法转换返回 409/422 |
| `M8-W2C-2` | P0 | DB | 代理和任务转移 | 原责任和新责任轨迹保留 |
| `M8-W2C-3` | P0 | Audit | 查看、导出、状态和管理员动作审计 | 含 request id 和操作人 |
| `M8-W2C-4` | P0 | Test | 权限矩阵 integration 测试 | 允许与拒绝场景均覆盖 |

## 4. Wave 3：证据、打印、导出与移动能力

### 4.1 规格

- `docs/specs/safety/api/evidence-and-export-api.yaml`
- `docs/specs/safety/db/evidence-and-export-schema.md`
- `docs/specs/safety/state/evidence-jobs.md`
- `docs/specs/safety/ui/mobile-evidence-components.md`
- 更新文件、通知、JS-SDK 和工作平台打印规格

### 4.2 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M8-W3A-1` | P0 | UI | 通用附件组件 | 选择、上传、进度、预览、删除 |
| `M8-W3A-2` | P0 | API | 全模块附件绑定 | 不再要求手工 fileId |
| `M8-W3A-3` | P0 | WeCom | 拍照转存 OSS | mediaId 幂等和失败重试 |
| `M8-W3A-4` | P1 | UI | 图片压缩和弱网上传反馈 | 不阻塞其他字段草稿 |
| `M8-W3B-1` | P0 | DB | 签名证据 | 用户、时间、摘要哈希、文件 |
| `M8-W3B-2` | P0 | DB | 定位证据 | 经纬度、精度、时间、异常说明 |
| `M8-W3B-3` | P0 | UI | H5 签名板和定位采集 | 取消授权有替代说明 |
| `M8-W3B-4` | P0 | Audit | 归档证据替换与删除留痕 | 不可静默覆盖 |
| `M8-W3C-1` | P0 | API | PDF 快照下载 | 返回 fileId/downloadUrl |
| `M8-W3C-2` | P0 | PDF | 版本、时间、水印和业务编号 | A4/A3 兼容 |
| `M8-W3C-3` | P0 | Job | 异步导出任务 | queued/running/succeeded/failed |
| `M8-W3C-4` | P0 | Test | 文件权限和任务测试 | 无权下载、失败重试 |

## 5. Wave 4：安全主数据中心

### 5.1 规格

- `docs/specs/safety/api/master-data-api.yaml`
- `docs/specs/safety/db/master-data-schema.md`
- `docs/specs/safety/ui/master-data-pages.md`
- 更新 `docs/specs/my/db/vessels.md`、`personnel.md`、`certificates.md`

### 5.2 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M8-W4A-1` | P0 | DB/API | 船舶安全档案 | 基础信息、状态、证书关系 |
| `M8-W4A-2` | P1 | UI | 船舶 360 详情 | 人员、设备、证书和任务摘要 |
| `M8-W4B-1` | P0 | DB/API | 人员与企业微信身份 | 唯一映射和例外维护 |
| `M8-W4B-2` | P0 | DB/API | 船舶任职关系 | 岗位、有效期、上下船 |
| `M8-W4B-3` | P1 | UI | 人员档案与任职历史 | 敏感字段按权限显示 |
| `M8-W4C-1` | P0 | DB/API | 设备档案 | 编码、分类、船舶、状态 |
| `M8-W4C-2` | P0 | UI | 船舶、人员、设备选择器 | 支持搜索和停用过滤 |
| `M8-W4C-3` | P0 | Import | 幂等导入和重复识别 | 导入报告可下载 |
| `M8-W4C-4` | P0 | Migration | 文本引用治理 | 保留原值和映射状态 |

## 6. Wave 5：计划任务、待办与日历

### 6.1 规格

- `docs/specs/safety/api/plan-task-api.yaml`
- `docs/specs/safety/db/plan-task-schema.md`
- `docs/specs/safety/state/task-lifecycle.md`
- `docs/specs/safety/ui/task-center-and-calendar.md`
- 更新通知和企业微信消息规格

### 6.2 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M8-W5A-1` | P0 | DB/API | 计划和计划项 | 年/月/周期/单次 |
| `M8-W5A-2` | P0 | Job | 任务生成器 | 幂等键、重试、补偿 |
| `M8-W5A-3` | P0 | State | 任务生命周期 | pending/in_progress/blocked/done/cancelled |
| `M8-W5B-1` | P0 | API/UI | 统一待办 | 本人下一步可执行项 |
| `M8-W5B-2` | P0 | API/UI | 我发起、我参与、已完成 | 数据范围正确 |
| `M8-W5B-3` | P0 | UI | 真实任务日历 | 状态颜色与筛选 |
| `M8-W5B-4` | P1 | UI | 任务详情深链 | 认证恢复后回到目标任务 |
| `M8-W5C-1` | P0 | State | 改期、取消和转移 | 原因与审批规则 |
| `M8-W5C-2` | P0 | Job | 催办和逾期升级 | 去重、频率和接收人 |
| `M8-W5C-3` | P0 | WeCom | 应用消息深链 | 发送结果和重试审计 |
| `M8-W5C-4` | P0 | Test | 时间边界与重复生成测试 | 时区、月末和并发 |

## 7. Wave 6：检查、问题与 CAPA

### 7.1 规格

- `docs/specs/safety/api/inspection-capa-api.yaml`
- `docs/specs/safety/db/inspection-capa-schema.md`
- `docs/specs/safety/state/inspection-capa-lifecycle.md`
- `docs/specs/safety/ui/inspection-and-capa-pages.md`
- 更新工作平台检查整改规格

### 7.2 工作项

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M8-W6A-1` | P0 | DB/API | 检查模板和版本 | 已发任务不受新版本覆盖 |
| `M8-W6A-2` | P0 | DB/API | 检查计划和多人任务 | all/any/quorum |
| `M8-W6A-3` | P0 | UI | 移动检查表 | 项目结论、说明、照片 |
| `M8-W6A-4` | P1 | Import | 法规/公司检查项导入 | 来源和版本可追溯 |
| `M8-W6B-1` | P0 | DB/API | 统一问题实体 | 来源、类型、等级、船舶 |
| `M8-W6B-2` | P0 | Rule | 自动转不符合项 | 幂等和失败补偿 |
| `M8-W6B-3` | P0 | Rule | 重大性和逾期升级 | 权限和人工确认 |
| `M8-W6C-1` | P0 | DB/API | 根因和 CAPA 措施 | 多措施、责任人、期限 |
| `M8-W6C-2` | P0 | State | 提交、验证、返工、关闭 | 关闭门槛 |
| `M8-W6C-3` | P0 | Integration | 既有四类检查来源接入 | 来源记录双向链接 |
| `M8-W6C-4` | P0 | Report/Test | 问题统计和全链路测试 | 可追溯至检查项 |

## 8. Wave 7：迁移、联调、上线与验收

| ID | 优先级 | 层次 | 工作项 | 验收重点 |
|---|---|---|---|---|
| `M8-W7A-1` | P0 | Migration | 存量分类和映射脚本 | 可重复演练 |
| `M8-W7A-2` | P0 | Migration | 数量、关联、状态校验 | 自动对账报告 |
| `M8-W7A-3` | P0 | Rollback | 回滚和只读兼容 | 不丢失新旧来源 |
| `M8-W7B-1` | P0 | Test | 全量 unit/integration/web | 零 P0 失败 |
| `M8-W7B-2` | P0 | Performance | 列表、待办、日历、导出性能 | 达到规格阈值 |
| `M8-W7B-3` | P0 | Device | iOS/Android/桌面真机 | 核心链路证据 |
| `M8-W7B-4` | P1 | Security | 越权、附件、导出和审计复测 | 无高风险缺陷 |
| `M8-W7C-1` | P0 | Release | 发布、回滚和监控材料 | 可直接执行 |
| `M8-W7C-2` | P0 | Docs | 操作手册和培训材料 | 与生产页面一致 |
| `M8-W7C-3` | P0 | Acceptance | Wave 1-7 验收与上线包 | 证据索引完整 |
| `M8-W7C-4` | P1 | Operations | Hypercare | 首周问题闭环 |

## 9. M8 最低验证命令

按受影响范围执行，最终 Wave 必须全部执行：

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

所有新增或修改的 OpenAPI 文件还需逐个执行：

```bash
npx swagger-cli validate <openapi-file>
```
