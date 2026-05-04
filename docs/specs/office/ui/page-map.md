---
status: current-spec
owner: office
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 办事模块页面地图

## 路由结构

| 路由 | 页面 | 说明 |
|---|---|---|
| `/office` | 办事首页 | 分类入口与目录列表 |
| `/office/search` | 办事搜索页 | 搜索结果和筛选 |
| `/office/admin` | 办事治理台 | 分类分权维护入口 |

## 导航原则

1. `/office` 为办事模块首页。
2. 搜索结果页保留查询参数，支持从首页跳转。
3. 治理台不拆详情页，M2 采用单页列表加弹窗编辑。
