---
status: operations
owner: planning
updated: 2026-07-12
replaces: []
replaced_by: []
---
# 任务计划：M7 审计与 M8 Wave 5-6 安全闭环

## 目标
完成 M8 Wave 5 的可复用计划任务中心、统一待办、真实日历与企业微信任务消息，并在其验收基础上完成 Wave 6 检查、统一问题和 CAPA 验证关闭闭环。

## 当前阶段
阶段 11

## 各阶段

### 阶段 1：需求与现状发现
- [x] 理解用户列出的 9 类问题
- [x] 确认仓库文档入口与现有计划结构
- [x] 阅读当前执行计划、prompt 索引、M1-M8 需求与相关规格入口
- [x] 将关键发现记录到 findings.md
- **状态：** complete

### 阶段 2：规划结构设计
- [x] 确定新 M7 与后移 M8/M9 的文档表达方式
- [x] 确定 M1-M6 修复计划的 wave 划分
- [x] 确定每个 M 的 prompt 文件命名、范围与验收口径
- **状态：** complete

### 阶段 3：文档实现
- [x] 新增或更新计划文档
- [x] 新增或更新 wave prompt
- [x] 更新 docs/README.md、docs/plans/README.md、docs/prompts/README.md 等必要索引
- [x] 更新 docs/inventory.md
- **状态：** complete

### 阶段 4：格式与一致性验证
- [x] 检查 Markdown front matter、状态、owner、updated、replacement 字段
- [x] 检查路径交叉引用有效
- [x] 检查 M7/M8 不再被当前执行计划误导为立即实施
- **状态：** complete

### 阶段 5：交付
- [x] 汇总改动文件
- [x] 说明未执行业务修复和后续实施入口
- **状态：** complete

### 阶段 6：里程碑重排
- [x] 将 M1-M6 修复从临时修复计划改为新 M7
- [x] 将原 M7 安全管理底座后移为 M8
- [x] 将原 M8 专业安全深化后移为 M9
- [x] 更新需求、执行计划、backlog、prompt 目录和索引引用
- **状态：** complete

### 阶段 7：M7 实现审计与 M8/M9 缺口登记
- [x] 读取 M7 需求、执行计划、backlog、6 个 Wave 提示词和验收材料
- [x] 对照代码、测试与提交历史，区分“文档已计划”“代码已实现”“验收已证实”
- [x] 明确附件删除缺口的归属 Wave、规格边界和验收标准
- [x] 经用户确认后更新 M8/M9 路线图、执行计划/backlog/提示词及索引
- [x] 运行文档索引和引用校验，输出 M8/M9 启动建议
- **状态：** complete

### 阶段 8：M8 Wave 1 安全管理底座文档冻结
- [x] 完整复核 M8 需求、路线、计划、backlog、现有规格与代码证据
- [x] 冻结 safety 边界、术语/状态、API/DB/state/UI 目录和实施前置
- [x] 冻结测试矩阵、迁移原则、验收模板与 Wave 提示词入口
- [x] 更新领域、计划、文档索引与 inventory，并通过 P0 文档门禁
- **状态：** complete

### 阶段 9：M8 Wave 2 权限与流程状态链
- [ ] 复核 Wave 1 验收、Wave 2 约束和既有工作平台权限实现
- [ ] 完成 workflow-and-permission API、DB、state、UI 规格并校验
- [ ] 先新增红灯权限与非法状态转换测试
- [ ] 实现 migration、参与人/代理/转移/审计和后端 ABAC 策略
- [ ] 实现前端受权动作呈现并执行全量验证与 Wave 2 验收
- **状态：** complete

