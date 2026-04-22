# M6 优先级修复清单（分 Wave，含 API/DB/UI 改动点）

## 1. 目标与范围
- 目标：将当前“部分达成”与“未达成”项收口到可验收、可上线状态。
- 基线输入：`docs/requirements/M6-逐条需求对照表.md`
- 执行原则：
  - 先 P0 后 P1，再做 P2 体验增强
  - 每个项必须明确 `API/DB/UI/测试/验收`
  - `finance_business_board` 需先完成补料资产冻结，再进入实现

## 2. 优先级定义
- `P0`：不修复则无法宣称“需求全量兑现”
- `P1`：主流程可用但与需求仍有显著偏差
- `P2`：体验增强与治理完善项

## 3. Wave 规划总览
| Wave | 目标 | 优先级覆盖 | 退出标准 |
|---|---|---|---|
| Wave A | 补齐业务部关键字段缺口 | P0 | 业务部 4 张核心记录表字段与需求一致，OpenAPI 与前端联动通过 |
| Wave B | 总经办培训/会议高保真能力补齐 | P1 | 培训进度、会议签到/照片/A3 打印闭环通过 |
| Wave C | 财务板块补料决策与落地 | P0/P1 | 补料资产冻结并完成 C-2 代码、测试、验收 |
| Wave D | 治理与体验收口（查询窗口、证据归档、可观测） | P2 | 规则门禁、上线证据、运行治理全部可审计 |

## 3.1 当前状态
- Wave A：已完成
- Wave B：已完成
- Wave C：已完成（C-1 + C-2）
- Wave D：待执行

---

## 4. Wave A（P0）：业务部字段差距收口

### A-1 `business_ship_sign` 对齐 14 项字段（P0）
- 现状：当前仅 6 项字段。
- 目标字段（按需求）：
  - `customerName`、`vesselName`、`imoOrCallSign`、`vesselType`、`grossTonnage`、`agreementNo`
  - `fee`、`chargeMode`、`berth`、`cargoType`、`serviceOwner`、`teamLead`
  - `signDate`、`watchVessel`
- API 改动点：
  - 更新 `GET /api/v1/workbench/modules/business_ship_sign/schema`
  - 更新 `POST /api/v1/workbench/records` 对 `business_ship_sign` 的 payload 校验规则
  - 更新 `GET /api/v1/workbench/records/:recordId` 返回 payload 字段说明（如有 schema 回显）
- DB 改动点：
  - 预计无需表结构迁移（`payload` 为 `jsonb`）
  - 如需统计/检索新字段，新增表达式索引（可选，后评估）
- UI 改动点：
  - `WorkbenchModulePage` 中 `business_ship_sign` 表单渲染新字段
  - 详情页增加新字段展示与打印映射
- 测试改动点：
  - API：schema 返回字段断言、createRecord 字段必填校验
  - Web：模块表单渲染、提交参数、详情展示快照测试
- 验收标准：
  - 14 项字段全部可录入、可查看、可打印、可导出（如导出链路启用）

### A-2 `business_ship_garbage_operation` 字段补齐（P0）
- 现状：缺 `nationality`、`voyageNo`、`fee`。
- API 改动点：
  - 更新模块 schema 接口字段
  - 记录创建校验补充新增字段
- DB 改动点：
  - 无需结构迁移（`payload jsonb`）
- UI 改动点：
  - 模块表单补充国籍、航次、费用
  - 详情/打印模板同步
- 测试改动点：
  - API schema 快照与提交校验
  - 前端表单与详情渲染用例
- 验收标准：
  - 对齐需求 8 项字段。

### A-3 `business_ship_oily_water_operation` 字段补齐（P0）
- 现状：缺 `nationality`、`documentNo`、`fee`。
- API/DB/UI/测试改动点：同 A-2 模式。
- 验收标准：
  - 对齐需求 8 项字段。

### A-4 `business_domestic_sewage_operation` 字段补齐（P0）
- 现状：缺 `nationality`、`documentNo`、`voyageNo`。
- API/DB/UI/测试改动点：同 A-2 模式。
- 验收标准：
  - 对齐需求 8 项字段。

### A-5 `business_vessel_dynamic` 补齐“靠泊码头”（P1）
- 现状：现有字段缺 `berthTerminal`。
- API 改动点：
  - schema 增加 `berthTerminal`
- DB 改动点：
  - 无
