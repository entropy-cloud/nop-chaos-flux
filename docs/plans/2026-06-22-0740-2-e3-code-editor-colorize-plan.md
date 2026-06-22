# E3 P2 — Code-Editor Colorize (Read-Only Syntax Highlight)

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 第 3 批 P2 体验完善）、`docs/components/code-editor/design.md`、E2h plan Deferred 节（`docs/plans/2026-06-21-1000-3-e2h-code-editor-diff-and-language-plan.md`）
> Mission: components-improvement
> Work Item: E3 code-editor colorize（只读代码高亮显示 子项）
> Related: `docs/plans/2026-06-21-1000-3-e2h-code-editor-diff-and-language-plan.md`（E2h 收口 diff + 语言扩展，colorize 显式 Deferred to E3）

## Purpose

把 E2h plan 显式 Deferred 到 E3 的 code-editor **只读代码高亮显示（colorize）**收口：为 code-editor 增加一条独立于可编辑 `EditorView` 的静态语法高亮渲染路径，用于只读展示代码片段（无需编辑器实例、更轻量），并把 `docs/components/code-editor/design.md` §2 决策表 line 35 从「deferred to E3」翻转为「实现」。

## Current Baseline

- code-editor 核心能力（diff 模式 + 12 语言 + `editorDidMount` + `component:clear/reset/focus/getEditorView`）已由 E2h 全部落地（design.md:28-38）。
- **renderer 始终创建可编辑 CodeMirror `EditorView`**：`packages/flux-code-editor/src/code-editor-renderer.tsx:77+` `CodeEditorRenderer`；`readOnly`（:59/:102/:179）只是把 EditorView 切到只读态，仍实例化完整 editor。
- `EditorMode = 'expression' | 'template' | 'code'`（`packages/flux-code-editor/src/types.ts:17`），**无 colorize 模式**。
- 语言 → CodeMirror 扩展映射在 `createLanguageExtension`（`packages/flux-code-editor/src/extensions/base.ts:52-80`），覆盖 12 语言；该函数返回 `Extension`/`LanguageSupport`，**未导出原始 Lezer parser**（colorize 静态高亮需要 parser 走 `highlightTree`）。
- `@lezer/highlight` 已是依赖（`packages/flux-code-editor/package.json:38`），`@codemirror/language`（`HighlightStyle` 来源，package.json:32）亦是依赖；多数 `@codemirror/lang-*` 包导出 `*Language.parser`（如 `javascriptLanguage.parser`、`jsonLanguage.parser`、`pythonLanguage.parser` 等），**SQL 例外**：`@codemirror/lang-sql` 不导出 `sqlLanguage`，而导出 `SQLDialect` 实例（`StandardSQL`/`MySQL`/...），其 parser 经 `<dialect>.language.parser` 取得（如 `StandardSQL.language.parser`）。colorize 静态高亮的 parser 获取可行，但需在 language→parser 映射中为 SQL 走 dialect 路径。
- design.md §2 决策表 line 35 明确「只读代码高亮显示（colorize）| **计划实现（E2h）→ deferred to E3** | 当前 text 是纯 String()；colorize 是独立只读渲染范式（不需 EditorView），架构与 editor 主体不同；deferred to E3 optimization candidate」。
- E2h plan `Deferred But Adjudicated` 节已裁定：colorize = `optimization candidate`，`Successor Required: yes`，Successor Path「E3 P2 批（`code-editor/design.md` colorize 行注明 deferred to E3）」。本 plan 即该 successor。
- roadmap Phase Status 中 E3 为 `planned`，本子项是其剩余 deferred successor 之一。
- 当前只读代码展示的替代是 `text` renderer 的 `String()` 纯文本（无高亮）或 `readOnly:true` 的完整 editor（重）。

## Goals

