# 企业微信消息推送规格

## 概述

使用企业微信应用消息推送 API 向指定成员发送通知。里程碑1主要用于证书到期提醒。

## 推送接口

**企业微信 API：**
```
POST https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token={ACCESS_TOKEN}
```

## 消息类型规格

### 证书到期提醒（文本卡片消息）

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

**消息内容规则：**
- `title`：始终为"证书到期提醒"
- `description`：包含证书持有对象、证书类型、剩余天数、到期日期
- `url`：深链接到系统内对应提醒详情页
- `btntxt`："查看详情"

### 消息发送参数规则

| 字段 | 规则 |
|---|---|
| `touser` | 多人用 `\|` 分隔；单发用具体 UserId；全员发送用 `@all`（不推荐） |
| `agentid` | 使用系统自建应用的 AgentID |
| `safe` | 设为 `0`（非保密消息，允许转发） |

## NestJS Service 接口规格

```typescript
// services/WecomMessageService

interface SendTextCardOptions {
  userIds: string[];       // 接收人 UserId 列表
  title: string;
  description: string;
  url: string;
  btnText?: string;        // 默认"查看详情"
}

interface WecomMessageService {
  sendTextCard(options: SendTextCardOptions): Promise<{
    invalidUser: string[];   // 发送失败的 UserId（不在企业通讯录等）
  }>;
}
```

## 证书提醒定时任务规格

```typescript
// 每日 09:00 执行
// @Cron('0 9 * * *')
// CertificateReminderJob

// 执行步骤：
// 1. 查询 certificates 表，找出以下条件的记录：
//    - expiry_date <= NOW() + advance_days
//    - expiry_date > NOW()（未过期）
//    - deleted_at IS NULL
// 2. 查询 certificate_reminders 表，排除当天已发送且已确认的记录
// 3. 根据 notification-spec.md 中的路由规则确定接收人
// 4. 调用 WecomMessageService.sendTextCard
// 5. 写入/更新 certificate_reminders 记录（status: 'sent'）
// 6. 对于已过期的证书，同样发送提醒，status 标记为 'overdue'
```

## 错误处理

| 错误 | 处理方式 |
|---|---|
| 接收人不存在（`invalidUser` 非空） | 记录日志，不重试 |
| access_token 失效 | 自动刷新后重试一次 |
| 网络超时 | 最多重试3次，间隔30秒 |
| 全部失败 | 记录告警日志，人工处理 |

## 环境变量

| 变量名 | 说明 |
|---|---|
| `WECOM_AGENT_ID` | 自建应用 AgentID |
| `APP_DOMAIN` | 系统域名（用于生成深链接 URL） |
