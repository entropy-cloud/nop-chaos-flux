# Flux 开发指南 - 给 AI 看的精简版

> **一句话**：Flux 是 nop-chaos-flux 的 JSON-to-React 低代码框架。你写 JSON Schema，引擎编译并渲染成 UI。

---

## 核心架构

```
JSON Schema (含 type 字段)
  → SchemaCompiler 编译为 CompiledTemplate (TemplateNode + CompiledValueNode)
  → RendererRegistry 按 type 查找匹配的 React 组件
  → 递归渲染子节点 regions.body.render() / regions.header.render()
  → 每个渲染器可关联 FormRuntime / SurfaceRuntime / DataSource 等运行时
```

- **渲染器注册**：`registry.register({ type: 'xxx', component: MyRenderer })`
- **类型系统**：所有组件继承 `BaseSchema`（`flux-types/common.d.ts`），通过 `type` 字段区分
- **数据域**：组件树通过 `ScopeRef` 形成词法作用域，子可访问父，父不可访问子
- **响应式系统**：Value 原语内建依赖跟踪，`useScopeSelector` 实现细粒度重渲染
- **Action Algebra**：声明式动作 DAG（`when`/`then`/`onError`/`parallel`），编译器预编译执行图

## 类型定义位置

**所有组件的 TypeScript 接口定义在 `flux-types/*.d.ts`，这是绝对准确的知识源。** 修改 `packages/` 下任一 schema 时，须同步更新对应 `flux-types/*.d.ts` 以保持一致（定期维护）。需要查组件字段时直接看对应文件：

| 文件          | 内容                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `common.d.ts` | `BaseSchema`, `BoundFieldSchemaBase`, `ActionShapeFields`, `ApiSchema`, `SchemaInput`, `SchemaExpression` |
| `schema.d.ts` | 所有组件 Schema 接口（Page/Form/Table/Dialog/Mobile 等）                                                  |
| `index.ts`    | `FluxSchema`（所有组件的联合类型）+ `FluxSchemaByType`（type→接口映射）                                   |

> 看 TypeScript 接口即知 JSON 怎么写：接口的属性名就是 JSON key，类型就是值的类型。CRUD 等复杂控件字段较多，详见 `design-patterns/crud.md`。

## 跨组件共性

所有组件共用 `BaseSchema` 的属性：`id`, `name`, `label`, `title`, `className`, `frameClassName`, `classAliases`, `when`, `visible`, `hidden`, `disabled`, `testid`, `frameWrap`, `validateOn`, `showErrorOn`, `onMount`, `onUnmount`, `xui:imports`。

所有表单项继承 `BoundFieldSchemaBase`：`name`, `readOnly`, `required`, `mode`, `labelAlign`, `labelWidth`, `hint`, `description`, `remark`, `labelRemark`。

选项类控件还继承选项能力：`options`, `source`, `multiple`, `clearable`, `creatable` 等。

## 如何用

### 最小集成

```typescript
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';

const registry = createRendererRegistry();
registerBasicRenderers(registry);
const SchemaRenderer = createSchemaRenderer(registry);

const env = {
  fetcher: (config) => fetch(config.url, config).then((r) => r.json()),
  notify: (type, msg) => alert(msg),
  confirm: (msg) => window.confirm(msg),
  navigate: (to) => (window.location.href = to),
};

const schema = { type: 'page', title: '首页', body: [{ type: 'text', text: 'Hello' }] };
<SchemaRenderer schema={schema} env={env} />;
```

### 完整集成（注册所有渲染器）

```typescript
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';

const registry = createRendererRegistry();
registerBasicRenderers(registry); // page, text, button, icon, ...
registerLayoutRenderers(registry); // container, flex, grid, tabs, ...
registerFormRenderers(registry); // form, input-text, select, table, ...
registerFormAdvancedRenderers(registry); // combo, input-table, object-field, ...
registerDataRenderers(registry); // crud, data-source, chart, tree, ...
registerContentRenderers(registry); // card, alert, status, mapping, ...
registerMobileRenderers(registry); // pull-refresh, infinite-scroll, ...

const SchemaRenderer = createSchemaRenderer(registry);
```

## 文件索引

| 文件                      | 解决什么问题                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `01-quickstart.md`        | 17 个最常用代码段速查（page/CRUD/form/dialog/combo/action/source/wizard/tabs/loop/relation/upload/confirm/alert） |
| `02-expression-syntax.md` | 模板语法、过滤器、条件表达式                                                                                      |
| `03-api-config.md`        | API 配置格式（ajax action args）                                                                                  |
| `04-action-system.md`     | Action Algebra 事件与动作系统（链式、并行、条件）                                                                 |
| `05-data-flow.md`         | 数据源、数据域、组件间通信（data-source / scope）                                                                 |
| `06-form-validation.md`   | 表单校验系统（字段级校验、跨字段 rules、异步校验）                                                                |
| `07-structural-nodes.md`  | 结构节点（fragment/loop/recurse/reaction）+ 组件实例方法                                                          |
| `08-tabs-state.md`        | Tabs 状态管理（受控/非受控/scope 持久化）                                                                         |
| `09-amis-migration.md`    | 与 AMIS 的主要差异                                                                                                |
| `10-react-integration.md` | 自定义渲染器 React Hooks 速查（runtime/scope/form/page/context）                                                  |
| `flux-types/`             | 所有组件的 TypeScript 接口（字段知识源）。入口见 `flux-types/index.ts`                                            |
| `design-patterns/`        | 常见业务场景的完整解法 cookbook                                                                                   |
| `mobile/`                 | 移动端原生组件专题（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）                                |

