# 74 Dropdown Items 内嵌 OpenDialog 提交行数据旧值（嵌套 action args 被 props 求值污染）

## Problem

- host（nop-chaos-next）CRUD 行内"更多"下拉（`dropdown-button`）的"编辑"菜单项：打开对话框编辑昵称后点确定，**提交的是行数据旧值**（列表行的 nickName），而非表单编辑值。
- 后端 `ok: true` 用旧值成功更新——**测试假阳性**：role edit 测试断言"更新后昵称"读到旧值却显示"通过"（RPC 绕过 + 旧值被真实写库）。
- 首次在 nop-chaos-next 跨项目 e2e 联调（nop-entropy-e2e）中发现：`auth-user.spec.ts` 的编辑用例失败（238 行 edit、262 行 delete），但当时误判为 **adapter selector 问题**。

## Diagnostic Method

**为什么在 nop-chaos-next 中长时间调试未发现问题（三层排查 + 探针路径误导）**：

1. **e2e 层误判**：先以为是 e2e-shared `FluxAdapter` 的 selector 契约问题，按 flux 新机制（data-field/data-renderer/data-value）重写了 adapter 并同步下游——编辑用例仍失败，排除。
2. **host 层追踪（fetcher scope 打点）**：在 `apps/main/src/flux/adapter.ts` 的 fetcher 打点 `[TMP-SCOPE]`——**scope 的 `get('nickName')`/`readOwn()` 全是编辑值**、`api.data.nickName` 是旧值且只有 7 字段（CRUD 列表列）。结论：请求发出时 scope 正确、数据是旧值——问题在 flux 运行时，不在 host。
3. **flux 运行时探针反复误导**：
   - `[TMP-EVAL]`（evaluateCompiled 内条件探针）**不触发**——一度误判"4173 vite 加载的是旧 bundle"，甚至验证了 bundle 含探针、清 vite 缓存、重打包多次；实际是 `evaluateCompiled` 确实未被调用（静态化发生在编译产物层，evaluate 路径根本不进入）。
   - `[TMP-EVAL-CALLED]`（无条件探针）证明 `evaluateCompiled` 被调用且 `compiled.isStatic === true`——**编译产物已是旧值字面量**（`staticValue` 含 `nickName: "E2E_uiedit"`），后续 scope 变编辑值也不重新解析。
   - 逐层打点定位预解析点：host schema 模板（fetchPageSchema 打点 `[TMP-SCHEMA]`，`${nickName}` 原样）→ node-compiler 编译输入模板（`[TMP-RAW-ONCLICK]`）→ **`evaluateSurfaceArgs` 时 `action.source.args.body` 已旧值**（`[TMP-SURF]`）→ `surface-runtime.open` body 旧值（`[TMP-SURF-OPEN-DATA]`）。矛盾点（编译输入模板 vs source 旧值）最终指向：**dropdown-button 节点渲染时 `resolveNodeProps` 用行 scope 求值 props（items）**，污染了 item 里 openDialog 的 `args.body`。
4. **playground 对照复现**：注册 `registerLayoutRenderers`（playground 原本没注册，dropdown-button 编译期被 registry 过滤）+ 把行按钮从 operation buttons 改为 dropdown-button items 结构 → **立即复现**（提交 `RowNick` 旧值）。

**为什么此前在 nop-chaos-flux 中一直没复现（三类场景只有一类触发）**：

| 场景                                                | 按钮结构                     | onClick 归属                                              | 是否污染 |
| --------------------------------------------------- | ---------------------------- | --------------------------------------------------------- | -------- |
| 单测 `submit-action-scope.test.tsx`                 | 页面 body 独立按钮           | **事件字段**（eventPlans 预编译，模板保持）               | 否       |
| playground `crudRowEditDialog`（operation buttons） | CRUD operation 列按钮        | **事件字段**（同上）                                      | 否       |
| **host 真实 schema**                                | **dropdown-button 的 items** | **props 字段**（items 经 resolveNodeProps 行 scope 求值） | **是**   |

- 单测与 playground 的按钮 onClick 都是事件字段（走 eventPlans，不经 props 求值），路径天然正确；
- playground 未注册 layout renderers，dropdown-button 编译期被 registry 过滤（buttons 区域为空数组），该路径从未被渲染覆盖；
- **测试盲区**：三类场景中只有"dropdown-button items 内嵌 openDialog"触发 props 字段内的 action args 被行 scope 表达式化，而 flux 项目内无任何测试覆盖该结构。