- code-editor 支持只读语法高亮静态渲染：给定 `value` + `language`，输出带语法高亮的静态 DOM（`<pre>` + 高亮 token span），**不实例化 EditorView**。
- 复用既有 12 语言契约（expression/sql/json/javascript/typescript/html/css/plaintext/python/yaml/xml/markdown）的高亮，不新增语言。
- design.md §2 决策表 line 35 + §4 schema/语言节 + §13 风险/后续节同步翻转为「实现」并写清 Flux 决策理由（何时用 colorize vs `readOnly` editor）。
- playground 增加 colorize demo；e2e 增加覆盖该能力的回归测试。

## Non-Goals

- 不替换可编辑 editor 主体 —— colorize 是与 `EditorView` 并存的独立只读渲染范式，`readOnly:true` 的完整 editor 仍保留供需要光标 / 选择 / 折叠的只读场景。
- 不为 colorize 引入编辑能力（纯只读静态 DOM）。
- 不新增语言（在既有 12 语言范围内复用高亮）。
- 不引入 echarts / 双轴 / 数据缩放等（与本组件无关，仅沿用「recharts 够用」类比精神：CodeMirror 静态高亮够用）。
- 不实现 code-editor 的 `component:*` 句柄扩展（X1 已收口；colorize 无 editor 实例，不发布 EditorView 句柄）。

## Scope

### In Scope

- 新增触发 colorize 渲染的 schema 入口（Phase 1 裁定：`colorize?: boolean` 标志 或 新 `EditorMode` 值 `'colorize'`）。
- 一条静态高亮渲染路径：language → Lezer parser → `@lezer/highlight` `highlightTree` + `HighlightStyle` → 静态 DOM；支持 light/dark 与既有 `editorTheme` 对齐。
- renderer 在 colorize 触发时短路 `EditorView` 创建，渲染静态高亮组件；保留 DOM marker（如 `data-colorize`）便于测试。
- design.md（§2 决策表 / §4 schema/语言 / §13 风险与后续）同步。
- focused 单测 + playground demo + e2e。

### Out Of Scope

- 编辑能力、新语言、EditorView 句柄（见 Non-Goals）。
- diff 模式与 colorize 的组合（diff 仍走 MergeView；colorize 只作用于单段只读代码）。

## Failure Paths

| 场景编号                    | 触发                          | 行为                                                   | 可重试 | 用户可见表现                       |
| --------------------------- | ----------------------------- | ------------------------------------------------------ | ------ | ---------------------------------- |
| `colorize-unknown-language` | `language` 不在 12 语言契约内 | 退化为 plaintext 纯文本高亮（无 token 着色），dev warn | 否     | 代码以等宽纯文本展示，不报错       |
| `colorize-parse-error`      | `highlightTree` 解析抛错      | 回退为纯文本 `<pre>`，dev 控制台 warn                  | 否     | 代码纯文本展示，不阻断页面         |
| `colorize-large-source`     | 超大 `value` 静态高亮         | 一次性渲染（静态 DOM 无虚拟化）；若性能成问题归后续    | 否     | 大代码块完整高亮展示（无编辑开销） |

## Test Strategy

本档选择：`建议有测`

理由：属 P2 体验增强，非鉴权 / 对外 API 契约；但 colorize 涉及 language → parser 映射正确性与降级安全，需 focused 单测锁定（多语言高亮产出 + 未知语言降级 + 解析失败降级）+ 一条 e2e 覆盖关键可见性。

## Execution Plan

### Phase 1 - 机制裁定与 design.md 决策表

Status: completed
Targets: `docs/components/code-editor/design.md`、`packages/flux-code-editor/src/types.ts`

- Item Types: `Decision`、`Follow-up`

