---
status: current-source
owner: common
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 数据库规范

本文档定义 PostgreSQL 数据库的所有通用规范，所有表规格文档均须遵守。

## 基本规则

- **数据库**：PostgreSQL 16+
- **字符集**：UTF8
- **时区**：UTC（应用层转换为 +08:00 展示）
- **字符集对比规则（Collation）**：`zh-Hans-CN` 或 `C.UTF-8`

## 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 表名 | snake_case，名词复数 | `certificates`, `vessel_monitors` |
| 列名 | snake_case | `expiry_date`, `owner_type` |
| 主键 | `id` | — |
| 外键 | `{表名单数}_id` | `certificate_id`, `vessel_id` |
| 索引 | `idx_{表名}_{列名}` | `idx_certificates_owner_id` |
| 唯一约束 | `uq_{表名}_{列名}` | `uq_certificate_types_name` |
| 枚举类型 | snake_case + `_enum` 后缀 | `owner_type_enum` |

## 主键

- 所有表使用 **UUID v4** 作为主键
- PostgreSQL 类型：`UUID`，默认值：`gen_random_uuid()`
- 不使用自增整数主键（避免暴露数量信息，分布式兼容）

## 审计字段

每张业务表均须包含以下审计字段：

| 字段名 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `created_at` | `TIMESTAMPTZ` | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | 最后更新时间（由 trigger 自动维护） |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` | 软删除时间，NULL 表示未删除 |
| `created_by` | `VARCHAR(64)` | — | 创建人的企业微信 UserId |
| `updated_by` | `VARCHAR(64)` | `NULL` | 最后更新人的企业微信 UserId |

`updated_at` 由数据库触发器自动更新，无需应用层干预。

## 软删除

- 所有业务表使用 `deleted_at IS NULL` 过滤已删除数据
- 不使用 `is_deleted` 布尔字段（时间戳更有价值）
- TypeORM 配置 `@DeleteDateColumn()` 实现软删除
- 唯一约束需使用**部分索引**排除已删除数据：
  ```sql
  CREATE UNIQUE INDEX uq_xxx ON table_name(col) WHERE deleted_at IS NULL;
  ```

## 枚举类型

使用 PostgreSQL 原生枚举类型或 `VARCHAR` + CHECK 约束：

- **小型稳定枚举**（值很少变更）：使用 PostgreSQL `ENUM` 类型
- **可扩展枚举**：使用 `VARCHAR(32)` + 应用层校验

```sql
-- 示例：证书持有者类型
CREATE TYPE owner_type_enum AS ENUM ('vessel', 'vehicle', 'personnel');
```

## 数据类型规范

| 场景 | 推荐类型 |
|---|---|
| 主键 / 外键 | `UUID` |
| 短文本（≤255字符） | `VARCHAR(n)` |
| 长文本 | `TEXT` |
| 日期时间（带时区） | `TIMESTAMPTZ` |
| 仅日期 | `DATE` |
| 布尔值 | `BOOLEAN` |
| 整数 | `INTEGER` 或 `BIGINT` |
| 精确小数（金额） | `NUMERIC(12,2)` |
| 灵活结构数据 | `JSONB` |
| 文件大小 | `BIGINT`（字节） |

## 索引策略

- 外键列**必须**建索引
- 常用过滤字段建索引（如 `owner_type + owner_id`、`expiry_date`）
- 复合索引字段顺序：**高选择性字段在前**
- `deleted_at` 列建**部分索引**：`WHERE deleted_at IS NULL`
- 避免对低基数字段（如布尔值）单独建索引

```sql
-- 示例：证书表常用查询索引
CREATE INDEX idx_certificates_owner ON certificates(owner_type, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_certificates_expiry ON certificates(expiry_date) WHERE deleted_at IS NULL;
```

## 外键约束

- 所有外键关系**必须**在数据库层定义约束
- 删除行为：业务数据使用 `ON DELETE RESTRICT`（禁止直接删除被引用数据）
- 更新行为：使用默认 `ON UPDATE CASCADE`

## 迁移管理

- 使用 TypeORM Migration 管理所有 schema 变更
- 迁移文件命名：`{timestamp}-{描述}.ts`，例如 `1705300000000-create-certificates.ts`
- 每次迁移须包含 `up()` 和 `down()` 方法
- 禁止在生产环境使用 `synchronize: true`
- 迁移在 CI/CD 流水线中自动执行

## 种子数据

引用数据（船舶、车辆、证书类型等）通过 TypeORM `Seeder` 管理，放置于 `src/database/seeds/` 目录。种子数据在初始化时执行，幂等（使用 `INSERT ... ON CONFLICT DO NOTHING`）。

## 连接配置

- 连接池大小：最小 5，最大 20
- 连接超时：5秒
- 查询超时：30秒
- SSL：生产环境必须开启
