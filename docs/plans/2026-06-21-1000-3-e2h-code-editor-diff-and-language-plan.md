# E2h Code-Editor Diff + 语言扩展

> Plan Status: completed
> Package: components-improvement
> Work Item: E2h code-editor diff + 语言
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2h 行）、`docs/components/code-editor/design.md` §2 Flux 决策表（L33-37 标 `计划实现（E2h）`）、live-repo audit（`CodeEditorRenderer` + `CodeEditorSchema` + `useCodeMirror` hook + CodeMirror 6 extensions）
> Related: X5 code-editor Flux 决策表（done）、X1 doAction 命令族（todo — doAction clear/reset/focus 部分对齐 X1 句柄规范）

## Purpose

把 roadmap 工作项 **E2h code-editor diff + 语言** 从 `todo` 推进到 `done`：为 `code-editor` 补齐 **diff 编辑器模式**（`diffValue` 并排对比）、**语言预设扩展**（python/yaml/xml/markdown 等高频语言）、**`editorDidMount` 句柄**（命令式集成入口）、**`doAction` clear/reset/focus**（组件句柄命令）。当前 `CodeEditorRenderer`（`packages/flux-code-editor/src/code-editor-renderer.tsx:73-239`）仅支持 8 语言（expression/sql/json/javascript/typescript/html/css/plaintext），无 diff 模式、无额外语言、无 editorDidMount、无 doAction 句柄。design.md §2 已为全部 4 组能力裁定 Flux 决策。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`CodeEditorSchema`（`packages/flux-code-editor/src/types.ts:15-34`）含 `language`/`mode`/`value`/`placeholder`/`width`/`height`/`lineNumbers`/`folding`/`autoHeight`/`allowFullscreen`/`expressionConfig`/`sqlConfig`/`editorTheme`/`options`/`onChange`/`onFocus`/`onBlur`。无 `diffValue`/`editorDidMount`。
- **EditorLanguage union**（`types.ts:3-11`）：`'expression' | 'sql' | 'json' | 'javascript' | 'typescript' | 'html' | 'css' | 'plaintext'`——exhaustive switch 在 `extensions/base.ts:48-68` `createLanguageExtension()`。
- **Editor library**：CodeMirror 6（deps: `@codemirror/state`/`view`/`language`/`lang-{css,html,javascript,json,sql}`/`autocomplete`/`commands`/`lint`/`theme-one-dark` + `sql-formatter` + `@lezer/highlight`）。
- **useCodeMirror hook**（`packages/flux-code-editor/src/use-code-mirror.ts`）：wiring CodeMirror 6 EditorView + extensions + onChange/onFocus/onBlur。接收 `{initialValue, placeholder, readOnly, extensions, contentAttributes, onChange, onFocus, onBlur}`，返回 `{ref, editorView}`。
- **Renderer**：`CodeEditorRenderer`（`code-editor-renderer.tsx:73-239`）——language/mode dispatch（L119-146 via `createBaseExtensions`）、height/width（L148-158）、fullscreen（L110-111）、`useCodeMirror(...)` call（L169-178）、SQL assembly delegation（L180-194）、root DOM `<div className="nop-code-editor">`（L197-237）。无 diff 逻辑、无 editorDidMount 回调、无 component handle。
- **Definition**：`codeEditorRendererDefinition`（`code-editor-renderer.tsx:241-362`）`propContracts`（L245-331）覆盖现有字段；`eventContracts`（L332-346）含 onChange/onFocus/onBlur；`fields: codeEditorFieldRules`（L347）；`validation` kind `'field'`（L348-361）。无 `diffValue` propContract、无 `editorDidMount` eventContract、无 `componentCapabilityContracts`（无 doAction 句柄）。
- **Field rules**：`codeEditorFieldRules`（`code-editor-renderer.tsx:49-71`）inline 声明 label/value/language/mode/placeholder/readOnly/required/expressionConfig/sqlConfig/editorTheme/lineNumbers/folding/autoHeight/allowFullscreen/options/height/width/onChange/onFocus/onBlur。
- **测试**：`code-editor.integration.test.tsx`（478 行，12+ 场景）、`use-code-mirror.test.tsx`、`code-editor-styles.test.ts`、SQL/expression completion tests、`sql-result-panel.test.tsx`。无 diff/editorDidMount/doAction 覆盖。
- **amis baseline**：`docs/components/amis-baseline-matrix.md:148` code-editor 行 status `runtime`；`diff` allocated to code-editor（L265）但未实现。
- **design.md**：§2 决策表 L33-37 标 `计划实现（E2h）`：diff 编辑器模式、只读代码高亮（colorize）、语言预设扩展、editorDidMount、doAction clear/reset/focus。L38-41 标 `暂不实现`：per-language renderer type、minimap、amis size 预设。