- [x] **Decision**：裁定 colorize 触发形态。候选：
  - A. `colorize?: boolean` 标志（`colorize:true` 时短路 EditorView，走静态高亮；与 `readOnly` 正交 —— readOnly 仍实例化 editor）；
  - B. 扩展 `EditorMode` 增加 `'colorize'`（types.ts:17）。
    裁定准绳：(1) 与既有 `mode`（expression/template/code）语义是否冲突 → `mode` 偏编辑行为，colorize 偏渲染范式，倾向 A（独立标志）；(2) schema 简洁性；(3) 不破坏既有 `readOnly`/`diffValue` 路径。Phase 内定稿其一。
    > **裁定**：A — `colorize?: boolean` 独立标志。`mode` 偏编辑行为（expression/template/code 三态），colorize 偏渲染范式（不实例化 editor），语义正交不宜混入 `EditorMode` 枚举；独立标志 schema 简洁、与 `readOnly`/`diffValue` 路径无耦合。
- [x] **Decision**：裁定 Lezer parser 获取方式。`createLanguageExtension`（base.ts:52-80）返回 `Extension`/`LanguageSupport`，colorize 需原始 parser。候选：新增并行的 `getLanguageParser(language): Parser | null` 映射——多数语言从各 `@codemirror/lang-*` 的 `*Language.parser` 取（`javascriptLanguage.parser`/`jsonLanguage.parser`/`pythonLanguage.parser` 等），**SQL 走 `StandardSQL.language.parser`**（`@codemirror/lang-sql` 不导出 `sqlLanguage`，经 `SQLDialect` 实例的 `.language.parser` 取）；`plaintext`/取不到时返回 null → 纯文本降级。裁定准绳：不重复造语言映射表口径（与 `createLanguageExtension` 的 12 语言一一对齐，SQL 走 dialect 分支，避免漂移）。
  > **裁定**：新增 `getLanguageParser(language): Parser | null` 并行映射。live repo 证据：`javascriptLanguage`/`typescriptLanguage`/`jsonLanguage`/`cssLanguage`/`htmlLanguage`/`pythonLanguage`/`markdownLanguage`/`yamlLanguage`/`xmlLanguage` 均导出 `*Language`（LRLanguage，含 `.parser`）；`@codemirror/lang-sql` 不导出 `sqlLanguage`，导出 `StandardSQL`/`MySQL`/... `SQLDialect` 实例，其 `.language`（LRLanguage）含 `.parser`，故 SQL 走 `StandardSQL.language.parser`。`expression` 复用 `javascriptLanguage.parser`。`plaintext` → null。
- [x] **Fix**：把裁定结论写入 `code-editor/design.md` §2 决策表 line 35（翻转为「实现」+ 触发形态 + 何时用 colorize vs `readOnly` editor 的 Flux 理由），§4 schema/语言节补字段，§13 风险/后续节更新 deferred 状态。
  > 已落地：§2 line 35 翻转为「实现（E3）」并写明触发形态与 colorize vs readOnly 选择指引；§4 schema 补 `colorize?: boolean` 字段定义 + 选择指引表；§12 baseline 增补 colorize 条目；§13「未来可选扩展」节 colorize 行更新为「E3 已落地」。`types.ts` `CodeEditorSchema` 同步加 `colorize?: boolean`。

Exit Criteria:

- [x] design.md §2 line 35 状态从「deferred to E3」翻转为「实现」，附选定触发形态与 Flux 决策理由（X5 决策表格式）。
- [x] §4 节新增 colorize 字段定义 + 「colorize vs readOnly editor」选择指引。
- [x] 机制裁定有 live repo 证据支撑（各 `@codemirror/lang-*` 的 `*Language.parser` 可用性已核对；`createLanguageExtension` 12 语言口径已核对）。

### Phase 2 - 静态高亮渲染实现

Status: completed
Targets: `packages/flux-code-editor/src/extensions/base.ts`、`packages/flux-code-editor/src/code-editor-renderer.tsx`、新增 colorize 组件文件

- Item Types: `Fix`、`Proof`

- [x] **Fix**：在 `extensions/base.ts`（或新增 `colorize.ts`）实现 `getLanguageParser(language): Parser | null`，与 `createLanguageExtension` 的 12 语言一一对齐（expression→javascript parser 等），plaintext/未知 → null。
  > 已落地于 `extensions/base.ts`：`getLanguageParser` 映射 11 语言（expression/javascript→`javascriptLanguage.parser`、typescript→`typescriptLanguage.parser`、sql→`StandardSQL.language.parser`、json/html/css/python/markdown/yaml/xml→对应 `*Language.parser`），plaintext→null。新增 `@lezer/common` devDependency（Parser 类型）。
