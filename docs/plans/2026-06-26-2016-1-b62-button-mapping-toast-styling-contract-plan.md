# B6.2 Button / Mapping / Toast / Styling 契约

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` Wave B6 B6.2；signal 源 `docs/components/amis-bug-driven-improvements/14-action-button-toast-mapping-cards-status-styling.md`（§A Button / §D Toast / §E Mapping / §I Styling-System）
> Mission: amis-bug-driven-improvements
> Work Item: B6.2 button/mapping/toast/styling 契约
> Related: 同 wave predecessor B6.1（`docs/plans/2026-06-26-1030-2-b61-action-graph-reload-condition-builder-disabled-cards-plan.md`，已 done；已收口 AG1/AG3/CB1/CB3/CD1/CD4）；successor：B7（P2/P3 backlog，依赖 B1–B6 closure，本工作项是 B1–B6 最后一项）。本工作项无前置依赖（roadmap Phases 表 Dependencies: —）。

## Purpose

把 Wave B6 最后一个工作项 B6.2 收口到 `done`：锁定 / 验证 button·toast·mapping·styling-system 四个 owner 结果面上「Flux 已声称但未锁/未测试/未文档化」的正确性属性（doc-14 的 B1/B3/T2/T3/MP2/STY2 六条 signal）。本工作项全部为 LOCK / TEST-GAP / DESIGN-GAP，无 P0 级 live defect——确认当前行为成立，补回归锚与 owner-doc 显式化，并把 genuinely-absent 的 amis-parity 特征（mapping loader）诚实裁定为 DESIGN-ACK-NOT-IMPL + successor B7。B6.2 收口后，B1–B6 closure 成立，B7 可启动评估。

## Current Baseline

> 经 live repo 核对（2026-06-26）。全部路径为本工作目录绝对路径简写。

### 已成立（不需要本 plan 介入，仅锁回归锚）

- **B1 button `disabled` boolean|expr**（LOCK P1）— `disabled` 是冻结 META 字段（`packages/flux-core/src/constants.ts:8` `META_FIELDS` 含 `disabled`）；button definition 声明 `kind: 'meta'`（`packages/flux-renderers-basic/src/basic-renderer-definitions.ts:265`）。编译期表达式被编译并求值（`packages/flux-compiler/src/schema-compiler/fields.ts:76-82`，`BOOLEAN_META_FIELDS = {when, visible, hidden, disabled}`）。runtime 把 disabled meta 程序重求值并投影进 props（`packages/flux-runtime/src/node-runtime.ts:19-32`（`projectRendererFacingMeta`）、`:271-303`）。renderer 读 `props.props.disabled` 并以 `=== true` 严判（`packages/flux-renderers-basic/src/button.tsx:48`、`:97` `disabled={disabled || loading}`）。**无 always-true 风险**：meta 求值路径 `?? false` 默认（`node-runtime.ts:219` `resolveMeta`）+ `normalizeBooleanLike`（`typeof value === 'boolean' ? value : undefined`，`node-runtime.ts:280` `projectedProps`）使非布尔 truthy 表达式结果解析为 `undefined`（非 disabled）；props 投影路径最终由 renderer `=== true` 严判（`button.tsx:48`）兜底，杜绝 always-true。owner doc 已声明（`docs/components/button/design.md:9,85`「disabled 等值字段可来自表达式」）。
- **B3 button label `&` 忠实渲染**（TEST-GAP P2）— renderer 输出 `{label ? String(label) : null}`（`packages/flux-renderers-basic/src/button.tsx:103`），React text child 单层自动转义；源值是纯文本（非预编码 HTML），故 label `"A & B"` 渲染为字面 `A & B`，无双逃逸。
- **T2 toast imperative API strict-mode 安全**（TEST-GAP P1）— Flux 直接 re-export sonner 的命令式 API（`packages/ui/src/index.ts:57` `export { toast } from 'sonner'`）。`<Toaster/>` 是 sonner 的薄 presentational wrapper（`packages/ui/src/components/ui/sonner.tsx:27-47`），无 Flux 层 `useState/useEffect` 驱动 toast 创建。sonner 维护 React 外的全局 toast store，`toast.success()` 是对全局 store 的直接 mutation，与 effect 无关，故 `React.StrictMode` 下不双发。playground root 已挂 StrictMode（`apps/playground/src/main.tsx:12-14`）。runtime `showToast` action 走 host 抽象 `env.notify`（`packages/flux-runtime/src/action-adapter.ts:279-291`），不直连 sonner。
- **T3 toast duration 跨 variant 一致**（TEST-GAP P2）— Flux **不设任何 duration**（`packages/ui/src/components/ui/sonner.tsx:21-25` `defaultToastOptions` 无 `duration` 键、无 per-variant duration）。四个 variant（info/success/error/warning）统一继承 sonner 内置默认（4000ms），无 variant 级不对称。一致性「by omission」成立，但无回归锚防止有人引入 per-variant duration。
- **STY2 utility className 仅默认 stylesheet 即生效（无 helper.css）**（LOCK P1）— 全仓**无** `helper.css` 文件、**无** `.amis-scope` 前缀选择器（`packages/` 内 grep 0 命中，仅 doc 引用）。utility 类（如 `text-destructive`，20+ 文件使用，含 `packages/ui/src/components/ui/button.tsx:19`）经 Tailwind v4 生成：默认 bundle `apps/playground/src/styles.css:1` `@import 'tailwindcss'` + `:8` `@source "../../../packages"`（扫描全 packages 源）+ `:21` `--color-destructive: hsl(var(--destructive))` + token `packages/theme-tokens/src/styles.css:61`。无 helper.css 即生效，STY2 LOCK 成立。owner doc（`docs/architecture/styling-system.md`）**未**显式声明该保证（`:187` 仅泛述「不引入平行样式系统」）—— DESIGN-GAP（owner doc 沉默）。
- **MP1（不在本工作项交付范围，P2）**— `map` 支持 expression `${statusMap}` 解析（`packages/flux-renderers-content/src/mapping.tsx:42` 直读 `slotProps.map`；`content-renderer-definitions.ts:337-342` `propContracts.map.editorType:'expression'`）。本 plan 仅顺带覆盖其回归锚（见 Phase 3 Proof），MP1 非 B6.2 交付项。

### 真正剩余的 gap（本 plan 收口）

- **MP2 mapping source-scope（DESIGN-GAP P1）**：
  - **owner-doc drift（确认）**：`docs/components/mapping/design.md:41` 写「`map` 也可来自静态值或 **loader 归一化结果**」—— live 证据证伪：`MappingSchema`（`packages/flux-renderers-content/src/schemas.ts:202-214`）字段仅 `value/map/defaultLabel/placeholder/item`，**无 `source`/loader 字段**；`mapping.tsx` 不 import 任何 `useSourceValue`/fetch。该 loader 半边是 owner doc 与 live baseline 不一致，须修正。
  - **重复上下文 source-scope 未文档化**：`map` 是 per-row prop，在 cards/list/crud 行内每行对各自 row scope 求值；若 `map` 表达式绑 page-level（词法继承），每行解析到同一对象（无发散）。renderer 无显式 once-per-renderer cache 层（`mapping.tsx:13-22` `lookupMap` 纯内存查表）。该契约 owner doc（`mapping/design.md` §9）沉默。
  - **empty `map:{}` + value 无 wildcard fallback**（已成立但无锚）：`lookupMap`（`mapping.tsx:13-22`）miss 返回 `undefined` → 落 `defaultLabel ?? placeholder ?? null`（`:70-73`），无 `*` 通配。
  - **loader-sourced map + 「loader wins」precedence**：当前 moot（无 loader）；与请求下沉审计一致（`docs/components/amis-bug-driven-improvement-roadmap.md` Cross-Cutting「请求下沉审计」0 violation，组件级 api/initApi 拒绝）。裁定为 DESIGN-ACK-NOT-IMPL + successor B7。
- **回归锚缺口（TEST-GAP）**：button disabled-expr 双分支（B1）、button label `&`（B3）、toast strict-mode（T2）、toast duration uniform（T3）、mapping 重复上下文 + empty-map（MP2）、styling no-helper.css repo-structure guard（STY2）—— 均无 focused 回归测试。

### Framework reuse（不得重建）

- `disabled` meta 求值/投影：flux-compiler `fields.ts` + flux-runtime `node-runtime.ts`（已落地，只补锚）。
- toast：`@nop-chaos/ui` sonner wrapper + runtime `env.notify`（只补锚，不重建 notify 层）。
- utility className 生成：Tailwind v4 `@source` + theme-tokens + tailwind-preset（只补 doc + repo-structure guard，不改 CSS 生成路径）。

## Goals

- 为 B1/B3/T2/T3/MP2/STY2 六条 signal 补 focused 回归锚，锁定「当前已成立」的正确性属性（无行为变更，纯 Proof + LOCK）。
- 修正 MP2 的 owner-doc drift（`mapping/design.md:41` loader 虚假声称）并把 source-scope / empty-map / 无 wildcard 契约显式化于 `mapping/design.md`。
- 把 STY2 的 no-helper.css 保证显式化于 `docs/architecture/styling-system.md`。
- 诚实裁定 mapping loader-sourced map 为 DESIGN-ACK-NOT-IMPL + successor B7（genuinely-absent amis-parity 特征，Flux 从未声称，请求下沉审计禁止组件级 api）。
- B6.2 收口 → B1–B6 closure 成立 → B7 可启动。

## Non-Goals

- 不新增任何行为 / schema surface / 新字段（B1/B3/T2/T3/STY2 均为 LOCK/TEST-GAP，MP2 owner-doc 半边为 Decision B）。
- 不实现 mapping `source`/loader 能力（distinct feature，DESIGN-ACK-NOT-IMPL + successor B7）。
- 不做 computed-color CSS 渲染断言（unit-test 层不可行；STY2 回归风险 = 有人重新引入 helper.css，用 repo-structure guard 覆盖）。
- 不收口 doc-14 的 P2/P3 余项（B2/B4/T1/MP1/CD2/CD3/CD5/CD6/ST1-ST3/STY1/STY3/STY4/DB1/DB2/AG2/AG4/AG5）——归 B7 backlog 评估。MP1 虽顺带覆盖锚但非交付项。
- 不引入 toast owner doc（无 toast 设计文档存在；T2/T3 为纯 TEST-GAP，按 Rule 17 不写「no doc update required」凑条目）。

## Scope

### In Scope

- B1 button `disabled` boolean|expr 双分支回归锚（Proof）。
- B3 button label `&` 忠实渲染回归锚（Proof）。
- T2 toast imperative strict-mode 安全回归锚（Proof）。
- T3 toast duration 跨 variant 一致回归锚（Proof / LOCK guard）。
- MP2 mapping source-scope owner-doc 修正 + 契约显式化（Fix owner-doc drift + Decision）；mapping loader 裁定 DESIGN-ACK-NOT-IMPL + successor（Decision）；重复上下文 + empty-map 回归锚（Proof）。
- STY2 styling no-helper.css 保证 owner-doc 显式化（Fix DESIGN-GAP）+ repo-structure guard（Proof）。

### Out Of Scope

- doc-14 §A/§C/§D/§E/§F/§G/§H/§I 中 B6.2 六条（B1/B3/T2/T3/MP2/STY2）以外的全部条目（→ B7）。
- mapping loader 实现、toast 新 owner doc、CSS computed-color 测试、button 行为/样式变更。

## Failure Paths

> 本工作项无错误处理/API 契约/鉴权/外部集成变更（纯 LOCK/TEST-GAP + owner-doc 修正 + DESIGN-ACK 裁定）。不适用。

唯一可观测失败场景（回归锚本身）：未来回归引入 helper.css / `.amis-scope` / per-variant toast duration / disabled always-true / mapping wildcard fallback 时，对应回归锚 fail 并阻止合入。无运行期用户可见失败路径。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**

理由：B6.2 全部为 P1/P2（无 P0 锚点，P0 已由 B6.1 收口）。roadmap Cross-Cutting 规定「P0 锚点属必须自动化（failing test 先行）；P1 多为建议有测」。本工作项无 live defect（全部 CONFIRMED-WORKING 或 by-omission 成立），故无 failing-test-first 硬要求；但 LOCK/TEST-GAP 项必须有回归锚防止未来回归，故每条 in-scope signal 均配 Proof（同 plan 内补齐，不延后）。MP2 owner-doc drift 与 STY2 DESIGN-GAP 属确认的 owner-doc 不一致，按 Non-Degradable 不可降级为 follow-up。

## Execution Plan

### Phase 1 - Button 契约回归锚（B1 LOCK / B3 TEST-GAP）

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/button-enhancements.test.tsx`（或新增 `button-contract.test.tsx`）

