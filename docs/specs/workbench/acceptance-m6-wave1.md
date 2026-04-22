# M6 Wave 1 验收归档

## 1. 波次目标

Wave 1 目标：

- WS-1A：M6 需求、执行计划与工作平台 M6 入口文档重构
- WS-1B：工作平台模块级现状审计与矩阵重写
- WS-1C：`财务板块`、`海图更新` 独立 SDD 入口建立

## 2. 交付清单

### WS-1A 交付

- `docs/requirements/M6-全量兑现与完美上线.md`
- `docs/execplans.md`
- `docs/M6-execplans.md`
- `docs/specs/workbench/README.md`

完成内容：

- 将 M6 由目标性描述重构为执行型规格。
- 明确 M6 波次、依赖 gate、完成定义、发布门槛。
- 统一主计划与镜像计划口径。

### WS-1B 交付

- `docs/specs/workbench/db/workbench-module-matrix.md`
- `docs/specs/workbench/ui/workbench-department-modules.md`

完成内容：

- 模块矩阵新增“代码现状、页面形态、样表来源、打印模板、审批模板映射、阻塞项”。
- 状态口径统一为 `已实现 / 已有底座 / M6 待高保真 / M6 遗留`。
- 模块高保真要求重写为“字段组 + 页面组 + 关键动作 + 打印/归档 + 权限/审批 + 验收点”。

### WS-1C 交付

- `docs/specs/workbench/db/finance-module-provisional.md`
- `docs/specs/workbench/ui/finance-module-provisional.md`
- `docs/specs/workbench/db/chart-update-module.md`
- `docs/specs/workbench/ui/chart-update-module.md`

完成内容：

- `财务板块` 从边界备注升级为独立 provisional SDD。
- `海图更新` 从最小边界升级为正式可实现 SDD。
- 明确海图更新与 `chart_update` 提醒联动的规则与验收口径。

## 3. 验收对照

### 对照项 A：M6 主线文档重构

- [x] M6 需求文档具备执行型结构（现状、范围、波次、gate、完成定义）
- [x] 主执行计划与镜像执行计划一致
- [x] 工作平台 README 已切换到 M6 入口与阅读顺序

### 对照项 B：模块级现状审计

- [x] 每个模块有“原始来源 -> 当前现状 -> M6 页面形态 -> 阻塞项”映射
- [x] 不再仅用“已冻结”描述模块状态

### 对照项 C：遗留模块独立入口

- [x] `财务板块` 有独立 DB/UI SDD 入口
- [x] `海图更新` 有独立 DB/UI SDD 入口

## 4. 结论

M6 Wave 1 的三个工作项（WS-1A / WS-1B / WS-1C）已完成，满足进入 Wave 2 的文档前置条件。