- UI 改动点：
  - 模块表单、详情与打印增加“靠泊码头”
- 测试改动点：
  - 字段渲染与提交流程测试
- 验收标准：
  - 船舶动态字段与需求一致。

---

## 5. Wave B（P1）：总经办培训/会议能力补齐

### B-1 培训“学习进度”能力落地（P1）
- 现状：仅培训台账字段，缺学习进度。
- API 改动点：
  - 在 `goa_training` payload 增加进度字段：
    - `learningProgressPercent`
    - `learningStatus`（`not_started/in_progress/completed`）
    - `completedAt`（可空）
  - 可选新增：`POST /api/v1/workbench/records/:recordId/actions` 的 `update_progress` 业务动作
- DB 改动点：
  - 无（jsonb）
- UI 改动点：
  - 培训记录详情展示进度条
  - 模块页支持更新学习进度（仅可编辑角色）
- 测试改动点：
  - 进度字段校验与状态流转测试
- 验收标准：
  - 可查看、更新并追踪学习进度。

### B-2 会议签到与会议照片字段落地（P1）
- 现状：会议为通用字段，缺签到/照片专用字段。
- API 改动点：
  - `goa_meeting` schema 增加：
    - `signInCount`
    - `photoAttachmentIds`（附件 ID 列表）
    - `retentionUntil`（留存截止日期，默认+3年）
- DB 改动点：
  - 无（关联附件沿用 files 模块）
- UI 改动点：
  - 表单新增签到人数、照片上传入口
  - 详情页展示会议照片清单
- 测试改动点：
  - 附件绑定与详情展示测试
- 验收标准：
  - 日常/季度/年度/视频会议均可留存签到与照片信息。

### B-3 A3/A4 打印规格支持（P1）
- 现状：当前 `renderedFormat` 固定 `pdf`，未区分 A3/A4。
- API 改动点：
  - `GET /api/v1/workbench/records/:recordId/print` 扩展 `paperSize` 参数（`A4|A3`）
  - 返回 `paperSize` 到响应体
- DB 改动点：
  - 方案 1（推荐）：`workbench_print_snapshots.snapshot_data` 内保存 `paperSize`（无迁移）
  - 方案 2：新增 `paper_size` 列（需 migration）
- UI 改动点：
  - 打印按钮提供 A4/A3 选项
- 测试改动点：
  - API 参数校验、A3/A4 分支快照测试
- 验收标准：
  - 会议类模块可选 A3/A4 输出，打印记录可追溯。

### B-4 视频会议“建群”接入策略（P2）
- 现状：需求中有“组建视频会议群”，当前未见显式能力。
- API 改动点（两种实现二选一）：
  - 方案 A（推荐短期）：在记录中留存 `wecomGroupChatId`（外部创建后回填）
  - 方案 B（长期）：对接企业微信建群 API（若企业侧开放）
- DB 改动点：
  - jsonb 字段即可，无需迁移
- UI 改动点：
  - 会议记录增加群 ID / 群链接字段
- 测试改动点：
  - 群信息字段保存与展示测试
- 验收标准：
  - 至少完成“群信息可留存可追踪”。

### Wave B 完成记录（2026-04-22）
- 已完成 `B-1`：
  - `goa_training` 新增 `learningStatus`、`learningProgressPercent`、`completedAt`
  - 新增 `update_payload` 动作，支持在详情页更新学习进度
- 已完成 `B-2`：
  - `goa_meeting` 新增 `signInCount`、`photoAttachmentIds`、`retentionUntil`
  - `retentionUntil` 在缺省时自动按 `+3 年` 生成
  - 前端详情页新增“会议照片上传”入口，并回写 `photoAttachmentIds`
- 已完成 `B-3`：
  - `GET /api/v1/workbench/records/:recordId/print` 支持 `paperSize=A4|A3`
  - 响应体返回 `paperSize`，并写入打印快照数据
  - 前端详情页新增 `打印 A4` / `打印 A3` 操作按钮
- 已完成 `B-4`（短期方案）：
  - 会议 schema 新增 `wecomGroupChatId`、`wecomGroupChatLink`，用于建群信息留存

验证证据：
- 后端：`pnpm --filter api build`、`pnpm --filter api test:integration -- workbench.integration.spec.ts`
- 前端：`pnpm --filter web test -- WorkbenchHomePage.test.tsx`、`pnpm --filter web build`

---

