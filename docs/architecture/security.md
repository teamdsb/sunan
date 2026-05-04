# 安全设计

## 认证

- 用户身份来源于企业微信 OAuth2 `snsapi_base`。
- API 会话使用 JWT。
- 企业微信 `access_token` 与 JS-SDK `ticket` 存 Redis，避免频繁调用上游接口。

## 授权

- 基于 RBAC 控制资源读写权限。
- 权限判断优先按角色、部门、本人关联数据三层处理。
- 管理按钮仅是 UI 优化，真正权限校验必须在后端完成。
- 工作平台 legacy-only 模块不得重新开放为默认录单入口。

## 数据安全

1. 所有外部通信使用 HTTPS。
2. OSS 文件使用私有读，下载通过预签名 URL。
3. 敏感配置通过环境变量或密钥管理服务注入，不写入仓库。
4. 数据库启用审计字段，关键操作记录操作人和时间。
5. 发布前数据库备份与恢复演练记录纳入上线材料。

## 回调安全

1. 企业微信回调必须校验签名、时间窗和 nonce。
2. 生产环境必须配置 `WECOM_CALLBACK_ALLOWED_IP_RANGES` 并校验来源 IP。
3. 若启用加密回调，必须配置 `WECOM_ENCODING_AES_KEY` 并完成解密。
4. 重复回调、旧版本回调和非法回调必须保留错误码与安全日志。

## 接口安全

1. OAuth2 回调使用 `state` 防 CSRF。
2. 上传接口限制文件类型、大小和 Bucket 路径前缀。
3. 所有写操作接口启用参数校验和统一异常格式。
4. 高风险管理接口必须记录操作审计日志。
5. 审批对账、重试、导出、回滚等管理员能力只允许受控角色调用。

## 运维安全

- 生产环境数据库定期备份。
- Redis、数据库和 OSS 使用最小权限账号。
- 企业微信应用 Secret、JWT Secret 按季度轮换。
- 上线窗口明确值班人与联系人。
- 关键告警至少覆盖 OAuth2、JS-SDK、审批回调、消息发送、文件回调、导出任务和打印快照。

## Wave 4 关联文档

- `docs/specs/common/operations-observability-m6.md`
- `docs/specs/wecom/production-cutover-runbook.md`
