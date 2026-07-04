---
status: current-spec
owner: procurement
updated: 2026-06-13
replaces: []
replaced_by: []
---

# 采购年度预算与全站响应式表单设计

## 目标

本设计包含两个并行工作流：

1. 为采购模块补齐以后端为唯一真源的年度预算能力。
2. 统一全站输入、搜索、选择、日期、数字和操作区的响应式排版。

预算能力属于 M3 范围增补。实施时必须同步修改
`docs/requirements/M3-采购管理.md` 中“预算不在范围”的旧结论，并先更新采购
API、DB、State、UI 规格，再修改代码。

## 已确认业务规则

- 预算按“年度 + 部门 + 采购分类”配置。
- 船务部复用 `vessel` 字典，后勤部复用 `logistics_category` 字典。
- 其他部门统一使用 `dimension_type=none`、`dimension_key=NULL`，界面显示“未细分”。
- 仅 `system_admin`、`general_office` 可维护预算。
- 已执行金额只统计 `status=final_approved` 的采购单。
- 年度归属以 `expense_date` 为准；`expense_date` 为空的采购单不计入预算执行。
- 预算可以在产生执行金额后修改，但修改必须填写备注并写入不可变审计记录。
- 预算不允许硬删除，只允许启用或停用。
- 字典项停用后保留历史预算和执行统计，但不能基于该项新增预算。
- 年度预算总额或已执行金额任一缺失、为空或小于等于 `0` 时，采购首页不显示预算卡片。
- 超预算时显示真实百分比，不截断文本值；进度环、风险提示和超出金额使用红色风险态。
- 前端不得包含静态预算金额、比例或分类明细；生产和 mock 模式均通过 API 获取。

## 方案选择

### 采用方案：独立预算资源与聚合查询

新增预算表、预算审计表、管理 API 和汇总 API。预算配置与执行金额分离：

- 预算金额来自 `procurement_budgets`。
- 执行金额由采购单实时聚合。
- 首页读取后端汇总结果，不自行拼接静态分类或计算业务口径。

该方案数据可审计、口径集中，并能支持后续预算占用、预算对账和安全费用关联。

### 未采用：在采购单列表接口附带预算

列表分页结果不能代表年度执行总额，容易把“本页金额”误当年度执行金额，也会让列表查询承担不相关职责。

### 未采用：在系统设置中保存 JSON 预算

JSON 缺少可靠的年度、部门、分类唯一约束，不利于并发更新、审计查询和后续预算占用扩展。

## 数据模型

### `procurement_budgets`

| 字段                      | 类型          | 约束                  | 说明                                         |
| ------------------------- | ------------- | --------------------- | -------------------------------------------- |
| `id`                      | UUID          | PK                    | 主键                                         |
| `budget_year`             | INTEGER       | NOT NULL              | 预算年度                                     |
| `department_code`         | VARCHAR(32)   | NOT NULL              | 采购部门编码                                 |
| `dimension_type`          | VARCHAR(32)   | NOT NULL              | `none/vessel/logistics_category`             |
| `dimension_key`           | VARCHAR(64)   | NULL                  | 细分稳定键                                   |
| `dimension_name_snapshot` | VARCHAR(128)  | NOT NULL              | 创建或调整时的展示名快照                     |
| `budget_amount`           | NUMERIC(12,2) | NOT NULL, CHECK > 0   | 预算金额                                     |
| `is_enabled`              | BOOLEAN       | NOT NULL default true | 是否参与当前预算汇总                         |
| `created_by`              | VARCHAR(64)   | NOT NULL              | 创建人 UserId                                |
| `updated_by`              | VARCHAR(64)   | NOT NULL              | 最后修改人 UserId                            |
| `created_at`              | TIMESTAMPTZ   | NOT NULL              | 创建时间                                     |
| `updated_at`              | TIMESTAMPTZ   | NOT NULL              | 更新时间                                     |
| `deleted_at`              | TIMESTAMPTZ   | NULL                  | 仅保留通用软删除字段，不开放硬删除或删除 API |

约束：

- 唯一范围为 `budget_year + department_code + dimension_type + COALESCE(dimension_key, '')`，排除 `deleted_at` 非空记录。
- `dimension_type=none` 时 `dimension_key` 必须为空。
- `dimension_type=vessel` 仅允许 `shipping_dept`。
- `dimension_type=logistics_category` 仅允许 `logistics_dept`。
- 新增细分预算时，字典项必须存在且启用。

### `procurement_budget_audits`