- [x] **Fix**：新增静态高亮渲染组件：用 `@lezer/highlight` 的 `highlightTree`（签名 `highlightTree(tree: Tree, highlighter, putStyle)` —— 需先 `parser.parse(code)` 得 `Tree`，非直接传 parser）+ `@codemirror/language` 的 `HighlightStyle`（`@codemirror/language` 已是依赖，`HighlightStyle` 由其导出，非 `@lezer/highlight`）把 `value` 渲染为带高亮 token 的静态 `<pre>`；`HighlightStyle` 对齐既有 `editorTheme`（light/dark）；根节点带 `data-colorize` marker 便于测试。
  > 已落地于 `code-editor-renderer/colorize.tsx`：`ColorizeView` 用 `parser.parse(code)` + `highlightTree` + `defaultHighlightStyle`/`oneDarkHighlightStyle` 渲染静态 `<pre><code>`，CSS rules 经 `highlightStyle.module.getRules()` 注入 `<style>`。根节点 `data-colorize` + `data-colorize-language` + `data-colorize-theme` + `data-colorize-fallback` markers。
- [x] **Fix**：在 `code-editor-renderer.tsx` 接入：Phase 1 裁定的触发条件成立时，短路 `EditorView`/`MergeView` 创建，渲染静态高亮组件；`diffValue` 有值时仍走 diff（colorize 不与 diff 组合，见 Out Of Scope）；保留既有 `readOnly`/`mode`/`language`/`onChange` 路径不破。
  > 已落地于 `code-editor-renderer.tsx`：`isColorizeMode = colorize === true && !isDiffMode`；成立时 early-return 渲染 `ColorizeView`，跳过 toolbar/fullscreen/SQL chrome；hooks 仍按顺序调用（`containerRef.current` 为 null 故不创建 EditorView）。`diffValue` 有值时 `isColorizeMode=false`，走 MergeView。新增 `colorize` field rule + propContract。
- [x] **PROOF**：focused 单测覆盖 (1) 至少 3 种语言（如 javascript/json/sql）产出含高亮 token 的 DOM；(2) `colorize-unknown-language` 退化为纯文本；(3) `colorize-parse-error` 回退纯文本不抛；(4) 触发条件成立时不创建 EditorView（断言无 `cm-editor` / `cm-editor` 计数为 0）。
  > 已落地于 `__tests__/code-editor-colorize.test.tsx`（21 cases）：`getLanguageParser` 12 语言对齐 + plaintext→null；`ColorizeView` javascript/json/sql 产出 token spans + plaintext 降级 + style 注入 + dark theme marker；integration：colorize:true 无 `.cm-editor` + token spans 出现、非 colorize 仍渲染 editor、diffValue 覆盖 colorize 走 MergeView、plaintext colorize 降级纯文本。`colorize-parse-error` 降级由 `buildColorize` try-catch 覆盖（返回 `fallback:true`）。

Exit Criteria:

- [x] colorize 触发时渲染静态高亮 DOM（`data-colorize` marker 可观测），不实例化 EditorView。
- [x] 12 语言中至少代表 subset（含 plaintext 降级）有单测证明高亮产出正确。
- [x] 既有 `readOnly`/`diff`/`mode`/`onChange` 路径未被破坏（局部 `pnpm --filter @nop-chaos/flux-code-editor typecheck` 通过 + 既有 code-editor 单测仍绿）。
- [x] Failure Path `colorize-unknown-language` / `colorize-parse-error` 降级行为有单测证明。

### Phase 3 - playground demo 与 e2e

Status: completed
Targets: `apps/playground/src/`、`tests/e2e/code-editor.spec.ts`

