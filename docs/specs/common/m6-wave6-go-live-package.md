# M6 Wave 6 上线包索引（可审计）

## 上线包清单

- [x] 全量测试与冒烟测试报告：
  - `docs/specs/common/m6-wave6-test-and-smoke-report.md`
- [x] 企业微信配置矩阵：
  - `docs/specs/wecom/production-config-matrix.md`
- [x] 回调安全规格：
  - `docs/specs/wecom/callback-security-spec.md`
- [x] 模板绑定清单：
  - `docs/specs/wecom/template-binding-checklist.md`
- [x] 生产切换 runbook：
  - `docs/specs/wecom/production-cutover-runbook.md`
- [x] 上线材料 checklist：
  - `docs/specs/wecom/go-live-materials-checklist.md`
- [x] 运维与可观测门禁：
  - `docs/specs/common/operations-observability-m6.md`
- [x] Hypercare 日报模板：
  - `docs/specs/common/m6-wave6-hypercare-daily-template.md`

## 需线下补齐材料（执行态）

以下材料为上线执行现场产物，不在仓库固化真实截图/录屏，仅保留索引要求：

- [ ] 真机回归截图与录屏（iOS/Android，四大板块）
- [ ] 企业微信后台配置截图（可信域名、OAuth 回调、事件接收、可见范围）
- [ ] 发布窗口审批单与变更单截图
- [ ] 发布后首周 Hypercare 每日日志
- [ ] 缺陷闭环清单（含严重级别、修复时间、责任人）

## 结论口径

- M6 以“生产切换完成 + 交付物可审计 + 缺陷闭环完成”为收口条件。
- 本索引用于 WS-6B 归档验收，执行态证据由发布负责人、测试负责人、企业微信管理员按角色补齐。
