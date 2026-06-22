# 命名规范基线（Naming Conventions）

> Status: active
> Owner: components-improvement mission / X3
> Source: `docs/components/existing-components-improvement-roadmap.md`（X3）、`docs/components/existing-components-improvement-analysis.md` §0.2 / §5
> Related: `docs/architecture/field-binding-and-renderer-contract.md`（Rule 10 / Frozen Contract Matrix）、`docs/architecture/styling-system.md`（CSS 类名，与本基线职责区分）

## Purpose

确立 Flux **schema 属性命名基线**（对齐 shadcn/ui + 命名标准化原则），作为后续所有组件改进项（E1/E2/X1/X2 等）**新增字段的审查硬准绳**。

本基线 adjudicates 待决问题 Q1（`existing-components-improvement-analysis.md` §9.1）= **yes**：先产出本文档作为 X3 依据。统一命名基线是 X5（Flux 决策表）与 E1/E2 实现的硬前置——缺它则后续字段命名无审查准绳。

## Scope Boundary（权威性与职责区分）

- **本文档只管 schema 属性命名**（author-facing 字段叫什么、映射到哪个 shadcn prop、哪些 amis 命名拒绝）。
- **不管 CSS 类名 / marker class / data-slot** —— 那是 `docs/architecture/styling-system.md` 与 `docs/architecture/renderer-markers-and-selectors.md` 的职责。
- **不管字段进入哪条归一化通道（props/meta/regions/events）** —— 那是 `docs/architecture/field-binding-and-renderer-contract.md` 的 Frozen Contract Matrix 职责。本文档与其 Rule 10（"Align With `@nop-chaos/ui` When Semantics Match Exactly"）互补：Rule 10 是架构级原则，本文档是改进项新增字段的具体审查清单。
- **不管新组件命名**（归主 `roadmap.md`），**不管移动端响应式命名**（归 `mobile-roadmap.md`）。

## Status Note

本文档由 X3 工作项成文（2026-06-21），从原 `Status: planned（X3 工作项，尚未成文）` 占位转为 `active`。`existing-components-improvement-analysis.md` §10 中"命名规范基线尚未成文…待 X3 落地后校准"的悬置状态已由本文档落地消除。

---

## 1. 命名原则

提炼自 `existing-components-improvement-analysis.md` §0.2 的六条 Flux 设计原则，作为命名裁决的准绳：

| 原则                            | 命名含义                                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **不以 amis 为标尺**            | amis 仅参考之一；amis 标准化差的部分（散落条件属性、`actionType` 判别树、`dataProvider` JS 函数串、`themeCss`、`mobileUI` 双实现）不引入命名。                                                              |
| **核心已简化**                  | 不引入 amis 的 `visibleOn`/`hiddenOn`/`disabledOn` 等散落条件属性命名；统一 `when`（见 `META_FIELDS` 冻结集，`field-binding-and-renderer-contract.md`）。                                                   |
| **命名标准化 + shadcn/ui 对齐** | 新增能力**必须用 shadcn 命名**（`variant` 非 `level`、option 形状 `{label,value}`、`size` 语义、`clearable`/`searchable` 明确布尔）。amis 命名（`level`/`joinValues`/`borderMode`/`actionType` 等）不采纳。 |
| **请求必须下沉**                | 不在组件层开 `api`/`initFetch`/`interval` 命名短路径；请求走 `data-source` + action graph。                                                                                                                 |
| **前端不做导出**                | table/crud 的 export-csv/export-excel/exportColumns 命名不采纳（后台职责）。                                                                                                                                |
| **chart 用 recharts**           | echarts config 透传/echarts 扩展命名不采纳。                                                                                                                                                                |

---

## 2. shadcn/ui 命名映射表

每行映射必须能在 live `packages/ui/src/index.ts` 导出或现有 design.md 中找到出处，不得臆造。

