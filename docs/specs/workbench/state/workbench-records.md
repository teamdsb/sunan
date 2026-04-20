# 工作平台记录状态规格

## 1. 目标

定义工作平台记录列表、详情、动作、附件和打印相关的前端状态边界。

## 2. 状态切片

### `workbenchRecords`

职责：

- 记录列表与分页
- 记录详情与步骤明细
- 动作提交
- 附件上传与删除
- 打印预览状态

建议状态：

```ts
interface WorkbenchRecordsState {
  list: BusinessRecordSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: {
    moduleCode?: string;
    status?: string[];
    vesselId?: string;
    ownerUserId?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  detail: BusinessRecordDetail | null;
  actionSubmitting: boolean;
  attachmentQueue: UploadQueueItem[];
  printPreview: PrintSnapshot | null;
  loadingList: boolean;
  loadingDetail: boolean;
  error: string | null;
}
```

## 3. 动作规范

通用动作由 `POST /workbench/records/:id/actions` 统一提交，前端动作按钮应根据模板和状态渲染，不允许写死到单一模块页面中。

常见动作：

- `submit`
- `assign`
- `start`
- `complete_step`
- `submit_review`
- `request_rework`
- `close_record`
- `archive`

## 4. 附件上传

- 图片上传优先走企业微信拍照/选图。
- 长传文件、单证、导出文件复用通用文件上传能力。
- 整改前后照片必须带 `category`，例如：
  - `before_rectification`
  - `after_rectification`
  - `meeting_photo`
  - `evidence`
  - `print_export`

## 5. 打印预览

- 打印预览只读取后端生成的快照数据，不直接用前端当前编辑态拼装。
- 若记录已归档，则默认显示最新一次打印快照。
