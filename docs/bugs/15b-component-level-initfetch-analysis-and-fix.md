# 组件级 initFetch 模式分析与修复

> 状态: completed
> 来源: `docs/plans/2026-06-22-1343-1-e3-condition-builder-async-metadata-loading-plan.md` 审查中发现的设计原则偏离
> 相关原则: `docs/components/existing-components-improvement-analysis.md` §0.2「请求必须下沉」— 不在组件层开 `api`/`initFetch`/`interval` 短路径
> 相关文档: `docs/references/naming-conventions.md` §1「请求必须下沉」、§3「组件级请求 不采纳清单」

---

## 0. 问题摘要

`condition-builder` 的 `source` 字段（E3 收口）在 schema 层面提供了一个"挂载时自动加载 field 元数据"的入口。该模式本质上等价于 amis 已明确 reject 的组件级 `initFetch`——区别仅在于路由经过 `executeSource`（data-source 层）而非裸 HTTP 端点。设计原则要求"请求必须下沉 data-source + action graph"，但**更关键的是**组件不应在自身 schema 上开设"挂载时自动加载数据"的字段入口；异步数据应由外部 data-source 组合层（表达式 + scope）控制，组件只负责消费。

---

## 1. 关键区分：用户驱动 vs. 挂载时自动加载

| 模式                   | 触发时机                           | 示例                                                              | 是否符合原则                                                    |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| **用户交互驱动**       | 用户点击展开、输入搜索             | tree `childrenSource`、tree `searchSource`、input `suggestSource` | ✅ 符合——用户行为触发，非组件自动发起                           |
| **挂载时自动加载**     | 组件 mount 时 `useEffect` 自动执行 | condition-builder `source`、form `initAction`、`onMount`          | ❌ 违反——等价于组件级 `initFetch`                               |
| **标准数据流**         | 编译期表达式解析                   | `allowSource` 字段、`use-node-source-props`                       | ✅ 符合——编译时表达式/数据源解析，非挂载时主动查询              |
| **data-source 层自身** | data-source 组件 `initFetch` gate  | `<data-source initFetch={true}>`                                  | ✅ 符合——这是标准请求层本身的行为，且有 `initFetch: false` 门控 |

---

## 2. 全代码库扫描结果

### 2.1 ❌ 需修复：组件级挂载时自动加载（无门控）

| #   | 组件                  | schema 字段                  | 文件                                     | 触发方式                                     | 门控                                     |
| --- | --------------------- | ---------------------------- | ---------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| 1   | **condition-builder** | `source?: string`            | `use-condition-builder-source.ts:96-130` | `useEffect` → `helpers.executeSource`        | 无（source 非空即触发）                  |
| 2   | **form**              | `initAction?: ActionSchema`  | `form.tsx:310-364`                       | `useEffect` → `initAction()` action dispatch | 无（有值即触发）                         |
| 3   | **所有组件**（通用）  | `onMount?: ActionSchemaLike` | `node-renderer-effects.ts:87-118`        | `useEffect` → `helpers.dispatch`             | `enabled === false` 可跳过（但极少使用） |

### 2.2 ⚠️ 已有门控（设计上已裁定，记录但不动）

| #   | 组件                 | schema 字段                      | 门控                               | 裁定出处                                                                 |
| --- | -------------------- | -------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| 4   | **dynamic-renderer** | `loadAction` + `autoLoad`        | `autoLoad` (default `true`, 可关)  | `docs/plans/2026-06-22-0528-1-e3-dynamic-renderer-autoload-gate-plan.md` |
| 5   | **data-source**      | `action`/`formula` + `initFetch` | `initFetch` (default `true`, 可关) | `api-data-source-controller.ts:15-27`，这是标准请求层                    |

### 2.3 ✅ 符合原则：用户交互驱动（不需修复）

| #   | 组件                         | schema 字段      | 触发时机                  |
| --- | ---------------------------- | ---------------- | ------------------------- |
| 6   | **input-tree / tree-select** | `childrenSource` | 用户展开节点              |
| 7   | **input-tree / tree-select** | `searchSource`   | 用户输入搜索（debounce）  |
| 8   | **input-text**               | `suggestSource`  | 用户输入/聚焦（debounce） |

### 2.4 ✅ 符合原则：标准数据流（不需修复）

