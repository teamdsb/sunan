---
status: current-spec
owner: safety
updated: 2026-07-10
replaces: []
---
# Wave 2 权限与动作 UI 规格

详情响应提供 `availableActions`、`participants` 和 `accessScope`。前端只渲染 `availableActions` 中的动作；403 显示“无权访问或执行此记录”，不得显示记录摘要、步骤或附件元数据。按钮点击后仍必须处理 403、409、422 并刷新详情。

记录列表仅呈现后端已过滤结果。附件、打印和导出入口使用同一 `availableActions`；前端不以模块角色或路由可见性替代后端授权。移动端动作区保持可点击区域至少 44px，提交期间禁止重复动作。
