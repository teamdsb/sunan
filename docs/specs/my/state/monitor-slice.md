---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `monitorApi` 状态规格

## 目标

管理船舶监控入口列表与按船舶过滤结果。

## 状态结构

该域建议仅使用 RTK Query，无需单独 reducer。

## 查询策略

1. 首页进入监控页时先请求全部启用入口。
2. 点击某船后优先使用 `vesselId` 参数命中的缓存。
3. 监控地址仅做展示和跳转，不在前端持久化敏感口令。

## 测试关注点

- 相同 `vesselId` 请求复用缓存
- 禁用入口在普通用户视角不可见
- 外链打开失败时有明确兜底提示
