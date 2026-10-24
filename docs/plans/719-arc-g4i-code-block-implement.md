# 719 Arc G4I — markdown code fence 语法高亮落地（`codeHighlight`）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §7 G4I（依赖 G4D done，plan 718）
> Related: 协议权威 `docs/components/markdown/design.md` §2a（plan 718 裁决）
> Branch note: 本分支 `arc-component-gap` 落地——实现与 plan 主体完成于 master worktree 在办会话（草案审查 R1 revised→共识已记录于 Draft Review Record），按 roadmap "每 plan 一 commit" 纪律移植至本分支收口（移植后门禁在本分支独立复验，closure audit 由本分支 fresh 子 agent 执行）。

## Purpose

按 G4D 协议实现 markdown `codeHighlight`：lazy ColorizeView 接入、语言别名映射、ReactMarkdown code 覆写、focused 单测、交付铁律 3/5/6/8（含依赖硬门禁论证）。

## Current Baseline（live 核对 2026-10-24）

- 协议已定稿（`docs/components/markdown/design.md` §2a）：渲染器级开关、默认 false 零变化、lazy 硬条款、别名表归 content 包、未知语言回退、marker `data-code-highlight="true"`、复制不做。
- `ColorizeView`（`flux-code-editor/src/index.ts:65` 导出；`colorize.tsx` props `{ value, language: EditorLanguage, editorTheme: 'light'|'dark', className?, style? }`，同步 useMemo highlightTree 渲染）。`EditorLanguage` 联合含 expression/xlang/sql/json/javascript/typescript 等（types.ts:3）。
- markdown 定义（`content-renderer-definitions.ts:243-252`）与 `MarkdownSchema`（schemas.ts:192-204）。
- `flux-renderers-content` deps 现无 flux-code-editor（package.json:20-28）；renderer 包间依赖有先例（form→basic、form-advanced→content 等），无循环（code-editor 不依赖 content）。
- content 包 vitest 环境 happy-dom（审查 m1 勘误），动态 import/React.lazy 可用；lazy 先例 `createLazyRendererComponent`（flux-code-editor）。

## Goals

- `codeHighlight: true` 时 fence 块渲染带高亮的 pre（`data-code-highlight="true"`），语言标注映射 EditorLanguage（含 js→javascript、md→markdown 等别名），未知语言回退纯文本 pre。
- 默认（未声明）行为零变化、零增量加载（React.lazy 动态 import）。
- focused 单测 + full-green + 依赖门禁 `pnpm check` 通过（workspace-manifest-deps 硬门禁）。

## Non-Goals

- 行号/复制按钮；per-fence 粒度；暗色主题切换（首版 editorTheme 'light' 固定——设计文档未裁暗色，实现按 light 落，如需随主题另立项）。

## Scope

### In Scope

- `packages/flux-renderers-content`：package.json 增 workspace 依赖；新 `markdown-code-highlight.tsx`（别名表 + lazy 高亮组件）；`markdown.tsx` code 覆写；schemas/definitions 增 `codeHighlight`。
- 新测试 `src/__tests__/markdown-code-highlight.test.tsx`。

### Out Of Scope

- code-editor 包改动；diff-view；其他 renderer。

## Failure Paths

（design.md §2a 已定：未知语言回退 / 默认零变化 / diffValue 场景不涉及本能力。）

## Test Strategy

本档选择：**必须自动化**（渲染契约 + 回退行为）。

## Execution Plan

### Phase 1 — 实现 + focused 单测

Status: completed
Targets: `packages/flux-renderers-content`

- Item Types: `Fix | Proof`

