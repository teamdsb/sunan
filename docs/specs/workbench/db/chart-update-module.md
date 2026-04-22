# 海图更新模块数据规格（M6）

## 1. 文档定位

本文件将 `海图更新` 从 M5 的最小边界升级为 M6 可实现 SDD。

来源：

- `docs/需求文档.md` 4.6.11
- `docs/需求文档.md` 5.4.2 中“海图更新（半年一次）”
- 现有提醒体系中的 `chart_update` 证照类型

## 2. 模块定位

- 模块名称：海图更新
- 目标 `moduleCode`：`shipping_chart_update`
- 模板类型：`ledger_form`
- 部门：船务部
- 目标：记录海图更新批次、适用船舶、更新资源、确认结果，并驱动下一次半年提醒

## 3. 数据边界

### 3.1 核心字段

| 字段 | 说明 |
|---|---|
| `updateBatchNo` | 更新批次号 |
| `applicableVesselIds` | 适用船舶列表 |
| `chartVersion` | 海图版本 |
| `chartDate` | 海图日期或版本日期 |
| `resourceSummary` | 更新资源摘要 |
| `description` | 更新说明 |
| `attachmentIds` | 附件 |
| `confirmedBy` | 确认人 |
| `confirmedAt` | 确认时间 |
| `nextPlannedUpdateDate` | 下次计划更新日期 |

### 3.2 运行时对象

- 继续复用工作平台统一 `record / attachment / print / action log`
- 不新增专有大表作为前置条件
- 海图更新详情字段存放于统一 `payload`

## 4. 状态机

```text
draft -> submitted -> confirmed -> archived
```

说明：

- `draft`：草稿
- `submitted`：提交待确认
- `confirmed`：已确认完成本次更新
- `archived`：打印归档完成

## 5. 与提醒体系的联动

### 5.1 联动目标

当前提醒体系中已存在 `chart_update` 类型。M6 决定：

- 海图更新模块完成确认后，驱动下一次半年提醒
- 不再要求人工在“我的-证照”与“工作平台-海图更新”各录一次

### 5.2 联动规则

当 `shipping_chart_update` 记录进入 `confirmed` 状态时：

1. 对每条 `applicableVesselId` 计算：
   - `baselineDate = confirmedAt`
   - `nextPlannedUpdateDate = confirmedAt + 6 months`
2. 以 `chart_update` 证照类型为目标：
   - 若已存在该船的 `chart_update` 证照记录，则更新其最近完成日期与到期日
   - 若不存在，则创建一条 `chart_update` 证照记录
3. 将证照 `expiryDate` 写为 `nextPlannedUpdateDate`
4. 继续复用现有提醒引擎生成后续提醒

日期计算补充：

- 统一按业务时区 `Asia/Shanghai` 计算半年周期。
- 若确认时间为月末（例如 8 月 31 日），目标月无同日时取该月最后一天。
- `nextPlannedUpdateDate` 仅保留日期部分，不携带时分秒。

幂等补充：

- 联动幂等键建议：`{recordId}:{vesselId}:chart_update:confirmed`。
- 同一 `recordId` 重复触发确认时，必须命中幂等键并执行“更新不新增”。
- 仅当 `confirmedAt` 被显式改写（纠错流程）时允许重算下一次计划日期，并记动作审计。

### 5.3 约束

- 提醒联动只在 `confirmed` 后触发，不在 `draft` / `submitted` 状态触发
- 同一条海图更新记录重复确认不得重复创建提醒记录

## 6. 打印与归档

- 打印模板：`A4-海图更新确认单`
- 打印内容至少包括：
  - 批次号
  - 船舶范围
  - 版本 / 日期
  - 更新资源摘要
  - 确认人 / 确认时间
  - 下次计划更新日期

## 7. 验收点

- 海图更新具备独立模块入口、字段、状态机和打印归档
- 确认动作可推导下一次半年提醒
- `chart_update` 提醒记录与工作平台海图更新记录可建立可追溯关联
- 重复确认不会重复创建提醒记录，联动具备幂等性