| Flux schema 字段                         | shadcn/ui 对应                               | 受控词表 / 形状                                                                                                              | 出处                                                                  |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `variant`（按钮视觉变体）                | `Button` `variant`                           | `default` / `outline` / `secondary` / `ghost` / `destructive` / `link`                                                       | `packages/ui/src/components/ui/button.tsx:10-21`                      |
| `size`（按钮/控件尺寸）                  | `Button` `size`；`SelectTrigger` `size`      | Button: `default` / `xs` / `sm` / `lg` / `icon` / `icon-xs` / `icon-sm` / `icon-lg`；Select trigger: `xs` / `sm` / `default` | `button.tsx:22-34`、`select.tsx:37`                                   |
| `options`（选项集）                      | shadcn Combobox/Select item 形状             | `{ label, value }[]`（标准形状）                                                                                             | analysis §2.6、roadmap E1a                                            |
| `clearable`                              | `ComboboxInput` `showClear` 的 schema 级命名 | 明确 `boolean`（肯定式）                                                                                                     | `combobox.tsx:48`、analysis §2.6                                      |
| `searchable`                             | Combobox 搜索过滤的 schema 级命名            | 明确 `boolean`（肯定式）                                                                                                     | analysis §2.6、roadmap E1a                                            |
| `disabled`                               | runtime 节点控制态                           | `boolean`；进入 `meta.disabled`（非 props）                                                                                  | `field-binding-and-renderer-contract.md` Frozen Matrix、`META_FIELDS` |
| `readOnly`                               | 业务编辑语义                                 | `boolean`；进入 `props.readOnly`                                                                                             | `field-binding-and-renderer-contract.md` Frozen Matrix                |
| `required`                               | 字段级校验语义                               | `boolean`；进入 `props.required`                                                                                             | `field-binding-and-renderer-contract.md` Frozen Matrix                |
| `name`                                   | editable field 双向绑定入口                  | string；唯一绑定入口，不平行开 `valueSource`                                                                                 | `field-binding-and-renderer-contract.md` Rule 2                       |
| `label` / `title`                        | 外框 label / title-like 内容                 | `props.label` 或 `regions.label`（由 renderer metadata 决定）                                                                | `field-binding-and-renderer-contract.md` Frozen Matrix                |
| `onClick` / `onChange` / `onSubmit`      | declarative action 事件                      | 保留 `on*` 命名；进入 `events.*`                                                                                             | `field-binding-and-renderer-contract.md` Frozen Matrix                |
| `body` / `header` / `footer` / `actions` | 子 schema 片段                               | 保留语义命名；进入 `regions.*`                                                                                               | `field-binding-and-renderer-contract.md` Frozen Matrix                |
| `when`                                   | 条件渲染统一入口                             | raw expression；进入 `meta`（`META_FIELDS`）                                                                                 | `field-binding-and-renderer-contract.md` `META_FIELDS`                |
| `prefix` / `suffix`                      | Input 前后缀                                 | string                                                                                                                       | `input-number/design.md:21`、roadmap E2a                              |
| `placeholder`                            | 通用字段行为                                 | string                                                                                                                       | `input-number/design.md:23`                                           |

**不发明平行词汇表**：当 schema 字段与 `@nop-chaos/ui` prop 语义完全一致时，用同一组词汇（如 `button.variant`/`button.size` 直接映射 Button，不另造 `level`/`btnSize`）。语义化内容字段（`text.text`、`tree.data`、`select.options`）保留领域命名，不强行 shadcn 化（见 `field-binding-and-renderer-contract.md` Rule 10）。

---

## 3. amis 不采纳清单

迁移自 `existing-components-improvement-analysis.md` §5。每条附 Flux 拒绝理由：

| 类别                | 不采纳项                                                                                                                                                                                    | Flux 理由                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **前端导出**        | table/crud 的 `export-csv`/`export-excel`/`exportColumns`                                                                                                                                   | 后台职责，前端不做导出。                                                                                                              |
| **echarts 相关**    | chart 的 echarts config 透传、echarts 扩展（wordcloud/stat/bmap）、geo 地图、`echarts.registerTheme`/`registerMap`                                                                          | recharts 够用，echarts 过大。                                                                                                         |
| **组件级请求**      | form/page/chart/crud/dynamic-renderer 的组件级 `api`/`initFetch`/`initFetchOn`/`sendOn`/`asyncApi`/`interval`/`silentPolling`/`stopAutoRefreshWhen`                                         | 请求必须下沉 data-source + action，不在组件开短路径。（data-source 作为统一请求层的 `sendOn`/`initFetch` gate 增强归 X4，非组件级。） |
| **散落条件属性**    | amis `visibleOn`/`hiddenOn`/`disabledOn`                                                                                                                                                    | Flux 核心已简化，统一 `when`（`META_FIELDS`）。                                                                                       |
| **button amis 化**  | amis `level`（用 `variant`）、`actionType` 判别树、`hotKey`、`countDown`/`countDownTpl`、`isMenuItem`、`requireSelected`、`feedback`/`messages`/`payload`、email/download/saveAs/url 子类型 | 用 Flux action graph + shadcn `variant`；不引入 amis 复杂判别树。                                                                     |
| **值编码 amis 化**  | 选择族 `valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`/`simpleValue`                                                                                                      | 用 shadcn `{label,value}` 标准形状；如需扩展按 Flux 命名规范单独立项。                                                                |
| **样式 amis 化**    | `themeCss`/`wrapperCustomStyle`/`CustomStyle`/`borderMode`                                                                                                                                  | Flux 样式系统（marker class + Tailwind，见 `styling-system.md`）。                                                                    |
| **mobileUI 双实现** | amis `mobileUI` 标志位 + `SelectMobile`/`Tabs` 移动分支等独立代码路径                                                                                                                       | 同组件同属性 + 响应式（见 `mobile-responsive-baseline.md`）。                                                                         |
| **JS 函数串**       | amis `dataProvider`、`str2AsyncFunction` onClick                                                                                                                                            | 反模式，安全/可维护性差。                                                                                                             |
| **路由/持久化**     | `syncLocation`/`parsePrimitiveQuery`/`promptPageLeave`/`persistData`/`redirect`/`reload`/`target`                                                                                           | 宿主路由/状态管理职责，不在组件。                                                                                                     |
| **杂项重 SDK**      | `input-signature`/`location-picker`/`input-city`（重 SDK 耦合）、`iframe`（安全）、`tasks`/`sparkline`/`remark`/`tooltip-wrapper`/`words`/`multiline-text`（低价值）                        | 已在 `amis-baseline-matrix.md` 标 notRetained。                                                                                       |

