---
status: current-index
owner: common
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 通用规格索引

> 状态：当前通用规格入口。跨领域 API、DB、认证、文件、通知和仍在维护的运维规格从这里进入。

## 当前真源

| 文件 | 状态 | 用途 |
|---|---|---|
| `api-conventions.md` | 当前真源 | API 路径、响应包裹、分页、错误和版本约定 |
| `db-conventions.md` | 当前真源 | 主键、审计字段、软删除、migration、命名和索引约定 |
| `auth-spec.md` | 当前规格 | 企业微信 OAuth2、JWT、角色与权限边界 |
| `file-upload-spec.md` | 当前规格 | OSS 直传、文件元数据、业务绑定和访问控制 |
| `notification-spec.md` | 当前规格 | 系统通知、企业微信消息和消息状态约定 |
| `operations-observability-m6.md` | 运维上线 | M6 生产运维、可观测、告警和恢复 SOP；后续生产 SOP 可在此演进 |

## 归档入口

| 归档 | 状态 | 说明 |
|---|---|---|
| `docs/archive/backlogs/common/` | 历史归档 | M6 修复清单 |
| `docs/archive/acceptance/common/` | 验收归档 | M6 验收、质量门禁、上线包和测试报告 |
| `docs/archive/templates/common/` | 模板归档 | M6 Hypercare 日报模板 |

## 使用规则

- 任何 API 规格新增或变更，必须同时检查 `api-conventions.md`。
- 任何表结构、索引、审计字段或软删除改动，必须同时检查 `db-conventions.md`。
- 涉及登录、权限、附件或消息时，先读本目录对应通用规格，再读领域规格。
- 验收归档类文档已迁入 `docs/archive/`，只记录历史证据；新增需求不要直接改历史验收结论。
