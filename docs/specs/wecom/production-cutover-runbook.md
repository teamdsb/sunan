---
status: operations
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 企业微信正式上线切换 Runbook（M6）

## 切换前提

- M6 Wave 1-Wave 5 文档与代码已冻结。
- OpenAPI 校验通过。
- `make test-web` 通过。
- 后端 integration 已在具备 Docker/testcontainers 的环境下通过。
- 真机回归和回滚演练已完成。

## 切换步骤

1. 备份生产 PostgreSQL。
2. 导出当前环境变量与企业微信后台截图存档。
3. 在预发布环境执行一次完整 migration + smoke。
4. 核对 `WEB_PUBLIC_URL`、`API_PUBLIC_URL`、`WECOM_REDIRECT_URI`、`WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`、`WECOM_CALLBACK_ALLOWED_IP_RANGES`。
5. 更新企业微信后台配置：首页地址、可信域名、JS 接口安全域名、OAuth2 回调、事件接收服务器、应用可见范围。
6. 执行生产 migration。
7. 发布后端。
8. 发布前端静态资源并确认 CDN 刷新完成。
9. 执行生产 smoke：登录、JS-SDK、办事入口、采购、工作平台录单、审批回调、消息、打印、导出。
10. 输出切换结果并进入 Hypercare。

## 关键门禁

- 未完成数据库恢复演练记录时，不得进入生产切换。
- 未完成四大板块真机回归矩阵时，不得进入生产切换。
- `api integration` 未在稳定容器环境通过时，不得进入生产切换。

## 回滚触发条件

满足任一条件立即评估回滚：

- OAuth2 登录不可用且 30 分钟内无法恢复。
- 审批回调连续失败，且无法人工补偿。
- JS-SDK 大面积初始化失败。
- 消息发送异常影响核心业务。
- 生产 migration 导致核心链路不可用。

补充阈值：

- 5 分钟内审批回调失败 >= 3 次。
- 10 分钟内 OAuth2 登录失败率 > 2%。
- 30 分钟内导出超时任务 >= 3 条且无法重试恢复。

## 回滚步骤

1. 停止新的生产切换动作。
2. 将企业微信工作台首页与回调配置切回上一稳定版本。
3. 回退前端静态资源版本。
4. 回退后端版本。
5. 如 migration 不兼容，按数据库恢复预案执行恢复。
6. 重新执行核心 smoke，确认系统回到稳定状态。

## Hypercare

上线后首个工作周，至少每天核对：

- OAuth2 登录成功率
- 审批发起/回调/重试/对账
- 应用消息发送
- 文件上传与回调
- 导出任务
- 打印快照

## 关联文档

- `docs/specs/common/operations-observability-m6.md`
- `docs/specs/wecom/go-live-materials-checklist.md`