- Item Types: `Proof`

- [x] (Proof, B1) 新增 button-renderer 回归锚：`disabled: "${!isAdmin}"` 经 scope 求值——`isAdmin=true` → button **不禁用**（DOM `button.disabled === false`）；`isAdmin=false` → button **禁用**（`button.disabled === true`）。两分支均断言 DOM 真实 disabled 态（非仅 props 值）。复用既有 schema-renderer 渲染 + scope 注入模式（参考 `button-enhancements.test.tsx` 既有 `disabled:true` 静态用例 `:209-213`）。
- [x] (Proof, B3) 新增 button-renderer 回归锚：`label: "${name}"`，scope `name = "A & B"` → 渲染字面文本 `A & B`（断言 `textContent === 'A & B'`，非 `"A &amp; B"`），证明单层转义、无双逃逸。

Exit Criteria:

- [x] B1/B3 两条 button-renderer focused 测试 green（`pnpm --filter @nop-chaos/flux-renderers-basic test` 相关用例通过），断言的是 DOM 可观测结果（`button.disabled`、`textContent`）而非仅内部值。
- [x] 无 button 行为/schema 变更（纯 Proof；本 Phase 不动 `button.tsx` / definition）。

### Phase 2 - Toast 契约回归锚（T2 / T3 TEST-GAP）