| 字段               | 类型          | 约束                  | 说明                           |
| ------------------ | ------------- | --------------------- | ------------------------------ |
| `id`               | UUID          | PK                    | 主键                           |
| `budget_id`        | UUID          | FK, NOT NULL          | 对应预算                       |
| `action`           | VARCHAR(32)   | NOT NULL              | `create/update/enable/disable` |
| `before_amount`    | NUMERIC(12,2) | NULL                  | 修改前金额                     |
| `after_amount`     | NUMERIC(12,2) | NULL                  | 修改后金额                     |
| `before_enabled`   | BOOLEAN       | NULL                  | 修改前启用状态                 |
| `after_enabled`    | BOOLEAN       | NULL                  | 修改后启用状态                 |
| `change_reason`    | VARCHAR(500)  | NOT NULL              | 修改原因或备注                 |
| `payload_snapshot` | JSONB         | NOT NULL default `{}` | 部门、分类和名称等完整快照     |
| `changed_by`       | VARCHAR(64)   | NOT NULL              | 操作人 UserId                  |
| `changed_at`       | TIMESTAMPTZ   | NOT NULL              | 操作时间                       |

审计记录只追加、不更新、不删除。

## 执行金额口径

后端按以下条件聚合采购单：

- `status = final_approved`
- `deleted_at IS NULL`
- `expense_date >= YYYY-01-01`
- `expense_date < (YYYY + 1)-01-01`

分类映射使用采购单自身的 `department_code`、`dimension_type`、`dimension_key`。
已停用字典项仍按稳定键计入历史执行。

没有匹配预算行的合格采购单仍计入年度已执行总额，并在明细中作为预算金额为 `0`
的“未配置预算”项返回，以暴露未预算支出和超预算风险。

## API 设计

所有响应遵循 `docs/specs/common/api-conventions.md`。

### 汇总查询

`GET /api/v1/procurement/budgets/summary?year=2026`

所有已认证用户可读。返回：

```json
{
  "data": {
    "year": 2026,
    "budgetAmount": 1000000,
    "executedAmount": 1260000,
    "executionRate": 126,
    "overBudgetAmount": 260000,
    "isOverBudget": true,
    "items": [
      {
        "departmentCode": "shipping_dept",
        "dimensionType": "vessel",
        "dimensionKey": "su-nan-012",
        "dimensionName": "苏南 012",
        "budgetAmount": 300000,
        "executedAmount": 360000,
        "executionRate": 120,
        "overBudgetAmount": 60000,
        "isOverBudget": true,
        "isConfigured": true
      }
    ]
  }
}
```

金额均为数字，保留两位小数。`executionRate` 保留两位小数且允许超过 `100`。
没有预算或执行数据时仍返回零值汇总，不返回前端展示兜底。

### 管理接口

- `GET /api/v1/procurement/admin/budgets`
- `POST /api/v1/procurement/admin/budgets`
- `PATCH /api/v1/procurement/admin/budgets/:id`
- `GET /api/v1/procurement/admin/budgets/:id/audits`

管理接口仅允许 `system_admin`、`general_office`。

创建请求包含年度、部门、分类、预算金额和必填备注。更新请求至少包含预算金额或
`isEnabled` 之一，并要求必填备注。服务端在同一事务中更新预算并追加审计记录。

## 前端页面

### 采购首页

- 删除所有静态预算金额、静态百分比和静态分类。
- 查询当前年度预算汇总。
- 仅在 `budgetAmount > 0 && executedAmount > 0` 时渲染预算卡片。
- 不显示卡片时，采购流程和供应商主区域自动占满容器宽度。
- 进度文字使用真实 `executionRate`；环形填充最多绘制到 `100%`，避免 CSS 环形图溢出。
- `isOverBudget=true` 时使用红色环、红色超出金额和“超预算”文案。
- 卡片展示年度总额、已执行、剩余或超出金额，以及按已执行金额排序的前四个分类。
- 管理角色显示“预算管理”入口；其他角色只能查看汇总。

### 预算管理页

新增路由 `/procurement/budgets`。

- 默认当前年度，可切换历史年度。
- 支持按部门、分类和启用状态筛选。
- 新增表单按年度、部门、分类、金额、备注组织。
- 编辑预算使用抽屉或对话框表单，不使用 `window.prompt`。
- 列表展示年度、部门、分类、预算、执行、执行率、状态和操作。
- 超预算行显示风险态。
- 可查看每条预算的审计历史。
- 不提供删除操作。

### Mock

mock runtime 增加与正式 API 同结构的预算资源和聚合逻辑。页面组件不得引用 mock
常量。测试可分别构造：

- 无预算
- 预算或执行为零
- 正常执行
- 超预算

## 全站响应式表单系统

### 设计原则