- [x] package.json 增 `"@nop-chaos/flux-code-editor": "workspace:*"`（deps；lockfile 同步 `pnpm install`）。
- [x] `markdown-code-highlight.tsx`：`FENCE_LANGUAGE_ALIASES`（js/ts→javascript/typescript、md→markdown、python→python、sh/bash/shell→无映射则回退——以 EditorLanguage 实际联合为准裁表）；`HighlightedFence`（`React.lazy(() => import('@nop-chaos/flux-code-editor').then(m => ({ default: m.ColorizeView })))` + Suspense fallback 纯文本 pre；包 `data-code-highlight="true"` 容器；editorTheme 'light'）。
- [x] `markdown.tsx`：`codeHighlight === true` 时 ReactMarkdown `components` 覆写 **`pre`**（审查 M1：react-markdown v10 的 `code` 组件无 inline prop、bare fence 无 className——`pre` 是 fenced block 的可靠判定载体），pre 的子 code 走 `HighlightedFence`，行内 code 不经 pre 不受影响；未声明走原路径。
- [x] schemas.ts `MarkdownSchema.codeHighlight?: boolean`；definitions 增 `{ key: 'codeHighlight', kind: 'prop', valueType: 'boolean' }`。
- [x] focused 单测（Proof，先写）：**判别性（正向）**——`codeHighlight: true` + js fence → `[data-code-highlight="true"]` 出现且含高亮 span（waitFor lazy 解析）；**回归防护**——未声明时行为零变化（无 marker、原渲染）；未知语言（如 `whitespace`）回退纯文本 pre 且 marker 仍在；**bare fence（无语言标注）→ 带 marker 纯文本 pre（审查 M1 判别性用例）**；行内 code 不生成 marker；别名映射（md fence → markdown 高亮）。

Exit Criteria:

- [x] focused 套件 6 case 全绿（判别性：marker 断言在无实现时必挂；lazy 冷启动以 beforeAll 预热同源动态 import 解决）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-content typecheck` 通过。

### Phase 2 — 依赖门禁 + 交付铁律

Status: completed
Targets: `pnpm check`、example/lab、登记

- Item Types: `Proof`

- [x] 依赖门禁：`pnpm check` 全量通过（workspace-manifest-deps 认可新依赖）；论证记录进本 plan Closure Note（复用既有导出、无新外部依赖、**无环论证含全传递闭包**：content→code-editor→form→basic，basic/data 仅 devDeps，无路径回 content——审查 m2）。
- [x] 铁律 3：markdown example.json / lab 页增 `codeHighlight` 演示。
- [x] 铁律 5/6：quick-reference 无 markdown 条目先例（记录核对）；i18n 零新增键（记录结论）。

Exit Criteria:

- [x] `pnpm check` 通过且无新增未登记红项（ContentMenuItemSchema/resolveFenceLanguage 两处未导出命中已当场收敛；剩余 knip 为 HEAD/他线既有）；example/lab 落地；铁律处置无悬空。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `revised` → 共识达成（零 Blocker / 1 Major / 2 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: M1 block 判定改覆写 `pre`（v10 code 组件无 inline prop、bare fence 无 className 会误判行内）+ bare fence 判别性用例补齐；m1 vitest 环境勘误 happy-dom；m2 无环论证写全传递闭包

## Closure Gates

- [x] 所有 in-scope 行为已落地且 focused 单测证明（判别性断言存在）
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（协议在 plan 718 落稿；实现偏离就地勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（82/82 task 全绿）
- [x] `pnpm check`（零新增未登记红项；剩余为 HEAD 既有 2 条 + 他线 scheduling 未提交改动 1 条，stash 已验证归属）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 暗色主题跟随（editorTheme 当前固定 light）、per-fence 粒度（demand 出现再立项）。

## Closure

Status Note: （closure 时填写）

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_242652e6，2026-10-24，本分支 arc-component-gap）
- Evidence: **approved**（0 Blocker / 0 Major / 2 Minor）。§2a 协议九条逐项 PASS（含 lazy 硬条款、默认零变化回归钉、别名表归属、未知语言回退）；抽查复跑：包 typecheck、focused 6/6、console-baseline、workspace-manifest-deps、全量 check exit 0；无环论证与实际 deps 一致；判别性测试六面在案；无静默降级。m1（design.md §2a `code`→`pre` 覆写勘误未回写）已随本 commit 就地勘误；m2（关闭态零增量加载无直接断言）记录为可接受缺口（实现结构保证）。
