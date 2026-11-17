---
status: audit-snapshot
owner: repository
updated: 2026-11-17
replaces: []
replaced_by: []
---
# 企业资料归档读取权限收尾复核

## 发现与修复

企业资料规格规定归档资料仅系统管理员可查看。原详情和附件签名下载接口只验证资料、附件关系存在，持有已知资料 ID 的普通成员仍能读取归档资料并获取短期下载地址。

详情和签名下载现统一执行归档可见性检查。普通成员对归档资料详情及附件下载均收到 404；系统管理员仍可读取和下载。写入归档状态的授权更新仍返回成功详情，归档前普通成员的详情和下载能力保留。

## 验证

- 回归用例先运行于修复前，复现普通成员读取归档详情返回 200、预期 404 的失败。
- `pnpm --filter api test:integration --runInBand test/enterprise-profile.integration.spec.ts`：1 suite、3 tests 通过；覆盖归档前普通成员读/下载、经理归档、归档后普通成员 404、管理员读/下载，以及拒绝访问时不生成 OSS 签名。
- `pnpm --filter api lint`：退出 0。
- `pnpm --filter api test:unit --runInBand`：35 suites、206 tests 通过。
- `pnpm --filter api test:integration --runInBand`：30 suites、201 tests 通过。
- `pnpm --filter api build`：退出 0。
- `pnpm --filter web test --maxWorkers=1`：61 files、312 tests 通过。
- `pnpm --filter web build`：退出 0。
- 21 份 OpenAPI YAML 校验通过；源码接口清单仍为 19 controllers、233 routes、195 frontend calls，未匹配、未解析和重复路由均为 0。
- `node scripts/generate-doc-inventory.mjs` 和 `node scripts/check-doc-index.mjs` 通过；`git diff --check` 通过。

自动化使用合成用户和隔离 PostgreSQL/OSS 替身，不代表真实企业微信、生产存储或真机现场已验收。
