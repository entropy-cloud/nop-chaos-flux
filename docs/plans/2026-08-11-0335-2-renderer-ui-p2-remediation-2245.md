# 2 Renderer/UI 族 P2 修复（citations 显式空 sources / clipboard 假成功 / timestamp 崩溃 / message-list 空态 className / attachments region 名 / ActionScope 实例隔离）（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Work Item: Follow-up Backlog P2（2026-08-10-2245 双审计 renderer/UI 族）：R2-F1 / R2-F2 / R3-F1 / FIND-13 / FIND-20 / R1-F5
> Last Reviewed: 2026-08-11
> Source: `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（2026-08-10-2245 双审计 P2 填充节）、`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-13/FIND-20）、`docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`（R2-F1/R2-F2/R3-F1/R1-F5）；live repo 核对 2026-08-11（HEAD `6085f697d`，行号以审计时点为准，执行时 live 复核）
> Related: `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`（engine/adapter 族 P2，独立 closure surface）、`docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`（契约/文档族 P2，独立 closure surface）

## Purpose

修复 2026-08-10-2245 双审计遗留的 **renderer/UI 族 6 条 P2**（0 P0/P1）：① `ai-citations` 显式 `sources: []` 不覆盖 `metadata.sources`——host 无法按消息禁用引用渲染（R2-F1，P2-7 显式空数组契约的 sibling 成员）；② markdown CodeBlock 复制在无 `navigator.clipboard` 环境报假「已复制」（R2-F2，ai-feedback P3 家族第二实例）；③ `TimestampContentRenderer` 对 host 可写非法 `metadata.createdAt` 无防护——`toISOString()` 抛 RangeError 崩整棵气泡树（R3-F1，F6 cloneMessages 同族未守卫成员）；④ ai-message-list 空态分支丢弃 `props.meta.className`（FIND-13，canonical-root className 路由契约空态断链）；⑤ ai-attachments 根节点 `role="region"` 无 accessible name（FIND-20，landmark 语义失效）；⑥ `ai` ActionScope namespace 无实例隔离——同页双 ai-chat 后挂载者顶替 + 先卸载者整 namespace 注销（R1-F5，action-scope.ts 语义 + ai-chat 无守卫）。

每条修复带 test-first 回归断言（RED→GREEN）+ 类别清扫；R1-F5 的完整多实例隔离方案属结构性方案，本 plan 只做 P2 级守卫 + 文档化（决策项）。

## Current Baseline

（live repo 核对 2026-08-11；行号 = 审计时点 2026-08-10，0008-1/2/3 修复后部分漂移，执行时 live 复核）

- **R2-F1（citations 显式空 sources）**：`ai-citations.tsx:465-486` `resolveSources` 要求 `Array.isArray(explicitSources) && explicitSources.length > 0` 才走显式源 → 显式 `sources: []` 静默落到 `metadata.sources` / `data-sources`；`schemas.ts:344` 承诺「Explicit sources（overrides metadata.sources / data-sources）」；ai-feedback 的 P2-7 已修同族（显式空数组 = 显式意图）。live 核对：`resolveSources` 首判 `length > 0`。
- **R2-F2（clipboard 假成功）**：`markdown.tsx:119-130` `handleCopy` 经 `copyToClipboard` → `clipboardAdapter.writeText`；`clipboardAdapter.writeText`（`:166-177`）在无 `navigator.clipboard` 时返回 `undefined`（非 reject）→ `Promise.resolve(undefined)` 成功 → `setCopied(true)` 假「已复制」；已处理 reject 但未处理 API 缺失面。live 核对：`clipboardAdapter` 缺 API 时 `return undefined`。
- **R3-F1（timestamp 崩溃）**：`timestamp.tsx:17-30` `typeof createdAt !== 'number'` 守卫放行 `NaN`/越界值 → `new Date(NaN)` → JSX 属性 `dateTime={date.toISOString()}` 在 `formatTimestamp` 的 try/catch 之外抛 RangeError → 整棵气泡树崩溃（ai-chat 无 Error Boundary）；F6 cloneMessages 已修同族（host 注入崩溃面），本成员未守卫。live 核对：`date.toISOString()` 在 JSX 返回语句中，先于 `formatTimestamp` 的 try/catch。
- **FIND-13（空态 className）**：`ai-message-list.tsx:61-76` 空态分支 `cn('nop-ai-message-list')`（`:64`）无 `props.className`；非空分支 `:78-90`（`:81`）含 `cn('nop-ai-message-list', props.className)`；同包先例 ai-prompts.tsx:49 / ai-suggestions.tsx:89 空态保留 className。live 核对：空态分支位于 `messages.length === 0` 早退。
- **FIND-20（attachments region）**：`ai-attachments.tsx:214-227` 根 div `role="region"`（`:222`）无 `aria-label`/`aria-labelledby` → 未命名 region 不作为 landmark 暴露（WCAG 4.1.2/1.3.1）。live 核对：根节点有 `role="region"`，无命名属性。
- **R1-F5（ActionScope 实例隔离）**：`ai-chat.tsx:200-206` `useNamespaceRegistration(actionScope, 'ai', ...)` namespace-keyed；`flux-runtime/src/action-scope.ts:53-68` `registerNamespace` 同 namespace 重复注册时 `cleanupProvider(existing)` 顶替 + unregister 删整个 namespace → 同页双 ai-chat 的 `ai:*` 动作路由到后挂载者，先卸载者注销后 namespace 消失；ComponentHandle 路径 cid-isolated 无此问题。live 核对：`action-scope.ts:53-68` 顶替语义确认。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中；AI 包基线 **79 files / 678 tests 全绿**（0008-3 收口后，roadmap 2026-08-11 收口注记）。
- Bug note 编号：live 最高 **153**，新增编号 **154+**（与 sibling 1 共用编号区间，执行时协调分配）。
- 授权：全为 P2 backlog 既定修复，按 roadmap Rule 走 plan 生命周期。**R1-F5 不改 flux-runtime 公共语义**——守卫与文档化落在 AI 包侧（ai-chat 检测 + engine.md/renderers.md 注记）；完整实例隔离方案（action-scope 支持多实例/按实例作用域）超出本 plan 范围，属结构性重构需人工确认。

