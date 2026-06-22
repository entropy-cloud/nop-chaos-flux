# E3 condition-builder 异步 field/operator 元数据加载

> Plan Status: abandoned
> Last Reviewed: 2026-06-22
> Abandoned reason: 违反「请求必须下沉」设计原则。该 plan 引入了组件级挂载时 auto-fetch（initFetch 等价物），属 rejected 的 amis 组件级 api 模式变形。详见 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行）、`docs/components/condition-builder/design.md` §2 L32「异步 field/operator 元数据加载（`source` 走 api）— 计划实现（E3 P2 批）」、`docs/components/condition-builder/design.md` §4 L106「远程字段来源：`source`」
> Related: `docs/plans/2026-06-22-0149-1-e3-condition-builder-formula-completion-plan.md`（E3 formula 收口；本 plan 是 condition-builder E3 最后一项子能力）、`docs/plans/2026-06-21-0010-e0d-condition-builder-drift-fix-plan.md`（E0d：source 进 types）、`docs/plans/2026-06-21-1345-1-x4-data-source-request-layer-enhancement-plan.md`（X4：executeSource + sendOn/initFetch gate 模式范本）
> Mission: components-improvement
> Work Item: E3 P2 — condition-builder async field/operator metadata loading

## Purpose

把 condition-builder 的 `ConditionBuilderSchema.source` 从**声明但 runtime 不消费**（design.md §2 L32 明确标 `计划实现（E3 P2 批）`）收口为**有明确语义、有 runtime 消费、有 focused 验证**的落地契约：当 `source` 指向 data-source 时，renderer 在挂载时通过 `helpers.executeSource` 异步加载 field/operator 元数据，加载完成后替换或合并静态 `fields`，加载中/失败有明确降级路径。这是 E3 P2 批 condition-builder 子项的**最后一项**（formula 已由 0149-1 收口），收口后 E3 P2 condition-builder 子项全部完成。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:154` — `ConditionBuilderSchema.source?: string` 已声明（E0d 进 types）；design.md §2 L32 明确标 `计划实现（E3 P2 批）`，§4 L106 注明「远程字段来源：`source`」。
- runtime 不消费 `schemaProps.source`：`condition-builder.tsx:129` 直接 `const fields = (schemaProps.fields ?? []) as ConditionField[]`，**同步读静态 fields，无 async 加载分支**。`grep -n "schemaProps.source\|props\.props\.source" condition-builder.tsx` 确认零引用。
- 既有 async 加载范本（本 plan 复用）：
  - E3 formula（0149-1）：`condition-builder.tsx:99-105` 已用 `helpers.executeSource({ type: 'source', formula: sourceExpr }, { scope })` 加载 formula 上下文 → `result.data` → `helpers.createScope`。本 plan 的 field/operator 加载走同一 `executeSource` 入口，但消费的是 `ConditionField[]` 而非 formula scope。
  - E2d tree async（`docs/plans/2026-06-21-0722-e2d-tree-async-and-virtual-plan.md`）：tree-select/input-tree 用 `executeSource` 加载 options，模式成熟。
  - X4（`docs/plans/2026-06-21-1345-1-x4-...-plan.md`）：data-source `sendOn`/`initFetch` gate + `onSuccess`/`onError` lifecycle event 已落地，本 plan 可复用 data-source 层能力（不在 renderer 开 api 短路径，X3 §1/§3）。
- `ConditionSelectField.source?: string`（types.ts:80）已存在——这是 select **选项**的 source（单字段级），与 builder 级 `ConditionBuilderSchema.source`（**field/operator 元数据**的 source）是不同维度。本 plan 只处理 builder 级 source；select 字段级 source 保持现状（如未来需要可独立评估）。
- design.md §7 L134 已裁定：「远程字段解析属于组件内受控加载逻辑，不应反向发明新的宿主级状态协议」——本 plan 的加载状态归 component local state，不走 form runtime。
- design.md 已有完整 Flux 决策表（§2，X5 已覆盖），本 plan 只需把 §2 L32 行从 `计划实现（E3 P2 批）` 翻转为 `实现（E3 收口）`。
- 测试基线：`packages/flux-renderers-form-advanced/src/condition-builder/` 下已有 `condition-builder-renderer.test.tsx`(647 行)、`condition-builder-formula.test.tsx`(403 行)、`condition-builder-drift.test.tsx` 等充足测试基建。

## Goals

- `ConditionBuilderSchema.source` 具备明确 runtime 语义：当 `source` 非空时，renderer 通过 `helpers.executeSource({ type: 'source', formula: source }, { scope })` 异步加载 field/operator 元数据（`ConditionField[]` + 可选 `ConditionOperatorOverrides`），加载完成后用作有效 fields。
- runtime 真实消费 `source`（不再静默忽略），消费路径有 focused 单测证明行为成立。
- 加载中/加载失败/加载成功三态有明确降级：加载中用静态 fields 兜底（或空数组 + loading marker），加载失败降级为静态 fields + console.warn（dev only），不阻塞 renderer 渲染。
- `design.md` §2 对应行翻转为 `实现（E3 收口）`，§4/§7 补充 source 加载语义、响应形状、降级路径，消除 owner-doc drift。
- 收口 E3 P2 condition-builder 子项最后一项；roadmap E3 P2 行补注 condition-builder async metadata loading ✅ done。

## Non-Goals

- 不实现 condition-builder 的远程搜索/过滤（那是 `searchable` 字段的职责，已由 E0d 落地）。
- 不实现 `ConditionSelectField.source`（select 字段级选项 source）的 runtime 消费——这是字段级选项加载，与 builder 级元数据加载是不同维度，归独立评估。
- 不引入 polling/interval/auto-refresh（source 加载是 initFetch 语义，挂载时加载一次；如需刷新走 `component:refresh` capability 或 data-source `sendOn` gate，X4 已落地）。
- 不实现 source 响应的 schema 级静态校验（响应形状校验在 runtime 做 defensive parsing，不引入编译期 schema 校验通道）。
- 不改 condition-builder 的 builderMode / draggable / uniqueFields / formulas 等已有能力。
- 不覆盖 E3 其它组件——归各自 E3 plans（已全部收口）。

## Scope

### In Scope

- `source` 运行期语义定稿（data-source 名 / scope 路径 / 表达式串，通过 `executeSource` 解析）。
- source 响应形状定稿（`{ fields: ConditionField[], operators?: ConditionOperatorOverrides }` 或裸 `ConditionField[]`，defensive parsing）。
- `useConditionBuilderSource` hook（或等效 inline 逻辑）：挂载时调 `executeSource`、管理 loading/error/data local state、cleanup on unmount。
- `condition-builder.tsx` 接线：`source` 非空时走 async 分支，加载结果与静态 `fields` 的 merge/replace 策略。
- 加载中/失败/成功三态 UX：loading marker（`data-slot="condition-builder-source-loading"`）、error 降级（console.warn + 静态 fields 兜底）。
- focused 单测覆盖：source 加载成功（fields 替换/合并）、加载中（静态兜底）、加载失败（降级 + warn）、source 空（无 async 分支）、source 响应形状 defensive parsing、unmount cleanup。
- `design.md` §2/§4/§7 同步；roadmap E3 P2 行状态联动。
- playground 示例 + e2e 测试。

### Out Of Scope

- `ConditionSelectField.source` 字段级选项加载（独立维度）。
- source polling / interval / auto-refresh。
- source 响应的编译期 schema 校验。
- condition-builder 与外部规则引擎的深度集成（批量 import/export）。

## Failure Paths

| 场景编号                 | 触发                                     | 行为                                                                       | 可重试 | 用户可见表现                                          |
| ------------------------ | ---------------------------------------- | -------------------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| cb-source-loading        | `source` 非空，`executeSource` 进行中    | 渲染静态 `fields`（如有）或空 fields + loading marker                      | 否     | builder 可用（静态 fields 如有），顶部 loading 提示   |
| cb-source-error          | `executeSource` reject / 抛错            | 捕获 → console.warn（dev）→ 降级为静态 `fields`（如有）或空 fields         | 否     | builder 渲染静态 fields，控制台 warn（dev only）      |
| cb-source-empty-response | `source` 解析成功但响应无 fields         | 降级为静态 `fields`（如有）或空 fields；不报错                             | 否     | builder 渲染静态 fields 或空状态                      |
| cb-source-invalid-shape  | 响应字段形状不符合 `ConditionField` 契约 | defensive parsing 过滤无效条目，保留有效条目；全部无效则降级为静态 fields  | 否     | builder 渲染有效子集或静态 fields，控制台 warn（dev） |
| cb-source-merge-conflict | source fields 与静态 fields 同名         | source fields 优先（replace 语义）；静态 fields 仅在 source 加载失败时兜底 | 否     | builder 渲染 source 版本的字段定义                    |

## Test Strategy

本档选择：`必须自动化`

理由：本 plan 收口的是一个**已声明但 runtime 静默忽略**的契约（`source` 字段存在于 types 但 runtime 不消费，design.md 明确标 `计划实现`），属于核心行为落地，必须 Proof-before-Fix。async 加载路径、三态降级、defensive parsing 是可回归的关键路径。

## Execution Plan

### Phase 1 - 语义裁定与决策表翻转

Status: completed
Targets: `docs/components/condition-builder/design.md`

- Item Types: `Decision`

- [x] **Decision**：定稿 `source` 运行期语义 —— `source: string` 指向 data-source 名或表达式串，renderer 通过 `helpers.executeSource({ type: 'source', formula: source }, { scope })` 解析（与 E3 formula plan 的 `ConditionFormulaConfig.source` 走同一 `executeSource` 入口，保持一致）。`source` 为空时不触发 async 分支（零回归）。语义写入 `design.md` §4。
- [x] **Decision**：定稿 source 响应形状 —— 预期 `{ fields: ConditionField[], operators?: ConditionOperatorOverrides }` 对象，或裸 `ConditionField[]` 数组（defensive parsing 双兼容）。`operators` 可选，存在时覆盖 `ConditionBuilderSchema.operators`（source 优先于静态）。理由：fields 是核心元数据，operators 是可选覆盖；允许裸数组降低后端实现门槛。写入 `design.md` §4。
- [x] **Decision**：定稿 merge 策略 —— **replace 语义**：source 加载成功后，source fields **替换**静态 `fields`（source 是权威来源）。静态 `fields` 仅在 source 未加载/加载失败时作为 fallback。理由：source 是远程权威来源，merge 会引入"哪些字段来自哪里"的歧义；replace 语义简单可观测。写入 `design.md` §4 + §7。
- [x] **Decision**：定稿加载触发时机 —— **initFetch 语义**：renderer 挂载时加载一次（`useEffect` + `executeSource`）；不引入 polling/interval。如需刷新，走 `component:refresh` capability（X1/X4 已落地）或 data-source `sendOn` gate。理由：与 X4 initFetch gate 一致，不发明新触发协议。写入 `design.md` §7。
- [x] **Fix**：`design.md` §2 L32 `异步 field/operator 元数据加载` 行由 `计划实现（E3 P2 批）` 翻转为 `实现（E3 收口）`，理由列更新。

Exit Criteria:

- [x] `design.md` §2 L32 翻转为 `实现（E3 收口）`
- [x] `design.md` §4 schema 代码块 `source?: string | ApiSchema` 收敛为 `source?: string`（与 live `types.ts:154` 一致；`ApiSchema` 形态由 runtime `executeSource` 消费，不进 schema 类型）
- [x] `design.md` §4 含 `source` 运行期语义、响应形状、merge 策略三段说明
- [x] `design.md` §7 新增 §7.6 含加载触发时机（initFetch）+ 三态降级路径说明

### Phase 2 - types + 加载 hook + focused 测试（RED）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`、`packages/flux-renderers-form-advanced/src/condition-builder/use-condition-builder-source.ts`（新增）、`packages/flux-renderers-form-advanced/src/condition-builder/use-condition-builder-source.test.tsx`（新增）

