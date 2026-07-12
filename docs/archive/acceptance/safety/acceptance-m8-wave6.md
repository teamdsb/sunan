---
status: acceptance-archive
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# M8 Wave 6 验收记录：检查、问题与 CAPA

## 结论

- 状态：通过
- 未关闭 P0/P1 缺陷：无
- 范围：模板版本快照、多人检查、自动转单、统一问题、CAPA、验证返工/关闭和四类来源双向链接。

## 工作包与证据

| 工作包 | 状态 | 证据 |
|---|---|---|
| `M8-W6A` | 通过 | `inspection-capa-api.yaml`、`inspection-capa-schema.md`、`inspection-capa.integration.spec.ts` |
| `M8-W6B` | 通过 | 稳定转单键、并发去重、失败 job 与 reconcile 回归 |
| `M8-W6C` | 通过 | 根因、纠正/预防措施、证据、独立验证、返工、重大问题关闭拒绝和四来源回链 |

## 主链路证据

`inspection-capa.integration.spec.ts` 从实际 API 创建检查计划，生成安全任务，由两位检查人独立签认，在 `all` 门槛前拒绝汇总，之后只生成一个不符合问题；接着完成根因、纠正/预防措施、两类证据、失败验证返工、通过验证和受权关闭。

## 新鲜自动化证据（2026-07-12）

| 门禁 | 结果 | 失败数 |
|---|---|---:|
| API unit | 16 suites / 79 tests 通过 | 0 |
| API integration | 18 suites / 78 tests 通过 | 0 |
| Web | 61 files / 238 tests 通过 | 0 |
| API lint/build | 通过 | 0 |
| Web build | 通过 | 0 |
| OpenAPI | 全部 21 份通过 | 0 |
| migration | 22 个注册 migration 全量 down/up/重复 up 通过 | 0 |

Wave 6 未把浏览器自动化伪写为企业微信真机结果；最终 iOS/Android/桌面主链回归属于 Wave 7 上线门禁。
