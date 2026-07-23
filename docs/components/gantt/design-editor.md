# Gantt Task Editor 设计

## 1. 概述

Gantt Task Editor 是甘特图的任务编辑入口，支持双击/右键任务条弹出编辑界面，修改任务的 text/start/end/duration/progress 字段。

- 属于 `@nop-chaos/flux-renderers-scheduling` 包
- 文件位置：`src/gantt/gantt-editor.tsx`
- 对应 S2.9 work item

## 2. 编辑模式

### 2.1 Dialog 模式（默认）

双击/右键任务条 → `GanttStore.editTask(id)` 设置 `editingTaskId` → `GanttEditor` 渲染 Dialog 层。

Dialog 内容：

| 字段     | 控件类型      | 说明                |
| -------- | ------------- | ------------------- |
| text     | Input         | 任务名称            |
| start    | Input[date]   | 开始日期            |
| end      | Input[date]   | 结束日期            |
| duration | Input[number] | 工期（天）          |
| progress | Input[number] | 进度百分比（0-100） |

保存时调用 `store.updateTask(editingTaskId, partial)` 提交更改，关闭时 `store.editTask(null)` 清除编辑状态。

### 2.2 `editor` region 自定义模式

若 schema 提供 `editorRegion`，渲染器优先使用自定义 region 替代默认 dialog：

```tsx
editorRegion.render({
  bindings: { task: editingTask, onSave: closeEditor, onCancel: closeEditor },
});
```

自定义 region 可从 binding 获取当前 task 数据，用户保存/取消后调 `onSave`/`onCancel` 关闭编辑器。

## 3. 状态管理

### 3.1 editingTaskId

- 存储于 `GanttStore.editingTaskId`（signal 响应式）
- 由 `store.editTask(id)` / `store.editTask(null)` 控制
- Gantt 根组件监听从 `store.editingTaskId` 读取并传给 `GanttEditor`

### 3.2 触发路径

| 触发方式         | 处理函数                                  | 来源                  |
| ---------------- | ----------------------------------------- | --------------------- |
| 任务条双击       | `onBarDoubleClick` → `store.editTask(id)` | `GanttBars` 组件      |
| GanttHeader 内部 | `onBarDoubleClick` → `store.editTask(id)` | 同 GanttBars 事件冒泡 |

## 4. 组件 API

```tsx
interface GanttEditorProps {
  store: GanttStoreApi;
  editorRegion?: RenderRegionHandle; // 自定义编辑 region
  className?: string;
  editingTaskId?: string | number | null; // 当前编辑任务 ID
  onClose?: () => void;
  onBarDoubleClick?: (taskId: string | number) => void;
}
```

## 5. 键盘处理

- Enter 保存 → `handleSave`
- Escape 取消 → `closeEditor`
- Dialog 内的 Tab 在字段间切换（利用 `Dialog` 组件的内置焦点陷印）

## 6. 国际化

所有标签（任务名称、开始日期、取消、保存等）使用 `t()` 从 `@nop-chaos/flux-i18n` 读取，key 前缀 `scheduling.gantt.`：

| Key                         | 默认值      |
| --------------------------- | ----------- |
| `scheduling.gantt.editTask` | "Edit Task" |
| `scheduling.gantt.name`     | "Task Name" |
| `scheduling.gantt.start`    | "Start"     |
| `scheduling.gantt.end`      | "End"       |
| `scheduling.gantt.duration` | "Duration"  |
| `scheduling.gantt.progress` | "Progress"  |
| `scheduling.gantt.cancel`   | "Cancel"    |
| `scheduling.gantt.save`     | "Save"      |

## 7. 跨实例安全

每个 `GanttEditor` 实例使用 `useId()` 生成唯一 prefix，确保多个甘特图同屏时不产生 id 冲突。
