# M6 Wave 5 验收清单

- `pnpm --filter api build`、`pnpm --filter web build`、`pnpm --filter web test` 已通过。
- Workbench 前端路由级页面测试已覆盖新增入口。
- OpenAPI 变更若存在，必须纳入 `swagger-cli validate`。
- 后端集成测试必须在具备 Docker 或等效 container runtime 的环境执行。
- Web 构建结果需持续跟踪主包体积与懒加载拆包效果。
