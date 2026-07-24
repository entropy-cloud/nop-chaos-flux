# AI P2 Code & Behavior Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/components/roadmap-ai.md` Follow-up Backlog (P2 批), `docs/audits/2026-07-24-1757-multi-audit-ai.md`, `docs/audits/2026-07-24-1757-open-audit-ai.md`
> Related: `docs/plans/2026-07-24-1757-1-ai-message-snapshot-contract-remediation.md` (P1 已收口), `docs/plans/2026-07-24-1757-2-ai-input-and-docs-contract-remediation.md` (P1 已收口), `docs/plans/2026-07-24-2300-2-ai-p2-doc-consistency-remediation.md` (后继)

## Purpose

把 `flux-renderers-ai` 包内 P2 follow-up backlog 中所有**需要代码变更**的条目收敛到一致状态：行为缺陷修复、渲染健康收敛、代码卫生清理、样式/marker 一致性对齐、测试覆盖补齐。所有条目来自 2026-07-24 两份 open 审计，此前裁定为 non-blocking polish 不进入 P1 remediation；现 P1 已全部关闭，P2 是自然的下一个收口面。

## Current Baseline

> 以下 file:line 均经 live repo 核对（2026-07-24）。

### 行为缺陷（3 条）

- **O-4 附件 id 碰撞**（`docs/audits/2026-07-24-1757-open-audit-ai.md` O-4）：`ai-attachments.tsx:99` 用 `id: \`${file.name}-${file.size}-${file.lastModified}\``派生附件 id。两个同名同大小同修改时间的文件会产生相同 id → React key 重复 +`handleRemove`（`:125-137`）误删全部同名件。
- **tool-no-executor 不写 lastError**（multi-audit P2）：`create-engine.ts:250-259`（`tool-no-executor` 失败路径）设 `requestState='error'` + `isProcessing=false` + `processingState=undefined`，但**不写 `draft.lastError`**。与 connector-throw 路径（`:302` runOnce catch `draft.lastError = error`）不对齐——消费方（如 error 态气泡）拿不到错误原因。
- **Clipboard copy 乐观显示**（multi-audit P2）：`ai-feedback.tsx:95-96`（`void navigator.clipboard.writeText(text)` 后 `:28` `setCopied(true)`）和 `ai-bubble/renderers/markdown.tsx:102-107`（`copyToClipboard(text)` 后 `:105` `setCopied(true)`）都在不 await / 不 catch 的情况下乐观显示 "Copied"；写入失败时用户看到虚假成功反馈。

### 渲染健康（2 条）

- **AiChatProvider value 每渲染内联重建**（multi-audit P2）：`ai-chat.tsx:307` `<AiChatProvider value={{ engine, messages, requestState, processingState, isProcessing, sendMessage, abortRequest, branches, activeBranchId, onBranchChange }}>` —— 每次 render 新建对象字面量，跨 Provider 边界 React Compiler 无法 memoize，导致 context 消费者不必要的重渲染。
- **ai-voice-input effect deps 含 props.events**（multi-audit P2）：`ai-voice-input.tsx:100-105` effect deps `[unsupported, props.events]`——`props.events` 每渲染新引用，导致 effect 在 `unsupported` 未变时也重复触发（`firedUnsupportedRef` 守卫阻止了重复 fire，但 effect 仍无谓重跑）。应改 latest-ref 模式。

### 代码卫生（3 条）

- **MaybePromise\<T\> 定义 3 处**（multi-audit P2）：`engine/types.ts:95`、`storage/types.ts:17`、`adapters/ai-conversation-controller.ts:26` 各自定义 `export type MaybePromise<T> = T | Promise<T>;`；`index.ts:83` 导出 `MaybePromise`，`:123` 再 `export { MaybePromise as AiMaybePromise }`。三份重复定义，应收敛到单一来源。
- **toActionError 死导出**（multi-audit P2）：`adapters/ai-action-provider.ts:41` 定义 `function toActionError(error: unknown): Error`，`:136` `export { toActionError }`——全包内除定义文件外**零消费方**（`rg "toActionError"` 排除该文件无命中）。
- **markdown-buffer stateful API 未用于生产**（multi-audit P2）：`renderers/ai-bubble/markdown-buffer.ts` 导出 `createMarkdownBuffer` 等 stateful API，但生产代码仅用 `safeMarkdownSlice`（在流式 markdown 渲染中调用）。其余导出为 dead surface。