## Goals

- `CodeEditorSchema` 新增 `diffValue?: string`、`onEditorMount?: ActionSchema | ActionSchema[]`（editorDidMount 事件）；`EditorLanguage` union 扩展含 `'python' | 'yaml' | 'xml' | 'markdown'`。
- **diff 模式**：`diffValue` 有值时，渲染 CodeMirror 6 `MergeView`（并排 diff），左侧为 `diffValue`（原文），右侧为 `value`（当前编辑值），两侧均可编辑配置（默认右侧可编辑）。
- **语言扩展**：`createLanguageExtension()`（`extensions/base.ts:48-68`）switch 新增 `'python'`/`'yaml'`/`'xml'`/`'markdown'` case，引入对应 `@codemirror/lang-*` package（python/markdown 确定可用；yaml/xml 需在实现时验证 npm 包可用性，不可用则降级为 plaintext + 记录）。
- **editorDidMount**：editor mount 后触发 `onEditorMount` 事件（payload: `{ editorId }`）；同时通过 component registry 注册 `component:getEditorView` 句柄，返回原始 `EditorView` 实例（命令式集成入口）。
- **doAction 句柄**：code-editor renderer definition 新增 `componentCapabilityContracts`——`clear`（清空内容）、`reset`（重置到 initialValue）、`focus`（聚焦 editor）。
- design.md §2 决策表 4 行 E2h 标记翻转为 `实现`。
- focused 单测覆盖 diff 渲染、新语言 extension 接线、editorDidMount 事件、doAction 句柄行为。

## Non-Goals

- 不实现 **colorize（只读代码高亮显示）**——design.md L34 标 E2h 但 colorize 是独立的只读渲染范式（无需 EditorView，仅需 syntax highlight），架构上与 editor 主体不同。裁定为 `optimization candidate` deferred 到 E3。
- 不实现 per-language renderer type（`{lang}-editor`）——design.md §2 标 `暂不实现`，强制单 type + `language` prop。
- 不实现 minimap——design.md §2 标 `暂不实现`，字段级编辑器低频。
- 不实现 amis `size` 预设——design.md §2 标 `暂不实现`，已有 width/height 精确控制。
- 不实现 amis `mobileUI`——design.md §2 标 `不采纳`，走 mobile-roadmap。
- 不重构 SQL/Expression 专用 assembly——仅扩展通用 language extension + diff。
- 不实现 X1 doAction 命令族统一框架——本 plan 仅实现 code-editor 特定的 clear/reset/focus 句柄，X1 统一时回头对齐命名。

## Scope

### In Scope

- `CodeEditorSchema` 新增 `diffValue` + `onEditorMount`
- `EditorLanguage` union 扩展 4 语言
- diff MergeView 渲染
- editorDidMount 事件 + `component:getEditorView` 句柄
- `component:clear`/`reset`/`focus` 句柄
- design.md §2/§4/§5/§8/§12 同步
- focused 单测

### Out Of Scope

- colorize 只读高亮（deferred E3）
- per-language renderer type（`暂不实现`）
- minimap / amis size（`暂不实现`）
- mobileUI（`不采纳`）
- X1 doAction 统一框架（X1 独立工作项）
- SQL/Expression assembly 重构

