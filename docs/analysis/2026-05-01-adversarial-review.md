# Adversarial Review: 2026-05-01

Open-ended adversarial review of nop-chaos-flux. No preset checklist — followed the code where it led.

---

## Finding 1: Runtime Disposal Leaks Three Resource Categories (HIGH)

**Where:** `packages/flux-runtime/src/runtime-owned-factories.ts:124-125`, `runtime-factory.ts:443-468`, `runtime-owned-factories.ts:176-194`

**What:** `runtime.dispose()` does not clean up three categories of resources:

1. **Bidirectional page store sync subscriptions** — `createPageRuntime` calls `externalPageStore.subscribe(syncExternalPageStoreToValidation)` and `validationStore.subscribe(syncValidationToExternalPageStore)` at lines 124-125. Both return values are discarded. When `runtime.dispose()` runs, it clears `ownedPages` but never unsubscribes these listeners. The `PageRuntime` interface has no `dispose()` method at all.

2. **Page validation owners are never disposed** — `runtime.dispose()` iterates `ownedPages` at lines 450-453 but only calls `sourceRegistryRef.current?.disposeScopeTree(page.scope.id)` and `reactionRegistryRef.current?.disposeScopeTree(page.scope.id)`. It never calls `page.validationOwner.dispose()`, leaving the form runtime behind each page's validation scope in an undead state — its async governance entries, validation abort controllers, and debounce timers are orphaned.

3. **Standalone `createFormRuntime` instances are never tracked or auto-disposed** — Unlike `createPageRuntime` (tracked in `ownedPages`) and `createSurfaceRuntime` (tracked in `ownedSurfaceRuntimes`), `createFormRuntime` returns a `FormRuntime` that is not added to any set. `runtime.dispose()` has no way to reach these instances. The caller must manually call `.dispose()`, which is easy to forget in React component unmount paths.

**Why it matters:** These compound into a real leak in SPA scenarios. Each page navigation creates a new runtime, disposes the old one, but leaves 2+ dangling subscriptions and an undead form runtime per page. Over time, the `externalPageStore`'s listener set grows, and every external data change fires stale sync callbacks on disposed stores. The standalone form runtimes accumulate validation governance state.

**Confidence:** Confirmed. Traced the complete disposal path end-to-end.

---

## Finding 2: `RendererComponentProps<S>.props` Generic Is Decorative — Zero Type Safety at the Renderer Boundary (HIGH)

**Where:** `packages/flux-core/src/types/renderer-core.ts:144-155` (interface), `:188` (registration), `packages/flux-react/src/node-renderer.tsx:282` (runtime), `packages/flux-react/src/render-nodes.tsx:40-44` (bridge hook)

**What:** The generic parameter `S` on `RendererComponentProps<S>` is only used for `schema: S`, `templateNode: TemplateNode<S>`, and `node: NodeInstance<S>`. The critical field `props: Readonly<Record<string, unknown>>` ignores `S` entirely. At registration, `RendererDefinition<S>.component` is typed as `ComponentType<RendererComponentProps<any>>`, erasing `S` to `any`.

The result: every renderer component in the codebase (53 files, 237 property access sites) accesses `props.props.someField` with zero type checking. Every access returns `unknown`. Renderers compensate with:

- `String(props.props.name ?? '')` — 237 sites of manual coercion
- `(props.props as ButtonSchema).variant` — 22 explicit type assertions across 12 files
- `useSchemaProps(props)` — a centralized bridge that is `props.props as unknown as Readonly<S>` (pure assertion, only used by 4 renderers)

The AGENTS.md example shows `props.props.variant` as if it's typed, but in reality it's `unknown`.

**Why it matters:** This is the most touched interface in the entire codebase. The generic `S` creates an illusion of type safety that doesn't exist at the most critical boundary — where schema meets UI. Any typo in a property name, any wrong type assumption, compiles without error. The only reason this works today is exhaustive manual coercion at every call site.

**Confidence:** Confirmed. Traced from type definition through registration, compilation, runtime construction, and 237 usage sites.

---

## Finding 3: Scope Prototype Chain — Dangerous Keys Not Filtered on Write Paths (HIGH)

