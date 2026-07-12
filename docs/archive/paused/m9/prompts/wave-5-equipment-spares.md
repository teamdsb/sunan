---
status: conditional-baseline
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M9 Wave 5 提示词：设备维护、修理、备件与采购

```text
执行 M9 Wave 5，建设设备树、周期维护、缺陷修理、备件库存，并与现有采购管理建立来源和回写关系。

前置：Wave 4 通过。

必须阅读：
- AGENTS.md
- docs/requirements/M9-专业安全业务深化与体系完善.md
- docs/archive/paused/m9/M9-execplans.md
- docs/archive/paused/m9/M9-wave-backlog.md
- equipment-maintenance 规格组
- M8 主数据、计划任务、问题 CAPA 规格
- docs/specs/procurement/README.md 及相关 API/DB/state/UI
- 现有设备维护、设备检验、仓库和车辆维修实现

按 SDD/TDD 完成：
1. 冻结设备、维护、缺陷、修理、备件和采购关联规格。
2. 先写周期任务幂等、库存并发、负库存、采购取消释放和缺陷关闭门槛测试。
3. 实现船舶设备树、设备编码、分类、参数和周期模板。
4. 年度计划幂等拆分月度维护任务。
5. 实现多人执行、船长确认和岸基审查。
6. 实现设备缺陷、修理、厂修、报价、进度和验收。
7. 实现备件字典、库存流水、申领、发放、领用、退库、盘点和结存。
8. 技术需求调用现有采购流程，采购审批、到货和金额回写来源业务。

硬性验收：
- 不复制采购审批或金额真源。
- 同周期计划重复运行不生成重复任务。
- 库存更新使用事务和并发控制，不允许非法负库存。
- 修理或备件未验收时缺陷不能关闭。
- 采购取消、驳回或数量变化能正确释放或调整占用。

验证：
- 运行完整测试、API/Web build、OpenAPI、migration 和文档校验。

最终报告：
- 展示“维护发现缺陷 -> 修理/备件需求 -> 采购 -> 到货/验收 -> 缺陷关闭”的证据链。
```
