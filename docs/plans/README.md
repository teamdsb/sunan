---
status: current-index
owner: planning
updated: 2026-07-12
replaces: []
replaced_by: []
---
# 当前执行计划索引

> 本目录只存放尚未完成的当前计划。当前没有正在执行的里程碑；这里只保留通用 Wave 验收模板。

## 当前文件

| 文档 | 状态 | 用途 |
|---|---|---|
| `wave-acceptance-template.md` | 模板 | 每个 Wave 的统一验收记录格式 |

## M8 已归档

- 总验收：`docs/archive/acceptance/safety/acceptance-m8-overall.md`
- 最终功能核查：`docs/archive/audits/M8-最终功能实现核查.md`
- 历史执行计划：`docs/archive/execplans/M8-execplans.md`
- 历史 backlog：`docs/archive/backlogs/safety/M8-wave-backlog.md`
- 历史提示词：`docs/archive/prompts/m8/`

## M9 已暂停

- 暂停包：`docs/archive/paused/m9/`
- 恢复条件：用户明确重新启动，并重新确认 M8 生产/真机基线、M9 范围和排期。

## 配套入口

- 执行计划总入口：`docs/execplans.md`
- M8 需求：`docs/requirements/M8-安全管理底座与核心闭环.md`
- M9 暂停需求：`docs/requirements/M9-专业安全业务深化与体系完善.md`
- 安全领域规格索引：`docs/specs/safety/README.md`
- 提示词索引：`docs/prompts/README.md`

## 使用规则

1. 每个 Wave 必须先冻结规格，再写测试，最后实现。
2. 未通过当前 Wave 验收，不得将其任务标记为完成。
3. 外部海事、AIS、CCTV 等真实接口不在 M8/M9 范围。
4. 不得用通用文本字段替代已经冻结的专业结构化数据。
5. 暂停的 M9 不因 M8 已通过而自动启动。