### 阶段 10：M8 Wave 5 计划任务中心、待办、日历与企业微信任务消息
- [x] 完整复核 Wave 4 验收、Wave 5 需求/计划/backlog/prompt、通知与企业微信规格
- [x] 完成用户确认的任务中心布局与计划启用授权决策
- [x] 形成、自检并经用户确认 Wave 5 设计文档
- [x] W5.1 冻结 plan-task API、DB、state、UI 规格，更新安全领域与通知/企业微信规格索引
- [x] W5.2 按 TDD 建立周期边界、重复生成、并发、改期、取消、转移、时区、逾期与 OAuth 深链的失败测试
- [x] W5.3 实现迁移、实体、PlanTaskModule、计划/计划项、事务生成器、对账与统一任务查询
- [x] W5.4 实现任务动作、持久化投递、消息重试/去重和任务深链
- [x] W5.5 实现任务中心 A 布局、计划管理、真实日历与 API 驱动的加载/错误/权限状态
- [x] W5.6 执行受影响 API/Web 测试、build、OpenAPI、文档索引与验收证据收集
- **状态：** completed（Wave 5 自动化门禁全部通过）

### 阶段 11：M8 Wave 6 检查、问题与 CAPA
- [x] 阅读用户指定的需求、计划、Wave 2/3/5 规格、工作平台检查整改规格与代码现状
- [x] 提出独立安全领域对象、复用任务/证据/ABAC 的设计，并获用户确认
- [x] 写入并自检可审查设计文档；等待用户审阅书面设计
- [x] 冻结 inspection-capa API、DB、state、UI 规格并校验
- [x] 先建立模板版本、多人完成、自动转单幂等、关闭门槛和返工的红灯测试
- [x] 实现迁移、领域服务、来源双向链接与前端页面
- [x] 完成 API/Web/迁移/OpenAPI/文档全量验证和端到端证据链
- **状态：** completed（Wave 6 自动化门禁全部通过）

## 关键问题
1. 用户最新确认：M1-M6 修复应作为新的 M7；原 M7/M8 整体后移。
2. 新 M7 使用 6 个 Wave，对应上传/我的、办事、采购、工作台、企业微信直达和最终门禁。

## 已做决策
| 决策 | 理由 |
|------|------|
| 只改文档，不改业务代码 | 用户明确“规划好即可” |
| 先建立本次任务规划文件 | 符合 planning-with-files-zh 技能要求 |
| 不新增文档状态枚举 | `scripts/check-doc-index.mjs` 有固定 allowedStatuses |
| 采用新 M7 / 后移 M8-M9 命名 | 避免“当前修复”和“原 M7 安全管理”同时占用 M7 |
| M8 Wave 1 仅冻结文档，不新增业务代码或生产对象 | 用户明确本 Wave 的范围与禁止项 |
| Wave 2 以工作平台记录为首个受控资源 | 用户明确覆盖记录、附件、打印和导出；不提前实现 Wave 3-6 领域对象 |
| Wave 5 计划负责人可直接启用 | 用户确认不新增独立计划审批流；管理员才可跨范围启用或取消 |
| Wave 5 任务中心采用 A 布局 | 用户确认以待办为主、列表和日历同一查询、沿用既有蓝白企业 H5 视觉语言 |
| Wave 6 采用独立检查/CAPA 领域对象 | 结构化检查、问题和 CAPA 不能退回通用工作平台 payload；只复用任务、证据和 ABAC 基础 |

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 默认 PATH 找不到 `node` | 1 | 使用 Codex bundled Node 绝对路径执行文档脚本 |
| 尝试直接反向应用 Git diff 恢复规划文件被 `apply_patch` 拒绝 | 1 | 改为读取 index 原文，再用 `apply_patch` 删除并重建三个文件；历史内容已恢复 |
| Wave 6 OpenAPI 初次校验失败 | 1 | 流式 YAML 中带逗号的 response description 被解析为对象；按已验证的 Wave 5 模式加引号后通过 Swagger 校验 |
| 直接运行本地迁移连接被拒绝 | 1 | 本地 PostgreSQL 未运行；按 `make db-up` 启动后 `make migration-run` 成功执行 |

## 备注
- 所有新增文档默认使用仓库现有 YAML front matter 风格。
- 规划中需保持 Enterprise WeCom 作为主运行容器的约束。
