---
status: historical-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# M2 执行计划：办事模块“门户治理版”（历史归档）

> M2 实现已完成（2026-04-16），本文档为历史参考。

## Wave 状态

### Wave 1
- [x] WS-1A M2 需求与 SDD 规格收口
- [x] WS-1B `docs/execplans.md` 切换为 M2 主计划

### Wave 2
- [x] WS-2A 办事分类种子数据与后端查询接口
- [x] WS-2B `/office` 首页与 `/office/search` 搜索页
- [x] WS-2C 统一 launch helper 与打开链路

### Wave 3
- [x] WS-3A 办事治理后台 API
- [x] WS-3B 办事治理台前端页面
- [x] WS-3C 分类分权与目标地址校验

### Wave 4
- [x] WS-4A 打开行为与治理行为审计
- [x] WS-4B 企业微信上线检查清单
- [x] WS-4C 联调与测试补齐

### Wave 5（Phase5）
- [x] WS-5A 壳层导航多模块化验收
- [x] WS-5B office 领域实体/接口/状态/页面联动验收
- [x] WS-5C 打开与治理审计闭环验收

## Wave 1：规格收口

### 目标
- 明确 M2 只做“办事门户治理版”，不扩为审批流。
- 固化七类办事分类、分类维护权矩阵、状态机与验收标准。
- 补齐 office 领域的 SDD 文档目录与状态表。

### 产出
- `docs/requirements/M2-办事.md`
- `docs/specs/office/README.md`
- `docs/specs/office/api/*`
- `docs/specs/office/db/*`
- `docs/specs/office/state/*`
- `docs/specs/office/ui/*`

## Wave 2：目录与搜索

### 实现范围
- 初始化办事分类种子数据。
- 新增办事分类与目录查询接口。
- 实现 `/office` 首页、`/office/search` 搜索页。
- 建立统一入口打开链路，区分站内与站外跳转。

### 验收标准
- 登录用户可按分类浏览办事入口。
- 支持按关键词搜索标题和摘要。
- 仅返回当前用户有权限访问的已发布入口。

## Wave 3：治理后台

### 实现范围
- 办事入口治理端 CRUD。
- 草稿、发布、停用三态流转。
- 分类维护权校验。
- URL、路由白名单、角色可见性校验。

### 验收标准
- 分类维护人不能跨分类维护入口。
- 未发布和已停用入口对普通用户不可见。
- 系统管理员可跨分类查看和维护全部入口。

## Wave 4：审计与上线准备

### 实现范围
- 入口打开行为审计。
- 创建、更新、发布、停用审计。
- 企业微信正式域名、可信域名、回调域名、JS 接口安全域名检查清单。
- 测试与联调补齐。

### 验收标准
- 可追踪谁在什么时候维护或打开了哪个入口。
- 企业微信后台配置项具备上线检查单。
- 关键跳转链路在 iOS/Android 企业微信中通过验证。

## Wave 5（Phase5）：扩展收敛与验收归档

### 实现范围
- 壳层导航从单模块扩展为多模块导航（`/my`、`/office`、`/procurement`、`/workbench`）。
- office 领域实体、接口、状态、页面与路由映射统一验收。
- 打开行为与治理行为审计形成闭环（接口、页面、测试、上线清单一致）。

### 验收标准
- AppShell 可在桌面端与移动端显示模块导航，并正确高亮当前模块。
- office 规格与实现一一对应：实体、API、状态、页面均可追踪到实现文件。
- 审计链路可覆盖 `open/create/update/publish/disable` 且在治理台可查询。