## Failure Paths

| 场景                     | 触发                                         | 行为                                                      | 可重试 | 用户可见表现                    |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------- | ------ | ------------------------------- |
| diffValue-empty          | `diffValue: ''` + `value: 'code'`            | MergeView 正常渲染，左侧空，右侧有内容                    | 否     | 并排 diff，左空右有             |
| language-package-missing | `language: 'yaml'` 但 yaml CM package 不可用 | 降级为 plaintext extension + console.warn                 | 否     | 无语法高亮的纯文本编辑          |
| doAction-clear           | `component:clear` 调用                       | editor 内容清空为 `''`，触发 onChange                     | 否     | 编辑器内容清空                  |
| doAction-reset           | `component:reset` 调用                       | editor 内容恢复为 initialValue                            | 否     | 编辑器恢复初始值                |
| editorDidMount           | editor mount 完成                            | `onEditorMount` 事件触发 + `component:getEditorView` 可用 | 否     | 事件触发，句柄可获取 EditorView |
| diffValue-undefined      | 无 `diffValue`                               | 正常渲染单 editor（非 MergeView）                         | 否     | 标准 code-editor                |

## Test Strategy

档位选择：`建议有测`

本档选择：`建议有测`。code-editor 是 P1 专用组件，E2h 为能力扩展（非契约漂移修复）。diff 模式、语言扩展、句柄能力均可通过 focused 单测验证（DOM 结构、extension 接线、句柄调用效果）。

## Execution Plan

### Phase 1 - Schema + Definition 契约

Status: completed
Targets: `packages/flux-code-editor/src/types.ts`、`packages/flux-code-editor/src/code-editor-renderer.tsx`（definition + fieldRules）

- Item Types: `Fix | Decision`

- [x] `EditorLanguage` union（`types.ts:3-11`）扩展：新增 `'python' | 'yaml' | 'xml' | 'markdown'`
- [x] `CodeEditorSchema`（`types.ts:15-34`）新增：`diffValue?: string`、`onEditorMount?: ActionSchema | ActionSchema[]`
- [x] **Decision**：`editorDidMount` 实现为 `onEditorMount` 事件（fire-and-forget，payload `{ editorId: string }`）+ `component:getEditorView` 句柄（同步返回 `EditorView`）。理由：EditorView 不可序列化（不能走事件 payload），事件仅通知 mount 完成，句柄提供命令式访问。
- [x] **Decision**：doAction 句柄用 `component:clear`/`reset`/`focus` 三个 capability contracts，对齐 form 的 `component:submit` 句柄命名风格。X1 统一时回头对齐。
- [x] `codeEditorRendererDefinition`（`code-editor-renderer.tsx:241-362`）`propContracts` 补 `diffValue`（shape `'string'`）；`eventContracts` 补 `onEditorMount`；新增 `componentCapabilityContracts`（clear/reset/focus/getEditorView）
- [x] `codeEditorFieldRules`（L49-71）补 `diffValue`/`onEditorMount`

Exit Criteria:

- [x] `pnpm typecheck` 通过
- [x] `pnpm --filter @nop-chaos/flux-code-editor test` 现有用例不回归
- [x] No owner-doc update required（design.md 更新在 Phase 5）

### Phase 2 - Diff 模式实现 + 测试

Status: completed
Targets: `packages/flux-code-editor/src/use-code-mirror.ts`（或新建 `use-merge-view.ts`）、`packages/flux-code-editor/src/code-editor-renderer.tsx`、`packages/flux-code-editor/src/__tests__/code-editor-diff.test.tsx`（新建）

- Item Types: `Fix | Proof`

