---
status: acceptance-archive
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# M8 Wave 5 验收记录：计划任务、统一待办、真实日历与企业微信消息

## 结论

状态：通过。Wave 5 已建立可被后续安全领域复用的计划、计划项、真实任务、参与人、动作轨迹、生成运行和企业微信投递真源。无未关闭 P0/P1，无构建或测试警告。

## 任务生成幂等证据

- `buildGenerationKey(planItemId, ruleVersion, occurrenceAt)` 使用 SHA-256 产生稳定键；`safety_tasks.generation_key` 在 PostgreSQL 中唯一。
- `safety_task_generation_runs` 持久化每次 generate/reconcile 窗口和 created/skipped/failed 数；`(run_id,generation_key)` 保留每次运行证据。
- `plan-task.integration.spec.ts` 并发发起两次不同 request id 的生成：数据库只有 1 个任务，两个 run 累计 `created=1`、`skipped=1`，assignment 投递也只有 1 条。
- 故障注入测试强制参与人写入失败，确认任务事务回滚且 generation entry 记录 `failed`；解除故障后 reconcile 补建任务与参与人。
- 调度器每日 00:05（Asia/Shanghai）运行 62 天滚动生成、逾期升级和投递重试；同日重放升级不新建投递。

## 待办数据范围与日历证据

- `GET /tasks` 是待办、我发起、我参与、已完成、逾期和日历范围查询的唯一接口；日历不存在独立排程表或静态数据。
- 可见范围为系统管理员、计划负责人、当前责任人或历史/有效参与人；待办只包含当前可执行且非终态任务。
- 集成测试对同一 task id 核对 todo、overdue、calendar range、completed、participated 和计划 `completionRate`；取消任务不进入完成率分母。
- Web 组件测试确认列表和日历复用同一 hook/query，日历任务可直达 `/workbench/tasks/:taskId`。

## 任务动作和企业微信证据

- 改期、取消、阻塞、催办、升级、代理和转移要求原因；前后快照和 operator/request id 写入不可变动作日志。
- 转移将旧 executor 关系改为 `transferred`、创建新 executor 并保留 transfer 记录；集成测试确认旧责任人再执行返回 403，但仍能在历史参与视图看到任务。
- 任务生成、转移、催办和升级创建逐接收人投递；记录 `queued/dispatching/sent/failed/skipped`、attempt count、WeCom errcode、失败原因、下次重试和 sentAt。
- 转移、动作日志和投递 outbox 同事务提交；故障注入确认投递落库失败时三者一起回滚，同一幂等键可安全重放。
- 消息去重键为 `task + recipient + messageType + businessCycle`；失败重试更新同一 delivery，不更换键。集成测试验证 errcode `50001`、尝试次数 `1 -> 2`、`attemptHistory` 同时保留失败与成功结果，成功后重放不再发送。
- 文本卡片 URL 包含 `/workbench/tasks/{taskId}?notificationId={deliveryId}`；`AuthCallbackPage.test.tsx` 验证 OAuth state 恢复后保留该完整路径和查询参数，外部/协议相对回跳被安全降级到 `/my`。

## 自动化验证

| 门禁 | 结果 |
|---|---|
| API lint | 通过，0 errors / 0 warnings |
| API unit | 15 suites、70 tests passed |
| API integration（PostgreSQL testcontainers） | 16 suites、69 tests passed；单独 Wave 5 以 `--detectOpenHandles` 通过 11 tests |
| Web tests | 60 files、236 tests passed，无 Router/Form/Redux 警告 |
| API build | 通过 |
| Web build | 通过，无 Node engine 警告（直接使用工作区二进制） |
| OpenAPI | `plan-task-api.yaml` 通过 `swagger-cli validate` |
| 文档 | inventory 生成、index 校验和 `git diff --check` 通过 |

月末无永久漂移、闰年 2 月 29 日、周期/单次发生时点、Asia/Shanghai 调度边界、截止时刻严格逾期边界均有自动化单元测试。