### 样式 / Marker 一致性（3 条）

- **nop- 前缀泄到非根内部 region**（multi-audit P2，8 元素）：marker `nop-` 前缀应仅出现在组件根元素。实际泄漏到内部元素，已确认的：`ai-voice-input.tsx:202` `className="nop-ai-voice-input-wave ..."`、`ai-bubble/index.tsx:171` `className="nop-ai-bubble-branches ..."`。内部元素应改用 `data-slot` 而非 `nop-` marker class。
- **.ai-bubble-cursor 裸全局 helper class**（multi-audit P2）：`styles.css:4-21` 定义 `.ai-bubble-cursor`（display/animation）+ `@media (prefers-reduced-motion)` 覆盖，是裸 class 选择器而非 `data-slot` 约定。包内已有 `data-slot='ai-voice-input-wave'` 等 data-slot 先例（`:24`）。
- **.nop-ai-message-list 视觉规则挂在根 marker**（multi-audit P2）：`styles.css:83-87` 把 `min-height:0; flex:1 1 0%; overflow:auto` 直接挂在 `.nop-ai-message-list`（根 marker class）。按 Renderer Styling Contract，根 marker 只应做语义标识，视觉规则应移至 `[data-slot='ai-message-list']`。

### 测试覆盖缺口（3 条）

- **clear() while-in-flight guard 无测试**（multi-audit P2）：`create-engine.ts:483-496` 的 `clear()` 在 `isProcessing` 时有 guard（`:487-489` `if (adapter.getState().isProcessing) return;`），但与 `setMessages` 的 guard 不对称且无 focused 测试。
- **component-handle-no-registry skip 路径无测试**（multi-audit P2）：`ai-chat.tsx:144-154`——当 `useCurrentComponentRegistry()` 返回 null 时，`useEffect` 内 `if (!componentRegistry) return;`（`:152`）静默跳过注册（Failure Path `component-handle-no-registry`），但无测试覆盖此防御性跳过路径。
- **use-conversation.test.ts 跨 4 domain**（multi-audit P2）：`adapters/__tests__/use-conversation.test.ts`（520 行）跨 4 个 domain（create/switch/storage/controller），导航性差，应按 domain 拆分。

## Goals

- O-4 附件 id 不再碰撞（用 crypto.randomUUID / 自增 counter 替代 name-size-lastModified 派生）。
- tool-no-executor 失败路径写 `draft.lastError`，与 connector-throw 路径对齐。
- Clipboard copy 在写入失败时不显示 "Copied"，改为 await + catch 后回退。
- AiChatProvider value 经 useMemo 稳定（或 React Compiler 能识别的 stable shape），不再每渲染重建。
- ai-voice-input unsupported effect 改 latest-ref 模式，deps 只含 `[unsupported]`。
- MaybePromise 收敛到单一来源定义。
- toActionError 死导出移除（或标注 internal）。
- markdown-buffer 未用于生产的 stateful 导出移除（仅保留 `safeMarkdownSlice`）。
- nop- 前缀不再出现在非根内部元素；内部元素统一用 `data-slot`。
- `.ai-bubble-cursor` 改为 `data-slot` 驱动。
- `.nop-ai-message-list` 视觉规则移至 `[data-slot='ai-message-list']`。
- clear() guard + component-handle-no-registry skip 各有 focused 测试。
- use-conversation.test.ts 按 domain 拆分。

## Non-Goals

