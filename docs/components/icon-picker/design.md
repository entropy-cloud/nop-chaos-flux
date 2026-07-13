# IconPicker 组件设计

## 1. 组件定位

- `icon-picker` 是弹层选择字段 renderer，用于让用户从 Lucide 图标集中可视化选择一个图标。
- 它是表单高级字段 family 的选择控件，服务于低代码平台的菜单配置、按钮图标设置、插件图标选择等场景。
- **边界裁定**：icon-picker 是**图标值选择壳**，值 owner = 表单字段。弹层 UI 复用 `@nop-chaos/ui` Popover 原语，不重造 surface owner 协议。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS 场景中通过下拉/弹层选择图标名的需求。
- Flux 应优先用 `Popover` + 表单字段值 owner 的组合语言表达它，而不是复制历史大而全 picker 协议。
- 参考 `nop-chaos-next` 的 `IconPicker` 实现模式：Popover + 搜索 + 6 列网格 + 虚拟滚动（`visibleCount` 按 200 递增）。

### Flux 决策表

| 能力                  | 采纳                          | 不采纳     | 理由                                                                         |
| --------------------- | ----------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Lucide 图标网格展示   | **实现**                      | —          | 基于 `lucide-react` `icons` 对象，PascalCase → kebab-case 展示全量图标       |
| 搜索过滤              | **实现**：`searchable`        | —          | 按 kebab-case 名称大小写无关子串匹配；图标数量大（~1500+），搜索是核心交互   |
| 已选高亮              | **实现**                      | —          | 当前值对应的图标高亮显示（`border-primary bg-accent`）                       |
| 虚拟滚动/分批加载     | **实现**：`visibleCount` 递增 | —          | 初始显示 200 个，点击"显示更多"追加；避免一次性渲染 1500+ SVG DOM 节点       |
| Ant Design 图标名兼容 | **实现**                      | —          | 值通过 `resolveLucideIcon()` 解析，自动支持 `ant-design:*` 前缀名            |
| FontAwesome 前缀兼容  | **实现**                      | —          | 值经 `normalizeIconName()` 剥离 FA 前缀，保持向后兼容                        |
| 多选                  | —                             | **不采纳** | 图标选择场景几乎都是单选；多选归 `tag-list` 或 `transfer`                    |
| 自定义图标集          | —                             | **不采纳** | 首版仅支持 Lucide 全量图标集；自定义 SVG 集合与 `image` 边界模糊，归后续评估 |
| 分类/分组             | —                             | **不采纳** | Lucide 图标无官方分类；按字母序展示 + 搜索过滤已足够                         |
| 图标预览尺寸          | —                             | **不采纳** | 固定 `size-4`（16px），与 `IconRenderer` 默认尺寸一致；无需用户可配          |

## 3. Flux 中的 renderer/type 定义

- `type: 'icon-picker'`
- `category: 'form'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`

## 4. schema 设计

- 继承 `InputSchema`，增加 icon-picker 特有字段。

```typescript
interface IconPickerSchema extends BaseSchema {
  type: 'icon-picker';
  /** 表单字段名 */
  name?: string;
  /** 字段标签 */
  label?: string;
  /** 占位文案，缺省 "选择图标" */
  placeholder?: string;
  /** 是否可搜索，缺省 true */
  searchable?: boolean;
  /** 是否可清空，缺省 true */
  clearable?: boolean;
  /** 是否禁用 */
  disabled?: boolean | string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: string;
  /** 当前值（受控模式） */
  value?: string;
}
```

### 与 AMIS 对照

- AMIS 无标准 `icon-picker` 组件；图标选择通常由自定义组件或 `select` + 手动 option 实现。
- Flux 的 `icon-picker` 是独立 type，提供开箱即用的图标选择体验。

## 5. 字段分类

- `label`: `value-or-region`
- `name`: `value`
- `placeholder`: `value`
- `searchable`: `value`（boolean，缺省 `true`）
- `clearable`: `value`（boolean，缺省 `true`）
- `disabled`: `value`
- `readOnly`: `value`
- `required`: `value`
- `defaultValue`: `value`
- `value`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- 首版不暴露自定义 region。
- 图标网格为内部固定布局（6 列网格），不开放模板化。
- 后续如需自定义图标预览，可开放 `iconTemplate` region（`params: ['icon']`）。

## 7. 运行期状态归属

- 当前选中值归 form runtime 或 scope。
- 搜索关键字、弹层打开态、可见图标数量等纯 UI 状态归本地组件状态，不应默认写入表单。
- 值变更通过 `onChange` 事件通知表单 owner。

## 8. 事件、动作与组件句柄能力

- `onChange`: 值变更事件，触发 `ActionSchema`。
- 首版不提供组件句柄（`component:open` 等）。
- 如果需要编程式打开弹层，归后续评估。

## 9. 数据源、表达式、导入能力接入点

- `value` 和 `defaultValue` 可接表达式结果。
- 图标集固定为 Lucide 全量图标，不支持外部数据源注入。
- 值经 `resolveLucideIcon()` 解析，自动支持 Ant Design 名称兼容。

## 10. 样式与 DOM marker 约定

- 触发器根节点输出 `nop-icon-picker` marker。
- 弹层内图标网格使用 6 列 CSS Grid 布局。
- 每个图标项固定 `size-4`（16px），hover 态 `bg-accent rounded`，选中态 `border-primary bg-accent`。
- 搜索框位于弹层顶部，占满宽度。
- "显示更多"按钮位于网格底部，居中。

## 11. 图标列表生成

图标列表从 `lucide-react` 的 `icons` 对象动态生成：

```typescript
const ICON_NAMES = Object.keys(icons)
  .map((key) => toKebabCase(key)) // PascalCase → kebab-case
  .filter(Boolean)
  .sort();
```

- 完整列表约 1500+ 项（随 `lucide-react` 版本变化）。
- 搜索过滤：大小写无关子串匹配 `ICON_NAMES`。
- 虚拟化：初始 `visibleCount = 200`，每次"显示更多"追加 200。
- 选中高亮：当前 `value` 经 `normalizeIconName()` 规范化后与 `ICON_NAMES` 项比对。

## 12. 实现拆分建议

- **渲染层**：`IconPickerRenderer` 在 `@nop-chaos/flux-renderers-form-advanced` 中，负责 schema 驱动的触发器 + 弹层组合。
- **图标解析**：复用 `@nop-chaos/ui` 的 `resolveLucideIcon`、`normalizeIconName`，不重复实现。
- **UI 原语**：弹层使用 `@nop-chaos/ui` 的 `Popover`/`PopoverTrigger`/`PopoverContent`。
- **图标列表生成**：纯工具函数，可在 icon-utils 中导出，或内联在 icon-picker renderer 中。

## 13. 风险、取舍与后续阶段

- Lucide 图标数量随版本增长，需关注初始加载性能（虚拟化已缓解）。
- Ant Design 映射表需定期与 `@ant-design/icons` 版本同步更新。
- 如果未来需要自定义图标集（如企业内部图标），需评估与 `image` 的边界。
- 搜索性能：1500+ 项的子串匹配在现代浏览器中无瓶颈，但如果后续图标数量大幅增长，可考虑 debounce 或 Web Worker。
