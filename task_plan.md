---
status: operations
owner: planning
updated: 2026-07-04
replaces: []
replaced_by: []
---
# 任务计划：新 M7 修复与 M8/M9 顺延文档规划

## 目标
在不实现业务代码的前提下，将 M1-M6 上线问题修复正式规划为新 M7，并将原 M7/M8 安全管理计划整体后移为 M8/M9。

## 当前阶段
阶段 6

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

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| 默认 PATH 找不到 `node` | 1 | 使用 Codex bundled Node 绝对路径执行文档脚本 |

## 备注
- 所有新增文档默认使用仓库现有 YAML front matter 风格。
- 规划中需保持 Enterprise WeCom 作为主运行容器的约束。
