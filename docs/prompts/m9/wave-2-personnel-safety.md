---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M9 Wave 2 提示词：人员安全与培训资格

```text
执行 M9 Wave 2，建设船员任职、调配、交接、健康、资格、培训、考试、熟悉职责和开航资格快照。

前置：M9 Wave 1 通过。

必须阅读：
- AGENTS.md
- docs/requirements/M9-专业安全业务深化与体系完善.md
- docs/plans/M9-execplans.md
- docs/plans/M9-wave-backlog.md
- personnel-safety 规格组
- M8 主数据、任务、证据、权限和 CAPA 规格
- docs/specs/my/db/personnel.md
- docs/specs/my/db/certificates.md
- docs/specs/common/auth-spec.md

按 SDD/TDD 完成：
1. 先补齐并评审 personnel-safety API/DB/state/UI 规格。
2. 先写证书到期、健康失效、岗位冲突、交接并发和资格快照测试。
3. 实现任职、调配、上船、下船和岗位有效期。
4. 实现健康、证书和岗位资格规则。
5. 实现结构化交接，将未结任务、问题和设备责任转移并保留轨迹。
6. 实现培训需求、计划、签到、学习、考试、补考和评价。
7. 实现熟悉职责清单、个人签认、审核和完成门槛。
8. 在上岗或航次使用时保存不可变资格快照。

硬性验收：
- 失效证书、过期健康和未完成熟悉职责可按规则阻断。
- 一人同一时间不能拥有冲突的有效船舶岗位。
- 交接不能丢失或重复未结事项。
- 多人培训保存每人结果，不能用总进度代替。
- 历史资格判断可由快照复原。

验证：
- 运行 unit/integration/web、API/Web build、OpenAPI、migration 和文档校验。

最终报告：
- 附资格阻断、交接转移、培训个人结果和历史快照证据。
```