- 不改引擎对外 API 签名（`sendMessage`/`abort`/`regenerate`/`setMessages`/`getMessages` 等不变）。
- 不改渲染器 schema 字段（`AiAttachmentsSchema`/`AiChatSchema` 等不变）。
- 不处理 P2 文档一致性条目（phantom 引用 / terminology / AGENTS.md）——由 `2026-07-24-2300-2-ai-p2-doc-consistency-remediation.md` 收口。
- 不引入 LaTeX / Streamdown / 更多 Tiptap 扩展（已裁定 out-of-scope）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx` — id 派生改为唯一 id
- `packages/flux-renderers-ai/src/engine/create-engine.ts` — tool-no-executor 写 lastError + clear() guard
- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx` + `ai-bubble/renderers/markdown.tsx` — clipboard copy 失败处理
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx` — AiChatProvider value memoize
- `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx` — effect latest-ref
- `packages/flux-renderers-ai/src/engine/types.ts` + `storage/types.ts` + `adapters/ai-conversation-controller.ts` — MaybePromise 收敛
- `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts` — toActionError 移除
- `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts` — unused exports 移除
- `packages/flux-renderers-ai/src/styles.css` + 受影响 renderers — nop- prefix / data-slot 收敛
- `packages/flux-renderers-ai/src/__tests__/` — 新增 guard 测试 + use-conversation 拆分

### Out Of Scope

- 文档一致性修复（renderers.md/design.md line rot、terminology.md、AGENTS.md、engine.md label）→ Plan 2
- 全仓 raw `<button>` 收敛（repo-wide 任务，非本 mission）
- markdown sanitize XSS 组合用例（watch-only residual，可选加固）

## Failure Paths

| 场景编号                  | 触发                                                    | 行为                                              | 可重试           | 用户可见表现                                        |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ---------------- | --------------------------------------------------- |
| `attachment-duplicate-id` | 上传两个同名同大小同修改时间文件                        | 各自获得唯一 id，共存于附件列表                   | 否               | 两个附件都显示，删除一个不影响另一个                |
| `tool-no-executor`        | LLM 请求工具调用但未提供 toolExecutor                   | `requestState='error'` + `lastError` 写入错误信息 | 否               | error 态气泡显示错误原因（与 connector-throw 一致） |
| `clipboard-write-failed`  | `navigator.clipboard.writeText` reject（权限/焦点丢失） | 不显示 "Copied"，保持原态                         | 是（用户可重试） | 按钮不切换为 copied 状态                            |

## Test Strategy

本档选择：`建议有测`

行为缺陷（O-4 碰撞、tool-no-executor lastError、clipboard 失败）需配回归测试证明修复后的行为；渲染健康（memo/latest-ref）和代码卫生（dedup/dead code）以 typecheck + 既有测试零回归为主；样式 marker 变更以 typecheck + 既有 a11y/e2e 零回归为主。

## Execution Plan

### Phase 1 - 行为缺陷修复

Status: completed
Targets: `ai-attachments.tsx`, `create-engine.ts`, `ai-feedback.tsx`, `ai-bubble/renderers/markdown.tsx`

- Item Types: `Fix | Proof`

- [x] **O-4 附件 id 唯一化**（Fix）：`ai-attachments.tsx:99` 将 `id: \`${file.name}-${file.size}-${file.lastModified}\``改为`id: crypto.randomUUID()`（带 `typeof crypto !== 'undefined'` 守卫 + 回退自增 counter）；`handleRemove`（`:125-137`）验证按唯一 id 删除
- [x] **tool-no-executor 写 lastError**（Fix）：`create-engine.ts:251-255` 在 `adapter.mutate('requestState', ...)` recipe 内增 `draft.lastError = new Error('tool-no-executor')`（或与 connector-throw 路径一致的 Error shape）
- [x] **clipboard copy 失败处理**（Fix）：`ai-feedback.tsx:95-96` 和 `ai-bubble/renderers/markdown.tsx:102-107` 将 `void navigator.clipboard.writeText(text)` + 立即 `setCopied(true)` 改为 `await` + `.then(() => setCopied(true))` / `.catch(() => {})`（失败不显示 Copied）
- [x] **O-4 回归测试**（Proof）：新增 `ai-attachments-duplicate-id.test.tsx`——上传两个 mock 同名同大小文件，断言各自唯一 id + 删除一个不影响另一个
- [x] **tool-no-executor lastError 回归测试**（Proof）：在 `engine-tool-loop.test.ts` 增用例——无 toolExecutor 时断言 `state.lastError` 非 undefined
- [x] **clipboard 失败回退测试**（Proof）：在 ai-feedback 或 markdown copy 测试中 mock `navigator.clipboard.writeText` reject，断言 `copied` 不切换为 true

