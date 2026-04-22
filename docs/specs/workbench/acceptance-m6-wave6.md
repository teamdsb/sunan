# M6 Wave 6 验收归档

## 1. 波次目标

Wave 6 目标：

- WS-6A：`财务板块` provisional SDD 完成
- WS-6B：`海图更新` 正式 SDD 完成
- WS-6C：海图更新与 `chart_update` 提醒联动规则冻结

## 2. 交付清单

### WS-6A 交付

- `docs/specs/workbench/db/finance-module-provisional.md`
- `docs/specs/workbench/ui/finance-module-provisional.md`

完成内容：

- 冻结财务板块入口、角色、页面范围、导出包边界与审批边界。
- 明确 `confirmed/provisional` 字段分层与 UI 展示约束。
- 增加 provisional 升级 gate，明确从暂行稿进入正式稿的前置条件。

### WS-6B 交付

- `docs/specs/workbench/db/chart-update-module.md`
- `docs/specs/workbench/ui/chart-update-module.md`

完成内容：

- 海图更新模块完成正式 SDD 冻结（字段、状态机、动作、打印归档）。
- 详情页补齐联动反馈、失败跳转与处理中状态。
- 打印与归档规则固定为可执行规范。

### WS-6C 交付

- `docs/specs/workbench/db/chart-update-module.md`
- `docs/specs/workbench/ui/workbench-wave6-legacy-closure-notes.md`

完成内容：

- 半年提醒联动规则补齐时区、月末日期与幂等约束。
- 固定“确认触发联动、重复确认不重复建提醒”的执行边界。
- 固定异常进入管理员诊断页的联动排障路径。

## 3. 验收对照

### 对照项 A：财务板块 provisional

- [x] 页面范围与角色边界可执行
- [x] `confirmed/provisional` 字段边界可识别
- [x] 审批与导出包边界未伪装为已确认

### 对照项 B：海图更新正式化

- [x] 独立模块字段、页面、动作、打印归档齐备
- [x] 详情页可追踪提醒联动状态
- [x] 半年提醒推导规则可落地

### 对照项 C：联动与收口

- [x] `chart_update` 联动触发条件明确
- [x] 联动幂等与失败诊断路径明确
- [x] Wave6 文档与执行计划状态一致

## 4. 结论

M6 Wave 6 的三个工作项（WS-6A / WS-6B / WS-6C）已完成，满足进入 Wave 7 的文档前置条件。
