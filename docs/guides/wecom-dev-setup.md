# 企业微信开发与发布配置指南（M6）

## 1. 文档定位

本指南用于统一 M6 的企业微信开发、联调、预发布和生产发布配置口径，覆盖：

- OAuth2
- 可信域名
- JS 接口安全域名
- 回调配置
- 审批模板 / 消息模板
- 真机验证
- 发布前核对

## 2. 必备参数

### API

| 参数 | 说明 |
|---|---|
| `WECOM_CORP_ID` | 企业 CorpID |
| `WECOM_AGENT_ID` | 自建应用 AgentID |
| `WECOM_AGENT_SECRET` | 自建应用 Secret |
| `WECOM_REDIRECT_URI` | OAuth2 回调地址 |
| `WECOM_TOKEN` | 回调校验 Token |
| `WECOM_ENCODING_AES_KEY` | 回调加密 Key |

### Web

| 参数 | 说明 |
|---|---|
| `VITE_WECOM_CORP_ID` | 企业 CorpID |
| `VITE_WECOM_AGENT_ID` | 自建应用 AgentID |
| `VITE_WECOM_REDIRECT_URI` | 前端 OAuth2 回调地址 |
| `VITE_API_BASE_URL` | API 基地址 |

## 3. 后台配置项

### 3.1 自建应用

- 创建企业微信自建应用。
- 确认 `AgentId`、应用 Secret、应用可见范围。
- 工作平台首页地址必须指向生产 HTTPS 域名。

### 3.2 域名配置

必须配置以下域名项：

- 可信域名
- OAuth2 回调域名
- JS 接口安全域名
- 审批 / 消息回调地址所在域名

注意：

- 可信域名必须与实际访问域名精确匹配。
- 若 URL 带端口号，端口号也必须登记。
- 不得默认认为“主域名一致即可”。

### 3.3 回调配置

若启用审批回调或消息回调：

- 回调 URL 可访问
- `Token` 已登记
- `EncodingAESKey` 已登记
- GET 验证和 POST 消费都已联调通过

## 4. OAuth2 与身份验证

开发与发布时统一遵循：

- 授权地址使用企业微信官方 OAuth2 构造规则
- `redirect_uri` 必须先登记为可信域名
- `state` 必须生成并校验
- `agentid` 应显式携带

参考官方：

- 构造网页授权链接：<https://developer.work.weixin.qq.com/document/path/91022>
- 获取访问用户身份：<https://developer.work.weixin.qq.com/document/path/91023>

## 5. JS-SDK 配置

### 5.1 M6 目标

- 目标态为 `@wecom/jssdk` + `ww.register`
- legacy `window.wx` 仅作为灰度兼容层

### 5.2 关键注意事项

- iOS 必须固定首次加载 URL 作为签名基准
- Android 使用当前页面 URL
- 签名接口与页面实际 URL 必须一致
- 真机必须验证拍照、上传、预览、路由切换和弱网

参考官方：

- 开始使用：<https://developer.work.weixin.qq.com/document/path/90514>
- JS-SDK 签名算法：<https://developer.work.weixin.qq.com/document/path/90539>

## 6. 审批与消息

### 6.1 审批

上线前必须冻结：

- `moduleCode -> templateCode -> wecomTemplateId`
- 模板负责人
- 回调地址
- 异常重试与对账策略

### 6.2 消息

上线前必须冻结：

- 消息模板编号或模板说明
- 目标接收人规则
- 失败留痕和告警策略

参考官方：

- 发送应用消息：<https://developer.work.weixin.qq.com/document/path/90236>
- 审批流程引擎：<https://developer.work.weixin.qq.com/document/path/90269>
- 获取审批模板详情：<https://developer.work.weixin.qq.com/document/path/91982>
- 获取审批申请详情：<https://developer.work.weixin.qq.com/document/path/91983>

## 7. 环境分层建议

| 环境 | 目标 | 要求 |
|---|---|---|
| 本地开发 | 接口联调 / UI 开发 | 使用可信测试域名或 mock，避免直接依赖随机 localhost |
| 测试环境 | 真实企微联调 | 验证 OAuth2、签名、上传、审批、消息 |
| 预发布 | 发布前全链路验证 | 与生产参数尽量一致，完成真机和 UAT |
| 生产 | 正式发布 | 需闭环回调、模板、值班、回滚 |

## 8. 真机联调口径

至少覆盖：

- iOS 企业微信
- Android 企业微信

每个平台必须验证：

- OAuth2 登录
- JS-SDK 注册
- 首页与目标路由可访问
- 文件上传 / 拍照 / 预览
- 审批发起与状态回写
- 导出 / 打印
- 管理员诊断入口

## 9. 发布前一次性核对

- [ ] 工作台首页地址为生产 HTTPS 域名
- [ ] 可信域名与真实访问域名完全一致
- [ ] OAuth2 回调地址与 `WECOM_REDIRECT_URI` 一致
- [ ] JS 接口安全域名已配置
- [ ] 审批回调地址已配置并可验证
- [ ] 消息回调地址已配置并可验证
- [ ] `Token`、`EncodingAESKey` 已录入并校验通过
- [ ] 应用可见范围覆盖实际使用部门和管理员
- [ ] 审批模板映射与消息模板映射已冻结
- [ ] 真机回归计划、回滚预案和值班联系人已确认

## 10. 发布后抽检

- [ ] 抽检 OAuth2 登录
- [ ] 抽检 1 条上传链路
- [ ] 抽检 1 条审批发起与回写链路
- [ ] 抽检 1 条消息推送链路
- [ ] 抽检管理员诊断页是否可检索最近事件
