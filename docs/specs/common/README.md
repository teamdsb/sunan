# 通用规格索引

> 状态：当前通用规格入口。跨领域 API、DB、认证、文件、通知、运维与 M6 验收材料从这里进入。

## 当前真源

| 文件 | 状态 | 用途 |
|---|---|---|
| `api-conventions.md` | 当前真源 | API 路径、响应包裹、分页、错误和版本约定 |
| `db-conventions.md` | 当前真源 | 主键、审计字段、软删除、migration、命名和索引约定 |
| `auth-spec.md` | 当前规格 | 企业微信 OAuth2、JWT、角色与权限边界 |
| `file-upload-spec.md` | 当前规格 | OSS 直传、文件元数据、业务绑定和访问控制 |
| `notification-spec.md` | 当前规格 | 系统通知、企业微信消息和消息状态约定 |
| `operations-observability-m6.md` | 运维上线 | M6 生产运维、可观测、告警和恢复 SOP |

## M6 计划与修复快照

| 文件 | 状态 | 说明 |
|---|---|---|
| `M6-优先级修复清单（分wave）.md` | 历史归档 | Wave A-D 已完成；不要作为当前待办清单 |
| `m6-wave5-quality-gates.md` | 验收归档 | Wave 5 质量门禁和证据 |
| `m6-waved-governance-closure.md` | 验收归档 | Wave D 治理收口报告 |

## M6 验收与上线证据

| 文件 | 状态 | 说明 |
|---|---|---|
| `acceptance-m6-wave1.md` | 验收归档 | M6 Wave 1 验收 |
| `acceptance-m6-wave4.md` | 验收归档 | M6 Wave 4 验收 |
| `acceptance-m6-wave5.md` | 验收归档 | M6 Wave 5 验收 |
| `acceptance-m6-wave6.md` | 验收归档 | M6 Wave 6 验收 |
| `acceptance-m6-wavec.md` | 验收归档 | M6 Wave C 财务补料与落地验收 |
| `acceptance-m6-waved.md` | 验收归档 | M6 Wave D 治理与上线证据验收 |
| `m6-wave6-go-live-package.md` | 运维上线 | M6 上线包索引 |
| `m6-wave6-hypercare-daily-template.md` | 模板 | Hypercare 每日日志模板 |
| `m6-wave6-test-and-smoke-report.md` | 验收归档 | M6 全量测试与冒烟报告 |

## 使用规则

- 任何 API 规格新增或变更，必须同时检查 `api-conventions.md`。
- 任何表结构、索引、审计字段或软删除改动，必须同时检查 `db-conventions.md`。
- 涉及登录、权限、附件或消息时，先读本目录对应通用规格，再读领域规格。
- 验收归档类文档只记录历史证据；新增需求不要直接改历史验收结论。