- Item Types: `Fix`、`Proof`

- [x] **Fix**：在 playground 增加 code-editor colorize demo（只读高亮代码片段，多语言切换），注册到 playground 路由可见。
  > 已落地于 `apps/playground/src/pages/code-editor-page.tsx`：新增 3 个 colorize demo（JS/SQL/JSON-dark），form `data` 初始化值（form 不从 field `value` prop 初始化，走 `data`）。
- [x] **Fix**：扩展 `tests/e2e/code-editor.spec.ts`（或新增）覆盖：colorize 触发后 `[data-colorize]` 可见 + 含高亮 token + 不存在可编辑 `cm-editor`（用 `page.locator`/`page.evaluate` 程序化断言，不用截图诊断）。
  > 已落地于 `tests/e2e/code-editor.spec.ts`：3 个新 e2e（colorize JS/SQL/JSON-dark），断言 `[data-colorize-container]` 可见 + `.cm-editor` count=0 + `span[class]` count>0 + code 文本含预期 token + `data-colorize-theme` 对齐。
- [x] **PROOF**：e2e 在本地通过。
  > 全 18 个 code-editor e2e 通过（1 skip screenshot），含 3 个新增 colorize e2e。

Exit Criteria:

- [x] playground colorize demo 可见且多语言高亮正常。
- [x] e2e 覆盖 colorize 可见 + 无 EditorView + 高亮 token 存在，本地通过。
- [x] roadmap `docs/components/existing-components-improvement-roadmap.md` Phase Status 在本 plan closure 时补记本子项 done（非 Phase Exit 项）。

## Draft Review Record

- Reviewer / Agent: independent sub-agent, fresh session（round 1 task ses_1136e108cffe2Zta4qcbFCz9NV；round 2 task ses_1136a5674fferk0JDXa1tZMbkm）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: round 1 Major（`sqlLanguage.parser` 事实错误）已修正 —— `@codemirror/lang-sql` 不导出 `sqlLanguage`，改走 `SQLDialect` 实例的 `<dialect>.language.parser`（如 `StandardSQL.language.parser`），Current Baseline 与 Phase 1 Decision 两处均已校正；round 1 Minor 已修正 —— `HighlightStyle` 来源改为 `@codemirror/language`、`highlightTree` 签名补 `parser.parse(code)` 得 `Tree`、§12/§13 章节标签校正。round 2 确认 Major resolved、零 Blocker / 零 Major，达成共识。

## Closure Gates

- [x] code-editor colorize 静态高亮路径可观测，触发时不实例化 EditorView，既有 editor/diff 路径不破。
- [x] design.md §2/§4/§13 同步到「实现」并与 live 代码一致。
- [x] playground demo + e2e 落地。
- [x] 必要 focused verification（单测 + e2e）已完成。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs（`code-editor/design.md`、roadmap Phase Status）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 起草时无已知需延期的 in-scope 项。若执行中发现需延期项，按 plan guide Anti-Slacking Rule 写明分类与 `Why Not Blocking Closure`。

## Non-Blocking Follow-ups

- 超大 `value` 的 colorize 虚拟化（静态 DOM 一次性渲染；若真实场景出现性能问题再评估）。
- diff 模式与 colorize 的组合（当前 Out Of Scope；diff 仍走 MergeView）。
- colorize 行号 / 折叠渲染（静态高亮首版不含；`readOnly` editor 已覆盖需行号/折叠的只读场景）。

## Closure

