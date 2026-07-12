---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# Wave 3 证据与导出状态

## 证据关系

| 动作 | 来源 | 目标 | 授权与审计 |
|---|---|---|---|
| bind/capture/sign | 无或 `unlinked` | `active` | 记录 ABAC + 可执行附件动作；写创建审计 |
| replace | `active` | 原证据 `replaced`，新证据 `active` | 需非空原因；保留原文件和 hash |
| archive | `active|replaced` | `archived` | 需归档动作和原因；不可静默覆盖 |
| unlink | `active` | `unlinked` | 需非空原因；仅解除业务关系，绝不删除 `files` 或 OSS |

定位 `captured` 需经纬度与精度；`denied|sdk_failed` 只允许失败说明，禁止写坐标。签名必须保存 SHA-256 业务摘要和签署文件。企业微信 media 转存与导出失败均可重试，且重试本身必须审计。

## 导出任务

```text
queued --worker claim--> running --file persisted--> succeeded
   ^                         |                         |
   |                         +--failure--> failed       +--terminal
   +------ authorized retry -------------------+
```

- 仅 worker 可从 `queued` 原子领取为 `running`；崩溃恢复由超时的 running 任务转为 `failed` 并记录诊断信息。
- 仅 `failed` 可重试；重试者必须对源记录/考勤范围具有与创建者相同的授权，重置结果文件和失败字段后进入 `queued`。
- `succeeded` 只在真实文件元数据已经持久化后达成；下载仍须重新验证源记录权限，不能因曾经成功而绕过权限。
- 前端轮询 queued/running，succeeded 展示下载，failed 展示可理解错误和重试；不得将 queued 或 fileId 占位值显示为完成。
