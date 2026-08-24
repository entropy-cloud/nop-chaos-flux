# 1 ai-widgets 审计 P2 批量收敛（dark guard / lowlight 声明 / feedback 播种 / setSenderDraft 清空 / useMemo 裁定）

> Plan Status: completed
> Last Reviewed: 2026-08-25
> Mission: ai-widgets-product
> Work Item: audit-p2-remediation
> Source: `docs/backlog/audit-followups-2026-08-24-0803.md`（5 条 P2；源审计 `docs/audits/2026-08-24-0803-open-audit-ai-widgets-product.md`）
> Related: `docs/plans/2026-08-25-0410-1-ai-bubble-math-delimiter-pipeline-remediation.md`（同源审计的 3 条 P1 已收口；P2 与其 closure surface 不同源，零折叠）

## Purpose

把 2026-08-24 08:03 open-audit 登记并延后的 5 条 P2 收敛到各自明确 disposition：P2-1 dark 双触发 media 轨缺 light 出口、P2-2 playground 未声明 `lowlight` peer、P2-3 `ai-feedback` 不从 metadata 播种、P2-4 `setSenderDraft` 无法清空草稿、P2-5 手写 `useMemo` 冗余。收敛后 `audit-followups-2026-08-24-0803.md` backlog 清零。

## Current Baseline

（2026-08-25 live 核对）

- **绿色基线**：roadmap D0–DG + P1 remediation（0410 plan）后全绿（`docs/logs/2026/08-25.md`）。
- **P2-1**：`packages/flux-renderers-ai/src/styles.css` 全文件恰 3 处 `@media (prefers-color-scheme: dark)` 块——typography `:277-289`、avatar `:332-338`、welcome `:357-361`——内层 selector 均无 light guard：standalone host（只 import 包 `styles.css`、未定义 token 集）在 dark-OS + `data-mode='light'` 下拿到 literal dark fallback（如 `--ai-md-fg: hsl(210 40% 98%)`），浅色页面近不可见。CSS-source regex 断言先例：`renderers/ai-bubble/__tests__/markdown-content.test.tsx:328`（c1 dark-path 用例）。
- **P2-2**：`apps/playground/package.json:46` 已补 `katex` 但无 `lowlight`；`flux-renderers-ai` peer `lowlight@^3` 且 `renderers/ai-bubble/renderers/markdown.tsx:7` 直接 import——当前靠 pnpm auto-install-peers / 经 `flux-renderers-content` 传递解析；后者 lowlight 用法已登记 bug 167、是 removal 候选，移除后 showcase 代码高亮将以无人声明的原因构建失败。
- **P2-3**：`renderers/ai-feedback.tsx:101` `useState<'like' | 'dislike' | null>(null)` 不播种；`writeFeedbackMetadata`（`:71-76`）已把投票写入 `message.metadata.feedback` → 虚拟列表回收 / 分支切换重挂载后视觉态与持久化 metadata 脱钩（liked 消息重挂载渲染为未 like）。
- **P2-4**：`adapters/ai-component-handle.ts:156-158` 空 `text` 一律 `{ ok: false }`，`mode` 解析在其后（`:165`）→ `mode:'replace'` + `''` 的"清空"意图无法表达，host 无经由 handle 清空输入框的路径。`schemas.ts` 无上游 `text` 校验（grep 0 命中，handle 校验是唯一 gate）。
- **P2-5**：审计记 3 处手写 useMemo 冗余——live 行号 `renderers/ai-chat.tsx:261`（senderDraftStore 工厂；审计记 :257，行漂移）、`apps/playground/src/pages/ai-widgets-demo.tsx:198`（env 工厂）、`:200`（importLoader tuple）；三处均延续所在文件既有模式且带理由注释、lint 零告警，属风格收敛项（`docs/skills/react19-best-practices-review.md` 口径）。
- 测试锚点：`adapters/__tests__/ai-component-handle.test.ts`、`renderers/__tests__/ai-feedback.test.tsx`、`adapters/__tests__/ai-sender-draft.test.ts` 均存在；e2e 家族 `tests/e2e/ai-widgets-*.spec.ts` 4 文件。
- `AI_COMPONENT_METHODS` 定义于 `ai-component-handle.ts:11`（7 项，drift-guard 断言）。

## Goals

- P2-1 / P2-3 / P2-4 三个已证实行为缺陷修复，各自 focused 回归测试先红后绿。
- P2-2 playground 显式声明 `lowlight@^3`，消除对 auto-install-peers / 传递依赖的隐式依赖。
- P2-5 三处 useMemo 各落一个 disposition（移除或 keep-with-reason），零静默跳过。
- `docs/backlog/audit-followups-2026-08-24-0803.md` 5 条全部标注处置结果。