## Goals

- 6 条 P2 全部修复（test-first：每条先写 RED 回归测试 → 修复 → GREEN），强制类别清扫（修任一组件 grep 全部同类兄弟一并核对，清扫记录入档）。
- R2-F1：显式 `sources: []` 成为权威覆盖（overrides metadata.sources / data-sources），回归测试钉住「显式空数组 → 零引用卡」。
- R2-F2：无 `navigator.clipboard` 环境不再报「已复制」（保持按钮原态或显式失败态），回归测试钉住 API 缺失面。
- R3-F1：非法 `metadata.createdAt`（NaN/越界/非法字符串）不崩树——守卫提前返回 null，回归测试钉住「非法值 → 不渲染 timestamp、树存活」。
- FIND-13：空态分支 className 路由与 props.meta.className 合并（对齐非空分支 + ai-prompts/ai-suggestions 先例），回归测试钉住空态 className 存在。
- FIND-20：`role="region"` 补 accessible name（`aria-label`，i18n key），回归测试（可测面：aria-label 存在）。
- R1-F5：ai-chat 注册 namespace 前检测既有 provider 冲突 → 显式 warn（一次性）+ engine.md/renderers.md 文档化「单页多 ai-chat 的 `ai:*` namespace 语义：后挂载者接管，先卸载者注销」；回归测试钉住 warn 触发面（或文档注记 + 测试注明限制）。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants` live 零命中、engine.md / renderers.md / i18n / bug notes / daily log 同步。

## Non-Goals

- 不处理 engine/adapter 族 P2（FIND-12 + R1-F2/R1-F3/R1-F4 + FIND-22/R2-F3）——已在 `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`。
- 不处理契约/文档族 P2（FIND-07/08/09/14/19/10/11/15/16/17/18）——已在 `docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`。
- **不做 flux-runtime action-scope 结构性重构**（多实例隔离 / 按实例作用域）；R1-F5 只做 AI 包侧守卫 + 文档化，完整方案入非阻塞 follow-up（需人工确认）。
- 不做 host 输入归一化统一入口（R1-F2 族注释建议的更大方案，见 open-audit 总评 §2）；只修 timestamp 单点。
- 不裁决 P3/观察项；不执行全量仓库验证（归 Closure Gates）。

## Scope

### In Scope

- `renderers/ai-citations.tsx`（R2-F1 `resolveSources`）、`renderers/ai-bubble/renderers/markdown.tsx`（R2-F2 clipboard 面）、`renderers/ai-bubble/renderers/timestamp.tsx`（R3-F1 守卫）。
- `renderers/ai-message-list.tsx`（FIND-13 空态 className）、`renderers/ai-attachments.tsx`（FIND-20 aria-label）。
- `renderers/ai-chat.tsx`（R1-F5 namespace 冲突守卫 + warn）。
- 测试：`renderers/__tests__/` 对应文件（ai-citations / ai-bubble（markdown、timestamp）/ ai-message-list / ai-attachments / ai-chat 相关测试）。
- 文档：`engine.md` / `renderers.md`（R1-F5 多实例注记 + R3-F1 host 可写字段防御注记）、i18n key（如新增）、bug notes 154+、daily log。

### Out Of Scope

- engine/adapter 族 P2、契约/文档族 P2、flux-runtime action-scope 结构性重构、host 输入归一化统一入口、P3/观察项、全量仓库验证。

## Failure Paths

| 场景                         | 触发                                              | 行为                                                            | 可重试 | 用户可见表现                 |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------------------------- | ------ | ---------------------------- |
| citations-empty-sources      | 消息显式 `sources: []` 但 metadata 含 sources     | 回归测试 RED；修复后零引用卡渲染（显式空数组权威）              | 是     | host 可按消息禁用引用        |
| clipboard-absent             | 无 `navigator.clipboard`（非 https / 沙箱）点复制 | 回归测试 RED；修复后不显示「已复制」假成功                      | 是     | 无假「Copied」反馈           |
| timestamp-invalid            | host 写 NaN/越界 `metadata.createdAt`             | 回归测试 RED；修复后 timestamp 不渲染、树不崩                   | 是     | 无整树崩溃（RangeError）     |
| message-list-empty-className | 空会话 + schema className                         | 回归测试 RED；修复后空态根节点含 className                      | 是     | schema className 空态不消失  |
| attachments-region-name      | 渲染 attachments 区域                             | 回归测试（aria-label 存在）；修复后 landmark 可命名             | 是     | 无障碍 landmark 语义恢复     |
| namespace-conflict           | 同页双 ai-chat                                    | warn 一次性 + 文档注记；`ai:*` 动作路由语义明示（后挂载者接管） | 是     | 无静默路由错乱（有显式警告） |

## Test Strategy

本档选择：必须自动化

renderer 行为 + a11y 契约回归（roadmap Rule：不变式门禁即测试的精神扩展到 renderer 行为面）；每条 P2 的 Proof（RED 回归测试）先于 Fix；R1-F5 守卫面以 warn 断言 + 文档注记双面收口（行为面可测则测，纯文档面按 guide 不凑条目）。

## Execution Plan

### Phase 1 — citations 显式空 sources（R2-F1）+ 类别清扫

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-citations.tsx`、`src/renderers/__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（显式空数组权威）——消息显式 `sources: []` + metadata.sources 非空 → 断言渲染零引用卡（`sources` 解析为空）；修复前 RED
- [ ] Proof: RED 回归测试（data-sources 覆盖面）——显式 `sources: []` + content `data-sources` 非空 → 断言零引用卡；修复前 RED
- [ ] Fix: `resolveSources` 契约修正——`Array.isArray(explicitSources)`（含空数组）即权威返回 `normalizeSources(explicitSources)`；metadata / data-sources fallback 仅在 explicitSources 为 undefined/非数组时触发
- [ ] Fix: 类别清扫——全部「显式输入覆盖 metadata」契约面核对：ai-feedback（P2-7 已修）/ ai-citations（本面）/ 其余消费 `metadata.*` 的渲染器是否同族；清扫记录入档
- [ ] Proof: 既有 citations 测试零回归（metadata 路径用例保持绿）

Exit Criteria:

- [ ] R2-F1 两条 RED 测试全部转 GREEN（显式空数组覆盖 metadata 与 data-sources）
- [ ] 既有 citations 用例零回归（非空显式/无显式路径行为不变）
- [ ] 类别清扫记录入档（显式输入覆盖契约核对结论）

### Phase 2 — clipboard 假成功（R2-F2）+ 类别清扫

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`、`src/renderers/__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（无 clipboard API）——`navigator.clipboard` 缺失（stub 移除）→ 点复制 → 断言不出现「Copied」（按钮保持原态）；修复前 RED
- [ ] Proof: RED 回归测试（writeText 缺失面）——`navigator.clipboard` 存在但无 `writeText` → 同上断言；修复前 RED
- [ ] Fix: `clipboardAdapter.writeText` 缺失面语义——API 缺失时返回 reject 或显式失败信号（`handleCopy` 的 `.catch` 路径保持按钮原态，与既有拒绝处理一致）
- [ ] Fix: 类别清扫——全包「复制」面核对：ai-feedback 复制（P3 登记，同根因）/ markdown CodeBlock（本面）/ 其余 copy 交互；清扫记录入档（P3 已登记项是否顺带收敛，记录结论）
- [ ] Proof: 既有 markdown 复制用例零回归（正常路径「Copied」仍成立）

Exit Criteria:

- [ ] R2-F2 两条 RED 测试全部转 GREEN（API 缺失与 writeText 缺失两面对称）
- [ ] 既有复制用例零回归（正常环境「Copied」保持）
- [ ] 类别清扫记录入档（全包复制面核对结论）

### Phase 3 — timestamp 非法值守卫（R3-F1）+ 类别清扫

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/timestamp.tsx`、`src/renderers/__tests__/`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（NaN）——`metadata.createdAt = NaN` → 断言组件渲染 null、树不崩（无 RangeError）；修复前 RED
- [ ] Proof: RED 回归测试（越界/非法值面）——`Number.MAX_VALUE`、非法字符串→数字等 host 可写值 → 断言不崩树；修复前 RED
- [ ] Fix: 守卫修正——`typeof createdAt !== 'number'` 之外补 `Number.isFinite(createdAt)` **且 Date 可表示范围**检查（Date 有效范围 ±8.64e15 ms；`Number.isFinite(Number.MAX_VALUE)` 为 true 但 `new Date(Number.MAX_VALUE)` 仍非法）——或等价实现：`Number.isNaN(date.getTime())` 早退 / 对 `toISOString()` 兜底 try-catch；对齐 ai-token-usage 的 isFinite 先例并补足 Date 语义
- [ ] Fix: 类别清扫——全包「host 可写 metadata 数值面」核对：ai-token-usage（已 isFinite）/ timestamp（本面）/ 其余消费 `metadata.*` 数值的渲染器；清扫记录入档
- [ ] Proof: 既有 timestamp 用例零回归（合法值渲染保持）

