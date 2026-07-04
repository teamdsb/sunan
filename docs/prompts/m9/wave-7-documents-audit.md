---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M9 Wave 7 提示词：受控文件、内审、统计与档案

```text
执行 M9 Wave 7，建设受控文件、外来文件、分发回执、内部审核、全域统计、人工监管上报和档案中心。

前置：Wave 6 通过。

必须阅读：
- AGENTS.md
- docs/requirements/M9-专业安全业务深化与体系完善.md
- docs/plans/M9-execplans.md
- docs/plans/M9-wave-backlog.md
- document-audit-archive 规格组
- M8 任务、证据、CAPA、导出和审计规格
- docs/specs/my 中企业制度规格
- docs/specs/common/file-upload-spec.md
- docs/specs/common/frontend-experience-guidelines.md

按 SDD/TDD 完成：
1. 冻结受控文件、内审、报告、统计和档案规格。
2. 先写版本唯一、阅读确认、内审转 CAPA、报告追溯、档案冻结和权限测试。
3. 实现内部文件变更、审批、版本、替换、修订说明和现行版本。
4. 实现外来文件登记、适用性评审、更新和停用。
5. 实现分发、阅读确认、催办、撤回、水印和受控副本。
6. 实现内审计划、审核组、首末次会议、方案、个人底稿、汇总和报告。
7. 内审发现自动生成不符合项并进入 CAPA。
8. 实现人员、问题、设备、文件和内审统计及异步导出。
9. 实现人工监管上报事项、材料、渠道、时间、状态和回执。
10. 实现档案保管期限、冻结、借阅和访问审计。

硬性验收：
- 同一受控文件只有一个现行版本。
- 已分发版本不能静默替换。
- 内审报告可追溯到审核记录和问题。
- 归档后修改需走明确解冻或新版本流程。
- 人工监管事项不得显示为接口同步。

验证：
- 运行完整测试、API/Web build、OpenAPI、migration 和文档校验。

最终报告：
- 附文件版本链、阅读回执、完整内审链和档案访问审计证据。
```
