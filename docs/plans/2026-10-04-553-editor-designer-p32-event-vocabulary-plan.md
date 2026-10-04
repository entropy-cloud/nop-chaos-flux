# 553 事件词汇/save payload 统一落地（P3.2）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P3.2、§7 粒度注记；`docs/architecture/editor-designer-standard.md` §2.6/§6 裁决③
> Related: plan 552（P3.1 前置，done）；plan 544（裁决③：save payload 统一 `{serialized: string}`，最小事件集，禁裸 CustomEvent，测试通道豁免声明）

## Purpose

落地裁决③的事件词汇定版：①save payload 键迁移——scada `serializedConfig`→`serialized`、word `SavedDocumentData`→`{serialized}`（各留一个版本兼容读）；②dashboard 补 `sessionChange`/`modeChange` 事件；③最小事件集适用性裁定成文（pull 型家族经 §2.5 命令面 + §2.4 statusPath 满足）。宿主可见契约变更允许 breaking，但 payload 键迁移留一个版本兼容读。

## Current Baseline

- **scada**：save 事件 payload `{serializedConfig}`（dispatch `scada-editor-canvas.tsx:171` + eventContracts `renderer-definitions.ts:155`）；7 事件 eventContracts 齐备（ready/error/selectionChange/modeChange/sessionChange/save/load）——**仅 payload 键迁移**。
- **dashboard**：save `{serialized}` ✓ 已合规；事件仅 save/error——**缺 sessionChange/modeChange**（roadmap 点名补齐）；renderer 有 dispatchEventRef 模式 + session（useEditorSession，逐 notify 新对象）+ mode 切换站点（`dashboard-editor-renderer.tsx:307-310`）。
- **word**：save 事件 payload = `SavedDocumentData {data, paperSettings, savedAt}`（dispatch `word-editor-action-provider.ts:109` `input.saveEvent(saved, ctx)`；eventContracts `renderers.tsx:111` payload=savedDocumentDataShape）——**payload 迁移**。word save 由 `word-editor:save` 命令面触发后经 saveEvent 推送（混合型）。
- **flow/spreadsheet/report**：无 eventContracts（save 为 §2.5 命令面拉取型，无推送事件面）。
- 消费面：playground scada demo 经 component:save 句柄 result.data 消费（不读事件 payload，迁移零破坏）；word payload 消费者仅 schema onSave 通道。

## Goals

1. **scada 迁移**：dispatch 改发 `{ serialized, serializedConfig }` 双键（新键 primary + 旧键 deprecated 一版）；eventContracts payload = `serialized`（primary）+ `serializedConfig`（deprecated 注记）；future 删旧键归 P5.1 治理。
2. **word 迁移（M1 修正）**：saveEvent 改传 `{ serialized: JSON.stringify(saved.data), data, paperSettings, savedAt }`——**旧 SavedDocumentData 三个顶层键逐一保留一版**（真实兼容读：旧宿主 `${event.data}`/`${event.savedAt}` 继续可用），`serialized` 为新 primary；eventContracts payload = `serialized`（primary string）+ `data`/`paperSettings`/`savedAt`（description 注记 deprecated 一版）。
3. **dashboard 补事件**：新增 `dashboard-editor:sessionChange`（payload {canUndo, canRedo, dirty, mode}，session notify 驱动）与 `dashboard-editor:modeChange`（payload {mode}）；eventContracts + fields 声明；dispatch 站点 = renderer 内 effect（session 值驱动，遵守 rules of hooks——置于 early return 之前）。
4. **最小事件集适用性裁定成文**（editor-designer-standard.md §2.6 增注，m6 措辞修正）：最小事件集治理**推送型**事件面；pull 型家族（flow/spreadsheet/report——save 走 §2.5 命令面）经 capability + §2.4 statusPath（ready=busy/idle、error）满足；word 为**混合型判例**（save 经 word-editor:save 命令面触发后经 onSave 推送回执）。附 sessionChange payload 词汇注（m5 裁定）：至少含 `{canUndo, canRedo, selection, mode}`（scada 现状），dashboard 实现 EditorSessionState 全量摘要 `{canUndo, canRedo, dirty, selection, mode}`（additive 超集方向；scada 加 dirty 待其会话迁移补齐，不在本计划强改）。
5. 各迁移点测试锁定（payload 双键/新键 primary/deprecated 字段声明/dashboard 新事件触发）。

## Non-Goals