Exit Criteria:

- [ ] R3-F1 两条 RED 测试全部转 GREEN（NaN + 越界值不崩树）
- [ ] 既有 timestamp 合法值用例零回归
- [ ] 类别清扫记录入档（host 可写数值面核对结论）

### Phase 4 — message-list 空态 className（FIND-13）+ attachments region 名（FIND-20）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`、`src/renderers/ai-attachments.tsx`、`src/renderers/__tests__/`、i18n

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（空态 className）——空会话渲染 → 断言根节点 class 含 `props.meta.className` 值；修复前 RED
- [ ] Fix: 空态分支 `cn('nop-ai-message-list', props.className)`（对齐非空分支 :81 与 ai-prompts/ai-suggestions 先例）
- [ ] Fix: 类别清扫——全包「空态/缺省分支丢 className」面核对：ai-message-list（本面）/ ai-prompts（已含）/ ai-suggestions（已含）/ 其余含空态分支的 renderer；清扫记录入档
- [ ] Proof: RED 回归测试（region accessible name）——渲染 attachments → 断言根节点 `aria-label` 非空（i18n `flux.ai.attachments` 或等价 key）；修复前 RED
- [ ] Fix: 根节点补 `aria-label={t('flux.ai.attachments')}`（i18n en/zh 对称注册，对齐既有 `flux.ai.*` key 先例）；或按组件语义改 role（裁定记录）
- [ ] Proof: 既有 message-list / attachments 用例零回归

