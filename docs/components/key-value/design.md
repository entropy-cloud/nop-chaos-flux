# Key Value 组件设计

## 1. 组件定位

- `key-value` 是键值对数组字段编辑器。
- 它适合配置项、headers、metadata 等字符串到字符串的小型映射场景。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `addLabel` 和 `uniqueKeys`，并在 validation contributor 中明确为 `array` 值类型。
- 更复杂的 value schema、嵌套对象编辑或类型化 key/value 不应直接塞进首版 `key-value`。

## 3. Flux 中的 renderer/type 定义

- `type: 'key-value'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'array'`

## 4. schema 设计

- 继承 `InputSchema`，并增加 `addLabel`、`uniqueKeys`。
- 值模型是 `Array<{ id: string; key: string; value: string }>`，而不是普通对象字面量。

## 5. 字段分类

- `label`: `value-or-region`
- `addLabel`、`uniqueKeys`: `value`

## 6. regions 与 slot 约定

- 首版不需要 item-level region。
- 如果后续需要自定义 key/value 输入器，应优先拆出类型化配置而不是让 item 支持任意 schema。

## 7. 运行期状态归属

- 键值数组归 form runtime。
- 行内编辑态和新增草稿属于局部 UI 状态。

## 8. 事件、动作与组件句柄能力

- 集合操作可演进为 `component:addItem`、`component:removeItem`、`component:moveItem`。
- 当前删除/新增主要通过值更新驱动。

## 9. 数据源、表达式、导入能力接入点

- 初始值可通过表达式或 form data 注入。
- 复杂映射来源应由 loader 先转成规范的键值数组。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-key-value` marker。
- 行布局和按钮样式应来自通用 UI 组件，不内嵌专用视觉协议。

## 11. 实现拆分建议

- 数组值桥接、唯一键验证和行编辑壳层分模块实现。

## 12. 风险、取舍与后续阶段

- 一旦需要对象级复杂值，应该升级为 `array-editor` 或专用 editor，而不是继续膨胀 `key-value`。