Exit Criteria:

- [x] `ai-attachments.tsx` 附件 id 不再由 name-size-lastModified 派生；两个同名文件共存且独立删除
- [x] `create-engine.ts` tool-no-executor 路径写 `lastError`，与 connector-throw 路径 shape 一致
- [x] clipboard copy 写入失败时不显示 "Copied"
- [x] 三个回归测试均真实断言修复后行为（非 tautology）
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过

### Phase 2 - 渲染健康收敛

Status: completed
Targets: `ai-chat.tsx`, `ai-voice-input.tsx`

- Item Types: `Fix`

- [x] **AiChatProvider value 稳定化**（Fix）：`ai-chat.tsx:307` 将内联 `value={{ ... }}` 改为 `useMemo`（deps 含全部字段值；React 19 下 prefer plain derivation 但此处是 context value 需稳定引用）。若 React Compiler 能识别则用注释说明依赖
- [x] **ai-voice-input effect latest-ref**（Fix）：`ai-voice-input.tsx:100-105` 将 `props.events` 收入 latest-ref（`eventsRef`，若已存在则复用），effect deps 改为 `[unsupported]`；`firedUnsupportedRef` 守卫保留

Exit Criteria:

- [x] `ai-chat.tsx` AiChatProvider value 引用稳定（相同输入下不每渲染重建）
- [x] `ai-voice-input.tsx` unsupported effect deps 不再含 `props.events`
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` + `pnpm --filter @nop-chaos/flux-renderers-ai lint` 通过（lint 含 `react-hooks/exhaustive-deps`）

### Phase 3 - 代码卫生清理

Status: completed
Targets: `engine/types.ts`, `storage/types.ts`, `adapters/ai-conversation-controller.ts`, `adapters/ai-action-provider.ts`, `renderers/ai-bubble/markdown-buffer.ts`, `index.ts`

- Item Types: `Fix`

- [x] **MaybePromise 收敛**（Fix）：保留 `engine/types.ts:95` 为唯一定义；`storage/types.ts:17` 和 `adapters/ai-conversation-controller.ts:26` 改为从 `engine/types.ts` import（或共用 `engine/types.ts` re-export）；`index.ts` 保持单一导出源
- [x] **toActionError 死导出移除**（Fix）：`adapters/ai-action-provider.ts:41` 定义 + `:136` 导出移除（确认零消费方后删除；若 `ai-action-provider.ts` 内部使用则改为 module-local 不导出）
- [x] **markdown-buffer 未用导出移除**（Fix）：`renderers/ai-bubble/markdown-buffer.ts` 移除生产未用的 stateful API 导出（`createMarkdownBuffer` 等），仅保留 `safeMarkdownSlice`；若有测试引用则一并清理

Exit Criteria:

- [x] `MaybePromise<T>` 全包内单一来源定义，`rg "export type MaybePromise"` 仅命中 `engine/types.ts`
- [x] `rg "toActionError"` 在 `src/` 内除定义处外零命中（或定义处改为不导出）
- [x] `markdown-buffer.ts` 仅导出 `safeMarkdownSlice`
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过

### Phase 4 - 样式 / Marker 一致性

Status: completed
Targets: `styles.css`, `ai-voice-input.tsx`, `ai-bubble/index.tsx`, 其他含 `nop-` 内部元素的文件

- Item Types: `Fix | Proof`

- [x] **nop- prefix 从非根内部 region 移除**（Fix）：`ai-voice-input.tsx:202` `nop-ai-voice-input-wave` → 改为 `data-slot="ai-voice-input-wave"`（CSS 已有 `[data-slot='ai-voice-input-wave']` 选择器 `styles.css:24`，只需同步 JSX className）；`ai-bubble/index.tsx:171` `nop-ai-bubble-branches` → `data-slot="ai-bubble-branches"`；扫描其余 6 个元素一并处理
- [x] **.ai-bubble-cursor 改 data-slot**（Fix）：`styles.css:4-21` `.ai-bubble-cursor` 选择器改为 `[data-slot='ai-bubble-cursor']`；同步引用处（streaming cursor 渲染处）改用 `data-slot` attribute
- [x] **.nop-ai-message-list 视觉规则移至 data-slot**（Fix）：`styles.css:83-87` `.nop-ai-message-list { min-height:0; flex:1 1 0%; overflow:auto }` 改为 `[data-slot='ai-message-list-scroll']` 或 `[data-slot='ai-message-list']`（以实际 scroll container 的 data-slot 为准）；`.nop-ai-message-list` marker class 保留在根元素做语义标识但不承载视觉规则
- [x] **marker 一致性回归**（Proof）：在 `contract-honesty.test.ts` 或新建 marker-conformance 测试中断言 `nop-` 前缀 class 只出现在组件根元素（扫描所有 renderer 的 `data-slot` + `className` 对应关系）

Exit Criteria:

- [x] `rg "nop-ai-" packages/flux-renderers-ai/src/renderers/ --include="*.tsx"` 中 `nop-` 前缀仅出现在组件根元素 className（`cn('nop-ai-...', ...)` 首参数）
- [x] `styles.css` 中 `.ai-bubble-cursor` 裸 class 已改为 `data-slot` 驱动
- [x] `styles.css` 中 `.nop-ai-message-list` 不再承载 `min-height/flex/overflow` 视觉规则
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` + `test` 通过；AI e2e `pnpm test:e2e` 中 AI 相关用例零回归（无 e2e 选择器命中被改 class；单元 a11y/renderers 用例全绿）

