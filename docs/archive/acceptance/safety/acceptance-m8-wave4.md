---
status: acceptance-archive
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M8 Wave 4 验收记录：安全主数据中心

## 结论

状态：通过。Wave 4 已建立船舶、人员/企业微信身份、任职、设备/分类、证书设备持有者、受控选择器、幂等导入和工作平台文本引用映射；历史 payload 不被迁移或规范化操作覆盖。

## 工作包与规格证据

| 工作包 | 状态 | 证据 |
|---|---|---|
| `M8-W4A` | 通过 | `master-data-api.yaml`、`master-data-schema.md`、船舶 360 API 和证书关联 |
| `M8-W4B` | 通过 | `vessel_personnel_assignments`、企业微信唯一映射、有效期排他约束和敏感字段脱敏测试 |
| `M8-W4C` | 通过 | 设备/分类、搜索选择器、导入批次/行报告、文本引用映射和 `MasterDataPage` |

## 导入对账与回滚证据

- `apps/api/test/master-data.integration.spec.ts`：一份设备导入包含 2 行，结果为 `created=1`、`failed=1`；同一内容哈希重放返回同一批次 ID，未再创建设备；船舶和人员导入同样验证创建结果。
- `master_data_import_batches` 以 `import_type + content_hash` 部分唯一；`master_data_import_rows` 保存行号、自然键、结果、错误和回滚前像。
- 迁移演练在同一 PostgreSQL testcontainer 中执行 `down()` 后确认规范化引用表不存在，再执行 `up()` 后确认其恢复；`workbench_records` 原记录仍存在。
- 回滚仅删除 Wave 4 新表、索引和触发器；不删除或重写 `workbench_records.payload`、文件、既有船舶、人员和证书。更新型导入的恢复必须使用保存的 `before_snapshot` 显式补偿，避免覆盖之后的人工修改。

## 文本映射、选择器与权限证据

- 文本治理表 `workbench_master_data_references` 同时保存 `raw_value`、规范化对象 ID、`display_snapshot` 与 `matched/ambiguous/unmatched/manual_override` 状态。集成测试证明停用船舶后历史仍显示原名称，且 payload 保持原样。
- `/api/v1/master-data/selectors/{type}` 与证照持有者选择器均只返回有效对象；服务端写入再次拒绝停用的船舶、人员、设备或证书持有者。
- 人员 API 仅向本人、系统管理员或安全管理范围角色返回 `mobile`、`wecomUserId`；集成测试验证范围外船员拿不到这两个字段。
- `/workbench/master-data` 直达页面提供按名称/编码的搜索选择器，明确不要求 UUID，且测试覆盖该交互。

## 自动化验证

| 命令 | 结果 |
|---|---|
| `apps/api/node_modules/.bin/jest --config jest.unit.config.ts --runInBand` | 13 suites、62 tests passed |
| `apps/api/node_modules/.bin/jest --config jest.integration.config.ts --runInBand` | 通过；含 5 个 Wave 4 PostgreSQL 集成场景与 migration up/down 演练 |
| `apps/api/node_modules/.bin/nest build` | 通过 |
| `apps/web/node_modules/.bin/vitest run` | 通过 |
| `apps/web/node_modules/.bin/tsc -b && apps/web/node_modules/.bin/vite build` | 通过 |
| `npx --yes swagger-cli validate docs/specs/safety/api/master-data-api.yaml` | 通过 |
| `node scripts/generate-doc-inventory.mjs && node scripts/check-doc-index.mjs` | 通过 |
| `git diff --check` | 通过 |

企业微信真机拍照、定位与签名不属于 Wave 4 新能力；Wave 3 已作为前置验收。本 Wave 的移动端选择器由 Web 组件自动化覆盖，未将其伪称为真机验证。
