# M6 Wave 2 验收归档

## 1. 波次目标

Wave 2 目标：

- WS-2A：企业微信 JS-SDK 迁移规格冻结
- WS-2B：OAuth2、可信域名、回调、审批、消息生产配置口径冻结
- WS-2C：真机验证、UAT、上线材料和回滚门槛冻结

## 2. 交付清单

### WS-2A 交付

- `docs/specs/wecom/jssdk-spec.md`

完成内容：

- 明确 M6 目标态为 `@wecom/jssdk` + `ww.register`。
- 保留 legacy adapter 兼容态，并定义回退触发条件与恢复要求。
- 冻结 URL 签名平台差异、诊断字段与真机验证门槛。

### WS-2B 交付

- `docs/guides/wecom-dev-setup.md`
- `docs/specs/wecom/workbench-go-live-checklist.md`

完成内容：

- 统一 OAuth2、可信域名、JS 接口安全域名、回调与审批/消息模板配置口径。
- 补齐生产参数核对、回调验证、模板负责人和发布后抽检要求。
- 补充灰度与回退执行口径，明确 legacy 仅为兼容层。

### WS-2C 交付

- `docs/specs/wecom/workbench-real-device-regression.md`
- `docs/specs/wecom/workbench-go-live-checklist.md`

完成内容：

- 真机回归模板升级到 M6，统一 `ww.register` 主路径与 legacy 回退证据要求。
- 增加管理员诊断事件检索用例，覆盖 JS-SDK / 审批 / 导出失败留痕。
- 上线检查清单补齐回退证据项与发布门槛材料。

## 3. 验收对照

### 对照项 A：JS-SDK 迁移口径

- [x] 旧 `wx.config + wx.agentConfig` 不再作为目标态
- [x] `ww.register` 与 legacy adapter 分层职责明确
- [x] 回退条件与恢复要求具备可执行描述

### 对照项 B：生产配置与发布口径

- [x] OAuth2、可信域名、回调、审批与消息模板要求统一
- [x] 生产发布前核对项可逐项执行
- [x] 灰度与回退口径已纳入配置指南

### 对照项 C：真机与上线材料

- [x] iOS/Android 真机回归模板可直接执行
- [x] 证据留存规则覆盖 JS-SDK、审批、导出与管理员诊断
- [x] 上线材料、回滚和值班要求可打勾验收

## 4. 结论

M6 Wave 2 的三个工作项（WS-2A / WS-2B / WS-2C）已完成，满足进入 Wave 3 的文档前置条件。
