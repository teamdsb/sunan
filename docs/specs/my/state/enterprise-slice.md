---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `enterpriseApi` 状态规格

## 目标

承载企业资料与企业制度的数据访问、缓存失效和文件绑定流程。

## 查询模型

| 资源 | 列表查询 | 详情查询 | 变更操作 |
|---|---|---|---|
| 企业资料 | `getEnterpriseProfiles` | `getEnterpriseProfileById` | `create/update/delete/bindFiles` |
| 企业制度 | `getEnterprisePolicies` | `getEnterprisePolicyById` | `create/update/delete/publish` |

## 缓存策略

1. 列表按查询参数序列化缓存。
2. 详情页命中后写入实体级 tag，例如 `EnterpriseProfile:id`。
3. 发布制度后同时失效 `EnterprisePolicy` 与 `PolicyVersion`。

## 前端派生状态

- 当前是否存在草稿制度
- 当前列表是否为空
- 文件上传回调后待绑定 `fileIds`

## 测试关注点

- 创建资料后列表自动刷新
- 制度发布后版本历史同步更新
- 多附件绑定时顺序保持稳定