---

## 4. 按字段类型的命名规则

### 4.1 布尔字段

- **肯定式命名**：`clearable` / `searchable` / `disabled` / `readOnly` / `block`（按钮占满宽）/ `multiple`（多选）/ `inline`（表单）/ `submitOnChange`。
- **避免否定前缀**：用 `disabled` 不用 `notEnabled`；用 `readOnly` 不用 `notEditable`。
- **authoring vs runtime 类型**：authoring schema 允许 `true` / `false` / `${expr}`；编译后 renderer-facing `props` 只能是 `boolean | undefined`（非 boolean 结果解析为 `undefined`，不做 truthiness coercion）。见 `field-binding-and-renderer-contract.md` Rule 1 "Boolean-Like Fields"。

### 4.2 枚举字段

- **受控词表**：`variant`（按钮：`default`/`outline`/`secondary`/`ghost`/`destructive`/`link`）、`size`（Button: `default`/`xs`/`sm`/`lg`/`icon`/...；Select trigger: `xs`/`sm`/`default`）。
- **语义枚举保留领域命名**：如 `treeMode: 'checkbox' | 'radio' | 'normal'`（input-tree）、`selectMode` 已删除（condition-builder 收敛 list-only，见 E0d）。
- **不引入 amis 风格判别树枚举**（如 `actionType: ajax|dialog|drawer|toast|copy|...`），改用 action graph。

### 4.3 选项集（options）

- **标准形状**：`options: { label: string; value: string | number }[]`。
- **不引入 amis 编码字段**：拒绝 `valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`/`simpleValue`。如需自定义 label/value 字段名，按 Flux 命名规范单独立项评估，不默认引入。
- **分组**：用嵌套 `options` 或 `groups: { label, options }[]`，不用 amis `children` 混合扁平编码。

### 4.4 事件（events）

- **schema 侧**：declarative action 字段保留 `on*` 命名（`onClick`/`onChange`/`onSubmit`/`onFocus`/`onBlur`/...），进入 `events.*` 通道。
- **renderer 句柄侧**：renderer 从 `props.events.onXxx` 读取（见 `integrating-third-party-components.md` "Native DOM-style events"）。
- **不发明 `xxxEvent`/`onXxxHandler` 平行命名**：`onClick` 即可，不再造 `clickEvent`。
- **可阻止事件**：按 Flux 事件系统设计 preventDefault 语义（X2 已落地）。action 节点声明 `preventDefault?: boolean | string` / `stopPropagation?: boolean | string`，与 DOM API 同名（不发明新词），与既有 `when` 字段同形（boolean | 表达式 string）。runtime 在 dispatch 前 sync 求值并调用 native `event.preventDefault()`/`stopPropagation()`。不采纳 amis `rendererEvent` 兼容层（见 `docs/components/existing-components-improvement-analysis.md` §2.8 + `docs/architecture/renderer-runtime.md` "Schema-Driven Prevention"）。

### 4.5 region / fragment

- **region 命名**：保留语义化命名（`body`/`header`/`footer`/`actions`/`toolbar`/`aside`/`label`/`title`），进入 `regions.*` 通道，由 renderer metadata 分类。
- **fragment 渲染**：renderer 通过 `props.regions.xxx.render()` 渲染子片段（见 `quick-reference.md`、`renderer-runtime.md`）。
- **不引入 amis `name` 占位 region** 模式：region 名直接反映语义。