Status: completed
Targets: `packages/ui/src/components/ui/sonner.test.tsx`

- Item Types: `Proof`

- [x] (Proof, T2) 新增 strict-mode 回归锚：在 `<React.StrictMode>` 内挂载 `<Toaster/>`，命令式触发 `toast.success('msg')` 一次，断言渲染出的 toast **恰好一个**（无双 toast、无 throw）。验证 sonner 全局 store 路径在 StrictMode 下不双发。用 `act()` 包裹 + 查询渲染 toast 数量。
- [x] (Proof, T3) 新增 duration-uniform 回归锚：断言 Flux `<Toaster/>` wrapper **不引入 per-variant duration 不对称**。**优先采用结构 guard (b)**（sonner 在 jsdom 不暴露每 toast resolved duration，选项 (a) 不可行）：断言 `defaultToastOptions`（`sonner.tsx:21-25`）与 Toaster wrapper 不含 per-variant duration 映射（四个 variant 继承同一 sonner 默认）。该 guard 验证的是 Flux-owned 属性「Flux 不引入 per-variant 不对称」。

Exit Criteria:

- [x] T2/T3 两条 toast focused 测试 green（`pnpm --filter @nop-chaos/ui test` 相关用例通过）。
- [x] 无 `sonner.tsx` 行为变更（纯 Proof；本 Phase 不改 wrapper 逻辑。T3 采用只读结构 guard）。