- [x] **Fix**：新增 `@codemirror/merge` 依赖（`packages/flux-code-editor/package.json` devDeps/deps）
- [x] **Fix**：新建 `useMergeView({ original, modified, extensions, readOnly, onChange })` hook 或在 `useCodeMirror` 中增加 diff 分支——`diffValue` 有值时创建 `MergeView`（并排两窗格），否则创建标准 `EditorView`
- [x] **Fix**：`CodeEditorRenderer` 消费 `props.props.diffValue`——有值时切换到 MergeView 渲染路径
- [x] **Proof**：`diffValue: 'original'` + `value: 'modified'` → DOM 含两个 CodeMirror 编辑窗格（`.cm-mergeView` 或等效）
- [x] **Proof**：无 `diffValue` → DOM 仅含一个编辑窗格（标准 editor）
- [x] **Proof**：`diffValue: ''`（空字符串）→ MergeView 正常渲染，左窗格空
- [x] **Proof**：MergeView 右侧编辑触发 onChange

Exit Criteria:

- [x] diff 测试全过
- [x] `pnpm typecheck` + `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/flux-code-editor test` 全过
- [x] No owner-doc update required

### Phase 3 - 语言扩展实现 + 测试

Status: completed
Targets: `packages/flux-code-editor/src/extensions/base.ts`、`packages/flux-code-editor/package.json`、`packages/flux-code-editor/src/__tests__/code-editor-languages.test.tsx`（新建或扩展 integration test）

- Item Types: `Fix | Proof | Decision`

- [x] **Fix**：`package.json` 新增 `@codemirror/lang-python`、`@codemirror/lang-markdown`（确认可用的语言包）
- [x] **Decision**：验证 `@codemirror/lang-yaml` 和 `@codemirror/lang-xml` npm 包可用性。可用则引入；不可用则该语言降级为 plaintext + design.md 注明降级原因 + console.warn。 — **裁定**：四个语言包（python/markdown/yaml/xml）均原生可用（npm `@codemirror/lang-python@6.2.1` / `@codemirror/lang-markdown@6.5.0` / `@codemirror/lang-yaml@6.1.3` / `@codemirror/lang-xml@6.1.0`），全部引入，无需降级。
- [x] **Fix**：`createLanguageExtension()`（`extensions/base.ts:48-68`）switch 新增 `'python'`/`'yaml'`/`'xml'`/`'markdown'` case
- [x] **Proof**：`language: 'python'` → editor extensions 含 python language support（验证 extension 接线，非 DOM 可见高亮）
- [x] **Proof**：`language: 'markdown'` → editor extensions 含 markdown language support
- [x] **Proof**：`language: 'yaml'` → 有 extension（可用 package 或 plaintext 降级 + warn）
- [x] **Proof**：现有 8 语言不回归

Exit Criteria:

- [x] 语言扩展测试全过
- [x] `pnpm typecheck` + `pnpm build` 通过
- [x] design.md §4 注明哪些语言包原生可用、哪些降级（若适用）
- [x] No owner-doc update required（design.md 完整更新在 Phase 5）

### Phase 4 - editorDidMount + doAction 实现 + 测试

Status: completed
Targets: `packages/flux-code-editor/src/code-editor-renderer.tsx`、`packages/flux-code-editor/src/__tests__/code-editor-handles.test.tsx`（新建）

- Item Types: `Fix | Proof`

- [x] **Fix**：`CodeEditorRenderer` 在 `useCodeMirror`/`useMergeView` mount 后触发 `props.events.onEditorMount?.({ editorId })` + 注册 component handle（`component:getEditorView`/`clear`/`reset`/`focus`）
- [x] **Fix**：`component:clear` 实现——`editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: '' } })`
- [x] **Fix**：`component:reset` 实现——恢复 initialValue（需在 hook 内保留 initialValue ref）
- [x] **Fix**：`component:focus` 实现——`editorView.focus()`
- [x] **Fix**：`component:getEditorView` 实现——返回当前 `EditorView` 实例
- [x] **Proof**：mount 后 `onEditorMount` 事件触发（spy 验证）
- [x] **Proof**：`component:clear` 调用后 editor 内容为空 + onChange 触发
- [x] **Proof**：`component:reset` 调用后 editor 内容恢复 initialValue
- [x] **Proof**：`component:focus` 调用后 editor 获得 DOM focus