## Non-Goals

- 不修 bug 167（content 包 diff-view 零注册缺陷；mission 授权目录外，已路由 content 包 owner）。
- 不做 fixture 中文分发 / e2e 货币-`\(` 增强（successor plan `2026-08-25-0440-2-fixture-zh-dispatch-e2e-math.md`）。
- 不动 markdown math pipeline（0410 plan 已收口）。
- 不新增 `check:*` 门禁（mission 一次性 polish 纪律）。
- P2-3 不做同 mount 内 message 引用切换的深度响应式同步（审计 Fix direction 即 mount 播种一行；限制语如实记入 renderers.md）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/styles.css`（3 个 media 块加 guard）
- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx` + `renderers/__tests__/ai-feedback.test.tsx`
- `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts` + `adapters/__tests__/ai-component-handle.test.ts`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/markdown-content.test.tsx`（CSS 契约断言扩展）
- `apps/playground/package.json`（lowlight 依赖声明）
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx` / `apps/playground/src/pages/ai-widgets-demo.tsx` 的 P2-5 三处（如裁定移除）
- `docs/components/flux-renderers-ai/design.md`（typography 段 guard 语义）、`docs/components/flux-renderers-ai/renderers.md`（setSenderDraft 清空契约 / ai-feedback 播种语义）
- `docs/backlog/audit-followups-2026-08-24-0803.md`（处置标注）

### Out Of Scope

- engine / 其他 renderers / adapters 其他方法。
- `packages/flux-renderers-content`（bug 167 领地）。
- 新增 e2e spec（本 plan 以 unit + CSS 契约测试证明行为；e2e 面只要求既有 spec 零回归）。

## Failure Paths

| 场景编号               | 触发                                          | 行为                                           | 可重试 | 用户可见表现                 |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- | ------ | ---------------------------- |
| p2-clear-draft-replace | `setSenderDraft` `mode:'replace'` + `text:''` | `{ ok: true }`，draft 清空                     | 否     | 输入框被清空                 |
| p2-clear-draft-append  | `mode:'append'`（默认）+ `text:''`            | `{ ok: false }`，错误文案（append 空串无语义） | 否     | action 报错，输入框不变      |
| p2-clear-draft-badtype | `text` 非字符串 / 缺失                        | `{ ok: false }` 既有错误文案（不变）           | 否     | action 报错                  |
| p2-feedback-seed       | 挂载时 `message.metadata.feedback` 已有投票值 | 初始 `voted` 播种该值                          | 否     | like/dislike 态跨重挂载保持  |
| p2-dark-os-light-host  | OS dark + root `data-mode='light'`            | 3 条 media 轨被 guard 排除，基线 light 值生效  | 否     | 浅色页面文本可读（非近白色） |

## Test Strategy

本档选择：**必须自动化**。P2-1 / P2-3 / P2-4 为已证实的行为缺陷（audit live-probe），Proof 项先红后绿且排在对应 Fix 之前；P2-2 manifest 变更以 `pnpm install` + 构建 + `pnpm check`（含 workspace-manifest-deps）验证；P2-5 为裁定项，以现有测试零回归 + 逐处 disposition 记录为证明。

## Execution Plan

### Phase 1 - P2-1：dark media 轨 light guard

Status: completed
Targets: `packages/flux-renderers-ai/src/styles.css`、`renderers/ai-bubble/__tests__/markdown-content.test.tsx`、`docs/components/flux-renderers-ai/design.md`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：扩展 markdown-content.test.tsx 既有 (c1) dark-path CSS-source 用例——新增断言：styles.css 内**每个** `@media (prefers-color-scheme: dark)` 块的内层 selector 均含 `:root:not([data-mode='light'])` guard（现状 3 块全无 → 红）。
- [x] Fix：3 处 media 块（`:277-289` typography、`:332-338` avatar、`:357-361` welcome）内层 selector 加 `:root:not([data-mode='light'])` 前缀；trigger-2 `[data-mode='dark']` 块不动（显式 dark 恒胜——两 dark 轨 token 值相同，specificity 差异无视觉影响）。guard 语义注记：项目约定 `data-mode` 挂 root（`docs/architecture/theme-compatibility.md:165` `:root[data-theme=...][data-mode=...]` 先例）；非 root 挂法不在本 plan 语义内。
- [x] Fix：design.md typography 段（`ai-bubble-typography` 双触发描述处）补一句 light guard 语义（media 轨在显式 `data-mode='light'` 下让位给基线 light 值）。

Exit Criteria:

- [x] Proof 断言转绿；styles.css 中 `:root:not([data-mode='light'])` 恰 3 处、`@media (prefers-color-scheme: dark)` 仍恰 3 处。
- [x] design.md 双触发描述与 live CSS 一致（含 guard 语义）。

### Phase 2 - P2-3 + P2-4：feedback 播种与 setSenderDraft 清空语义

Status: completed
Targets: `renderers/ai-feedback.tsx`、`adapters/ai-component-handle.ts`、`renderers/__tests__/ai-feedback.test.tsx`、`adapters/__tests__/ai-component-handle.test.ts`、`docs/components/flux-renderers-ai/renderers.md`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：ai-feedback.test.tsx 新增——携带 `metadata.feedback:'like'` 的消息渲染后初始即 like 态（既有 `data-active` / `aria-pressed` 断言口径）；`'dislike'` 对称一条；无 metadata 初始无态（回归）。
- [x] Fix：`ai-feedback.tsx:101` 改为惰性播种——`useState(() => ((message?.metadata as { feedback?: 'like' | 'dislike' } | undefined)?.feedback ?? null))`（mount 时读一次）。
- [x] Proof（先红）：ai-component-handle.test.ts 新增——`replace` + `''` 期望 `{ ok: true }` 且 draft channel 收到空串（现状红：被 `:156-158` 拒绝）；`append` + `''` 仍 `{ ok: false }`；`replace`/`append` + 非空行为不变（回归两条）。
- [x] Fix：`ai-component-handle.ts:154-167` 校验次序重排——`typeof text !== 'string'` 拒绝（不变）→ senderDraft channel 存在性检查（不变，清空也需要 channel）→ `mode` 解析前移 → 空串策略：`mode==='replace'` 放行为合法清空，`append` 保持拒绝（两类拒绝错误文案可区分）。
- [x] Fix：renderers.md `§13b setSenderDraft` 段补清空契约（`replace` + 空串 = 清空；`append` + 空串 = 错误）；`§8 ai-feedback` 段补 mount 播种语义一句（含"同 mount 引用切换不重播种"限制语）。

Exit Criteria:

- [x] 两组 Proof 全部转绿；`pnpm --filter @nop-chaos/flux-renderers-ai test -- ai-feedback ai-component-handle ai-sender-draft` 零回归。
- [x] renderers.md 两处与 live 行为一致（含 append 空串拒绝的失败路径）。

### Phase 3 - P2-2 + P2-5：lowlight 声明、useMemo 裁定、backlog 清零

Status: completed
Targets: `apps/playground/package.json`、`packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`apps/playground/src/pages/ai-widgets-demo.tsx`、`docs/backlog/audit-followups-2026-08-24-0803.md`

- Item Types: `Fix | Decision`

- [x] Fix：`apps/playground/package.json` `dependencies` 补 `lowlight: ^3`（与 `flux-renderers-content` 既有 `lowlight@^3.1.0` 区间对齐）；`pnpm install` 更新 lockfile。
- [x] Decision：P2-5 三处逐一裁定并记录（live 行号：`ai-chat.tsx:261`、`ai-widgets-demo.tsx:198`、`ai-widgets-demo.tsx:200`，执行时复核）。判据：先核实 React Compiler 对 playground vite 构建与包构建的实际覆盖面；纯工厂 + 空依赖数组且 Compiler 覆盖 → 移除（现有测试证零回归）；引用稳定性被下游 effect/context 消费链真实依赖且 Compiler 不保证 → keep-with-reason（更新注释指向本裁定）。每处恰好一个 disposition，零静默跳过；三处结论写入本 plan `## Closure` 的 `Status Note`。
- [x] Fix：`docs/backlog/audit-followups-2026-08-24-0803.md` 5 条 P2 各标注处置结果（fixed by Phase N / adjudicated keep-with-reason / removed）。

Exit Criteria:

- [x] playground `package.json` 含 `lowlight`，`pnpm install` 后 lockfile 记录该直接依赖；playground 构建通过。
- [x] P2-5 三处 disposition 记录在案；如涉及移除，相关包 focused test 零回归。
- [x] backlog 5 条全部带处置标注，无未处置条目。

## Draft Review Record

- Reviewer / Agent: fresh sub-agent session `ses_fca7b2762ffeaZ4s3gcubx6xTW`（非起草 session）
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major / 3 Minor——① markdown.tsx 路径补全为 `renderers/ai-bubble/renderers/markdown.tsx:7`（已修正）；② P2-5 结论落点措辞改为 `## Closure` 的 `Status Note`（已修正）；③ guard 依赖 `data-mode` 挂 root 为已披露的范围限定（reviewer 裁定可接受，不改）。

## Closure Gates

