---
status: operations
owner: delivery
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M8 Wave 3 提示词：证据、打印、导出与移动能力

```text
执行 M8 Wave 3，目标是让所有工作平台业务具备统一附件、企业微信拍照、签名、定位、PDF 下载和真实异步导出。

前置：Wave 2 权限与动作授权已验收。

必须阅读：
- AGENTS.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/plans/M8-execplans.md
- docs/plans/M8-wave-backlog.md
- docs/specs/common/file-upload-spec.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/wecom/jssdk-spec.md
- docs/specs/workbench/api/workbench-platform-api.yaml
- docs/specs/procurement/README.md
- docs/specs/procurement/api/procurement-order-api.yaml
- docs/specs/procurement/db/procurement-order-files.md
- docs/specs/procurement/ui/order-create-page.md
- Wave 2 权限规格
- docs/specs/safety/README.md

按 SDD/TDD 完成：
1. 冻结 evidence-and-export API、DB、state、UI 规格。
2. 先写文件权限、导出状态、签名和定位证据测试。
3. 将通用附件组件接入所有工作平台详情，移除普通用户手工输入 fileId 的操作路径。
4. 将该组件接入采购执行清单详情：新增受采购单权限保护的 `DELETE /procurement/orders/{id}/attachments/{fileId}`，仅解除订单—文件关联；删除前二次确认并记录操作人、时间、原因和关联对象，绝不删除 OSS 对象或仍被其他业务引用的 `files` 元数据。
5. 采购附件解除关联复用草稿编辑权限；无权用户和非草稿订单必须被后端拒绝，成功后前端刷新附件列表。
6. 接入企业微信拍照转存 OSS，处理 mediaId 幂等和失败重试。
7. 实现 H5 签名板和定位证据，保存用户、时间、摘要哈希、经纬度和精度。
8. 证据替换、删除和归档必须有审计。
9. 工作平台打印返回受权限保护的 downloadUrl，并提供版本、水印和生成时间。
10. 将考勤及通用导出从模拟 queued/fileId 改为真实任务、真实文件和可重试失败状态。

硬性验收：
- 任意支持附件的业务可选择文件或拍照、预览、下载。
- 采购执行清单详情的授权草稿编辑者可解除已绑定附件；无权、非草稿和不存在的关联均不能删除，解除后文件记录及其他合法关联仍存在。
- 无权用户不能获得下载 URL。
- 定位拒绝或 JS-SDK 失败有明确恢复路径，不伪造坐标。
- 导出状态至少包含 queued/running/succeeded/failed。
- PDF 和导出文件继承业务记录权限。

真机要求：
- 企业微信 iOS 和 Android 各验证拍照、定位、签名、文件预览。
- 记录机型、系统、企业微信版本和结果。

运行受影响测试、API/Web build、OpenAPI 校验和文档索引校验。最终报告附真机证据、生成文件证据、权限拒绝证据和 Wave 3 验收文档。
```