### Phase 3 - Mapping source-scope 契约（MP2 DESIGN-GAP）

Status: completed
Targets: `docs/components/mapping/design.md`、`packages/flux-renderers-content/src/mapping.test.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] (Fix, owner-doc drift) 修正 `docs/components/mapping/design.md:41` 虚假 loader 声称：删去/改写「loader 归一化结果」表述为 live 契约——`map` 为静态对象或 expression prop（`map:"${statusMap}"`），无组件级 loader/source（与请求下沉审计一致，组件级 api 拒绝）。
- [x] (Decision, MP2 source-scope) 在 `mapping/design.md` §9 显式化 source-scope 契约：重复上下文（cards/list/crud 行）内 `map` 作为 prop 对各自 row scope 求值；绑 page-level 的共享 `map` 表达式经词法继承每行解析到同一对象（无 per-row 发散）；renderer 无 once-per-renderer cache，行为 = 每 row/每 render 的 prop 重求值（与所有 prop 一致）。记录 owner doc 无「Proposed vs Current」叙事（Rule 14）。
- [x] (Decision, MP2 loader + precedence + empty-map) 裁定并文档化：(1) loader-sourced map + 「loader wins」precedence → **DESIGN-ACK-NOT-IMPL + successor B7**（genuinely-absent distinct feature，Flux 从未声称，请求下沉审计 0 violation）；(2) `map:{}` + 有 value → miss → `defaultLabel ?? placeholder ?? null`，**无 `*` 通配 fallback**（锁定 `lookupMap` 当前行为）。登记到 `Deferred But Adjudicated`。
- [x] (Proof, MP2) 新增 mapping 回归锚：在重复上下文（cards 或 loop rows）渲染 mapping，共享 `map:"${statusMap}"` 表达式（statusMap 在 page scope），断言每行按各自 row value 解析到正确 label（无 per-row 发散、无 wildcard）；另断言 `map:{}` + 有 value → 命中 defaultLabel/placeholder（无 wildcard 误命中）。

Exit Criteria:

- [x] `mapping/design.md:41` loader 虚假声称已修正；§9 source-scope / empty-map / 无 wildcard / loader DESIGN-ACK 契约显式化，且与 live code（`mapping.tsx:13-22,42,70-73`、`schemas.ts:202-214` 无 source 字段）一致。
- [x] MP2 mapping focused 测试 green（`pnpm --filter @nop-chaos/flux-renderers-content test` 相关用例通过）。
- [x] loader 裁定已登记 `Deferred But Adjudicated`（Classification + Why Not Blocking + Successor B7）。

### Phase 4 - Styling utility-className 契约（STY2 LOCK + DESIGN-GAP）

Status: completed
Targets: `docs/architecture/styling-system.md`、新增 `packages/<ui 或 theme-tokens>/src/__tests__/styling-no-helper-css.test.ts`（repo-structure guard）

- Item Types: `Fix | Proof`

- [x] (Fix, STY2 DESIGN-GAP) 在 `docs/architecture/styling-system.md`（Architecture Guardrails / Tailwind 集成段）显式声明 STY2 保证：Flux utility classNames（如 `text-destructive`）经 Tailwind v4 `@source` 扫描 + `@theme inline` 颜色映射生成，**仅默认 stylesheet bundle 即生效，不需要独立 helper.css 或 `.amis-scope` scope-prefix**（LOCK，对应 doc-14 §I NOT-ADOPTED #1807/#5553/#5502）。引 `apps/playground/src/styles.css:1,8,21` 与 `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md` 为证据。无「Proposed vs Current」叙事。
- [x] (Proof, STY2) 新增 repo-structure guard 回归锚：断言 (a) 全仓 `**/helper.css` glob 为空；(b) `packages/**/*.css` 与 `packages/**/*.tsx` 内无 `.amis-scope` 选择器/引用；(c) `apps/playground/src/styles.css` 含 `@source "../../../packages"` 指令。该 guard 在有人重新引入 helper.css / scope-prefix / 移除 `@source` 时 fail。

Exit Criteria:

- [x] `docs/architecture/styling-system.md` 已含 STY2 no-helper.css 保证且与 live（`styles.css:1,8,21`、全仓无 helper.css）一致。
- [x] STY2 repo-structure guard 测试 green（放 `@nop-chaos/ui` 或 `@nop-chaos/theme-tokens`，执行 `pnpm --filter <pkg> test` 通过）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent（task `ses_0fc21ab0affefR5nnchtNQfc6T`，general 类型，不复用起草者上下文）
- Verdict: `pass-with-minors`（1 轮）
- Rounds: 1
- Findings addressed:
  - 零 Blocker、零 Major → 共识达成，`draft` → `active`。
  - 引用准确性：plan 内全部 file:line 引用经 live repo 逐条核对成立（constants.ts:8 / basic-renderer-definitions.ts:265 / fields.ts:11,76-82 / node-runtime.ts:19-32,219,271-303 / button.tsx:48,97,103 / ui/index.ts:57 / sonner.tsx:21-25,27-47 / main.tsx:12-14 / action-adapter.ts:279-291 / mapping.tsx:13-22,42,70-73 / schemas.ts:202-214 无 source / content-renderer-definitions.ts:337-342,358 / mapping/design.md:41 loader drift 确认 / styles.css:1,8,21 / theme-tokens styles.css:61 / styling-system.md 未声明 no-helper.css / 全仓无 helper.css 与 .amis-scope / button-enhancements.test.tsx:209-213）。
  - Minor 1（node-runtime.ts:219,280 联合引用易误导）→ 已修正：拆分 meta 路径 `?? false`（:219）与 props 投影路径 `normalizeBooleanLike`（:280），明示 props 路径由 renderer `=== true`（button.tsx:48）兜底。
  - Minor 2（「33+ 文件」近似偏大）→ 已软化为「20+ 文件」。
  - Minor 3（T3 选项 (a) 在 jsdom 不可行，sonner 不暴露 per-toast resolved duration）→ 已改为优先结构 guard (b)，明示 (a) 不可行以避免执行者浪费。
  - Minor 4（`> Mission:`/`> Work Item:` 额外 blockquote 标记）→ guide 不禁止，保留。
- 内容稳健性确认：scope {B1/B3/T2/T3/MP2/STY2} 精确匹配 roadmap B6.2 交付（roadmap:197），正确排除 B6.1 已收口的 {AG1/AG3/CB1/CB3/CD1/CD4}；MP1 显式声明非交付（仅锚）；MP2 loader 诚实裁定 `out-of-scope improvement` + successor B7，唯一 live defect（mapping/design.md:41 doc drift）列为 Fix 非 deferred；无 Anti-Slacking 违规；Test Strategy `建议有测`（P1/P2 无 P0）有据。

## Closure Gates

> **关闭条件**：本 section 与每 Phase Exit Criteria 全勾 `[x]` 后方可 `Plan Status: completed`。纯文档/测试计划：`pnpm test`/`lint`/`typecheck`/`build` 仍保留（本 plan 含新增测试文件 + owner-doc 修改，须全量验证）。

- [x] B1/B3/T2/T3/MP2/STY2 六条 signal 的回归锚均已 landed 且 green。
- [x] MP2 owner-doc drift（`mapping/design.md:41` loader 虚假声称）已修正。
- [x] STY2 DESIGN-GAP（`styling-system.md` no-helper.css 保证沉默）已显式化。
- [x] mapping loader 裁定为 DESIGN-ACK-NOT-IMPL + successor B7，已登记 `Deferred But Adjudicated` 且 non-blocking 理由充分。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（本工作项无 live defect；MP2 loader 为 genuinely-absent feature）。
- [x] 受影响 owner docs（`mapping/design.md`、`styling-system.md`）已同步到 live baseline，无「Proposed vs Current」叙事。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Mapping loader-sourced map + 「loader wins」precedence（MP2 loader 半边）

- Classification: `out-of-scope improvement`（显式 successor 所有权）
- Why Not Blocking Closure: live 无 mapping loader/source 机制——`MappingSchema`（`packages/flux-renderers-content/src/schemas.ts:202-214`）字段仅 `value/map/defaultLabel/placeholder/item`，无 `source` 字段；`mapping.tsx` 不 import fetch/useSourceValue。组件级 loader/api 被请求下沉审计显式拒绝（`docs/components/amis-bug-driven-improvement-roadmap.md` Cross-Cutting「请求下沉审计」0 violation；`map` 应经 loader/组装层或 `map:"${...}"` 表达式注入）。loader-sourced map + 「loader wins」precedence 是 distinct feature、Flux 从未声称，当前 vacuously 满足「无 precedence 冲突」。本工作项的 source-scope/empty-map 契约（static/expression `map`）独立于 loader，均已落地或在本计划收口。
- Successor Required: `yes`
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（如产品判断需 mapping loader/source，开独立 feature plan，评估为 loader/组装层职责）。

## Non-Blocking Follow-ups

- doc-14 余项（B2/B4/T1/MP1/CD2/CD3/CD5/CD6/ST1-ST3/STY1/STY3/STY4/DB1/DB2/AG2/AG4/AG5）→ B7 backlog 评估（非 plan-owned defect）。
- B7 P2/P3 信号收口（103 条）依赖本工作项 closure 后启动。

## Closure

Status Note: B6.2 收口完成——6 条 signal（B1/B3/T2/T3/MP2/STY2）回归锚全 green、owner-doc drift 已修正、loader 诚实裁定 DESIGN-ACK-NOT-IMPL+B7、纯 lock/test-gap/doc 无行为/schema 变更（唯一生产改动 = schemas.ts 1 行 JSDoc）。B1–B6 closure 成立，B7 可启动评估。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session general sub-agent（不复用执行 session 上下文；本审计独立 spot-run 测试 / 独立读 live 源 / 独立 git diff / 独立 typecheck+lint）
- Verdict: `pass`（零 Blocker、零 Major）
- Spot-run 结果（independently observed，非信任 summary）:
  - `flux-renderers-basic` button-enhancements B6.2 describe：B1×2（`isAdmin=true`→`button.disabled===false` / `isAdmin=false`→`===true`，断言 DOM）+ B3×1（`label "${name}"`、`name="A & B"`→`textContent==="A & B"`、`innerHTML` 不含 `&amp;amp;`）= 3 green；全包 408 green。
  - `ui`：STY2 repo-structure guard 3 green（0 helper.css / 0 `.amis-scope` / `@source` present）+ T2 strict-mode 2 green（不 mock sonner，StrictMode 单发）+ T3 2 green（rendered toastOptions 无 `duration` + 源 guard 无 `duration` token）= 11/11 green（含既有）；全包 139 green。
  - `flux-renderers-content` mapping：MP2×2 green（cards 共享 `map:"${statusMap}"` 三行 Active/Idle/Unknown-defaultLabel 无发散、无 wildcard；`map:{'*':...}` value 'unknown'→miss→Default、value '_'→hit→Star 锁 `'_'` 字面 key）；全包 171 green。
  - `pnpm --filter <三包> typecheck`：3/3 Done；`pnpm --filter <三包> lint`：3/3 Done。
- Live file:line 抽查（全部成立）:
  - `packages/flux-renderers-basic/src/button.tsx:48` `disabled === true`（严判）；`:97` `disabled={disabled || loading}`；`:103` `{label ? String(label) : null}`（单层转义）—— B1/B3 锚与之一致。
  - `packages/ui/src/components/ui/sonner.tsx:21-25` `defaultToastOptions` 仅 `classNames.toast`，**无 `duration` 键、无 per-variant duration**；`:27-47` wrapper 不 forward `duration` —— T3 锚与之一致。
  - `packages/flux-renderers-content/src/mapping.tsx:13-22` `lookupMap` 逐字 `hasOwnProperty(String(value))`、**无 `*` 通配**；imports 仅 `RendererComponentProps`/`cn`/`MappingSchema`（**无 fetch/useSourceValue**）；`:70-73` miss → `defaultLabel ?? placeholder ?? null` —— MP2 锚与之一致。
  - `packages/flux-renderers-content/src/schemas.ts:202-214` `MappingSchema` 字段仅 `value/map/defaultLabel/placeholder/item`（**无 source/loader**）；`:204` `value` JSDoc 已去误导的「/source」（唯一生产改动）。
  - `apps/playground/src/styles.css:8` `@source "../../../packages"`；全仓 `helper.css`=0、packages `*.css`/`*.tsx` 内 `amis-scope`=0（Grep + STY2 guard 双重确认）。
- 诚实性核查: loader-sourced map + 「loader wins」precedence 在 `Deferred But Adjudicated`（:187-192，`out-of-scope improvement` + successor B7 + non-blocking 理由充分）与 `mapping/design.md:54-58` §9.3（DESIGN-ACK-NOT-IMPL + successor B7）**两处一致记录**；loader 是 genuinely-absent feature（live 无 source 字段、无 fetch import），非 live defect 被静默降级。无任何 in-scope live defect / contract drift 被降级为 follow-up。
- Scope 核查: `git diff HEAD` 确认唯一非测试生产改动 = `schemas.ts:204` 1 行 JSDoc；`button.tsx`/`sonner.tsx`/`mapping.tsx` **byte-identical**（无行为变更）；**未**实现 mapping loader、**未**改 button 行为、**未**新增 schema surface。交付精确匹配 B1/B3/T2/T3/MP2/STY2。owner docs（`mapping/design.md` §9、`styling-system.md:182`）陈述当前现实，无「Proposed vs Current」叙事。
- Minor（非阻断观察）: (1) T3 源 guard 用 `readFileSync('src/components/ui/sonner.tsx')` 相对路径，依赖 vitest cwd=包根——与仓内其它源 guard 风格一致，cwd 改变才会脆弱，可接受。(2) 经 pnpm filter 的 `--run <name>` 未真正限制范围（跑了全包），但已用 vitest verbose `-t` 逐条核实 B6.2 测试名，且全包计数 408/139/171 与执行者声称完全吻合。

Follow-up:

- mapping loader-sourced map + 「loader wins」precedence → successor B7（out-of-scope improvement，见 Deferred But Adjudicated）。
- B7 P2/P3 backlog 评估（含 doc-14 余项）→ 本工作项 closure 后启动。
