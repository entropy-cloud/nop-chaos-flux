# 组合范例 (Composite Examples)

`design-patterns/` 是**单组件/单特性**的 cookbook；本目录是**多技术组合**的端到端页面范例——把若干模式拼成真实业务页面，演示它们如何协作。

每个范例都是可独立参考的精简页面 schema（已去掉装饰性 className，保留核心机制），并标注它串起了哪些 pattern 与填补了哪些易被忽略的细节。

> 完整带样式 + mock 后端的真实版本见 `apps/playground/src/complex-pages/page-schemas/`（共 14 个页面）。

| 范例                           | 串起的核心技术                                                                                     | 对应真实页面             |
| ------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------ |
| `master-detail.md`             | `valuesPath` 过滤器发布 + `dependsOn`/`sendOn` 级联多数据源 + `$slot.record` 行按钮 + 只读 `table` | `master-detail.json`     |
| `inline-quick-edit.md`         | `quickEdit.body` + `quickSaveItemAction` + `actionType:"quickSaveItem"` + 挂载即触发一次 marker    | `inline-edit-table.json` |
| `business-document-formula.md` | `input-table` 逐行公式 + 自定义 `$Arr` 聚合命名空间 + `$Math` 折扣/税额计算                        | `business-document.json` |
| `wizard-values-path.md`        | wizard `steps` + 每步表单 `valuesPath` 分区 + 确认步跨步读取 + `onComplete` 汇总提交               | `form-wizard.json`       |

## 与 design-patterns 的关系

- 想查**单个组件怎么配** → `design-patterns/<组件>.md`。
- 想看**一个业务页面怎么把多个组件串起来** → 本目录。
- 本目录不重复 design-patterns 的字段说明，只在组合处加一句"为什么这样接"。