**Where:** `packages/flux-runtime/src/scope.ts:87` (DANGEROUS_KEYS), `:106-128` (readVisible), `:343-410` (merge/update/replace)

**What:** The scope system uses `Object.create(parent)` to build prototype chains for scope inheritance. A `DANGEROUS_KEYS` set (`__proto__`, `constructor`, `prototype`) exists but is only applied during `materializeVisible()` — the slow, full-copy path.

The fast path `readVisible()` applies **no** dangerous-key filtering. The write paths (`merge()`, `update()`, `replace()`) also apply **no** filtering. An API response containing `{ constructor: "malicious" }` would be stored as-is in the scope snapshot. When `readVisible()` constructs its `Object.assign(safeCreate(parentVisible), ownSnapshot)`, the `constructor` key shadows `Object.prototype.constructor` on the view object. Any code reading `view.constructor` (e.g., type guards like `value.constructor === Object`) would get the polluted value.

The formula scope proxy (`packages/flux-formula/src/scope.ts:124,163`) and the adaptor scope view (`request-runtime-adaptor.ts:57`) only block `__proto__`, not `constructor` or `prototype`.

**Why it matters:** API responses are user-controlled data. In a low-code platform where schemas are often user-authored, this is a realistic attack vector. The inconsistency between `readVisible()` (no filter) and `materializeVisible()` (full filter) means two reads of the same scope can return different results for `constructor`/`prototype` keys.

**Confidence:** Confirmed. Traced all write and read paths.

---

## Finding 4: Formula Parser Has No Recursion Depth Limit — Stack Overflow on Nested Input (MEDIUM)

**Where:** `packages/flux-formula/src/parser.ts:22-34, 69-95`

**What:** The recursive descent parser has no depth counter or guard. Each nesting level triggers ~12 mutually recursive method calls. The schema compiler has `MAX_COMPILE_DEPTH = 64` (`flux-compiler/src/schema-compiler-helpers.ts:19`), but the formula parser has no equivalent.

The evaluator (`packages/flux-formula/src/evaluator.ts:116`) also has no depth limit on the recursive `evaluateNode` function.

**Why it matters:** A deeply nested expression (thousands of parentheses) will crash the entire JS thread with a stack overflow before producing an AST. In a low-code platform where schema expressions are often user-authored or imported from external sources, this is a denial-of-service vector. The `collectSchemaImportSpecs` function in the compiler (`flux-compiler/src/schema-compiler/symbol-helpers.ts:46-83`) also has no depth limit.

**Confidence:** Confirmed. Read the parser code — no depth counter exists.

---

## Finding 5: Expression Errors Silently Swallowed at Three Layers (MEDIUM)

**Where:** `packages/flux-formula/src/compile/compile-node.ts:59-64, 81-86`, `packages/flux-formula/src/compile/formula-compiler.ts:130-132, 196-205`

**What:** Three catch-and-return patterns silently degrade malformed expressions:

1. `compile-node.ts` catches parse errors and returns the raw string as a `StaticValueNode`. The `options.reportDiagnostic` callback is never invoked.
2. `formula-compiler.ts` catches evaluation errors and returns `undefined as T`.
3. Template evaluation catches errors and returns empty string `''`.

A malformed expression like `"${...}"` silently becomes the literal string `"${...}"` with no diagnostic. The schema compiler's diagnostic reporter is never called.

**Why it matters:** In a low-code platform, expression errors are a primary source of "why isn't this working?" confusion. The three-layer silent swallowing means the user gets no feedback. The `reportDiagnostic` callback was designed to solve exactly this problem but is bypassed at the first catch layer.

**Confidence:** Confirmed. The test at `packages/flux-formula/src/index.test.ts:313-322` explicitly validates this behavior.

---

## Finding 6: Doc-Code Contract Drift — Multiple Interfaces Diverged (MEDIUM-HIGH)

**Where:** Multiple files across `docs/architecture/` and `packages/`

**What:** The following discrepancies exist between documentation and code:

