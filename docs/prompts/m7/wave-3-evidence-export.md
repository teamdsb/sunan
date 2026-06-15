---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M7 Wave 3 提示词：证据、打印、导出与移动能力

```text
执行 M7 Wave 3，目标是让所有工作平台业务具备统一附件、企业微信拍照、签名、定位、PDF 下载和真实异步导出。

前置：Wave 2 权限与动作授权已验收。

必须阅读：
- AGENTS.md
- docs/requirements/M7-安全管理底座与核心闭环.md
- docs/plans/M7-execplans.md
- docs/plans/M7-wave-backlog.md
- docs/specs/common/file-upload-spec.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/wecom/jssdk-spec.md
- docs/specs/workbench/api/workbench-platform-api.yaml
- Wave 2 权限规格
- docs/specs/safety/README.md

按 SDD/TDD 完成：
1. 冻结 evidence-and-export API、DB、state、UI 规格。
2. 先写文件权限、导出状态、签名和定位证据测试。
3. 将通用附件组件接入所有工作平台详情，移除普通用户手工输入 fileId 的操作路径。
4. 接入企业微信拍照转存 OSS，处理 mediaId 幂等和失败重试。
5. 实现 H5 签名板和定位证据，保存用户、时间、摘要哈希、经纬度和精度。
6. 证据替换、删除和归档必须有审计。
7. 工作平台打印返回受权限保护的 downloadUrl，并提供版本、水印和生成时间。
8. 将考勤及通用导出从模拟 queued/fileId 改为真实任务、真实文件和可重试失败状态。

硬性验收：
- 任意支持附件的业务可选择文件或拍照、预览、下载。
- 无权用户不能获得下载 URL。
- 定位拒绝或 JS-SDK 失败有明确恢复路径，不伪造坐标。
- 导出状态至少包含 queued/running/succeeded/failed。
- PDF 和导出文件继承业务记录权限。

真机要求：
- 企业微信 iOS 和 Android 各验证拍照、定位、签名、文件预览。
- 记录机型、系统、企业微信版本和结果。

运行受影响测试、API/Web build、OpenAPI 校验和文档索引校验。最终报告附真机证据、生成文件证据、权限拒绝证据和 Wave 3 验收文档。
```
