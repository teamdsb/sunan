---
status: current-spec
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台权限矩阵（M4 Wave 1 冻结）

## 1. 目的

本矩阵在不新增全局角色体系的前提下，基于 `docs/specs/common/auth-spec.md` 既有角色，冻结工作平台模块权限边界，供后续 API 守卫和前端可见性控制复用。

## 2. 角色定义（复用现有）

- `system_admin`
- `general_office`
- `finance`
- `business`
- `shipping`
- `logistics`
- `crew`
- `all_authenticated`

## 3. 工作平台权限点

| 权限点 | 说明 |
|---|---|
| `workbench_module_view` | 查看模块入口和列表 |
| `workbench_record_create` | 新建记录/提单 |
| `workbench_record_submit` | 提交流程或提交审核 |
| `workbench_record_execute` | 执行步骤、填写执行信息 |
| `workbench_record_review` | 审核、退回、关闭 |
| `workbench_record_print` | 打印/导出 A4/A3 |
| `workbench_attachment_upload` | 上传图片与附件 |
| `workbench_statistics_view` | 查看统计看板 |
| `workbench_statistics_export` | 导出统计报表 |
| `workbench_approval_launch` | 发起企业微信审批 |
| `workbench_approval_reconcile` | 审批对账与异常处理 |
| `workbench_module_admin` | 模块配置、模板配置、字典维护 |

## 4. 角色权限矩阵

| 权限点 | system_admin | general_office | finance | business | shipping | logistics | crew | all_authenticated |
|---|---|---|---|---|---|---|---|---|
| `workbench_module_view` | 全部 | 总经办+全局查询 | 财务部 | 业务部 | 船务部 | 后勤部 | 船务相关（按船） | 否 |
| `workbench_record_create` | 全部 | 总经办 | 财务部统计相关 | 业务部 | 船务部 | 后勤部 | 船务相关（按船） | 否 |
| `workbench_record_submit` | 全部 | 总经办 | 财务部统计相关 | 业务部 | 船务部 | 后勤部 | 船务相关（按船） | 否 |
| `workbench_record_execute` | 全部 | 总经办 | 财务部 | 业务部 | 船务部 | 后勤部 | 船务相关（按船） | 否 |
| `workbench_record_review` | 全部 | 总经办与全局终审 | 财务部财务节点 | 业务部本部门节点 | 船务部本部门节点 | 后勤部本部门节点 | 否 | 否 |
| `workbench_record_print` | 全部 | 总经办 | 财务部 | 业务部 | 船务部 | 后勤部 | 船务相关（按船） | 否 |
| `workbench_attachment_upload` | 全部 | 总经办 | 财务部 | 业务部 | 船务部 | 后勤部 | 船务相关（按船） | 否 |
| `workbench_statistics_view` | 全部 | 总经办+全局查询 | 财务部 | 业务部本部门 | 船务部本部门 | 后勤部本部门 | 仅本人/本船明细 | 否 |
| `workbench_statistics_export` | 全部 | 总经办 | 财务部 | 业务部本部门 | 船务部本部门 | 后勤部本部门 | 否 | 否 |
| `workbench_approval_launch` | 全部 | 总经办审批场景 | 财务部审批场景 | 业务部审批场景 | 船务部审批场景 | 后勤部审批场景 | 船员提单审批场景 | 否 |
| `workbench_approval_reconcile` | 全部 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| `workbench_module_admin` | 全部 | 总经办 | 否 | 否 | 否 | 否 | 否 | 否 |

## 5. 模块可见性基线

| 模块组 | 默认可见角色 |
|---|---|
| 总经办模块 | `system_admin`、`general_office` |
| 财务部统计中心 | `system_admin`、`general_office`、`finance` |
| 业务部模块 | `system_admin`、`general_office`、`business` |
| 船务部模块 | `system_admin`、`general_office`、`shipping`、`crew`（按船） |
| 后勤部模块 | `system_admin`、`general_office`、`logistics` |
| 工作组模块 | `system_admin`、`general_office`、`business`、`shipping`（按业务分配） |

## 6. 冻结约束

- 不新增新的全局角色。
- 工作平台权限由角色 + 部门 + 船舶归属三者共同决定。
- `crew` 角色必须施加“按船”和“按本人”数据范围限制。
- 审批对账能力仅允许 `system_admin` 使用。