| Doc Claim                                                                                                                 | Code Reality                                                                                                                                                                                 | Impact                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `renderer-runtime.md:788-789` — `RenderFragmentOptions.data` documented as `@deprecated` but "kept for back-compat"       | Field does not exist in `renderer-hooks.ts:23-38`                                                                                                                                            | Docs describe backward compatibility that was already removed |
| `renderer-runtime.md:594-602` — `RenderRegionHandle.instantiate()` documented as `@deprecated`                            | Method does not exist in `renderer-hooks.ts:58-85`                                                                                                                                           | Same — deprecated-kept docs for a removed method              |
| `renderer-runtime.md` — `useFormLayout`, `useAggregateError` options param, `FormLayoutContext` not listed                | All exist and are exported from `packages/flux-react/src/`                                                                                                                                   | Undocumented public API surface                               |
| `renderer-runtime.md` "Current Hooks" section                                                                             | `RendererHookApi` in `flux-core/src/types/renderer-hooks.ts:113-149` is stale — missing `useFormLayout`, `useCurrentValidationScope`, `useCurrentFormModelGeneration`, `useDataSourceStatus` | Type contract in core package doesn't match implementation    |
| `form-validation.md:468-477` — lists `sourceKind` values                                                                  | Code at `types/validation.ts:33-43` has additional `form` and `runtime-registration` values                                                                                                  | Undocumented enum values                                      |
| AGENTS.md dependency flow — linear chain `flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime` | `flux-runtime` directly depends on `flux-formula` and `flux-compiler` (3-level reach)                                                                                                        | Diagram misleading about actual dependency topology           |

**Unused production dependencies:**

- `flux-renderers-basic` declares `@nop-chaos/flux-runtime` dependency — zero imports found
- `flux-renderers-basic` declares `@nop-chaos/flux-formula` — only used in test support
- `flux-react` declares `@nop-chaos/flux-compiler` — only used in test files

**Why it matters:** The doc-code drift at the renderer contract boundary is the most impactful — deprecated methods documented as "kept" but already removed will mislead anyone implementing a new renderer. The stale `RendererHookApi` type in the core package means TypeScript consumers see an incomplete interface. The unused production dependencies bloat the bundle.

**Confidence:** Confirmed. Cross-referenced docs with actual exported types and imports.

---

## Finding 7: `Promise.all` in Form Validation Loses All Results on Single Throw (MEDIUM)

**Where:** `packages/flux-runtime/src/form-runtime-owner.ts:249-254`

**What:** Form-level validation uses `Promise.all` to run all field validations concurrently:

```typescript
const pathResults = await Promise.all(
  validationPaths.map(async (path) => {
    return { path, result: await input.getThisForm().validateField(path, reason) };
  }),
);
```

If any single field validation throws a non-`VALIDATION_CANCELLED` error (e.g., a custom `validate()` callback throws unexpectedly), the entire `Promise.all` rejects. Results from all other successfully validated fields are lost. The form is left in a partially validated state — `fieldStates` has been mutated for fields that completed before the error, but the remaining fields are untouched.

**Why it matters:** A misconfigured or buggy custom validator on one field prevents all other fields from being validated. The user sees partial validation state with no indication of what went wrong. `Promise.allSettled` or per-path try/catch would prevent this.

**Confidence:** Confirmed. Read the full validation flow.

---

## Finding 8: Accessibility — Tree and Table Interactions Not Keyboard-Accessible (MEDIUM)

**Where:**

