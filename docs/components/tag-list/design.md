# Tag List 组件设计

## 1. 组件定位

- `tag-list` 是字符串标签数组的轻量编辑字段。
- 它适合固定自由度较高但结构简单的标签输入，不承担复杂对象数组编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现最小标签列表编辑和 field label。
- 自动补全、预设选项、去重和最大数量是后续增强方向。

## 3. Flux 中的 renderer/type 定义

- `type: 'tag-list'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`

## 4. schema 设计

- 当前导出字段为 `tags?: string[]`，并继承 `InputSchema`。
- 建议正式契约后续统一到 `value`/`defaultValue` 风格，`tags` 可作为过渡字段或初始化别名。

## 5. 字段分类

- `label`: `value-or-region`
- `tags`: `value`

## 6. regions 与 slot 约定

- 不需要子 regions。
- 若后续需要自定义 tag renderer，应考虑受限 item slot，而不是完全开放任意 render prop。

## 7. 运行期状态归属

- 标签数组值归 form runtime。
- 输入中的草稿标签、光标位置等为局部 UI 状态。

## 8. 事件、动作与组件句柄能力

- 主要交互是新增、删除标签对应的值变化。
- 后续可考虑 `component:addItem`、`component:removeItem` 等统一集合句柄。

## 9. 数据源、表达式、导入能力接入点

- 初始标签可来自表达式结果。
- 如果需要从外部候选词库中选择，优先组合 `select`/`combobox` 族能力，而不是扩展 `tag-list` 为万能输入器。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-tag-list` marker。
- 标签胶囊视觉复用 `@nop-chaos/ui` Button/Badge 风格，不在 renderer 内重新定义一套 token。

## 11. 实现拆分建议

- 输入编辑、标签集合渲染和数组值桥接逻辑分离。

## 12. 风险、取舍与后续阶段

- `tag-list` 与 `checkbox-group`、`array-editor` 的边界需要持续明确：它只处理简单字符串标签集合。
