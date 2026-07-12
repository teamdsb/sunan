---
status: operations
owner: wecom
updated: 2026-07-12
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
- M8 Wave 1-7 验收已通过，存量迁移 `classify` 数量已与生产备份快照核对。
- 企业微信 iOS、Android、桌面安全主链路证据齐全，无未关闭 P0 缺陷。

## 切换步骤

1. 备份生产 PostgreSQL。
2. 导出当前环境变量与企业微信后台截图存档。
3. 在预发布环境执行一次完整 migration + smoke。
4. 核对 `WEB_PUBLIC_URL`、`API_PUBLIC_URL`、`WECOM_REDIRECT_URI`、`WECOM_CALLBACK_TOKEN`、`WECOM_ENCODING_AES_KEY`、`WECOM_CALLBACK_ALLOWED_IP_RANGES`。
5. 更新企业微信后台配置：首页地址、可信域名、JS 接口安全域名、OAuth2 回调、事件接收服务器、应用可见范围。
6. 运行 `pnpm --filter api migration:safety -- classify`，保存四类来源数量/状态报告。
7. 执行生产 schema migration，再使用发布批次号执行 `migration:safety -- run <request-id>`。
8. 执行 `migration:safety -- verify <batch-id>`；`source=created+skipped+failed`、关联数和来源不变数必须对平。
9. 发布后端。
10. 发布前端静态资源并确认 CDN 刷新完成。
11. 执行生产 smoke：原四大板块 + 计划/任务/检查/问题/CAPA/验证关闭 + 拍照/签名/定位/附件/PDF/导出/消息深链。
12. 输出切换结果并进入 Hypercare。

## 关键门禁

- 未完成数据库恢复演练记录时，不得进入生产切换。
- 未完成四大板块真机回归矩阵时，不得进入生产切换。
- `api integration` 未在稳定容器环境通过时，不得进入生产切换。
- 存量迁移失败数不为 0 且无逐行处置结论时，不得扩大可见范围。
- M8 安全主链路 iOS、Android、桌面矩阵未完成时，不得将 Wave 7 标记为通过。

## 回滚触发条件

满足任一条件立即评估回滚：

- OAuth2 登录不可用且 30 分钟内无法恢复。
- 审批回调连续失败，且无法人工补偿。
- JS-SDK 大面积初始化失败。
- 消息发送异常影响核心业务。
- 生产 migration 导致核心链路不可用。
- 迁移对账出现来源数量缺口、来源记录被改写或问题来源链接批量丢失。
- 计划重放产生重复任务，或检查转单产生重复问题。

补充阈值：

- 5 分钟内审批回调失败 >= 3 次。
- 10 分钟内 OAuth2 登录失败率 > 2%。
- 30 分钟内导出超时任务 >= 3 条且无法重试恢复。

## 回滚步骤

1. 停止新的生产切换动作。
2. 将企业微信工作台首页与回调配置切回上一稳定版本。
3. 回退前端静态资源版本。
4. 回退后端版本。
5. 如只需撤销本批存量映射，先执行 `migration:safety -- rollback <batch-id>`；有 CAPA/额外来源的问题会保留并需人工决策。
6. 如 schema migration 不兼容，按数据库恢复预案恢复；不以删除旧记录作为回滚方式。
7. 重新执行原四大板块与 M8 主链 smoke，确认系统回到稳定状态。

## Hypercare

上线后首个工作周，至少每天核对：

- OAuth2 登录成功率
- 审批发起/回调/重试/对账
- 应用消息发送
- 文件上传与回调
- 导出任务
- 打印快照
- 计划生成/对账与重复任务
- 任务消息 outbox 失败、重试和深链落地
- 检查转单失败/补偿、CAPA 逾期和验证返工
- 存量迁移批次与未处理失败行

## 关联文档

- `docs/specs/common/operations-observability-m6.md`
- `docs/specs/wecom/go-live-materials-checklist.md`