Exit Criteria:

- [x] handle 测试全过
- [x] `pnpm typecheck` + `pnpm build` 通过
- [x] `pnpm --filter @nop-chaos/flux-code-editor test` 全过
- [x] No owner-doc update required

### Phase 5 - Owner-Doc Sync + Roadmap

Status: completed
Targets: `docs/components/code-editor/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-21.md`

- Item Types: `Follow-up`

- [x] `docs/components/code-editor/design.md` §2 决策表 E2h 行翻转：diff 模式 → `实现`、语言预设扩展 → `实现`（注明新增 python/yaml/xml/markdown）、editorDidMount → `实现`（注明 onEditorMount 事件 + getEditorView 句柄设计）、doAction → `实现`
- [x] design.md §2 colorize 行保留 `计划实现（E2h）` 但注明 `deferred to E3`（optimization candidate）
- [x] design.md §4 schema 设计补 `diffValue`/`onEditorMount` 字段 + `EditorLanguage` 扩展
- [x] design.md §8 事件/动作/句柄补 `onEditorMount` + `component:clear`/`reset`/`focus`/`getEditorView` 契约
- [x] design.md §12 当前实现基线更新（8 语言 → 12 语言 + diff + handles）
- [x] `docs/components/existing-components-improvement-roadmap.md` E2h `todo`→`done`
- [x] `docs/components/amis-baseline-matrix.md` code-editor 行 `diff` 状态更新为 `landed`（L265）
- [x] `docs/logs/2026/06-21.md` 新增 E2h 收口条目

Exit Criteria:

- [x] design.md §2 E2h 行（diff/语言/editorDidMount/doAction）标为 `实现`；colorize 行注明 deferred
- [x] roadmap E2h 标为 `done`
- [x] amis-baseline-matrix diff 状态更新
- [x] daily log 含 E2h 条目
- [x] `docs/architecture/` 无需更新（No architecture doc update required — code-editor 能力扩展不涉及架构边界）

## Draft Review Record

- Reviewer / Agent: <<待 REVIEW_PLANS 填写>>
- Verdict: `<<pass | pass-with-minors | revised | degraded>>`
- Rounds: <<≤2>>
- Findings addressed: <<待填>>

## Closure Gates

- [x] `CodeEditorSchema` 新增 `diffValue`/`onEditorMount`；`EditorLanguage` 扩展 4 语言
- [x] diff MergeView 正确渲染（并排双窗格）
- [x] 新语言 extension 正确接线（python/markdown 原生；yaml/xml 可用或降级）
- [x] `onEditorMount` 事件 mount 后触发
- [x] `component:getEditorView`/`clear`/`reset`/`focus` 句柄正确执行
- [x] focused 单测覆盖 diff + 语言 + handles
- [x] design.md §2/§4/§8/§12 同步到 live baseline
- [x] amis-baseline-matrix diff 状态更新
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### colorize（只读代码高亮显示）

- Classification: `optimization candidate`
- Why Not Blocking Closure: design.md §2 L34 标 `计划实现（E2h）`，但 colorize 是独立的只读渲染范式——不需要 EditorView 实例，仅需 CodeMirror `HighlightStyle` + `@lezer/highlight` 将代码字符串渲染为带语法高亮的静态 DOM。架构上与 editor 主体（可编辑 EditorView）不同，实现路径独立。roadmap 标题"diff + 语言"不包含 colorize。当前 `text` renderer 的 `String()` 纯文本可满足基本只读展示。
- Successor Required: yes
- Successor Path: E3 P2 批（`code-editor/design.md` colorize 行注明 deferred to E3）。

