---
status: historical-archive
owner: archive
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M8 Wave 4 提示词：安全主数据中心

```text
执行 M8 Wave 4，建设船舶、人员任职、设备和证书关联的安全主数据中心，并治理现有表单中的手工文本引用。

前置：Wave 2 权限和 Wave 3 证据服务均已验收。

必须阅读：
- AGENTS.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/archive/execplans/M8-execplans.md
- docs/archive/backlogs/safety/M8-wave-backlog.md
- docs/specs/common/api-conventions.md
- docs/specs/common/db-conventions.md
- docs/specs/common/auth-spec.md
- docs/specs/my/db/vessels.md
- docs/specs/my/db/personnel.md
- docs/specs/my/db/certificates.md
- docs/specs/workbench/db/workbench-module-matrix.md
- docs/specs/safety/README.md

按 SDD/TDD 完成：
1. 冻结 master-data API、DB 和 UI 规格。
2. 先写唯一性、有效期、停用、历史引用和导入幂等测试。
3. 建立船舶安全档案及证书、人员任职、设备关联。
4. 建立人员与企业微信身份映射、船舶岗位和有效期。
5. 建立设备编码、分类、所属船舶和状态。
6. 为表单提供可搜索选择器，禁止要求用户手工输入 UUID。
7. 提供幂等导入、重复识别、错误报告和回滚说明。
8. 治理既有文本船名/人员/设备引用：保留原始值，增加规范化关联和映射状态。

硬性验收：
- 新业务不能选择已停用对象。
- 历史记录仍可显示停用对象及当时名称。
- 同一导入文件重复执行不产生重复数据。
- 主数据敏感字段按角色和任务范围显示。
- 不因迁移失败覆盖原 payload。

运行 API unit/integration、web tests、build、OpenAPI 校验、migration up/down 验证和文档索引校验。最终报告附导入对账、迁移映射、选择器和权限证据。
```
