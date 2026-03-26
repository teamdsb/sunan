# 测试策略

## 分层

| 层级 | 工具建议 | 目标 |
|---|---|---|
| 规格校验 | `swagger-cli`、Markdown Review | 保证文档可用 |
| 单元测试 | Vitest / Jest | 领域规则、工具函数、Reducer |
| 集成测试 | NestJS Testing + Testcontainers | API、数据库、Redis、企业微信适配层 |
| 组件测试 | React Testing Library | 页面状态切换、表单校验 |
| 端到端测试 | Playwright | 企业微信 H5 关键流程的浏览器替身验证 |

## 里程碑 1 测试重点

1. OAuth2 回调与 JWT 刷新。
2. 证照创建、更新、分组查询。
3. 定时扫描生成提醒。
4. 提醒确认权限。
5. 文件预签名上传与回调。

## 约束

- 规格变更后先补测试，再改实现。
- OpenAPI 与前端 endpoint 定义需做一致性检查。
- 影响提醒规则的逻辑必须覆盖边界日期测试。