## 6. Wave C（P0/P1）：财务板块补料决策与实施

### C-1 补料关口（P0，必须先做）
- 目标：决定 `finance_business_board` 是否可进入开发。
- 输入清单（任一缺失则不开发）：
  - 样表/字段字典
  - 业务流程图（提单、审批、统计、导出）
  - 角色权限矩阵
  - 打印模板要求
- 交付：
  - 若补料齐：冻结 `docs/specs/workbench/db/workbench-module-matrix.md` 中财务模块定义，进入 C-2
  - 若补料缺：更新 blocker 文档并签字确认“本期不开发”

### Wave C 当前记录（2026-04-22）
- 已完成 `C-1`：
  - 保留初次门禁不通过报告：`docs/specs/workbench/finance-business-board-c1-gate-report.md`
  - 在产品负责人授权下，已生成补料四件套并冻结基线：
    - `docs/specs/workbench/finance-business-board-sample-forms.md`
    - `docs/specs/workbench/finance-business-board-field-dictionary.md`
    - `docs/specs/workbench/finance-business-board-flowchart.md`
    - `docs/specs/workbench/finance-business-board-print-template.md`
- 已完成 `C-2`：
  - `finance_business_board` 已落地到 workbench 模块注册与 schema。
  - 财务角色可见性与建单能力已纳入集成测试。
- 验收归档：`docs/specs/common/acceptance-m6-wavec.md`

### C-2 财务板块实现（仅补料齐后执行，P1）
- API 改动点：
  - 新增模块编码：`finance_business_board`
  - 扩展：
    - `GET /api/v1/workbench/modules`
    - `GET /api/v1/workbench/modules/:moduleCode/schema`
    - `POST /api/v1/workbench/records`
- DB 改动点：
  - 默认无结构迁移（payload jsonb）
  - 若需财务聚合统计高频查询，可补索引或汇总表
- UI 改动点：
  - `/workbench/modules/finance_business_board` 页面表单与详情视图
  - 首页卡片与权限可见性
- 测试改动点：
  - API schema / create / list / detail
  - Web 表单提交、路由、权限隐藏
- 验收标准：
  - 财务模块满足补料规格，不允许“通用表单占位”。

---

## 7. Wave D（P2）：治理与上线证据收口

### D-1 采购“3年查询窗口”规则化（P2）
- API 改动点：
  - 在 `procurement` 列表与报表查询 DTO 增加时间窗口校验
  - 超窗返回明确错误码与提示
- DB 改动点：
  - 视查询压力评估是否新增时间索引
- UI 改动点：
  - 查询控件限制可选范围并展示规则提示
- 测试改动点：
  - 边界日期用例（恰好 3 年、超 3 年）
- 验收标准：
  - 符合“仅支持 3 年内查询”。

### D-2 企业微信上线证据自动归档（P2）
- API 改动点：
  - 可选新增运维内部接口：归档批次状态登记（若采用系统化归档）
- DB 改动点：
  - 可选新增 `go_live_evidence_batches`（若系统化）
- UI 改动点：
  - 可选新增“上线证据清单页”（运维角色）
- 测试改动点：
  - 文档侧至少保证 checklist 全量可追踪
- 验收标准：
  - 上线截图/录屏/切换单/回滚演练记录可审计。

### D-3 可观测与告警阈值回归校准（P2）
- API 改动点：
  - 关键链路日志字段标准化（审批回调/OAuth/JS-SDK/导出/打印）
- DB 改动点：
  - 无
- UI 改动点：
  - 无（运维向）
- 测试改动点：
  - 失败注入与告警触发演练
- 验收标准：
  - 失败分级、值班、恢复 SOP 全链路演练通过。

---

## 8. 建议执行顺序（可直接开工）
1. Wave A：A-1/A-2/A-3/A-4（全部 P0）  
2. Wave A：A-5（P1）  
3. Wave B：B-1/B-2/B-3（P1）  
4. Wave C：C-1（补料判定）-> C-2（条件执行）  
5. Wave D：D-1/D-2/D-3（P2 收口）

## 9. 每 Wave 最低门禁
- API：`pnpm --filter api build` + 相关单测/集成测试通过
- Web：`pnpm --filter web build` + `make test-web` 通过
- OpenAPI：变更后执行 `swagger-cli validate`
- 文档：同步更新 `docs/execplans.md` 与对应 `acceptance-m6-waveN.md`
