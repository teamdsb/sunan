---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# `certificateApi` 状态规格

## 目标

管理证照列表、详情、分组查询、类型字典和附件关联。

## 关键查询

| 端点 | 用途 |
|---|---|
| `getCertificates` | 列表页分页查询 |
| `getGroupedCertificates` | 按持有对象或证书类型分组 |
| `getCertificateById` | 详情页加载 |
| `createCertificate` | 新建证照 |
| `updateCertificate` | 更新证照 |
| `bindCertificateFiles` | 绑定附件 |

## 缓存与失效

1. 列表和分组结果使用独立 cache key。
2. 更新证照后失效当前详情、列表和提醒看板。
3. `certificateTypes` 建议在应用启动后预加载并长缓存。

## 表单协作规则

1. `ownerType` 变化时重置 `ownerId` 与候选项。
2. `certificateTypeId` 变化时自动带出默认 `advanceDays`。
3. 文件上传完成后仅保存 `fileIds`，提交成功前不写入业务主表。

## 测试关注点

- 分组查询与列表查询结果一致性
- 到期日期变更后提醒相关缓存失效
- 合同类证书默认 90 天提醒
