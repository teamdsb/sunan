# M6 Wave 7 验收归档

## 1. 波次目标

Wave 7 目标：

- WS-7A：OpenAPI 校验、模块级测试矩阵与路由级测试矩阵冻结
- WS-7B：真机回归、业务 UAT、缺陷闭环模板完成
- WS-7C：上线材料包、回滚预案和值班机制完成

## 2. 交付清单

### WS-7A 交付

- `docs/specs/workbench/testing/workbench-openapi-validation-m6.md`
- `docs/specs/workbench/testing/workbench-module-test-matrix-m6.md`
- `docs/specs/workbench/testing/workbench-route-test-matrix-m6.md`

完成内容：

- 固化 OpenAPI 校验命令与结果基线（四份工作平台 API 规格）。
- 冻结模块级测试矩阵（Batch A、Batch B、Wave6 遗留、管理员台）。
- 冻结路由级测试矩阵（模块路由与管理员路由全覆盖）。

### WS-7B 交付

- `docs/specs/wecom/workbench-real-device-regression.md`
- `docs/specs/workbench/uat/workbench-uat-template-m6.md`
- `docs/specs/workbench/uat/workbench-defect-closure-template-m6.md`

完成内容：

- 真机回归模板覆盖 OAuth2、JS-SDK、审批、导出、打印与管理员诊断。
- UAT 模板冻结字段/流程/打印/统计/权限五类验收。
- 缺陷闭环模板冻结 P0/P1 发布门槛和复测要求。

### WS-7C 交付

- `docs/specs/wecom/workbench-go-live-checklist.md`
- `docs/specs/wecom/workbench-go-live-runbook-m6.md`

完成内容：

- 上线材料包清单明确到可核对文件级别。
- 回滚触发条件、回滚步骤和值班机制冻结。
- 发布后 24 小时观察项与稳定性结论口径冻结。

## 3. 验收对照

### 对照项 A：测试基线

- [x] OpenAPI 四份规格校验通过
- [x] 模块级测试矩阵与路由级测试矩阵已冻结
- [x] Wave7 测试口径可直接执行

### 对照项 B：UAT 与缺陷闭环

- [x] 真机模板可复用为上线证据
- [x] UAT 模板可覆盖各部门最小样例要求
- [x] 缺陷闭环模板具备发布阻断规则

### 对照项 C：发布与应急

- [x] 上线材料包边界明确
- [x] 回滚预案可执行
- [x] 值班机制与发布后观察口径明确

## 4. 结论

M6 Wave 7 的三个工作项（WS-7A / WS-7B / WS-7C）已完成，M6 文档规划阶段全部收口完成。