| #   | 组件                          | 机制                                    | 说明                                             |
| --- | ----------------------------- | --------------------------------------- | ------------------------------------------------ |
| 9   | select/radio/checkbox/tree 等 | `allowSource` + `use-node-source-props` | 通用 prop 级 SourceSchema 解析，非独立"加载"字段 |
| 10  | 任意组件                      | `useSourceValue` / `SourceObserver`     | 通用 source 值解析                               |

---

## 3. 修复计划

### 3.1 Fix A：condition-builder `source` → 移除，改用表达式+外部 data-source

**当前行为**：`ConditionBuilderSchema.source` 字段在渲染器挂载时自动调 `executeSource` 加载 fields/operators，加载结果替换静态 fields。

**修复方案**：

1. 从 `ConditionBuilderSchema` 移除 `source` 字段
2. 移除 `use-condition-builder-source.ts` hook 和测试文件
3. 渲染器直接使用 `schemaProps.fields`（通过标准编译期表达式解析，支持 `${expr}` 语法）
4. 文档说明：异步 field 元数据应由外部 `data-source` 组件加载并写入 scope，condition-builder 通过 `fields: "${expr}"` 表达式读取

### 3.2 Fix B：form `initAction` → 添加 `autoInit` 门控

**当前行为**：form 的 `initAction` 在 mount 且 `importsReady` 时无条件触发。

**修复方案**：

1. `FormSchema` 新增 `autoInit?: boolean`（default `true`，向后兼容）
2. form 渲染器在 `useEffect` 门控检查 `autoInit !== false`
3. 需要跳过挂载时初始化时设 `autoInit: false`，通过外部事件触发 init

### 3.3 Fix C：文档强化

1. `docs/components/existing-components-improvement-analysis.md` §0.2「请求必须下沉」原则补充细则
2. `docs/references/naming-conventions.md` §3 不采纳清单补充说明
3. 各受影响组件 design.md 同步

---

## 4. 执行

### Fix A：condition-builder

- [x] 移除 `ConditionBuilderSchema.source` 字段（types.ts）
- [x] 移除 `use-condition-builder-source.ts` 文件
- [x] 移除 `use-condition-builder-source.test.tsx` 文件
- [x] 修改 `condition-builder.tsx`：去除 `useConditionBuilderSource` 调用，直接使用静态 `fields`
- [x] 更新 `docs/components/condition-builder/design.md`：去除 `source` 相关说明，补充表达式+外部 data-source 文档
- [x] 更新 `docs/plans/2026-06-22-1343-1-e3-condition-builder-async-metadata-loading-plan.md` 标记为废弃

### Fix B：form `initAction` 门控

- [x] `FormSchema` 新增 `autoInit?: boolean`
- [x] form 渲染器添加 `autoInit !== false` 门控
- [x] 更新 `docs/components/form/design.md`

### Fix C：文档强化

- [x] `docs/references/naming-conventions.md` 补充细则
- [x] `docs/components/existing-components-improvement-analysis.md` 补充说明

---

## 5. 核心教训

1. **组件 schema 字段不应成为数据加载的入口**。即使路由经过 `executeSource`（data-source 层），在组件 schema 上开一个"挂载时自动加载"的字段本身就是 `initFetch` 模式的变形。

2. **用户交互驱动 vs. 挂载时自动加载**是判断是否违反原则的关键分界线：`childrenSource`（展开节点）是合法的，`source`（挂载时自动加载）是违规的。

3. **表达式 + scope + 外部 data-source 组合**是 Flux 控制异步的正确路径：数据由 `data-source` 组件加载到 scope，组件通过表达式（`${fieldName}`）读取。

---

## 6. 全量核查结论（2026-06-22 二次审计）

> 触发：condition-builder `source` 修复后，对全部 ~55 个 runtime renderer 做一次全面核查，确认无其他同类违规。
> 审计 plan：`docs/plans/2026-06-22-1500-1-component-level-auto-fetch-audit-plan.md`

### 6.1 表达式值绑定（非 auto-fetch，SAFE）

以下组件的 `source` 字段类型为 `SchemaValue`，是**表达式值绑定**——renderer 从 scope 读已解析的数组数据（由外部 `data-source` 组件加载），**不触发 HTTP 请求**。完全符合「请求必须下沉」原则。

