# scheduling 包 `@deprecated` 字段清册

> Owner: plan 766（deep-audit 2026-10-27 C8）；维护规则：每处 `@deprecated` 必须在本册有行，新增时同步；实际删除批次按候选排序另行立项。
> 扫描口径：`grep -rn "@deprecated" packages/flux-renderers-scheduling/src --include='*.ts'`（排 test）；2026-10-27 实测 9 处。

| #   | 位置                                | 标的                                                                                          | 替代路径                              | 消费者状态（2026-10-27 grep）                                                          | 处置建议                     |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | `src/calendar/calendar.types.ts:86` | `CalendarResource.text`                                                                       | `title`                               | 包外零消费者                                                                           | 候选删除                     |
| 2   | `src/gantt/gantt.types.ts:173`      | `GanttSchema.scales`                                                                          | `zoomLevels`                          | 包外命中均为 zoomLevel 条目内的同名键（`gantt-perf-scale-demo.tsx:157-159`），非本字段 | 候选删除                     |
| 3   | `src/gantt/gantt.types.ts:178`      | `GanttSchema.startDate`                                                                       | `zoomLevels` + `GanttTaskData.start`  | 包外零消费者                                                                           | 候选删除                     |
| 4   | `src/gantt/gantt.types.ts:180`      | `GanttSchema.endDate`                                                                         | `zoomLevels` + `GanttTaskData.end`    | 包外零消费者                                                                           | 候选删除                     |
| 5   | `src/gantt/gantt.types.ts:182`      | `GanttSchema.childrenField`                                                                   | task `children: GanttTaskData[]` 嵌套 | 包外零消费者                                                                           | 候选删除                     |
| 6   | `src/gantt/gantt.types.ts:184`      | `GanttSchema.initiallyExpanded`                                                               | 运行时状态驱动                        | 包外命中为 tree-renderer 同名字段（不同组件），非本字段                                | 候选删除                     |
| 7   | `src/gantt/gantt.types.ts:190`      | `GanttSchema.progressBarHeight`                                                               | `taskBarHeight`                       | 包外零消费者                                                                           | 候选删除                     |
| 8   | `src/gantt/gantt.types.ts:192`      | `GanttSchema.calendar`                                                                        | per-`parse()` `CalendarEntry[]`       | 包外零消费者                                                                           | 候选删除                     |
| 9   | `src/gantt/gantt-store.ts:465`      | `GanttStore` 类型别名（`new GanttStore()` 构造面，经 intentional `as unknown as` 走同一工厂） | `createGanttStore(config?)`           | 删除批次执行时复核                                                                     | 候选删除（向后兼容构造语法） |

## 规则

- 全部 9 处当前无移除目标版本（原 JSDoc 只写 "will be removed in a future version"）——本册即 deprecation skill 要求的 docs record；删除前须满足 skill 两条件（docs 标记 + 零活跃消费者复核）。
- schema 面字段（#1–#8）删除属用户可见 schema 契约变更，须 release 策略裁定（PH-12）先行或同批。
