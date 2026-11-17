---
status: audit-snapshot
owner: repository
updated: 2026-11-17
replaces: []
replaced_by: []
---
# 文件授权与检查/CAPA 下载复核

检查/CAPA 新增两条业务下载接口：
- `GET /api/v1/inspections/:inspectionId/files/:fileId/download-url`
- `GET /api/v1/capa-actions/:actionId/files/:fileId/download-url`

检查入口先验证检查读取权限，再确认未删除结果中的证据或个人签认关系；CAPA 入口先验证所属问题读取权限，再确认当前措施 active 且未删除的证据关系。详情只返回 id、文件名、MIME、大小与创建时间；不返回存储 key、路径或下载 URL。UI 已显示保存证据与签认并通过对应业务入口预览/下载。上传成功绑定后清空临时上传控件。

## 验证

- 修改前真实 PostgreSQL 新增回归：两条业务下载均 404（预期 200）。UI 两条查看回归失败。
- 修改后 inspection/CAPA PostgreSQL：10/10，通过正常业务读取、无读取权限拒绝、外来 fileId 拒绝、撤回 CAPA 证据拒绝、通用下载仍拒绝。
- 文件授权 PostgreSQL 最终复跑：15/15。
- 文件及 inspection/CAPA 单元：4 suites，42/42。
- 检查/CAPA 页面及上传控件：2 suites，17/17。
- web `tsc -b`、涉及 API 文件 eslint、`git diff --check` 均通过。
- inspection OpenAPI YAML 可解析，25 paths、195 个本地引用均可解析。

## 独立链路复核

- 通用下载、旧 callback key 与旧企微 media 重放先锁定文件行，再验证本人且无业务/历史引用，签名发生在事务内。管理员不绕过通用入口。
- 新业务绑定同事务调用统一 helper；目标原有关系可保留。普通用户新绑定须本人未引用文件；system_admin 保留既有业务管理绑定能力。
- hasFileReferences 覆盖当前全部业务文件 ID 列，包括检查签认、证据、导出、打印快照及历史附件审计。解绑与回收也锁定文件并复查引用。
- 证照、企业资料、制度、采购附件与导出、工作台附件、考勤导出已有业务路径，下载先验证业务权限/关系。企业资料、制度和证照的已发布/有效内容按登录成员读取；企业资料归档状态遵循当前规格，仅系统管理员可读取和下载。
- 已交由 workbench owner 补齐：自查照片拒绝本人跨记录已引用文件并加文件锁；工作台独立 signature 业务下载、安全 metadata 与 UI；EvidencePanel 已绑定上传状态清空。此报告未声称这些 owner 改动已验证。