- 业务表单、查询栏、筛选栏和操作栏使用统一布局原语，不依赖零散内联宽度。
- 同一行控件高度、标签位置、间距和按钮基线一致。
- 输入、搜索、选择、日期和数字控件默认占满其网格单元。
- 桌面优先横向扫描，手机优先单列完成任务。
- 不改变现有字段、验证、权限、查询参数或提交行为。

### 共享布局原语

在现有样式体系中增加并逐页采用：

- `.sunan-query-grid`：搜索与筛选区。
- `.sunan-form-grid`：新增、编辑和详情表单。
- `.sunan-form-field-wide`：需要跨列的长文本、搜索和上传字段。
- `.sunan-form-actions`：提交、重置、返回等操作区。
- `.sunan-control-block`：使 Ant Design 控件宽度填满网格。

不新增第三方依赖。保留 Ant Design `Form` 的校验和可访问标签关联。

### 断点

| 视口         | 查询区                            | 业务表单                     | 操作按钮                       |
| ------------ | --------------------------------- | ---------------------------- | ------------------------------ |
| `>= 1280px`  | 4 列或自适应 `minmax(180px, 1fr)` | 12 列网格，常规字段占 3-6 列 | 右对齐，可保持内容宽度         |
| `769-1279px` | 2-3 列                            | 2 列                         | 行尾对齐                       |
| `431-768px`  | 2 列，搜索跨两列                  | 1-2 列，长字段跨整行         | 等宽排列                       |
| `<= 430px`   | 1 列                              | 1 列                         | 主按钮全宽，次按钮可并排或全宽 |

统一控制高度：桌面至少 `42px`，移动端至少 `46px`。标签置于控件上方，避免
中文标签与输入框在窄屏相互挤压。错误提示在字段下方占独立行。

### 迁移范围

逐页检查并迁移以下页面及其抽屉、对话框：

- 我的：证照、企业资料、企业制度、船舶监控、提醒、设置。
- 办事：首页搜索、搜索页、治理页。
- 采购：首页筛选、录单、详情编辑、审批、报表、报表审批、字典治理、预算管理。
- 工作台：模块筛选、记录创建、审批和统计筛选。

表格保持自身横向滚动，不允许表单容器制造页面级横向滚动。

## 错误处理

- 预算重复范围返回 `409 BUDGET_SCOPE_CONFLICT`。
- 字典不存在或已停用返回 `422 BUDGET_DIMENSION_INVALID`。
- 金额小于等于零返回 `400 VALIDATION_ERROR`。
- 修改备注为空返回 `400 VALIDATION_ERROR`。
- 无权限返回 `403 FORBIDDEN`。
- 汇总查询失败时预算卡片不显示，并在采购页提供可重试的轻量错误提示；不得显示旧静态数据。
- 管理页保存失败保留用户输入并显示明确错误，不关闭编辑容器。

## 测试与验收

### 后端

- 使用 PostgreSQL testcontainers 验证唯一约束、金额精度和审计事务。
- 验证只有终审通过且费用日期属于目标年度的采购单计入执行。
- 验证空费用日期、其他状态、软删除单据不计入。
- 验证未配置预算的执行金额仍进入汇总并形成超预算项。
- 验证角色权限、重复预算、停用字典和修改备注。

### 前端

- 预算卡片在无预算、预算为零或执行为零时不渲染。
- 正常预算显示后端金额和比例。
- 超预算显示真实比例、红色进度和红色超出金额。
- 无预算卡片时主内容自动铺满。
- mock 与正式接口类型一致，无组件级静态预算数据。

### 响应式

- 至少验证 `320px`、`375px`、`599px`、`768px`、`1280px`。
- 所有迁移页面无页面级横向滚动、标签重叠、控件裁切或按钮溢出。
- 查询控件可操作，选择下拉不被容器裁切，错误提示不改变相邻字段基线。
- 使用 Browser 对采购字典页、采购预算页、采购首页和每个业务域至少一个代表页面做截图与交互验收。

## 实施顺序

1. 更新 M3 需求与采购 API/DB/State/UI 规格。
2. 增加预算实体、迁移、DTO、服务、控制器和集成测试。
3. 增加前端 API 类型、mock runtime 和预算页面。
4. 替换采购首页静态预算卡片。
5. 建立共享响应式表单原语。
6. 按业务域逐页迁移表单和筛选区。
7. 运行 API/Web 全量测试、生产构建和多视口 Browser 验收。

## 非目标

- 本次不实现预算预占、释放、冻结或并发额度扣减。
- 本次不阻止采购单提交或审批，仅提供预算配置、执行统计和超预算风险展示。
- 本次不建设独立采购分类体系。
- 本次不改变 M9 安全费用预算的专业业务模型；未来只通过明确接口关联，避免重复建设。