- `packages/flux-renderers-data/src/tree-renderer.tsx:93-103` (expand trigger)
- `packages/flux-renderers-data/src/tree-renderer.tsx:114-127` (clickable node area)
- `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:74-79, 128-129` (checkbox, sortable headers)
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:137-145` (row selection)

**What:**

1. Tree expand/collapse trigger uses `<span role="button" tabIndex={0}>` with `aria-label` but **no keyboard handler** — Enter and Space don't work. Should be a `<button>`.
2. Tree node click area (when `expandRowByClick` is true) uses a `<div>` with `onClick` but no `role`, `tabIndex`, or keyboard handler.
3. Table select-all checkbox has no `aria-label`.
4. Table row selection checkbox and radio have no `aria-label`.
5. Table sortable column headers use `<span>` with `onClick` but no `role="button"`, `tabIndex`, or keyboard handler.

**Why it matters:** In a low-code platform that aims to produce production-ready applications, inaccessible table and tree interactions are a significant compliance gap. WCAG 2.1 Level A requires all interactive elements to be keyboard-operable.

**Confidence:** Confirmed. Read the JSX directly.

---

## Finding 9: Widespread Hardcoded User-Visible Strings — Not i18n-ized (MEDIUM)

**Where:** 19+ locations across renderer packages.

Key examples:

- `crud-renderer-toolbar.tsx:80` — `"Total ${summary.total}"`
- `crud-renderer-toolbar.tsx:118` — `"Page ${currentPage}"`
- `table-pagination-bar.tsx:146` — `"${from}-${to} of ${total}"`
- `input.tsx:97` — `'Failed to load options.'`
- `input.tsx:147` — `'Loading...'`
- `key-value.tsx:371` — `'Add entry'`
- `array-editor.tsx:65` — `'Item ${index}'`
- Validation messages in `array-editor.tsx:247`, `key-value.tsx:313,323`, `tag-list.tsx:60`, `array-field.tsx:334` — English-only strings like `"is required"`, `"requires at least one item"`

**Why it matters:** The project has an `@nop-chaos/flux-i18n` package with `flux.` prefix convention. Many renderers use `t()` for some strings but fall back to hardcoded English for others. The inconsistency suggests i18n was applied incrementally rather than systematically. For a platform that supports zh-CN and en-US, this creates a mixed-language user experience.

**Confidence:** Confirmed. Grepped for hardcoded strings in all renderer packages.

---

## Finding 10: `createAutoRendererComponent` Creates New Functions Every Render, No Memo (LOW-MEDIUM)

**Where:** `packages/flux-react/src/auto-renderer.tsx:3-25`

**What:** This factory function creates an un-memoized component that spreads `props.props` into a new object and wraps every event handler in a new closure on every render. Any wrapped component that uses `React.memo` would be defeated by the ever-changing prop references.

**Why it matters:** Auto-renderers are the common path for simple renderers. If used for any non-trivial component, this creates unnecessary re-renders. The pattern of `(event: unknown) => handler(event)` wrapper per event per render is particularly wasteful.

**Confidence:** Confirmed.

---

## Finding 11: Circular Type Dependencies in flux-core/types/ (LOW-MEDIUM)

**Where:** `packages/flux-core/src/types/renderer-core.ts` <-> `renderer-hooks.ts`, via `actions.ts` and `runtime.ts`

**What:** `renderer-core.ts:37` imports from `./renderer-hooks`, and `renderer-hooks.ts:7` imports from `./renderer-core`. This works today because all imports are `import type`. However, `renderer-authoring-contract.ts` already contains runtime functions (not just types) in the `types/` directory, establishing a precedent. If runtime code is added to either of the circularly-referenced files, it becomes a runtime crash.

**Why it matters:** The `types/` directory is slowly accumulating runtime code, which weakens the "it's only types, circular imports are fine" defense.

**Confidence:** Confirmed.

---

## Finding 12: Formula Namespace Objects Expose Prototype Chain (LOW)

**Where:** `packages/flux-formula/src/builtins.ts:50-52`, `evaluator.ts:237-242`

**What:** `$Math`, `$JSON`, `$Date` are registered as raw JavaScript objects (`Math`, `JSON`, `Date`). An expression like `$Math.constructor.constructor('return globalThis')()` traverses the prototype chain from `Math` to `Object` to `Function`. The scope proxy blocks `__proto__` but not `constructor` on namespace objects.

Mitigated by: no assignment/mutation in the expression language, no `eval`/`new Function` in the evaluator, and the expression language has no way to invoke a constructor. But the prototype chain access itself is not blocked.

**Why it matters:** Defense-in-depth. If a future expression feature adds callable references or constructor-like syntax, this becomes exploitable.

**Confidence:** Interesting guess. The exploit chain is incomplete in the current expression language.

---

## Finding 13: `ManagedFormRuntimeSharedState` — Large Mutable Object With No Centralized Tracking (LOW)

**Where:** `packages/flux-runtime/src/form-runtime.ts:140-156`

**What:** 10 mutable containers (Maps, Sets, counters) are directly mutated from dozens of call sites across 10+ files. No listener notification, no snapshot capability, no audit trail.

**Why it matters:** This is a deliberate performance design (these are internal bookkeeping structures), but it means any future debugging tool would need to patch every individual Map/Set method. The `initialFieldState.initialValues` property is mutated in-place during `reset()`, meaning all closures that captured the reference will see the new baseline without indication.

**Confidence:** Confirmed, but low priority by design.

---

## Finding 14: Schema Compiler `classifyField` Uses Linear Scan Per Field (LOW)

**Where:** `packages/flux-compiler/src/schema-compiler/fields.ts:23-47`

**What:** `renderer.fields?.find(field => field.key === key)` is O(n) per field per schema node. For a renderer with 50 field definitions and a schema node with 30 keys, that's 1500 comparisons per node. Converting `fields` to a `Map` would make this O(1).

**Why it matters:** Performance only. For typical schemas (1000 nodes, 5-10 fields each) the impact is negligible. For pathological schemas with many custom field definitions, it adds up.

**Confidence:** Confirmed.

---

## Finding 15: `compileSymbolTable.push()` Copies Full Frame Array Each Time (LOW)

**Where:** `packages/flux-compiler/src/compile-symbol-table.ts:12-14`

**What:** Each `push` creates a new array via spread (`...frames`), making it O(n) per push. With `MAX_COMPILE_DEPTH = 64`, this means up to 64 array copies, each O(n) in current frame count. Combined with `resolve()` scanning frames from back to front (also O(n)), deeply nested schemas have O(n^2) symbol resolution.

**Why it matters:** Likely negligible in practice (MAX_COMPILE_DEPTH is 64), but the pattern is structurally quadratic.

**Confidence:** Confirmed.

---

## 总评：最值得关注的 3 个方向

### 1. Runtime 生命周期完整性 (Finding 1)

运行时的 `dispose()` 路径是系统中最"灯下黑"的区域。创建路径有完善的工厂模式、依赖注入、共享状态管理；销毁路径只有部分清理，且三个不同的泄露机制（同步订阅、验证所有者、独立表单运行时）会复合叠加。这个问题在开发环境下不易察觉（页面刷新就清理了），但在 SPA 长时间运行时会逐渐显现。建议：给 `PageRuntime` 接口添加 `dispose()` 方法，在 `runtime.dispose()` 中调用；把 `createFormRuntime` 返回的实例纳入生命周期追踪。

### 2. Renderer 边界的类型安全幻觉 (Finding 2)

`RendererComponentProps<S>` 的泛型 `S` 在最关键的 `props` 字段上完全是装饰性的。53 个文件中的 237 个访问点全部以 `unknown` 类型运行。这不是一个小修小补能解决的问题——它涉及到编译管道如何从 schema 生成 props、类型如何在注册时保留、运行时如何构建 props 对象。但如果要提升这个系统的类型安全，需要从编译端（让编译器生成带类型的 props 结构）到注册端（让 `RendererDefinition` 保留组件的类型信息）到消费端（让渲染器拿到类型化的 props）统一重新设计。作为第一步，至少应该让 `useSchemaProps` 成为所有渲染器的标准入口，而不是散布 `as` 断言。

### 3. Scope 安全防御的不一致性 (Finding 3)

`DANGEROUS_KEYS` 过滤只在 `materializeVisible()` 中存在，写入路径和快速读取路径都没有。在低代码平台中，API 响应和 schema 数据都是外部输入。当前的三层防御（formula proxy、adaptor scope view、materializeVisible）各自只覆盖了部分场景，且不保护 `constructor`/`prototype` 键。这是一个防御深度问题——今天可能不会触发，但一旦有用户构造了包含 `constructor` 键的 API 响应，就可能在 scope 读取端产生意外行为。建议：在写入路径统一过滤 `DANGEROUS_KEYS`，让防御前置。
