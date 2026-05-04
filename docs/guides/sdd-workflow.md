---
status: current-source
owner: guides
updated: 2026-05-04
replaces: []
replaced_by: []
---
# SDD 工作流程

苏南项目采用 **SDD（规格驱动开发）+ TDD（测试驱动开发）** 方法论。本文档说明开发流程，确保所有团队成员和 Coding Agent 遵循一致的工作方式。

## 核心原则

> **规格先行，测试次之，实现最后。**

在任何功能的代码被写出之前，必须先有对应的规格文档。测试基于规格编写，代码实现以通过测试为目标。

## 完整开发流程

```
需求确认
   │
   ↓
① 编写/更新规格文档（docs/specs/）
   │
   ↓
② 评审规格（团队 review 或 Coding Agent 验证）
   │
   ↓
③ 编写测试（基于规格，不依赖实现）
   │
   ↓
④ 运行测试（全部失败是正常的——红灯阶段）
   │
   ↓
⑤ 编写实现代码（以通过测试为目标）
   │
   ↓
⑥ 运行测试（全部通过——绿灯阶段）
   │
   ↓
⑦ 重构优化（保持测试通过）
   │
   ↓
⑧ 提交代码 + 更新规格状态
```

## 规格文档类型与位置

| 规格类型 | 目录 | 工具消费 |
|---|---|---|
| API 规格 | `docs/specs/{模块}/api/*.yaml` | Mock Server (Prism)、代码生成、Supertest |
| 数据库规格 | `docs/specs/{模块}/db/*.md` | TypeORM Migration 验证 |
| 状态规格 | `docs/specs/{模块}/state/*.md` | Jest + RTK 测试工具 |
| 页面规格 | `docs/specs/{模块}/ui/*.md` | React Testing Library |
| 集成规格 | `docs/specs/wecom/*.md` | Jest mock |

## Coding Agent 使用规范

本项目鼓励使用 Claude Code 等 Coding Agent 加速开发。Agent 工作时须遵守：

### Agent 的输入
- **必须**先读取对应的规格文档，再生成代码
- **必须**读取 `docs/specs/common/api-conventions.md` 和 `docs/specs/common/db-conventions.md`
- 使用 CLAUDE.md 中的项目上下文（待建立）

### Agent 的输出
- 生成的代码须附带对应测试
- 不得偏离规格文档中定义的接口/字段命名
- 如规格有歧义，须先更新规格再实现

### Prompt 工程最佳实践

```
# 示例 Prompt 模板（后端 API）

请根据以下规格实现 NestJS Controller 和 Service：

规格文档：
- API 规格：docs/specs/my/api/certificate-api.yaml
- 数据库规格：docs/specs/my/db/certificates.md
- 通用规范：docs/specs/common/api-conventions.md、db-conventions.md

要求：
1. 严格遵循 OpenAPI 规格中的路径、参数和响应结构
2. 同时生成对应的 Supertest 集成测试
3. 使用 TypeORM Repository 模式
4. DTO 使用 class-validator 装饰器校验
```

## API 规格工作流

### 前后端并行开发

1. 后端开发前，API YAML 规格须通过 `swagger-cli validate` 校验
2. 使用 Prism 启动 Mock Server，前端可立即开始联调：
   ```bash
   npx @stoplight/prism-cli mock docs/specs/my/api/certificate-api.yaml
   ```
3. 前端使用 Mock Server 开发，后端实现真实 API
4. 联调阶段切换环境变量，对接真实 API

### TypeScript 类型生成

从 OpenAPI 规格自动生成 TypeScript 类型：
```bash
openapi-generator-cli generate \
  -i docs/specs/my/api/certificate-api.yaml \
  -g typescript-axios \
  -o src/api/generated
```

## 规格更新规则

- 规格是**合约**，一旦进入实现阶段不得随意修改
- 需要变更规格时，须：
  1. 创建新的讨论记录（PR 或 Issue）
  2. 评审影响范围
  3. 同步更新相关测试
  4. 更新规格文件并注明变更原因

## 规格状态标记

规格文档在对应的 README.md 中以状态表格追踪：

| 状态 | 含义 |
|---|---|
| 待编写 | 尚未开始 |
| 编写中 | 正在编写，未 review |
| 已评审 | 完成 review，可进入实现 |
| 已实现 | 对应代码已实现并通过测试 |
| 已废弃 | 不再使用，保留作历史参考 |
