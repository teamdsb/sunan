---
status: current-spec
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台壳层状态规格

## 1. 目标

定义工作平台首页、模块入口、待办和筛选器的前端状态边界。

## 2. 状态切片

### `workbenchShell`

职责：

- 工作平台首页模块列表
- 部门分组和模块可见性
- 待办计数与消息提示
- 当前筛选上下文（部门、模块、船舶、时间）
- 是否处于企业微信容器、JS-SDK 是否可用

建议状态：

```ts
interface WorkbenchShellState {
  modules: WorkbenchModuleSummary[];
  groupedModules: Record<string, WorkbenchModuleSummary[]>;
  pendingCounts: Record<string, number>;
  selectedDepartmentCode: string | null;
  selectedModuleCode: string | null;
  selectedVesselId: string | null;
  dateRange: { from: string | null; to: string | null };
  isWecomContainer: boolean;
  isJsSdkReady: boolean;
  loading: boolean;
  error: string | null;
}
```

## 3. 初始化顺序

1. 读取当前用户角色与部门。
2. 加载工作平台模块清单。
3. 根据角色过滤模块可见性。
4. 拉取模块待办计数与首页聚合数据。
5. 初始化企业微信容器能力与 JS-SDK 就绪态。

## 4. 页面共享约束

- 首页、模块列表、记录列表共享同一组筛选器上下文。
- 船舶相关模块必须支持快速切换船舶维度。
- 从消息中心跳入详情页时，需回填来源模块与筛选上下文。

## 5. 错误态

- 模块加载失败：显示重试入口。
- JS-SDK 初始化失败：不阻塞纯查看页面，但禁用拍照上传等能力。
- 权限不足：模块入口隐藏，直接访问详情页时显示无权限页。