Exit Criteria:

- [ ] FIND-13 RED 测试转 GREEN（空态 className 合并）；既有空态用例零回归
- [ ] FIND-20 RED 测试转 GREEN（aria-label 存在）；i18n en/zh 对称
- [ ] 类别清扫记录入档（空态 className 面 + region 命名面）

### Phase 5 — ActionScope namespace 冲突守卫（R1-F5）+ 文档化 + 收口

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`docs/components/flux-renderers-ai/engine.md`、`docs/components/flux-renderers-ai/renderers.md`、`src/renderers/__tests__/`、`docs/bugs/`、`docs/logs/2026/08-11.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] Proof: RED 回归测试（冲突 warn）——同页双 ai-chat（`useNamespaceRegistration` 同一 actionScope）→ 断言后挂载者触发一次性 warn（console.warn spy）；修复前 RED（现无 warn）
- [ ] Fix: ai-chat 注册前检测——`actionScope` 已有 `ai` provider 且非本实例时 `console.warn` 一次（指向 design.md §14.2「ActionScope namespace（P1）」多实例注记 + 本 plan 新增 engine.md 注记节，engine.md 无 §8.7/§14，不引用不存在的锚点）；不改变注册/注销语义
- [ ] Decision: 完整实例隔离方案评估与裁定——方案（按实例 namespace / 前缀隔离 / action-scope 多 provider）各自影响面（flux-runtime 公共 API 变更）记录，裁定为「超出 P2 范围，入非阻塞 follow-up 需人工确认」
- [ ] Fix: engine.md / renderers.md 文档化——「单页多 ai-chat：`ai:*` namespace 由后挂载者接管、先卸载者注销；ComponentHandle 路径 cid-isolated；多实例需 host 侧按实例作用域或等待完整方案」；与 Plan 3 FIND-19 双接口文档化协调（同文档面）
- [ ] Fix: bug notes 154+（R2-F1/R2-F2/R3-F1/FIND-13/FIND-20/R1-F5 族，按 guide；R1-F5 注明决策 + 完整方案 follow-up）
- [ ] Proof: AI 包全量测试 + `check:ai-engine-invariants` live 复跑 exit 0
- [ ] Follow-up: daily log `docs/logs/2026/08-11.md` 记录本 plan 收口

Exit Criteria:

- [ ] R1-F5 RED 测试转 GREEN（冲突 warn 触发）；既有 ai-chat 用例零回归
- [ ] 决策记录入档（完整方案裁定 + 理由）；engine.md / renderers.md 多实例注记同步
- [ ] bug notes 154+ 与 daily log 收口记录落档；`check:ai-engine-invariants` exit 0

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_012cd745affeGubTBp2lXkC1tx`）
- Verdict: `pass-with-minors`（达成共识：零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - Minor-1（warn 锚点引用不存在的 engine.md §8.7/§14.2——engine.md 无 §8.7/§14，真实 §14.2 在 design.md:637）→ 已改指向 design.md §14.2 + 本 plan 新增 engine.md 注记节
  - Minor-2（R3-F1 守卫 `Number.isFinite` 不足——`Number.isFinite(Number.MAX_VALUE)` 为 true 但 Date 不可表示，toISOString 仍抛）→ 已补「isFinite + Date 可表示范围 / getTime() 早退 / toISOString 兜底」

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 6 条 P2（R2-F1 / R2-F2 / R3-F1 / FIND-13 / FIND-20 / R1-F5）全部修复落地（test-first RED→GREEN 证据在案）
- [ ] R1-F5 守卫 + 文档化收口（完整方案决策入档，不做结构性重构）
- [ ] 类别清扫记录入档（显式输入覆盖契约 / 全包复制面 / host 可写数值面 / 空态 className 面）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（engine.md / renderers.md / i18n / bug notes / daily log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### engine/adapter 族 + 契约/文档族 P2 全量（17 条）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分属不同结果面（engine/adapter 行为 / 契约文档 truthfulness），已分别路由 `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md` 与 `docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`，不阻塞本 plan 的 6 条 renderer/UI P2 收口
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`、`docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`（同一起草轮三 plan 并行路由）

### R1-F5 完整实例隔离方案（flux-runtime action-scope 多实例支持）

- Classification: `optimization candidate`（结构性方案）
- Why Not Blocking Closure: 涉及 `flux-runtime/src/action-scope.ts` 公共语义变更（多 provider / 按实例作用域），属结构性重构需人工确认；当前 P2 守卫（warn）+ 文档化已消除「静默路由错乱」的信息缺失，单页多 ai-chat 仍可用 ComponentHandle 路径（cid-isolated）
- Successor Required: `yes`
- Successor Path: 非阻塞 follow-up（需人工确认后另立 plan）

### FIND-21（ai-bubble-hitl.test.tsx 模块级 `let captured`）

- Classification: `watch-only residual`（已修复核销）
- Why Not Blocking Closure: 已在 plan `docs/plans/2026-08-11-0008-1-renderer-contract-wiring-onapproval-and-projection-remediation.md` Phase 1 顺带修复，本 plan 不重复处理
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-2245 双审计 P2 填充节，本 plan 收口时同步回写路由收口注记）。
- R1-F5 完整实例隔离方案（需人工确认的 structural 选项）。
- open-audit 总评建议的「host 输入归一化统一入口」（R3-F1 同族的更大方案，P3 级观察项）。

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）

Follow-up:

- （待填）