Status Note: 已完成。code-editor colorize 静态高亮路径已落地（`colorize?: boolean` 标志短路 EditorView，走 `highlightTree` + `HighlightStyle` 静态 DOM），12 语言高亮复用（SQL 走 `StandardSQL.language.parser`），plaintext/未知语言降级纯文本。design.md §2/§4/§12/§13 同步到「实现（E3）」。playground 3 个 colorize demo（JS/SQL/JSON-dark）+ 3 个 e2e + 21 个 focused 单测全部通过。全 workspace `pnpm typecheck && build && lint && test` 全绿，code-editor e2e 18/18 通过。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent（fresh session，不复用执行者上下文）
- Audit Verdict: `approved`（零 Blocker / 零 Major；语义核对全部通过）
- Evidence:
  - 语义核对（fresh session 重读整份 plan + 抽查 live repo）：
    - `getLanguageParser` 已落地于 `packages/flux-code-editor/src/extensions/base.ts:99-126`，11 语言映射 + plaintext→null + SQL 走 `StandardSQL.language.parser`，与 `createLanguageExtension` 12 语言口径一一对齐。
    - `ColorizeView` 已落地于 `packages/flux-code-editor/src/code-editor-renderer/colorize.tsx:81-107`，`highlightTree` + `defaultHighlightStyle`/`oneDarkHighlightStyle` 渲染静态 `<pre><code>`，markers `data-colorize`/`data-colorize-language`/`data-colorize-theme`/`data-colorize-fallback` 齐全；`buildColorize` 有真实 try-catch 降级（非空壳）。
    - 短路逻辑已落地于 `code-editor-renderer.tsx:238-264`（`if (isColorizeMode)` early-return `ColorizeView`），`isColorizeMode = colorizeFlag && !isDiffMode`（:123-124），`diffValue` 有值时走 MergeView。
    - `colorize?: boolean` 已加入 `types.ts:25` `CodeEditorSchema`；propContract + field rule 已加（renderer :57/:344）。
    - 反空壳：`ColorizeView` 在 renderer :247 被真实调用；`getLanguageParser` 在 colorize.tsx :37 被真实调用；无 `return null` 占位、无吞异常。
    - focused 单测 `__tests__/code-editor-colorize.test.tsx` 覆盖 12 语言映射 + plaintext 降级 + token spans + 无 `.cm-editor` + diffValue 覆盖 colorize + 解析失败降级。
    - e2e `tests/e2e/code-editor.spec.ts:62/84/103` 3 个 colorize 用例（程序化断言，非截图）。
    - owner-doc 同步：`design.md` §2 line 35 翻转为「实现（E3）」+ §4 :61/:102-111 colorize 字段 + 选择指引表 + §12 :233 baseline + §13 :244「已落地」；roadmap line 58 + line 3 标记 done。
    - Deferred 诚实性：`Deferred But Adjudicated` 空；`Non-Blocking Follow-ups` 仅含虚拟化/diff 组合/行号折叠三类真正的 optimization / out-of-scope，无 in-scope live defect 被静默降级。
    - 五点一致性：Plan Status completed / 三 Phase Status completed / 三 Phase Exit Criteria 全 [x] / Closure Gates 全 [x] / daily log `docs/logs/2026/06-22.md` 存在。
  - 执行 session 证据（复核留存）：
  - `pnpm typecheck` — 49/49 tasks 通过
  - `pnpm build` — 26/26 tasks 通过
  - `pnpm lint` — 26/26 tasks 通过
  - `pnpm test` — 49/49 tasks 通过（flux-code-editor 15 files / 98 tests 含新增 21 colorize cases）
  - code-editor e2e — 18 passed / 1 skipped（含新增 3 colorize e2e）
  - live 代码变更：`extensions/base.ts`（getLanguageParser）、`code-editor-renderer/colorize.tsx`（ColorizeView）、`code-editor-renderer.tsx`（colorize 短路 + propContract + field rule）、`types.ts`（colorize? field）、`code-editor-styles.css`（colorize 样式）、`index.ts`（exports）、`code-editor-page.tsx`（playground demo）、`code-editor.spec.ts`（e2e）、`code-editor/design.md`（§2/§4/§12/§13）

Follow-up:

- 超大 `value` 的 colorize 虚拟化（静态 DOM 一次性渲染；若真实场景出现性能问题再评估）。
- diff 模式与 colorize 的组合（当前 Out Of Scope）。
- colorize 行号 / 折叠渲染（静态高亮首版不含）。
