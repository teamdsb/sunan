# `reminderApi` 状态规格

## 目标

支撑提醒看板统计、列表、详情、确认和手动扫描流程。

## 查询与操作

| 端点 | 用途 |
|---|---|
| `getReminderDashboard` | 看板统计 |
| `getReminderList` | 列表页分页查询 |
| `getReminderById` | 详情加载 |
| `acknowledgeReminder` | 确认提醒 |
| `triggerReminderScan` | 手动触发扫描 |

## 状态策略

1. 看板数据缓存时间可长于列表数据。
2. 确认提醒后更新详情本地缓存并失效看板计数。
3. 手动扫描返回异步任务后，前端轮询或提示用户稍后刷新。

## 测试关注点

- 重复确认返回 `409` 时的前端处理
- 扫描触发后 dashboard 刷新链路
- 仅本人可见与全局可见提醒的权限过滤
