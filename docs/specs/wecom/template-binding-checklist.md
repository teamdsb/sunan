---
status: operations
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 企业微信审批模板绑定清单（M6）

## 文档定位

本清单用于核对“系统模块编码 -> templateCode -> 企业微信模板 ID -> 业务负责人”的绑定关系，作为上线前的最后核验材料。

## 清单模板

| 模块编码 | 模块名称 | templateCode | 企业微信模板 ID | 审批真源 | 业务负责人 | 状态 |
|---|---|---|---|---|---|---|
| `shipping_voyage_approval` | 航次计划审批 | `shipping_voyage_approval_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_fuel_bunkering_approval` | 燃油加注审批 | `shipping_fuel_bunkering_approval_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_watch` | 值守记录 | `shipping_watch_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_attendance` | 船员考勤 | `shipping_attendance_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_equipment_maintenance` | 船务部设备维修保养 | `shipping_equipment_maintenance_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_vessel_inspection` | 船舶检验 | `shipping_vessel_inspection_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_confined_space_operation` | 密闭空间作业记录 | `shipping_confined_space_operation_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_oily_water_operation` | 污油水接收作业 | `shipping_oily_water_operation_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `shipping_maritime_safety_check` | 海事安全检查记录 | `shipping_maritime_safety_check_v1` | 待填 | 企业微信审批 | 待填 | [ ] |
| `logistics_vehicle_maintenance` | 后勤部车辆维修保养 | `logistics_vehicle_maintenance_v1` | 待填 | 企业微信审批 | 待填 | [ ] |

## 核对要求

- 模板名称、字段、审批节点与业务表单一致。
- 企业微信模板 ID 已在生产环境登记。
- 每个模板都能找到业务负责人和管理员联系人。
- 模板改动必须同步更新本清单和上线材料。
