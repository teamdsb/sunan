---
status: current-spec
owner: wecom
updated: 2026-11-17
replaces: []
replaced_by: []
---
# 企业微信消息推送规格

## 概述

系统通过企业微信应用消息 API 推送业务通知。

- M1：证书到期提醒
- M3：采购审批与报表审批提醒

本期不接入企业微信原生审批流，只发送应用消息提醒。

## 推送接口

企业微信 API：

```
POST https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={ACCESS_TOKEN}
```

## 通用发送规则

1. `touser` 多成员使用 `|` 分隔。
2. `agentid` 使用自建应用 AgentID。
3. `safe=0`（非密级消息）。
4. 发送失败记录错误码、脱敏原因与失败对象，不保存上游原始错误体。
5. `42001` 触发 token 刷新后重试。

## 消息类型规格

### 证书到期提醒（文本卡片）

```json
{
  "touser": "ZhangSan|LiSi",
  "msgtype": "textcard",
  "agentid": "{AGENT_ID}",
  "textcard": {
    "title": "证书到期提醒",
    "description": "<div class=\"gray\">提醒时间：2024-01-15 09:00</div><div class=\"normal\">苏南012 · 国籍证书</div><div class=\"highlight\">将于 30 天后到期（2024-02-14）</div>",
    "url": "https://{APP_DOMAIN}/my/reminders/{reminderId}",
    "btntxt": "查看详情"
  }
}
```

### 采购审批提醒（文本卡片）

适用节点：

- 采购单提交后通知部门主管
- 部门通过后通知总经办
- 审批结果通知申请人

```json
{
  "touser": "ApproverUserId",
  "msgtype": "textcard",
  "agentid": "{AGENT_ID}",
  "textcard": {
    "title": "采购审批待处理",
    "description": "<div class=\"gray\">单号：CG202604170001</div><div class=\"normal\">后勤部 · 食堂物资采购</div><div class=\"highlight\">金额：¥12800.00</div>",
    "url": "https://{APP_DOMAIN}/procurement/orders/{orderId}",
    "btntxt": "立即审批"
  }
}
```

### 报表审批提醒（文本卡片）

适用节点：

- 报表审批单提交后通知部门主管
- 部门通过后通知财务部
- 财务通过后通知总经办
- 审批结果通知发起人

```json
{
  "touser": "ApproverUserId",
  "msgtype": "textcard",
  "agentid": "{AGENT_ID}",
  "textcard": {
    "title": "报表审批待处理",
    "description": "<div class=\"gray\">单号：BG202604170001</div><div class=\"normal\">2026年03月采购月报</div><div class=\"highlight\">请在系统中完成审批</div>",
    "url": "https://{APP_DOMAIN}/procurement/report-approvals",
    "btntxt": "查看报表"
  }
}
```

### M8 任务提醒（文本卡片）

任务分派、催办、转移和逾期升级都使用同一文本卡片模型。链接必须指向具体任务，不得只打开工作平台首页；服务端先持久化一位接收人一条投递记录，再调用企业微信 API。

```json
{
  "touser": "ResponsibleUserId",
  "msgtype": "textcard",
  "agentid": "{AGENT_ID}",
  "textcard": {
    "title": "安全任务待处理",
    "description": "<div class=\"gray\">期限：2026-07-31 17:00</div><div class=\"normal\">救生设备月度检查</div><div class=\"highlight\">请在系统中完成任务</div>",
    "url": "https://{APP_DOMAIN}/workbench/tasks/{taskId}?notificationId={deliveryId}",
    "btntxt": "查看任务"
  }
}
```

`notificationId` 用于投递审计关联，不作为访问凭据。前端进入深链时保存完整本地 URL；OAuth 恢复后回到该任务并重新验证 JWT、ABAC 和 `availableActions`。

## 频率与调用建议

1. 避免在每小时 `00` 分和 `30` 分集中推送。
2. 单成员推送频率控制在企业微信上限以内（以官方实时规则为准）。
3. 批量消息按业务优先级拆批，避免一次全量失败。

## 错误处理

| 错误 | 处理方式 |
|---|---|
| 接收人不可见或不存在（`invaliduser`） | 逐人记确认失败；修复可见范围/资格后手动重试 |
| `access_token` 失效（`42001`） | 只刷新同一配置应用 token，最多重试一次 |
| 网络超时、断连、5xx、无法确认外部结果 | 记 `uncertain`，停止自动重发，进入人工核对 |
| 确认拒绝、频率超限等业务错误 | 记录码和失败；任务按既有退避策略重试，采购等通过管理入口手动重试 |
| 配置读取、解密、token获取失败 | 保存失败记录，不回退主应用；修复后重试 |

统一发送记录按业务键加接收人去重，`sent` 不重推；`sending/uncertain` 未核对不重发。超时 15 分钟的 `sending` 可由管理员人工核对。企业微信接受消息不等于收件人真实看到消息。任务与证书保留原生业务投递/确认记录，统一发送结果不得覆盖证书 `acknowledged/resolved`。

## M3 约束声明

1. 本期不对接企业微信原生审批 API。
2. 本期不启用审批回调地址。
3. 审批流消息仅作提醒，不作为审批状态唯一来源。

## M9 Wave 4 后台管理契约

当前实现已接入证书、采购、报表与计划任务。[W4 验收](../../acceptance/M9-wave-4.md) 为条件验收，真实租户收发仍待现场执行。主应用 OAuth、通讯录、JS-SDK、回调及其他主应用 API 继续使用 env。

以下接口均要求 JWT + env `system_admin`，位于 `/api/v1/settings/notification`：

| 方法/后缀 | 输入与结果 |
|---|---|
| `GET /` | 非敏感主应用标识、当前来源/AgentID/`configVersion`、`secretStored`、密钥可用/轮换标识、配置故障；不返回密文、Secret或主密钥 |
| `PATCH /` | `expectedConfigVersion` + `agentId`/可选`secret`；或明确`clearOverride:true`。冲突409，半配置422，密钥缺失/解密失败503；不允许CorpID/env字段 |
| `POST /connection-test` | 可选AgentID/Secret/清除草稿；直接验证该草稿凭据可取得token，不修改线上配置，不证明送达 |
| `POST /draft-test` | 上述草稿 + 唯一`testUserId`，可选title/description/url；仅该有效成员，随机测试去重键和token缓存标识，不修改线上配置 |
| `GET /deliveries` | 最近100条failed/uncertain或超时sending；返回来源、接收人、实际应用/版本、错误码、历史与人工核对审计，不返回消息负载或凭据 |
| `POST /deliveries/:id/reconcile` | `delivered:boolean`；仅uncertain/超时sending允许；记录操作者/时间，已送达终止重发，未送达转failed |
| `POST /deliveries/:id/retry` | 仅failed业务消息；重验有效账号和原业务当前资格，复用去重键，按当前配置重试；不重发草稿测试 |
| `POST /encryption-key/rotate` | env新旧独立密钥同时存在时，认证解密后重新加密，递增配置版本和脱敏审计；已是当前密钥时幂等 |

配置表为`notification_app_configs`，审计为`notification_app_config_audits`，统一投递为`notification_delivery_attempts`。无覆盖用完整env主应用；保存/清除/恢复/轮换均创建递增版本。原始业务键最长255字符，追加最长64字符收件人后通用键最长320字符。

密钥轮换操作及回滚限制见 [token与密钥](token-cache-spec.md)。主应用env Secret不入库；错误覆盖不得静默改用主应用。API不返回可还原Secret，日志不输出token、凭据或上游原始错误体。