- 不删旧键（兼容读保留一版；删除归 P5.1 治理轮）。
- 不为 flow/spreadsheet/report 新增推送事件系统（裁定④成文）。
- 不改 scada 内部 `onSave(serializedConfig: string)` 回调参数名（内部命名非 payload 契约）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/`（dispatch + eventContracts + 测试）。
- `packages/flux-renderers-dashboard/src/editor/`（新事件 + contracts + 测试）。
- `packages/word-editor-renderers/src/`（provider + contracts + 测试）。
- `docs/architecture/editor-designer-standard.md` §2.6（适用性裁定注）。
- **组件文档同步（M2）**：`docs/components/industrial-hmi-editor/design-renderer.md`（3 处 serializedConfig payload 记载）、`docs/components/industrial-hmi-editor/design-architecture.md`（1 处）、`docs/components/dashboard-editor/design.md`（事件字段清单补 onSessionChange/onModeChange）。

### Out Of Scope

- flow/spreadsheet/report 事件系统；旧键删除；playground demo 文案（serializedConfig 提法为 demo 自述，非契约）。

## Failure Paths

| 触发                                         | 行为                                                                                        | 可重试              | 用户可见表现 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------- | ------------ |
| 宿主仍读旧键                                 | 兼容双键一版（scada）/deprecated 字段一版（word）                                           | 是（P5.1 删旧键前） | 无           |
| dashboard effect 重派发（StrictMode/重渲染） | effect 以 session 值驱动；StrictMode dev 双派发与既有 notify 语义一致（可重入安全，纯通知） | 是                  | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（对外事件契约变更；failing-first）。

## Execution Plan

### Phase 1 - scada + word payload 迁移（Proof + Fix）

Status: completed
Targets: industrial scada-editor-canvas/renderer-definitions、word-editor-action-provider/renderers

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：scada contract 测试新键断言先红；word provider payload 断言先红
- [x] （Fix）scada dispatch 双键 + contracts 双键声明（description 注记）；word saveEvent `{serialized, data, paperSettings, savedAt}` + contracts 同型
- [x] 两包全量测试绿（word 165/165；industrial 137 文件全绿）

Exit Criteria:

- [x] 新 payload 键 primary + 兼容读落地（测试锁定；既有两处 pin 按裁定更新且为强化——word host-scope payload 形状 4 键全断言）
- [x] dev log 声明兼容读（docs/logs/2026/10-04.md P3.2 节首条）

### Phase 2 - dashboard sessionChange/modeChange（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx`、definitions

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败测试：2 用例先红（test-support 两个 definition fields 白名单缺新事件键——顺带修正）
- [x] （Fix）两个 dispatch effect（early return 之前；core 守卫；sessionChange 挂载快照派发为裁定行为）+ modeChange 仅真实迁移派发（lastModeRef 守卫，挂载不派发——与 sessionChange 裁定区分）+ payload 含 selection（m5 全量摘要）+ eventContracts/fields 声明
- [x] dashboard 全量测试绿（9 文件 83/83，含 2 新用例）

Exit Criteria:

- [x] 新事件触发与声明一致（测试锁定）；dashboard 零回归

### Phase 3 - 裁定成文 + 组件文档同步（Decision + Fix）

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`、三份组件文档

- Item Types: `Decision`、`Fix`

- [x] （Decision）§2.6 增适用性注（裁决③适用性澄清措辞 + save payload 键迁移纪律注）
- [x] （Fix）design-renderer.md 三处 + design-architecture.md 一处同步统一键+兼容读记载；dashboard-editor/design.md 事件清单补 onSessionChange/onModeChange

Exit Criteria:

- [x] 裁定注成文且与 pull/混合家族现状一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_6aa38c52-b04e-42f8-a30e-5f4feeb02b13）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: M1 word 兼容读改为旧三顶层键逐一保留一版 `{serialized, data, paperSettings, savedAt}`（真实兼容）；M2 组件文档同步补入范围（industrial-hmi-editor 两文档 4 处 + dashboard-editor design.md 事件清单）；m3 deprecated 注记通道=description 文字（无结构化标志，flux-core 类型变更超范围）；m4 挂载时初始派发裁定（接受+pin）+ effect 内 core 守卫；m5 sessionChange 词汇裁定（dashboard 全量摘要含 selection/dirty，scada 保持现状，additive 方向成文）；m6 word=混合型措辞统一；m7 Phase 3 改 Decision+Fix；m8 Deferred 理由收敛为 watch-only；m9 dev log 兼容读声明入 Exit Criteria。

## Closure Gates

- [x] save payload 统一：scada/word 新键 primary + 兼容读一版（dashboard 本已合规）
- [x] dashboard sessionChange/modeChange 落地（触发+声明一致；definitions 与 test-support 双白名单同步）
- [x] 最小事件集适用性裁定成文（standard §2.6 两注）
- [x] 必要 focused verification 已完成（dashboard 83/83 + word 165/165 + industrial 137 文件全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] owner doc 一致（standard §2.6 两注 + 三份组件文档同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P3.2 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

### 旧 payload 键删除（scada serializedConfig / word saved）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 裁决③明文"payload 键迁移须留一个版本的兼容读"；兼容双键使新旧宿主并存可用。删除无既存 owner（P5.1 是守卫+文档收口非键删除扫除）——按 watch-only residual 记录，待未来治理轮或下一版 manifest/contracts revision 时统一执行。
- Successor Required: `no`（watch-only；删除属未来治理动作，非本计划遗留缺陷）

## Non-Blocking Follow-ups

- playground scada demo 的 "serializedConfig" 提法为 demo 自述文案，可在 P4.4 宿主胶水收敛时随手更新。

## Closure

Status Note: save payload 统一（scada 双键/word 四键兼容读）+ dashboard 两新事件（modeChange 仅真实迁移）+ §2.6 两裁定注 + 三份组件文档同步全部落地；独立 closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_1d0720bb-0ef3-4de3-9480-7ada5ba53ece）
- Evidence: VERDICT: approved——word 四键 payload 保全旧三顶层键（M1 核实）、两处修改 pin 均为强化非弱化、dashboard 双 effect 语义（挂载派发/迁移守卫）与契约一致、test-support 双白名单、标准注/组件文档与 live 行为一致、三包独立复跑绿 + 五门禁复核。3 Minor（industrial 包内 4 处旧键注释、sessionChange 无依赖数组超集语义、renderers.tsx satisfies 解绑）均不阻塞，前两者已记 P5.1/后续治理。

Follow-up:

- industrial 包内 4 处旧键注释（schemas.ts:74/runtime-factories.ts:61/scada-editor-canvas.tsx:168/runtime-mutators.ts:302）随 P5.1 文档收口顺手更新；旧 payload 键删除归治理轮；no remaining plan-owned work。
