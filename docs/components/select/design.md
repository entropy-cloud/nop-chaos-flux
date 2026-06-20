# Select 组件设计

## 1. 组件定位

- `select` 是离散单选或多选字段的基础下拉控件。
- 它负责 option 选择与值绑定，不负责数据查询和分页式远程列表浏览。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决。当前 `select` 是单选 NativeSelect，**缺搜索过滤、多选、远程异步搜索、虚拟滚动、clearable、creatable、分组、option 模板**（用户反馈的"缺输入过滤"为头号缺口），属 P0 改进项 E1a。
- `placeholder` **已实现**（文档历史版本误列为"后续补齐"，已校正）。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。`—` 表示该侧无内容。

| 能力                                                                                        | 采纳                                                                                                  | 不采纳                                                   | 理由                                                                                 |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 单选 + 静态/异步 `options`（`{label,value}` 标准形状）                                      | **实现**：`options`（source-enabled，一次性异步加载）+ `placeholder`/`disabled`/`readOnly`/`required` | —                                                        | 当前基线；option 形状对齐 X3 §2（`{label,value}`，不用 amis 值编码）                 |
| 输入搜索过滤                                                                                | **计划实现（E1a）**：`searchable` + `filterOption`（shadcn Combobox 命名 + 高亮）                     | amis 组件级 `autoComplete` SchemaApi 生命周期            | 头号缺口；命名对齐 shadcn/ui Combobox；请求下沉 data-source + action（X3 §1/§3）     |
| 多选                                                                                        | **计划实现（E1a）**：`multiple`（tag 模式渲染选中项）                                                 | amis `checkAll`/`defaultCheckAll`（归 `checkbox-group`） | 多选是 select 核心能力；全选语义归离散多选集合字段（checkbox-group）                 |
| `clearable` 清空                                                                            | **计划实现（E1a）**：`clearable`（明确布尔，对齐 shadcn）                                             | —                                                        | 命名对齐 X3 §2（肯定式布尔）                                                         |
| 虚拟滚动（大 option 集）                                                                    | **计划实现（E1a）**：复用 table 的 virtual 模式                                                       | —                                                        | 大 option 集性能                                                                     |
| 分组 option                                                                                 | **计划实现（E1a）**：嵌套 `options` 或 `groups: { label, options }[]`                                 | amis `children` 混合扁平编码                             | 命名对齐 X3 §4.3（不用 amis 扁平编码）                                               |
| option 模板渲染                                                                             | **计划实现（E1a）**：受控 option label region                                                         | —                                                        | 自定义 option 展示                                                                   |
| 远程异步搜索（debounce）                                                                    | **计划实现（E1a）**：走 data-source，不在组件开 `api`                                                 | amis 组件级 `api`/`initFetch`                            | 请求下沉 data-source + action（X3 §1/§3）                                            |
| `creatable`/`editable`/`removable` option                                                   | **暂不实现**                                                                                          | —                                                        | 场景窄，后续按需                                                                     |
| amis 多模式 `selectMode`（table/group/tree/chained/associated）                             | —                                                                                                     | **不采纳**                                               | 多模式归 tree-select/picker/transfer 等独立组件，不塞进 select（X3 §1 "核心已简化"） |
| amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`/`simpleValue` | —                                                                                                     | **不采纳**                                               | 用 shadcn `{label,value}` 标准形状；如需扩展按命名规范单独立项（X3 §3）              |
| amis 皮肤/双实现 `borderMode`/`overlay`/`mobileUI`/`hideSelected`/`showInvalidMatch`        | —                                                                                                     | **不采纳**                                               | amis 皮肤变体/双实现坏设计；移动端走响应式（见 mobile-roadmap，X3 §3）               |

## 3. Flux 中的 renderer/type 定义

- `type: 'select'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`，`options` 为 `prop + allowSource`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `options`。
- E1a 将补齐 `multiple`、`searchable`、`clearable`、`filterOption` 等字段，命名对齐 shadcn/ui Combobox（不采纳 amis `joinValues`/`extractValue`/`selectMode` 等命名，见 §2 决策表）。`placeholder` 已实现。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value
- `placeholder`、`multiple`、`searchable`: `value`

## 6. regions 与 slot 约定

- 首版不开放 option-level region。
- 如果未来需要自定义 option/trigger 渲染，应在 renderer adapter 层转换，而不是把 schema 直接暴露为函数型 slot。

## 7. 运行期状态归属

- 当前选中值归 form runtime 或 scope。
- 打开态、搜索关键字等纯 UI 状态归本地组件状态，不应默认写入表单。

## 8. 事件、动作与组件句柄能力

- 标准 `onChange` 由 field 交互自然触发。
- 后续可考虑 `component:focus`、`component:open`，但不应暴露底层第三方组件 ref。

## 9. 数据源、表达式、导入能力接入点

- `options` 已是 source-enabled field，是当前表单族里最明确的数据源入口之一。
- 真正的远程请求、依赖注入和缓存仍应遵循统一 `data-source`/API 语义。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-select-wrapper` marker and `data-slot="select-wrapper"` marker.
- 当前表单 `type: 'select'` 单选 renderer uses `@nop-chaos/ui` `NativeSelect` as the stable browser-interaction baseline; popup/headless select remains a UI primitive for richer future modes.
- 视觉层复用 `@nop-chaos/ui` Select 或 NativeSelect，不再引入第二套 mode 命名。

### `NativeSelect` public contract baseline

- `NativeSelect` 属于 `@nop-chaos/ui` 的公开 UI primitive，不应只通过内部文件路径或 synthetic DOM 事件来定义契约。
- `disabled` 的支持语义以真实原生 `<select disabled>` 交互为准；不要把测试里手工触发 `change` 后 handler 仍被调用视为 supported contract。
- `value` / `defaultValue` / `onChange` 语义应保持与原生 `<select>` 一致，由上层 renderer 负责把 schema/runtime 值绑定到该公开接口。
- renderer 或测试如果要证明 disabled 行为，应优先断言真实禁用状态与公开入口行为，而不是把事件系统的可人工触发性写成长期基线。

## 11. 实现拆分建议

- option 归一化、source state 展示和 field chrome 应分离。

## 12. 风险、取舍与后续阶段

- 多选、搜索和远程源一旦混在一起，很容易使契约过宽；文档需要持续强调“单一 value 字段 + 明确 option 输入”原则。