- Item Types: `Proof`、`Fix`

- [x] **Proof**：先写 focused 测试（RED 阶段）—— `use-condition-builder-source.test.tsx` 覆盖以下场景（mock `executeSource`）：
  - `source` 为空 → 不调用 `executeSource`，返回 `{ fields: undefined, status: 'idle' }`
  - `source` 非空 → 调用 `executeSource({ type:'source', formula: source })`，返回 `{ fields, status:'loaded' }`
  - 加载中 → `{ fields: undefined, status: 'loading' }`
  - 加载失败 → 捕获 error，`console.warn`，`{ fields: undefined, status: 'error' }`
  - 响应为裸 `ConditionField[]` → 正确解析
  - 响应为 `{ fields, operators }` → 正确解析 operators
  - 响应字段形状无效 → defensive parsing 过滤无效条目
  - 响应为空/无 fields → `{ fields: undefined, status: 'loaded' }`（空结果，非 error）
  - unmount → cleanup（不 setState on unmounted component）
- [x] **Fix**：新增 `use-condition-builder-source.ts`：
  - 导出 `useConditionBuilderSource(params: { source?: string; scope; helpers }): { fields?: ConditionField[]; operators?: ConditionOperatorOverrides; status: 'idle' | 'loading' | 'loaded' | 'error' }`
  - `source` 为空时返回 `{ status: 'idle' }`（不触发 async）
  - `source` 非空时 `useEffect` 调 `helpers.executeSource({ type: 'source', formula: source }, { scope })`，管理 loading/error/data local state
  - defensive parsing：响应可能是 `{ fields, operators }` 或裸 `ConditionField[]`；逐条校验 `ConditionField` 形状（至少有 `name` + `label` + `type`）
  - cleanup：`useEffect` cleanup 设 cancelled flag，避免 unmount 后 setState
  - **不在 hook 内开 api 短路径**（X3 §1/§3）—— 只通过 `helpers.executeSource` 走 data-source 层