- [x] P2-1 / P2-3 / P2-4 修复落地且各自 Proof 先红后绿。
- [x] P2-2 playground 显式声明 lowlight，无隐式传递解析。
- [x] P2-5 三处各有 disposition，无静默跳过。
- [x] `audit-followups-2026-08-24-0803.md` 5 条全部标注处置（backlog 清零）。
- [x] 受影响 owner docs（design.md typography 段、renderers.md §13b / §8）与 live baseline 一致。
- [x] 既有 e2e `ai-widgets-*` 家族（4 spec）零回归——改动涉及 demo 页与 sender/feedback 渲染器。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0，零新增红）

## Deferred But Adjudicated

（无——P2-5 如裁定 keep-with-reason，属"裁定保留"的 disposition，记录于 Phase 3 结论与 backlog 标注，不是延期缺陷。）

## Non-Blocking Follow-ups

- dark guard 的 standalone-host（无 token 集）行为级验证需要一个不带 token 的 bare host 页面；当前防线为 CSS 契约断言 + guard 语义本身，行为级 bare-host 验证留给后续有该场景诉求的轮次。

## Closure

Status Note: 5 条 P2 全部收敛。P2-1：3 处 `@media (prefers-color-scheme: dark)` 块内层 selector 加 `:root:not([data-mode='light'])` guard（styles.css guard 恰 3 处、media 块仍恰 3 处），CSS 契约断言扩展进 `markdown-content.test.tsx` (c1) 先红后绿，design.md §10.7 补 light guard 语义。P2-3：`ai-feedback.tsx` `voted` 惰性播种自 `message.metadata.feedback`，3 用例先红后绿。P2-4：`setSenderDraft` 校验重排——`replace`+空串合法清空（`{ok:true}`、channel 收到 `''`）、`append`+空串显式拒绝（文案与缺参拒绝可区分），4 用例先红后绿，renderers.md §13b 清空契约 + §8 播种语义同步。P2-2：playground `dependencies` 补 `lowlight@^3.1.0`（与 content 包区间对齐），lockfile importer 记录直接依赖。P2-5 三处 disposition：① `ai-chat.tsx` senderDraftStore——**keep-with-reason**（identity 流入 componentHandle register-effect deps 与 Provider-bound context value，React Compiler 仅覆盖 playground vite 构建——包 dist 构建纯 tsc、vitest 不走 babel/react-compiler，移除将在未编译环境每 render 重建 store 丢 draft；注释已更新指向本裁定）；② `ai-widgets-demo.tsx` env 工厂——**removed**（该文件仅运行于 playground vite dev/build，Compiler 全覆盖，纯工厂纯冗余）；③ `ai-widgets-demo.tsx` importLoader pair——**removed**（同②，输入 `connector` + module 常量均稳定）。backlog `audit-followups-2026-08-24-0803.md` 5 条全部带处置标注（清零）。验证：`pnpm typecheck`/`build`/`lint`/`test`（68 test tasks，flux-renderers-ai 84 files / 789 tests）/`pnpm check`（exit 0）全绿；e2e `ai-widgets-*` 家族 4 spec 35 测全过（含 G6 lowlight 高亮、DV light/dark computed-style、streaming cadence——覆盖 useMemo 移除后 demo 页稳定性）。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session `ses_fca6c4376ffe0tK8ICri7tII6x`（非执行 session）
- Evidence: Verdict `approved`，0 Blocker / 0 Major——10 项 live-repo 核对全过：① 三 Phase 全 `[x]` 且 Exit Criteria repo-observable；② styles.css 3 media 块（:282/:336/:361）全 guard、恰 3 处 guard、`[data-mode='dark']` 轨未动、(c1) 断言锁定；③ ai-feedback.tsx:106-108 惰性播种 + 3 用例（:271/:292/:313）；④ ai-component-handle.ts:154-179 校验次序 + 4 用例（:235/:249/:263/:277）+ 既有拒绝保留（:216-227）；⑤ playground package.json:47 + lockfile importer 直接依赖；⑥ P2-5 三 disposition 落地（ai-chat.tsx:261-266 keep-with-reason 依据核实：identity 入 deps :284 与 Provider context :501、Compiler 仅 playground vite；demo :203/:205 无 useMemo、非 scope memo 未动）；⑦ owner docs 与 live 一致（design.md :447 / renderers.md :670/:391）；⑧ backlog 5 条全处置（:12-16）；⑨ 无 in-scope 缺陷被降级、Failure Paths 5 行全覆盖；⑩ 文本一致性核对通过。

Follow-up:

- fixture 中文分发 / e2e 货币-`\(` 增强 → `docs/plans/2026-08-25-0440-2-fixture-zh-dispatch-e2e-math.md`
