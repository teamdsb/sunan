---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `settingsApi` 状态规格

## 目标

维护当前用户的显示偏好和提醒展示偏好。

## 数据模型

```typescript
interface UserSettings {
  defaultModule: 'my';
  reminderViewMode: 'dashboard' | 'list';
  certificateGroupBy: 'owner' | 'type';
  enablePushNotifications: boolean;
  theme: 'light';
}
```

## 行为规则

1. 登录成功后立即拉取设置；若接口首次自动建档，前端无需单独初始化。
2. 更新设置采用乐观更新，但失败时回滚。
3. 设置变更应立即反映到列表分组和默认页面入口。

## 测试关注点

- 首次登录自动建档
- 乐观更新失败回滚
- 设置切换后跨页面保持一致