### `design-patterns/` 清单

| 文件                                            | 场景                                                                                                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-patterns/crud.md`                       | 标准 CRUD + 搜索 + 新增/编辑/删除                                                                                                                                                             |
| `design-patterns/form.md`                       | 表单提交 + 校验 + 嵌套表单                                                                                                                                                                    |
| `design-patterns/data-source.md`                | 命名数据源 + 轮询 + 公式派生                                                                                                                                                                  |
| `design-patterns/conditional.md`                | 显隐 + 条件激活 + loop 集合展开                                                                                                                                                               |
| `design-patterns/custom.md`                     | 自定义渲染器 / 自定义表单项 / 自定义动作                                                                                                                                                      |
| `design-patterns/tabs.md`                       | Tab 导航布局 + 受控/非受控切换                                                                                                                                                                |
| `design-patterns/cascading-select.md`           | 远程选项联动（省市区级联）                                                                                                                                                                    |
| `design-patterns/file-upload.md`                | 文件/图片上传                                                                                                                                                                                 |
| `design-patterns/cards.md`                      | 卡片列表展示                                                                                                                                                                                  |
| `design-patterns/layout.md`                     | 布局容器选型（container/flex/grid）                                                                                                                                                           |
| `design-patterns/wizard.md`                     | Wizard 多步骤向导                                                                                                                                                                             |
| `design-patterns/chart.md`                      | Chart 图表（bar/line/pie/area）                                                                                                                                                               |
| `design-patterns/dynamic-renderer.md`           | DynamicRenderer 动态加载 schema                                                                                                                                                               |
| `design-patterns/tree.md`                       | Tree & TreeSelect 树形组件                                                                                                                                                                    |
| `design-patterns/collapse.md`                   | Collapse 折叠面板                                                                                                                                                                             |
| `design-patterns/content-display.md`            | Card / Alert / Status / Mapping 内容展示                                                                                                                                                      |
| `design-patterns/combo-input-table.md`          | Combo & InputTable 可编辑集合                                                                                                                                                                 |
| `design-patterns/button-group.md`               | ButtonGroup & DropdownButton 按钮组合                                                                                                                                                         |
| `design-patterns/steps-timeline.md`             | Steps & Timeline 过程展示                                                                                                                                                                     |
| `design-patterns/picker-transfer.md`            | Picker & Transfer 选择类控件                                                                                                                                                                  |
| `design-patterns/form-advanced-fields.md`       | TagList / KeyValue / ArrayEditor / InputTree / ConditionBuilder                                                                                                                               |
| `design-patterns/composite-fields.md`           | ObjectField / VariantField / DetailField / DetailView 复合字段                                                                                                                                |
| `design-patterns/table.md`                      | Table 数据表格（列配置/排序/筛选/行选择/虚拟滚动）                                                                                                                                            |
| `design-patterns/list.md`                       | List 列表展示（卡片式/选择/分页/无限滚动）                                                                                                                                                    |
| `design-patterns/form-basic-fields.md`          | Textarea / Checkbox / Switch / RadioGroup / CheckboxGroup / InputNumber / InputDate / Fieldset                                                                                                |
| `design-patterns/date-fields.md`                | InputDate / InputDatetime / InputTime / InputMonth / InputQuarter / InputYear / DateRange                                                                                                     |
| `design-patterns/page-dialog-drawer.md`         | Page / Dialog / Drawer 容器组件                                                                                                                                                               |
| `design-patterns/pagination-separator.md`       | Pagination 分页 / Separator 分隔线                                                                                                                                                            |
| `design-patterns/content-display-components.md` | Icon / Badge / Link / Image / HTML / JSON View / Markdown / Statistics / Empty / Spinner / Progress                                                                                           |
| `design-patterns/remaining-components.md`       | Transfer / Picker / DropdownButton / ScopeDebug / Audio / Video / Carousel / QrCode / TreeSelect / InputTree / TagList / KeyValue / ArrayEditor / ConditionBuilder / DetailField / DetailView |

### `mobile/` 清单

| 文件                        | 场景           |
| --------------------------- | -------------- |
| `mobile/pull-refresh.md`    | 下拉刷新容器   |
| `mobile/infinite-scroll.md` | 触底加载更多   |
| `mobile/swipe-cell.md`      | 左滑操作单元格 |
| `mobile/countdown.md`       | 倒计时组件     |
| `mobile/notice-bar.md`      | 通知栏组件     |