| 组件                  | 字段                                           | 消费方式                                                              |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| `table`               | `source?: SchemaValue`                         | `table-renderer.tsx:160` `Array.isArray(schemaProps.source)`          |
| `crud`                | `source?: SchemaValue`                         | `crud-renderer.tsx:96` `normalizeCrudSourceValue(schemaProps.source)` |
| `chart`               | `source?: SchemaValue`                         | `chart-renderer.tsx:102` `Array.isArray(props.props.source)`          |
| `table` column filter | `TableColumnFilterConfig.source?: SchemaValue` | 列筛选选项来源，读 scope                                              |
| `crud` column filter  | `CrudColumnFilterConfig.source?: SchemaValue`  | 同上                                                                  |

### 6.2 已 gated 的 action graph 入口（SAFE）

| 组件               | 字段                      | 门控                                              | 裁定                 |
| ------------------ | ------------------------- | ------------------------------------------------- | -------------------- |
| `dynamic-renderer` | `loadAction` + `autoLoad` | `autoLoad !== false`（`dynamic-renderer.tsx:72`） | SAFE                 |
| `form`             | `initAction` + `autoInit` | `!autoInit` 跳过（`form.tsx:312`）                | SAFE                 |
| `data-source`      | `initFetch`               | `DataSourceController.resolveInitFetch`           | SAFE（请求层自身）   |
| `BaseSchema`       | `onMount`                 | 走 `helpers.dispatch`（action graph）             | SAFE（通用基础设施） |

### 6.3 用户交互驱动（SAFE）

| 组件                                            | 字段             | 触发时机              |
| ----------------------------------------------- | ---------------- | --------------------- |
| `tree` / `input-tree` / `tree-select`           | `childrenSource` | 用户展开节点          |
| `tree` / `input-tree` / `tree-select`           | `searchSource`   | 用户搜索（debounced） |
| `input-text` / `input-email` / `input-password` | `suggestSource`  | 用户输入（debounced） |

### 6.4 已修复的契约漂移

| 组件                | 字段                            | 处理                                                      |
| ------------------- | ------------------------------- | --------------------------------------------------------- |
| `condition-builder` | `ConditionBuilderSchema.source` | 已删除（Fix A）                                           |
| `condition-builder` | `ConditionSelectField.source`   | 已删除（二次审计 Phase 1，声明但 runtime 不消费的 drift） |

### 6.5 结论

**全代码库无残留的组件级 mount-time auto-fetch 违规。** 所有数据请求路径均通过以下三种合规模式之一：

1. **表达式值绑定**（table/crud/chart `source`）：组件只读 scope，不发起请求
2. **gated action graph**（form `initAction`/dynamic-renderer `loadAction`）：走标准 action 通道，有显式 boolean gate
3. **用户交互驱动**（tree `childrenSource`/input `suggestSource`）：用户行为触发，非挂载时自动

后续新组件落地时，各组件 plan 的 Phase 1 契约审查应显式核对本结论表，确保不引入新的 auto-fetch 字段。`docs/components/roadmap.md` Cross-Cutting 已加「请求下沉」约束条目。

### 6.6 未实现组件 design.md 审计（2026-06-22）

对 `roadmap.md` W1-W4 全部 32 份未实现组件 design.md 做了预防性核查，确认设计阶段是否已正确处理「请求下沉」原则。

**结果**：31/32 正确；**1 份已修复**：

| 组件      | 问题                                                                                                                                         | 处理                                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service` | design.md 声明了 `source`/`interval`/`stopWhen`/`onReady`/`onError` 请求层字段在可视壳上，违反请求下沉（与 condition-builder `source` 同类） | **已重写** `docs/components/service/design.md`：删除所有请求层字段，改为 `items?: SchemaValue` 表达式值绑定 + Flux 决策表显式拒绝 amis `api`/`initFetch`/`interval`/`silentPolling`；轮询/请求生命周期归 `<data-source>` 组合 |

其余 31 份（pagination/cards/wizard/alert/input-date 族/grid/collapse/button-group/dropdown-button/mapping/status/input-month-quarter-year/input-file/input-image/editor/markdown-editor/audio/video/carousel/qrcode/steps/timeline/combo/picker/transfer/input-table）均正确：要么不声明数据加载字段，要么使用表达式值绑定，要么使用用户交互驱动加载（如 input-file `uploadAction`）。
