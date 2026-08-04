---
status: current-spec
owner: common
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 认证与授权规格

## 认证方式

系统使用企业微信 OAuth2 + JWT 双令牌认证体系：

- **企业微信 OAuth2**：负责身份识别（谁在使用系统）
- **JWT**：负责会话维持（后续请求无需再走 OAuth2）

详见 `docs/specs/wecom/oauth2-spec.md`。

## RBAC 权限模型

系统采用基于**职务/角色**的访问控制（RBAC）。业务角色优先由企业微信通讯录返回的**部门 ID**决定；系统管理员由独立的企业微信 UserID 白名单决定，不从部门推导。

### 内置角色定义

| 角色 | 判定条件 | 权限范围 |
|---|---|---|
| `system_admin` | UserID 位于 `WECOM_SYSTEM_ADMIN_USER_IDS` | 全部功能 + 系统设置 |
| `general_office` | 部门 ID = 3（总经办） | 总经办所有模块 + 全局查询 |
| `finance` | 部门 ID = 4（财务部） | 财务部模块 |
| `business` | 部门 ID = 5（业务部） | 业务部模块 |
| `shipping` | 部门 ID = 6（船务部） | 船务部模块 + 船员操作 |
| `logistics` | 部门 ID = 7（后勤部） | 后勤部模块 |
| `crew` | 部门 ID = 8（船员）；职务匹配仅作旧数据兼容 | 船务相关操作（限所属船只） |
| `all_authenticated` | 任意已登录用户 | "我的"模块（只读） |

部门 ID 1（公司成员）和 2（待设置部门）不授予额外业务角色。成员同时属于多个部门时，业务角色和部门数据范围取并集并去重；`system_admin` 始终独立判定。

### 里程碑1（"我的"模块）权限矩阵

| 功能 | 普通员工 | 部门管理员 | 系统管理员 |
|---|---|---|---|
| 查看企业资料 | ✓ | ✓ | ✓ |
| 管理企业资料 | ✗ | ✓（本部门） | ✓ |
| 查看企业制度 | ✓ | ✓ | ✓ |
| 上传/更新企业制度 | ✗ | ✓ | ✓ |
| 查看电子证照 | ✓ | ✓ | ✓ |
| 上传/更新证照 | ✗ | ✓ | ✓ |
| 查看证书提醒 | ✓（本人相关） | ✓（部门相关） | ✓（全部） |
| 确认提醒 | ✓（本人相关） | ✓（部门相关） | ✓ |
| 查看船舶监控 | ✓ | ✓ | ✓ |
| 管理监控端口 | ✗ | ✗ | ✓ |
| 修改系统设置 | ✗ | ✗ | ✓ |

## JWT 守卫规格（NestJS）

```typescript
// 所有需要认证的接口使用 @UseGuards(JwtAuthGuard)
// 需要特定权限的接口使用 @UseGuards(JwtAuthGuard, RolesGuard)
// 配合 @Roles('system_admin') 装饰器使用

// 接口中通过 @CurrentUser() 装饰器获取当前用户
interface CurrentUserDto {
  userId: string;       // 企业微信 UserId
  corpId: string;
  name: string;
  departmentIds: number[];
  departments: string[];
  position: string;
  roles: string[];      // 推断出的角色列表
}
```

## 公开接口

以下接口**不需要**认证：

- `GET /api/v1/auth/wecom/callback`（OAuth2 回调）
- `GET /api/health`（健康检查）

所有其他接口均需要有效 JWT。

## 里程碑3（采购管理）权限点

采购管理模块新增以下权限点：

| 权限点 | 说明 |
|---|---|
| `procurement_submit` | 采购单创建、草稿编辑、提交、退回后重提 |
| `procurement_approve` | 采购单与报表审批单审批动作 |
| `procurement_report` | 报表查询、报表审批单创建与导出 |

### M3 权限矩阵（最小集）

| 能力 | 普通员工 | 部门主管 | 财务部 | 总经办 | 系统管理员 |
|---|---|---|---|---|---|
| 创建/提交采购单 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 审批采购单（部门节点） | ✗ | ✓（本部门） | ✗ | ✗ | ✓ |
| 审批采购单（终审节点） | ✗ | ✗ | ✗ | ✓ | ✓ |
| 创建报表审批单 | ✓（按可见范围） | ✓ | ✓ | ✓ | ✓ |
| 审批报表（财务节点） | ✗ | ✗ | ✓ | ✗ | ✓ |
| 审批报表（终审节点） | ✗ | ✗ | ✗ | ✓ | ✓ |
| 维护采购细分字典 | ✗ | ✗ | ✗ | ✓ | ✓ |

## 原生审批预留开关

为后续接入企业微信原生审批流，预留环境变量：

- `PROCUREMENT_APPROVAL_BACKEND=internal|wecom_native`

M3 固定使用 `internal`，`wecom_native` 仅作契约预留。
