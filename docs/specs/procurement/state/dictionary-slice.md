# 采购字典状态规格

## 范围

用于船舶/后勤细分字典项读取与治理管理。

## 状态内容

- 列表：`itemsByDepartment`
- 筛选：`departmentCode`、`isEnabled`
- 治理态：`creating`、`updating`、`disabling`
- 错误态：`loadError`、`saveError`

## 关键动作

- `fetchDimensionItems`
- `createDimensionItem`
- `updateDimensionItem`
- `disableDimensionItem`

## 权限前提

- 仅 `system_admin`、`general_office` 显示管理按钮。
