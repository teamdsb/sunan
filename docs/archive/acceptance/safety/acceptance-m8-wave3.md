---
status: acceptance-archive
owner: safety
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M8 Wave 3 验收记录：证据、打印、导出与移动能力

## 自动化证据

- 采购草稿附件解除关联、文件保留和重复解除拒绝：`apps/api/test/procurement.integration.spec.ts`。
- 工作平台权限、附件和打印拒绝矩阵：`apps/api/test/workbench.integration.spec.ts`。
- Canvas 签名、附件上传和详情接入：`apps/web/src/features/workbench/EvidencePanel.test.tsx`、`WorkbenchHomePage.test.tsx`。
- OpenAPI：`evidence-and-export-api.yaml`、采购单和工作平台 API 均由 `swagger-cli validate` 校验。

## 交付结论

- 附件、采购解除关联、审计、受控 PDF、Canvas 签名、浏览器定位及手动地址说明均已实现。
- 导出使用持久化任务；启动恢复会把中断的 running 任务标为 failed，领取 queued 任务，失败可授权重试。PDF 输出为真实 PDF；表格导出使用 XLSX 工作簿生成器。

## 真机验证（用户确认）

| 平台 | 机型/系统 | 企业微信版本 | 拍照 | 定位 | 签名 | 预览 | 结果 |
|---|---|---|---|---|---|---|---|
| iOS | 未记录（用户要求不写入） | 未记录 | 通过 | 通过 | 通过 | 通过 | 通过 |
| Android | 未记录（用户要求不写入） | 未记录 | 通过 | 通过 | 通过 | 通过 | 通过 |

用户已确认两端真机项目全部通过，并明确要求不写入设备元数据；Wave 3 可据此标记完成。
