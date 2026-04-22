# 企业微信回调安全规格（M6）

## 文档定位

本规格定义企业微信审批/消息回调在 M6 的生产安全边界，覆盖签名、时间窗、nonce、幂等、可选加密解密、来源 IP 校验与异常留痕。

## 强制要求

- 回调必须校验签名。
- 回调必须校验时间窗与 nonce/版本组合，防止重放。
- 回调必须保留原始摘要、错误码、请求时间、请求来源 IP。
- 生产环境必须配置 `WECOM_CALLBACK_ALLOWED_IP_RANGES`。
- 若启用加密回调，必须配置 `WECOM_ENCODING_AES_KEY` 并完成解密。

## 校验顺序

1. 解析请求来源 IP。
2. 校验 IP 是否在允许范围内。
3. 校验 `signature`、`timestamp`、`nonce` 是否完整。
4. 校验时间窗是否在允许偏差内。
5. 若启用加密回调，先解密再进入业务处理。
6. 校验 `eventId + processInstanceId + callbackVersion` 幂等。
7. 更新审批镜像、业务状态和运维留痕。

## 留痕字段

- `eventId`
- `processInstanceId`
- `callbackVersion`
- `signature`
- `timestamp`
- `nonce`
- `requestIp`
- `rawPayloadDigest`
- `syncErrorCode`
- `syncErrorMessage`

## 失败分类

- `ip_not_allowed`
- `signature_missing`
- `signature_invalid`
- `timestamp_invalid`
- `request_expired`
- `decrypt_failed`
- `event_duplicate`
- `callback_version_conflict`
- `instance_not_found`

## 与现有规格关系

- 运维治理要求见 `approval-ops-spec.md`
- 正式配置矩阵见 `production-config-matrix.md`
- 切换步骤见 `production-cutover-runbook.md`
