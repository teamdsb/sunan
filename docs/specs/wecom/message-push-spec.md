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
4. 发送失败要记录 `errcode/errmsg` 与失败对象。
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

## 频率与调用建议

1. 避免在每小时 `00` 分和 `30` 分集中推送。
2. 单成员推送频率控制在企业微信上限以内（以官方实时规则为准）。
3. 批量消息按业务优先级拆批，避免一次全量失败。

## 错误处理

| 错误 | 处理方式 |
|---|---|
| 接收人不存在（`invaliduser`） | 记录日志，不重试 |
| `access_token` 失效（`42001`） | 强制刷新 token 并重试一次 |
| 网络超时 | 最多重试 3 次，间隔 30 秒 |
| 频率超限 | 记录告警并降速重试 |

## M3 约束声明

1. 本期不对接企业微信原生审批 API。
2. 本期不启用审批回调地址。
3. 审批流消息仅作提醒，不作为审批状态唯一来源。