- [x] **Fix**：types.ts 无需改动（`ConditionBuilderSchema.source?: string` 已存在；响应形状在 hook 内做 defensive parsing，不改 schema 类型）。

Exit Criteria:

- [x] `use-condition-builder-source.ts` 存在并导出 `useConditionBuilderSource`
- [x] `use-condition-builder-source.test.tsx` RED 测试全部通过（GREEN 后保持）
- [x] hook 不直接开 api 短路径，只通过 `helpers.executeSource` 走 data-source 层

### Phase 3 - renderer 集成 + 测试转绿（GREEN）

Status: abandoned
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`、`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-renderer.test.tsx`

- Item Types: `Fix`、`Proof`

- [ ] **Fix**：`condition-builder.tsx` 接线 `useConditionBuilderSource`：
  - 调 `const { fields: sourceFields, operators: sourceOperators, status: sourceStatus } = useConditionBuilderSource({ source: schemaProps.source, scope, helpers: props.helpers })`
  - 有效 fields 计算：`sourceFields ?? staticFields`（source 加载成功时 replace；未加载/失败时 fallback 到静态 `schemaProps.fields`）
  - 有效 operators 计算：`sourceOperators ?? operatorsOverride`（source 优先）
  - `sourceStatus === 'loading'` 时渲染 loading marker（`data-slot="condition-builder-source-loading"`）；builder 保持可用（静态 fields 兜底），loading 提示为附加 marker（与 Failure Path `cb-source-loading` 一致：builder 可用 + 顶部 loading 提示）
  - `sourceStatus === 'error'` 时渲染静态 fields fallback（不阻塞 builder 使用）
- [ ] **Proof**：`condition-builder-renderer.test.tsx` 新增 integration 用例：
  - `source` 非空 + mock `executeSource` 成功 → builder 渲染 source fields（非静态 fields）
  - `source` 非空 + mock `executeSource` 失败 → builder 降级为静态 fields
  - `source` 非空 + 加载中 → loading marker 存在
  - `source` 为空 → 无 async 分支，行为与既有完全一致（回归）
  - `source` + `operators` 响应 → operators 被消费
- [ ] **Fix**：渲染逻辑不破坏既有 formula/searchable/draggable 能力（回归验证）。

Exit Criteria:

- [ ] `condition-builder.tsx` 真实消费 `schemaProps.source`（非空时走 async 分支）
- [ ] 三态（loading/loaded/error）有可观测的 DOM 差异（marker / fields 来源）
- [ ] 既有 condition-builder 全部测试无回归（`condition-builder-renderer.test.tsx` + `condition-builder-formula.test.tsx` + `condition-builder-drift.test.tsx`）
- [ ] source 为空时零行为差异（回归 gate）

### Phase 4 - playground demo + e2e + 同步 + Closure

Status: abandoned
Targets: `apps/playground/src/pages/condition-builder-async-source-demo.tsx`（新增或扩展现有）、`tests/e2e/condition-builder-async-source.spec.ts`（新增）、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/condition-builder/design.md`、`docs/logs/2026/06-22.md`