### Phase 5 - 测试覆盖与卫生

Status: completed
Targets: `adapters/__tests__/use-conversation.test.ts`, `renderers/__tests__/component-handle.test.tsx`, 新建测试文件

- Item Types: `Proof | Fix`

- [x] **clear() while-in-flight guard 测试**（Proof）：在 `engine-clear.test.ts`（或 `engine-*.test.ts`）增用例——`isProcessing=true` 时调 `clear()`，断言 guard 行为（与 `setMessages` 对称性核对）
- [x] **component-handle-no-registry skip 测试**（Proof）：在 `renderers/__tests__/component-handle.test.tsx` 增用例——`useCurrentComponentRegistry()` 返回 null 时（模拟 registry 缺失），`ai-chat.tsx:152` 的 `if (!componentRegistry) return;` 生效，注册被静默跳过（不抛、不调 `register`）
- [x] **use-conversation.test.ts 按 domain 拆分**（Fix）：`adapters/__tests__/use-conversation.test.ts`（520 行）拆为 `use-conversation-create.test.ts` / `use-conversation-switch.test.ts` / `use-conversation-storage.test.ts` / `use-conversation-controller.test.ts`（或按实际 domain 边界）；保持全部既有断言不丢失

Exit Criteria:

- [x] clear() guard 有 focused 测试证明行为（非 tautology）
- [x] component-handle-no-registry skip 路径有 focused 测试（`ai-chat.tsx:152` registry 缺失时注册被跳过）
- [x] `use-conversation.test.ts` 拆分后各子文件聚焦单一 domain，全部既有断言保留（16 用例 4 文件，无断言丢失）
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai test` 通过（拆分后 test count 不减少：358 green）

## Draft Review Record

- Reviewer / Agent: independent sub-agent fresh session (round 1 `ses_06b970c9effeM5N6eYh8tUpTk5`, round 2 `ses_06b91d3bbffeWygBsr0SVCDmbJ`)
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - R1 [Major] component-handle-no-registry misattributed to `ai-component-handle.ts` → corrected to `ai-chat.tsx:144-154`（`:152` skip）+ test target `renderers/__tests__/component-handle.test.tsx`
  - R1 [Minor] connector-throw lastError line `:406` → corrected to `:302`
  - R1 [Minor] clear() guard line `:451-464` → corrected to `:483-489`
  - R1 [Minor] markdown-buffer path `engine/markdown-buffer.ts` → corrected to `renderers/ai-bubble/markdown-buffer.ts`（全部 5 处）
  - R2 [Minor] Phase 3 Targets header stale path → fixed
  - R2 pass-with-minors: zero Blocker / zero Major, remaining minors non-blocking（JSX 已迁移、nop- 枚举边界）

## Closure Gates

> Closure-audit 必须由独立子 agent（fresh session）完成，执行 session 不得自审勾选。

- [x] O-4 附件 id 碰撞已修复，有回归测试
- [x] tool-no-executor 失败路径写 `lastError`，与 connector-throw 对齐
- [x] clipboard copy 失败时不显示 "Copied"
- [x] AiChatProvider value 引用稳定
- [x] ai-voice-input effect deps 不含 `props.events`
- [x] MaybePromise 单一来源
- [x] toActionError 死导出已移除
- [x] markdown-buffer 仅导出 `safeMarkdownSlice`
- [x] nop- 前缀仅在组件根元素
- [x] `.ai-bubble-cursor` 改 data-slot
- [x] `.nop-ai-message-list` 不承载视觉规则
- [x] clear() guard + component-handle-no-registry 各有测试
- [x] use-conversation.test.ts 已拆分
- [x] 不存在被静默降级到 deferred 的 in-scope live defect
- [x] 受影响 owner docs 已同步（本计划不改公共 API 签名；styles.css marker 变更不触及 `renderer-markers-and-selectors.md` / `styling-system.md` 的既存条目 → 无需同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（暂无；执行中若出现需裁定项，按 `Non-Degradable Items` 规则处理。）

## Non-Blocking Follow-ups

- （文档一致性项见 `docs/plans/2026-07-24-2300-2-ai-p2-doc-consistency-remediation.md`）
- 全仓 raw `<button>` 收敛（独立全仓任务，待建）

## Closure

Status Note: 全部 5 个 Phase 执行完毕，所有 Closure Gate 由独立 closure-audit（fresh session `ses_06b7b5422ffeWruwWwKBp2Gj4d`）逐条核实，VERDICT: PASS（zero Blocker / zero Major）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session (`ses_06b7b5422ffeWruwWwKBp2Gj4d`, general)
- Evidence: 逐 gate 复核 live repo 源码 + 测试 + 命令输出。关键证据——
  - O-4: `ai-attachments.tsx` `generateAttachmentId()`（crypto.randomUUID + counter 回退）；`ai-attachments-duplicate-id.test.tsx` 断言碰撞对唯一 id + 删除存活。
  - tool-no-executor: `create-engine.ts:254-259` 写 `draft.lastError`；`engine-tool-loop.test.ts:174-175` 断言 Error。
  - clipboard: `ai-feedback.tsx:30-37` + `markdown.tsx:107-114` 仅 `.then` setCopied；reject 测试断言按钮不切 Copied。
  - AiChatProvider: `ai-chat.tsx:274-277` useMemo（无条件 hook 顺序，early return 之前）。
  - ai-voice-input: eventsRef + effect deps `[unsupported]`。
  - MaybePromise 单一来源（`rg "export type MaybePromise"` 仅 `engine/types.ts`）；toActionError 零命中；markdown-buffer 仅 `safeMarkdownSlice`。
  - marker 纯净: `contract-honesty.test.ts` 静态扫描 + 根集合 14 个 marker；`.ai-bubble-cursor` / `.nop-ai-message-list` 视觉规则已移至 data-slot。
  - clear() guard + component-handle-no-registry focused 测试各一。
  - use-conversation 拆 4 文件，原文件已删除。
  - 工具链: typecheck ✓ / lint ✓ / build ✓ / test ✓（47 文件 / 358 用例全绿）。
- Verdict: PASS（zero Blocker / zero Major）。

Follow-up:

- 文档一致性 P2 项（engine.md label / renderers.md·design.md line rot / terminology.md / AGENTS.md:9）由 `docs/plans/2026-07-24-2300-2-ai-p2-doc-consistency-remediation.md` 收口。
- 全仓 raw `<button>` 收敛为独立全仓任务，待建。