## Root Cause

- `dropdown-button` 的 `items` 是 **props 字段**（renderer 定义仅声明为普通 prop，无嵌套字段分类）；普通按钮的 `onClick` 是**事件字段**（`classifyField` 归为 event → eventPlans 保持模板）。
- 编译期：items 走 `compileValue` 表达式编译，item 里 `onClick.args.body`（form schema）被当作普通对象编译，`${nickName}` 编译为 dynamic 表达式。
- 渲染期：`resolveNodeProps`（`flux-runtime/src/node-runtime.ts:254`）对 dynamic propsProgram 用**行 scope** 求值（行数据直接暴露为 scope 键，`{...record, $slot}`）→ `args.body.submitAction.args.data` 被行数据求值 → 编译产物**静态化为旧值** → 提交旧值。
- 本质：**无 type/无契约的内置嵌套结构既无法编译分类也无法校验**——与 action args（openDialog body）无校验是同一类缺口（见 `docs/architecture/nested-schema-field-classification.md`）。

## Fix

按设计 v8（`docs/architecture/nested-schema-field-classification.md`）落地"属性内联 schema definition"机制：

- 属性定义（FluxValueShape）内联 `schema-definition`（fieldRules 分类 + `actionValue` 标记），容器形态（array.item/record.value/object.fields）确定作用对象；
- 编译期按 fieldRules 分类：`event`/`action` → `__nopPreserveLiteral` envelope 保持模板（不表达式化）；`region`/`schema` → region 提取；`prop`/`value` → 表达式求值；
- 渲染期 renderer 侧 `unwrapPreservedLiteral` 解包（dropdown-button/button-group 的 dispatch 处）；
- 校验期按同一 definition 递归（消除"无 type 报错"盲区）；
- 内建 action 每类型一个 definition（args 字段分类 + 约束载体），`evaluateSurfaceArgs` 对 action 类键原始值保留（兑现边界①）；
- 整体取代并删除遗留 `deepFields`/`nestedRegions`/`booleanKeys`/`normalize` 手工机制（机制统一计划）。

实施计划：`docs/plans/2026-08-02-1-nested-schema-field-classification.md`（P0 修复）、`docs/plans/2026-08-02-2-nested-schema-mechanism-unification.md`（机制统一）、`docs/plans/2026-08-02-3-ajax-validation-migration.md`（ajax 校验迁移）。

## Tests

- **红线契约测试（最先写）**：全静态 dropdown items 的 onClick 编译为 envelope（不进 props 表达式）+ 运行时 dispatch 解包断言（防 static/object-node 行为分裂）。
- compileNode 层：dropdown-button items 的 onClick 编译为模板——以 `submit-action-lazy-execution.test.tsx` 为模型。
- shape-validation 层：schema-definition 按 fieldRules 校验、三处 shape switch 对称性（matches/validate/summarize）。
- 污染断言：searchSource / quickSaveAction / picker loadAction / uploadAction 不被 props 求值污染。
- playground e2e：CRUD 行内 dropdown-button items 的 openDialog 编辑提交（断言提交编辑值）。
- 既有 `submit-action-scope.test.tsx`（页面按钮场景）继续通过——两类场景行为分界被测试锁定。

## Affected Files

- `packages/flux-core/src/schema-diagnostics/manifest.ts`（schema-definition shape）、`types/schema.ts`（SchemaFieldKind/SchemaFieldRule 扩展）、`schema-diagnostics/value-shape-runtime.ts`
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts`（propContracts.shape 管道）、`flux-value-shape-validation.ts`、`shape-validation-deep-fields.ts`（删除）
- `packages/flux-renderers-layout/src/dropdown-button-renderer.tsx`、`button-group-renderer.tsx`（unwrapPreservedLiteral）
- `packages/flux-renderers-form(-advanced)/`、`-data/`（searchSource/quickSaveAction/uploadAction/validate 等 actionValue 声明）
- `packages/flux-core/src/constants.ts`（action definition + refreshNearest 补正）、`flux-action-core/src/action-dispatcher/built-in-actions.ts`（兑现边界）
- 测试：`packages/flux-renderers-form/src/__tests__/submit-action-scope.test.tsx`、新增全静态 items 红线测试、playground `tests/e2e/component-lab/` 新场景