- Item Types: `Fix`、`Follow-up`

- [ ] **Fix**：playground demo —— 新增或扩展示例页面演示 `source` 异步加载：mock data-source 返回 `{ fields: [...], operators: {...} }`，展示加载中→加载完成→builder 可交互的完整流程。
- [ ] **Fix**：e2e 测试 —— `tests/e2e/condition-builder-async-source.spec.ts` 覆盖：source 加载成功后 builder 渲染远程 fields（程序化断言，不依赖截图）。
- [ ] **Follow-up**：roadmap E3 P2 行补注 condition-builder async metadata loading ✅ done + Last Updated 翻转。
- [ ] **Follow-up**：`docs/logs/2026/06-22.md` 记录本 plan 执行。

Exit Criteria:

- [ ] playground demo 可交互演示 source 异步加载
- [ ] e2e 测试程序化断言 source 加载行为
- [ ] roadmap E3 P2 补注 + Last Updated 翻转
- [ ] daily log 含本 plan 记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan-authoring-and-execution-guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 sub-agent round 1（fresh session `ses_11222f552ffeh642Q2VUpiGytG`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor 1（design.md §4 L55 代码块 `source?: string | ApiSchema` 与 live `types.ts:154` 的 `source?: string` 不一致，Phase 1 未要求收敛）：Phase 1 Exit Criteria 新增「§4 schema 代码块收敛为 `source?: string`」条目。
  - Minor 2（Phase 2 Targets 写 `.test.ts` 但 Proof 项写 `.test.tsx`）：Targets 已修正为 `.test.tsx`（hook 管理 React state，需 `.tsx` harness）。
  - Minor 3（Phase 3 引用「Decision 在 Phase 1 定」但 Phase 1 无对应 Decision，且 Failure Paths `cb-source-loading` 已裁定）：Phase 3 loading 描述已对齐 Failure Path `cb-source-loading`（builder 保持可用 + loading marker 附加），移除悬空 Decision 引用。
  - Minor 4（Phase 1 Exit Criteria 未指定 §7 子节名）：已指定为 §7.6。
  - 0 Blocker / 0 Major。Plan 升级为 `active`。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] `ConditionBuilderSchema.source` runtime 消费落地（非空时走 async 加载分支，空时零回归）
- [ ] 三态降级（loading/loaded/error）有 focused test 覆盖
- [ ] defensive parsing（裸数组 vs 对象 + 无效条目过滤）有 focused test 覆盖
- [ ] unmount cleanup 有 focused test 覆盖
- [ ] `design.md` §2 行翻转 + §4/§7 同步
- [ ] roadmap E3 P2 condition-builder async metadata loading ✅ + Last Updated 翻转
- [ ] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> 本 plan 预计无新增 deferred。`ConditionSelectField.source`（select 字段级选项 source）属不同维度，不在本 plan scope。如执行中发现独立优化项需延后，按 guide Anti-Slacking Rule 处理。

## Non-Blocking Follow-ups

- `ConditionSelectField.source`（select 字段级选项 source）的 runtime 消费 —— 独立维度，归后续评估（当前 select 字段的 `options` 静态声明 + `searchable` 已覆盖多数场景）。
- source 响应的 schema 级静态校验（编译期）—— 当前用 runtime defensive parsing，如后续需要编译期校验通道可独立评估。
- source polling / auto-refresh —— 当前 initFetch 语义（挂载时加载一次），如需定时刷新可复用 `component:refresh` capability 或 data-source `sendOn` gate。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