### 4.6 表达式字段

- **普通字段即可承载表达式**，不发明 `xxxExpr`/`xxxFormula` 平行命名（`field-binding-and-renderer-contract.md` Rule 1）。例：`{ "type": "text", "text": "${user.name}" }`，不写 `textExpr`。

### 4.7 禁止组件级 auto-fetch 字段

- **组件 schema 不得开设"挂载时自动加载数据"的专用字段**。这类字段（如 condition-builder 已移除的 `source`）本质是 amis 组件级 `initFetch` 的变形——即使路由经过 `executeSource`（data-source 层），组件 schema 上的 auto-fetch 入口本身就是与「请求必须下沉」原则冲突。
- **正确路径**：数据由外部 `data-source` 组件加载到 scope，组件通过标准表达式（`${expr}`）或 `allowSource` prop 读取。组件只消费数据，不主动发起挂载时查询。
- **唯一例外**：用户交互驱动的按需加载（如 tree `childrenSource` 在点击展开时触发）是合法的——数据加载由用户行为触发，非组件挂载自动发起。
- 相关分析：`docs/bugs/15-component-level-initfetch-analysis-and-fix.md`

---

## 5. 新增字段审查 Checklist

后续 X5/E1/E2 新增字段时，逐项过审（5–8 条）：

- [ ] **shadcn 对齐**：当语义与 `@nop-chaos/ui` prop 完全等价时，是否用了同一组词汇（而非另造 amis 风格名）？
- [ ] **受控词表**：枚举值是否落在已有 shadcn 词表（`variant`/`size`）？如新增枚举值，是否记入本基线 §2？
- [ ] **布尔肯定式**：布尔字段是否肯定式命名（`clearable` 非 `notUnclearable`）？是否避免了 amis 模糊枚举（`borderMode`）？
- [ ] **选项形状**：选项集是否用 `{label, value}` 标准形状？是否避免了 amis 值编码字段（`joinValues`/`extractValue`/`delimiter`）？
- [ ] **不采纳记录**：拒绝的 amis 能力是否记入本基线 §3 + 对应组件 design.md 的 Flux 决策表"不采纳"行（附 Flux 理由），而非只在分析报告？
- [ ] **通道归属**：字段是否进了正确通道（`props`/`meta`/`regions`/`events`，见 `field-binding-and-renderer-contract.md` Frozen Matrix）？是否避免了散落条件属性（用 `when` 统一）？
- [ ] **无平行词汇表**：是否避免了 `xxxExpr`/`xxxFormula`/`xxxHandler` 平行命名？是否避免了组件级 `api`/`initFetch`/`interval` 短路径（请求下沉 data-source）？
- [ ] **出处可查**：新增映射是否能在 `packages/ui/src/index.ts` 导出或现有 design.md 找到出处（不臆造组件或 prop）？

---

## 与 X5（Flux 决策表）的关系

本基线是 **X5 的硬前置**：各组件 design.md 的 Flux 决策表（列：能力 / 采纳 / 不采纳 / 理由，主语为 Flux 而非 amis）在裁定每个字段命名时，必须引用本基线 §2 映射表与 §3 不采纳清单。X5 的决策表范本是 `input-number/design.md:13-31`（当前主语仍为 AMIS，X5 翻转为 Flux 主语），本基线应与之相容。

如 X5 实施中发现某 shadcn 映射需修订，回写本基线 §2 并记 `Last Updated`（见 plan Non-Blocking Follow-ups）。

---

## 6. Component Handle 命名（X1）

X1（`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`）补齐 component handle 命名基线。详见 `docs/references/component-handle-vocabulary.md`。

- handle 名一律**小写连字符**核心词：`clear`/`reset`/`focus`/`open`/`close`/`toggle`/`refresh`/`submit`/`validate`。
- 既有 camelCase 动作型方法（`setValue`/`getValue`/`getValues`/`setValues`/`getSelection`/`setSelection`/`getEditorView`/`resize`/`cancel`/`start`）保留，不强制 rename。
- 新增 handle 优先用 vocabulary 核心词；动作型特化语义允许保留特化名。
- data-source `refreshSource`（action API）与 `component:refresh`（capability）**共存**（裁定 (a)，见 vocabulary §data-source-refresh）。
- code-editor `clear`/`reset`/`focus` **保持现状**（裁定：已是标准 vocabulary）。
