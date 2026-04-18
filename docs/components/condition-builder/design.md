# Condition Builder 组件设计

## 1. 组件定位

- `condition-builder` 是面向规则表达式的复合字段组件。
- 它负责条件组、逻辑关系和字段-运算符-值三元组编辑，不是通用公式编辑器，也不是平台级设计器宿主。
- 该文档是 `condition-builder` 的长期 owner 文档；通用 renderer/runtime/form 规则仍由 architecture 文档负责。

## 2. 与 AMIS 或既有产品的能力对照

- 目标能力对标 AMIS `condition-builder`：字段类型、运算符映射、AND/OR 嵌套组、NOT、simple/full mode、embed/picker mode、远程字段配置、字段搜索、条件触发、unique fields。
- 当前仓库已落地基础 condition group 编辑、字段清单、值输入与 required 校验。
- 更复杂的嵌套逻辑、运算符扩展、异步字段元数据加载、公式增强属于后续阶段。

## 3. Flux 中的 renderer/type 定义

- `type: 'condition-builder'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'scalar'`

## 4. schema 设计

组件正式 schema 以 `ConditionBuilderSchema` 为准。

```ts
interface ConditionBuilderSchema extends BaseSchema {
  type: 'condition-builder';
  name: string;

  fields: ConditionField[];
  source?: string | ApiSchema;

  builderMode?: 'full' | 'simple';
  embed?: boolean;
  title?: string;

  selectMode?: 'list' | 'tree' | 'chained';
  searchable?: boolean;

  draggable?: boolean;
  showAndOr?: boolean;
  showNot?: boolean;
  showIf?: boolean;
  uniqueFields?: boolean;

  formulas?: ConditionFormulaConfig;
  formulaForIf?: ConditionFormulaConfig;

  operators?: ConditionOperatorOverrides;
  addBtnVisibleOn?: string;
  addGroupBtnVisibleOn?: string;

  placeholder?: string;
  addConditionLabel?: string;
  addGroupLabel?: string;
  removeConditionLabel?: string;
  removeGroupLabel?: string;

  maxDepth?: number;
  maxItemsPerGroup?: number;
}
```

关键输入：

- 条件字段定义：`fields`
- 远程字段来源：`source`
- 编辑模式：`builderMode`、`embed`
- 逻辑和交互开关：`showAndOr`、`showNot`、`showIf`、`draggable`、`uniqueFields`
- 文案与按钮可见性：`placeholder`、`addConditionLabel`、`addGroupLabel`、`addBtnVisibleOn`、`addGroupBtnVisibleOn`

## 5. 字段分类

- `label`: `value-or-region`
- `fields`、`source`、`operators`、`formulas`、`formulaForIf`: `value`
- `builderMode`、`embed`、`selectMode`、`searchable`、`draggable`、`showAndOr`、`showNot`、`showIf`、`uniqueFields`: `value`
- `addConditionLabel`、`addGroupLabel`、`removeConditionLabel`、`removeGroupLabel`、`placeholder`: `value`

## 6. regions 与 slot 约定

- 首版不开放条件项任意 schema slot。
- 值输入类型切换通过内部适配完成，而不是暴露 render prop。
- 如果未来需要扩展 custom operator value UI，应继续作为组件内部 schema 位点，而不是直接把整棵 condition line 暴露成自由 region。

## 7. 运行期状态归属

- 条件值整体归 form runtime，通过 `name` 绑定读写。
- 展开态、局部编辑态、下拉打开态属于局部 UI 状态。
- 远程字段解析属于组件内受控加载逻辑，不应反向发明新的宿主级状态协议。

值结构：

```ts
interface ConditionGroupValue {
  id: string;
  conjunction: 'and' | 'or';
  not?: boolean;
  if?: string;
  children: Array<ConditionGroupValue | ConditionItemValue>;
}

interface ConditionItemValue {
  id: string;
  left: {
    type: 'field';
    field: string;
  };
  op: string;
  right?: unknown;
}
```

## 8. 事件、动作与组件句柄能力

- 当前对外主语义仍是字段值变化。
- 长期可以提供 `component:addCondition`、`component:addGroup`、`component:normalizeValue` 一类组件能力，但不应成为首要交互入口。
- `showIf` / 公式配置属于 value 语义扩展，不应演变成第二套 action 脚本协议。

## 8.1 i18n 约定

- `condition-builder` 的内置文案必须统一走 `@nop-chaos/flux-i18n`，不再维护组件私有本地文本表。
- 内置 key 归属 `conditionBuilder.*`，资源定义位于 `packages/flux-i18n/src/locales/{zh-CN.ts,en-US.ts}`。
- schema 侧自定义文案仍通过 `placeholder`、`addConditionLabel`、`addGroupLabel`、`removeGroupLabel` 等显式字段覆盖，而不是通过组件私有 override API 注入。

## 9. 数据源、表达式、导入能力接入点

- 字段元数据可来自内联 `fields`，或来自 `source` 指向的 scope/api 数据源。
- `source` 返回的数据应解析为字段配置，而不是任意 UI 片段。
- 条件 DSL 本身是 value，不应再内嵌动作脚本或平台宿主桥接语义。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-condition-builder` marker。
- 视觉层遵循 field frame 和 group/card 类 UI primitives，不内嵌组件私有布局体系。
- 组容器、条件项、拖拽柄、删除按钮等视觉结构应使用稳定 marker 以便外部主题和测试定位。

## 11. 实现拆分建议

- 字段选择、运算符选择、值输入适配和树结构操作拆分为独立模块。
- 推荐文件拆分：

```text
packages/flux-renderers-form/src/renderers/condition-builder/
  index.tsx
  types.ts
  operators.ts
  ConditionBuilder.tsx
  ConditionGroup.tsx
  ConditionItem.tsx
  ConditionLine.tsx
  FieldSelect.tsx
  OperatorSelect.tsx
  ValueInput.tsx
```

## 12. 风险、取舍与后续阶段

- 最主要风险是把条件构建器演变成通用公式 IDE，导致契约失控。
- 字段类型系统与 value editor 的映射需要持续文档化。
- custom operator、remote field loading、deep nesting、picker mode 都应按组件 owner 路线扩展，不应再把组件设计散落回 architecture 顶层。

## 13. 相关文档

- `docs/architecture/renderer-runtime.md` - 通用 renderer contract
- `docs/architecture/form-validation.md` - 表单校验参与规则
- `docs/architecture/styling-system.md` - 样式系统约束
- `docs/architecture/api-data-source.md` - 远程字段加载模式
- `docs/references/flux-json-conventions.md` - JSON 命名与表达式约定