### doAction 句柄命名与 X1 对齐

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本 plan 实现 `component:clear`/`reset`/`focus` 采用 form 句柄命名风格（`component:<verb>`）。X1（doAction 命令族统一）落地后可能统一为不同命名规范。当前命名可用，X1 统一时回头对齐（non-breaking rename）。
- Successor Required: yes
- Successor Path: X1 doAction 命令族统一 plan。
- **已由 X1 plan 收口**（`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md` Phase 1 裁定）：保持现状（已是 Flux 标准 vocabulary，`clear`/`reset`/`focus` 与 `docs/references/component-handle-vocabulary.md` 完全一致，无需 non-breaking rename）。

## Non-Blocking Follow-ups

- `@codemirror/lang-yaml`/`@codemirror/lang-xml` 若 npm 不可用，降级为 plaintext + design.md 注明。后续若包可用再接入。
- diff 模式的 `readOnlyOriginal` 配置（左侧原文是否可编辑）归后续增强。
- editorDidMount 的 `editorId` 可配置（当前自动生成）归后续增强。

## Closure

Status Note: E2h 全 5 Phase 执行完成（2026-06-21）。所有技术 closure gates 通过：12 语言（8 既有 + 4 新增原生 npm 包）、diff MergeView（左 readOnly 右 editable）、onEditorMount 事件 + 4 句柄（clear/reset/focus/getEditorView）。`pnpm typecheck` = 49/49、`pnpm build` 通过、`pnpm lint` = 0 errors、`pnpm test` = 14 files / 86 tests 全过（60 既有 + 26 新增）。按 AGENTS.md「Human gates」，独立子 agent closure-audit 留 human gate（执行 agent 不可自审）。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent (fresh session, mission-driver CLOSURE_AUDIT step)
- Evidence: 2026-06-21 live-repo re-verification pass. Phase 1 — `types.ts:3-15` EditorLanguage 含 python/yaml/xml/markdown；`types.ts:24,39` diffValue/onEditorMount 字段存在；`code-editor-renderer.tsx:304-425` propContracts.diffValue + eventContracts.onEditorMount + componentCapabilityContracts（clear/reset/focus/getEditorView）齐全。Phase 2 — `use-merge-view.ts` 完整实现（MergeView 左 readOnly 右 editable + onChange listener），`code-editor-renderer.tsx:187-188` 接线 useMergeView，`__tests__/code-editor-diff.test.tsx`(4) + `__tests__/use-merge-view.test.tsx`(2) 全过。Phase 3 — `extensions/base.ts:68-75` 4 语言 case + `package.json:27-31` 4 包齐全，`__tests__/code-editor-languages.test.tsx`(11) 全过，无降级。Phase 4 — `code-editor-renderer/use-code-editor-handle.ts` 完整实现（注册 ComponentHandle，4 方法 + hasMethod/listMethods），`code-editor-renderer.tsx:208,216` 接线 handle + 触发 onEditorMount，`__tests__/code-editor-handles.test.tsx`(9) 全过。Phase 5 — `design.md` §2/§4/§5/§8/§12 全量同步、roadmap E2h=`done`、amis-baseline-matrix L265 diff landed、`docs/logs/2026/06-21.md` 含 E2h 收口条目。验证命令：`pnpm --filter @nop-chaos/flux-code-editor test` = 14 files / 86 tests 全过；`typecheck` + `lint` 0 errors。Anti-hollow 核对：useMergeView/useCodeEditorHandle/onEditorMount 均 runtime 调用，无空体/return null/swallowed exception。Deferred 诚实性：colorize（→E3 optimization candidate）+ doAction 命名（→X1 watch-only residual）均附 non-blocking 理由，无 in-scope live defect 隐藏。

Follow-up:

- 独立审阅者执行 closure-audit（human gate）。
- X1 doAction 命令族统一时对齐 `component:clear`/`reset`/`focus` 命名（non-breaking rename）。**已由 X1 plan 裁定**：保持现状（已是 Flux 标准 vocabulary，无需 rename）。
- colorize 只读高亮 deferred to E3（optimization candidate）。
- diff 模式 `readOnlyOriginal` 配置 / `editorId` 可配置 / per-language `{lang}-editor` renderer type / minimap / amis size 仍按 design.md §2 `暂不实现`。
