---
status: operations
owner: planning
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 任务计划：M7 实现审计与 M8/M9 修复规划

## 目标
审计新 M7 的计划、规格、实现和验收证据是否闭环；将“采购见面 → 采购执行清单 → 查看详情”上传附件不可删除的问题纳入 M8/M9 升级计划；核实 M8/M9 每个 Wave 的 Agent 提示词是否齐备。

## 当前阶段
阶段 8

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

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 默认 PATH 找不到 `node` | 1 | 使用 Codex bundled Node 绝对路径执行文档脚本 |

## 备注
- 所有新增文档默认使用仓库现有 YAML front matter 风格。
- 规划中需保持 Enterprise WeCom 作为主运行容器的约束。
