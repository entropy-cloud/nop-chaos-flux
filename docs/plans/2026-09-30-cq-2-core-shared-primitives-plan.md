# CQ-2 核心层共享原语下沉（flux-core / flux-react 公开 API 增量）

> Plan Status: active
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-D14、CQ-D1、CQ-D9、CQ-C5、CQ-C6）+ 首轮独立评审 live 勘误
> Related: `docs/plans/2026-09-30-cq-3-intra-package-dedup-plan.md`（包内去重消费本 plan 产物）、`docs/plans/2026-09-30-cq-4-cross-package-dedup-plan.md`（其 host-action-provider 对归本 plan Phase 2 所有）、`docs/architecture/flux-core.md`、`docs/architecture/renderer-runtime.md`、`docs/references/renderer-interfaces.md`

## Purpose

为后续去重批提供共享层：小工具（cloneDeep/toJsonPointer 族/genId）、host action-provider 工厂与错误原语、React 侧 `useDebouncedValue`/`useDebouncedCallback`/`useRendererRuntimeOrNull`、RendererDefinition builder。全部为**向后兼容的公开 API 增量**，不做破坏性签名变更。

## Current Baseline

- **toJsonPointer 实为 4 类语义（8 处），非同文**（首轮评审 live 勘误）：
  - A 组（点路径→转义指针，3 处同文）：`flux-renderers-data/src/batch-bar-definition.ts:14`、`data-schema-validation.ts:121`、`flux-renderers-form/src/renderers/form-definition.ts:15`——parsePath + 滤 `$` + escape，空段返回 `''`；
  - B 组（指针追加，2 处同文）：`flux-renderers-data/src/{echarts,sparkline}-schema-validation.ts:4`——path 已是 `/` 指针形态，直接 `${path}${suffix}` 追加，无转义，且含死三元条件；
  - C 组：`table-schema-validation.ts:159`——不滤 `$`、全段转义、不 parsePath；
  - D 组：`flux-renderers-form/src/renderers/hidden-field-policy-schema.ts:11`——签名不同（`(path, key)`），自带解析；
  - E 组：`flux-renderers-map/src/map-renderer-definitions.ts:10`——完全无转义。
- 深拷贝：`flux-renderers-ai/src/engine/utils.ts:24` 手写递归（不动）；`flow-designer-core/src/core/clone.ts:7,43` structuredClone+JSON 回退；裸 `JSON.parse(JSON.stringify)` 生产站点 **6 处**（flow-designer-core/tree-session-impl.ts:33、core.ts:59、core/transactions.ts:98,120、report-designer-core/runtime/metadata.ts:11、spreadsheet-core/core/internal-state.ts:26、**page-designer-renderers/src/page-designer-page.tsx:53** `cloneNode()`——首轮评审补）。
- ID 生成 `Date.now()+Math.random().toString(36)` 变体：**7 文件 / 9 调用点**（flow-designer-core clone.ts:11、tree-structure.ts:65、flow-designer-renderers tree-session.ts:451、form-advanced upload-field.tsx:426、scheduling barcode-queue-utils.ts:33,50、flux-runtime runtime-factory.ts:100,364、word-editor-core dataset-store.ts:72）。注意 `form-advanced/src/condition-builder/id-utils.ts` 是**自增计数器**（`${prefix}-${++seq}` + resetIdSeq，有确定性测试依赖），不在本集合，**保留不迁**（与新 `genId` 同名不同义，需注记防混淆）。
- host action-provider 粘合层 4 包复制，但**非同构**（首轮评审勘误）：report(109L) 与 spreadsheet(90L) 为同构 dispatch 模板（validate → dispatch → toActionResult）；word-editor(194L) 是 6 方法 switch（save 含快照/saveEvent/abort/persist 编排，insertField 走手工检查），flow(558L) 40+ 方法直呼 core/adapter——后两者只有 `validateMethodPayload` 包装与 `toActionError/ok/fail` 原语可共享。flux-core 已有 `validateHostMethodPayload` 原语；`flux-runtime/src/action-adapter.ts:603` 对其的直调为合法核心内部用法（不属于 4 包复制面）。
- `scheduleDebounce`/`cancelPendingDebounce` 已在 flux-core 导出（flux-action-core、flux-runtime 消费）。手写防抖三处：kanban use-kanban-filter.ts:41-56（值型 trailing）、diff-view-renderer.tsx:71-87（4 值共享单 timer）、word-editor-renderers/editor-canvas.tsx:43-51（**回调型** autosave：快照 + onAutosave 回调 + AbortController，非值型）。`flux-runtime/src/async-data/reaction-runtime.ts:385` 可中止语义豁免。
- `flux-react/src/hooks.ts:74` `useRendererRuntime()` 无 runtime 时抛错；`flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:41-63` 旁路（MissingRuntimeContext + 私有 useFluxReactRuntime）是**有记录的刻意决策**（注释引 G3-R3）：容忍测试的部分工厂 mock。
- RendererDefinition 注册字面量：production 定义约 105 条、分布 17 个 production 包（含定义条目最多为 content 20）；flux-core 有类型无 builder。
- Protected Area：`packages/flux-core/src/` plan-first——本 plan 即所需 plan；`packages/ui/src/index.ts` ask-first——不触碰 ui。

## Goals

- flux-core 新增 `cloneDeep`、`toJsonPointer`（A 组语义）+ `appendToJsonPointer`（B 组语义）、`genId`、`createHostActionProvider` 工厂 + `toActionError/ok/fail` 公开原语、`defineRenderer`/`definePropContract` builder。
- flux-react 新增 `useDebouncedValue`、`useDebouncedCallback`、`useRendererRuntimeOrNull`；消除 2 处值型手写防抖 + 1 处回调型手写防抖 + 1 处 runtime 旁路。
- 迁移后各消费点行为等价（既有 focused 测试零回归；语义差异处逐点注记保留）。

## Non-Goals

- 不迁移其余 16 包的 RendererDefinition（builder 试点 content 包；全量迁移前须先改写 `check-finite-prop-contracts`/`check-schema-prop-coverage` 两个门禁的字面量提取逻辑，见 Deferred）。
- 不迁移 `condition-builder/id-utils.ts` 计数器与 `ai/engine/utils.ts` 手写递归 deepClone。
- 不动 ui 包；不改既有公开 API 签名（只增量）；`action-adapter.ts:603` 的核心内部直调不在迁移面。

## Scope

### In Scope

- `packages/flux-core/src/utils/`（object.ts、path.ts 均已存在，`id.ts` 新增）、`packages/flux-core/src/`（provider 工厂与 builder 落点）、`packages/flux-react/src/`（三个 hook）
- 消费者迁移：A 组 3 处 + B 组 2 处 + 裸 JSON 6 处 + genId 9 调用点、report/spreadsheet 两 provider 全模板迁移、word/flow 两 provider 原语级吸收、kanban/diff-view/editor-canvas 三处防抖、table 旁路一处 + 5 个部分 mock 测试适配、builder 试点 `flux-renderers-content`
- `docs/architecture/flux-core.md`、`docs/references/quick-reference.md`（新 hook 条目）、`docs/references/renderer-interfaces.md`（builder 与 definition 书写方式对齐说明）

### Out Of Scope

- 其余 16 包 RendererDefinition 全量迁移；dashboard handles 跨包收敛（cq-4 裁定）；任何行为变更；C/D/E 组 toJsonPointer 变体的强制统一（语义不同，逐点裁定）。

## Failure Paths

> 纯内部重构 + 向后兼容 API 增量，无新错误处理面。不适用。

## Test Strategy

档位：**必须自动化**（新增公开 API 属 public API contracts）。每个新 API 先写契约单测（先红）再实现；迁移点以既有 focused 测试锁行为，行为等价性由测试证明；cloneDeep 逐迁移点声明输入域（纯 JSON 数据 vs 含 undefined/函数成员）。

## Execution Plan

### Phase 1 - flux-core utils（cloneDeep / toJsonPointer 族 / genId）+ 消费者迁移

Status: planned
Targets: `packages/flux-core/src/utils/object.ts`、`utils/path.ts`、`utils/id.ts`（新增）、上列消费者

- Item Types: `Proof | Fix`

- [ ] Proof：新 API 契约单测先红——cloneDeep 边界（Date/undefined 属性/函数成员行为声明）、toJsonPointer（A 组语义：parsePath/滤 $/escape/空段）、appendToJsonPointer（B 组语义）、genId 唯一性
- [ ] Fix：实现三件 + A 组 3 处迁移 + B 组 2 处改 `appendToJsonPointer`（顺带删除死三元条件，行为注记）；C 组（table）逐点核对后迁移或保留注记；D 组（hidden-field-policy）、E 组（map）保留并注记语义差异理由
- [ ] Fix：裸 JSON 6 处迁 `cloneDeep`（逐点声明输入域为纯 JSON 数据）；genId 9 调用点逐处核对格式后迁移（格式被 testid/快照断言依赖处保留并注记）
- [ ] Proof：flux-core 单测绿；全部受影响包 focused 测试绿

Exit Criteria:

- [ ] A/B 组旧实现零残留；C/D/E 组保留处均有注记；裸 JSON 6 处零残留
- [ ] flux-core 单测绿 + 受影响包 focused 测试绿

### Phase 2 - host action-provider：2a 工厂全迁移（report/spreadsheet）+ 2b 原语吸收（word/flow）

Status: planned
Targets: `packages/flux-core/src/`（工厂 + toActionError/ok/fail 原语落点）、`report-designer-renderers/src/host-action-provider.ts`、`spreadsheet-renderers/src/host-action-provider.ts`、`word-editor-renderers/src/word-editor-action-provider.ts`、`flow-designer-renderers/src/designer-action-provider.ts`

- Item Types: `Proof | Fix`

- [ ] Proof：report/spreadsheet 既有 provider 契约测试盘点（无则各补冒烟）；工厂对同构模板的行为等价断言先红
- [ ] Fix（2a）：flux-core 新增 `createHostActionProvider({ namespace, contracts, commandPrefix, dispatch })`（report 的 console.warn 行为作为可选注入保持）；report/spreadsheet 改工厂调用，错误码/命令名/契约表逐字节保持
- [ ] Fix（2b）：`toActionError/ok/fail` + validate 包装公开为 flux-core 原语（**语义以 report/spreadsheet 全量版为基准**）；word-editor/flow 改用原语吸收包装层，**invoke 主体（switch 编排/直呼 core）保持现状**——两包 invoke 差异（word 快照编排、insertField 手工检查、flow tree-mode 门/reason 形结果、word 简化版 toActionError 对 null/对象 error 的归一化差异）为刻意设计，由 focused 测试锁定并注记
- [ ] Proof：4 包 focused 测试全绿

Exit Criteria:

- [ ] 4 包不再各自手写 validate 包装与错误助手（grep `validateMethodPayload`/`toActionError` 定义只出现在 flux-core；`action-adapter.ts:603` 核心内部直调除外）
- [ ] report/spreadsheet provider 文件不再含 dispatch 模板复制；4 包 focused 测试全绿

### Phase 3 - flux-react useDebouncedValue / useDebouncedCallback + 3 处迁移

Status: planned
Targets: `packages/flux-react/src/hooks.ts`（或新文件）、kanban use-kanban-filter、diff-view-renderer、word-editor-renderers/editor-canvas

- Item Types: `Proof | Fix`

- [ ] Proof：两 hook 契约单测先红（值型：delay 内多次变更只出末值、卸载取消；回调型：burst 只执行末次、卸载取消）
- [ ] Fix：实现 `useDebouncedValue` + `useDebouncedCallback`（均包 `scheduleDebounce`）；kanban/diff-view 迁值型，editor-canvas 迁回调型；diff-view 由"4 值共享单 timer"变"各自 timer"的瞬态窗口差异注记
- [ ] Proof：3 包 focused 测试绿

Exit Criteria:

- [ ] 3 处手写 timer 逻辑零残留（grep 各文件）
- [ ] flux-react 新 hook 单测绿 + 3 包 focused 绿

### Phase 4 - useRendererRuntimeOrNull + table 旁路删除（含 5 个部分 mock 测试适配）

Status: planned
Targets: `packages/flux-react/src/hooks.ts`、`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、5 个部分 mock 测试文件

- Item Types: `Proof | Fix`

- [ ] Proof：新 hook 单测先红（有/无 provider 两分支）
- [ ] Fix：实现 `useRendererRuntimeOrNull()`；table-body-row-rendering 改用新 hook，删 MissingRuntimeContext/私有 useFluxReactRuntime
- [ ] Fix：5 个部分工厂 mock 测试（table-column-width-strategy、table-e1c-row-drag-sort、table-p3-wave-drag-viewindex、table-b33-advanced-boundary、table-e1b-enhancements）改 `importOriginal` 展开或补 `useRendererRuntimeOrNull: () => null`——G3-R3"部分 mock 容忍"语义由测试基建承接的裁定随本项落地并注记
- [ ] Proof：table 全部测试（含上述 5 文件）绿

Exit Criteria:

- [ ] `table-body-row-rendering.tsx` 不再引用 flux-react RuntimeContext 内部导出（import 清单核验）
- [ ] focused 测试全绿（含 5 个适配后 mock 测试）

### Phase 5 - defineRenderer builder + content 试点

Status: planned
Targets: `packages/flux-core/src/`（builder 落点）、`packages/flux-renderers-content/src/content-renderer-definitions.ts`

- Item Types: `Proof | Fix`

- [ ] Proof：builder 输出与手写字面量的类型级等价断言先红（`defineRenderer` 返回类型可赋给 `RendererDefinition`）
- [ ] Fix：实现 `defineRenderer()`/`definePropContract()`（自动带 sourcePackage、收敛 propContracts 样板）；content 包 20 条定义迁移
- [ ] Proof：content 包 focused 测试绿；`check:schema-prop-coverage`、`check:renderer-definition-fields-only`、`check:finite-prop-contracts` exit 0（三门禁现扫描面不含 content，试点安全；全量迁移前需改写门禁提取逻辑——已录 Deferred）

Exit Criteria:

- [ ] content-renderer-definitions.ts 行数下降有记录（当前 581 行，目标 ≤450 或记录等价性证明：注册表形状深度相等断言）
- [ ] 三个契约门禁 exit 0

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_08cbce36，两轮）
- Verdict: 首轮 `revise`（0 Blocker + 6 Major）→ 修订 → 第二轮 `pass-with-minors`（零 Blocker/Major；3 条 Minor：A 组路径笔误已当场修正、2b toActionError 语义基准注记执行时补、本记录回填已完成）
- Rounds: 2
- Findings addressed: M1（toJsonPointer 4 组语义分别处置 + appendToJsonPointer）、M2（genId 清单修正 + id-utils 裁定）、M3（Phase 2 拆 2a/2b + exit 排除 action-adapter:603）、M4（useDebouncedCallback + editor-canvas 回调型）、M5（5 个部分 mock 测试适配 + G3-R3 承接）、M6（裸 JSON 6 处）；7 条 Minor 全吸收

## Closure Gates

- [ ] 所有 in-scope 重复实现已迁移至共享层且 grep 证明零残留（语义差异保留处均有注记）
- [ ] 公开 API 增量全部向后兼容（无既有签名变更）
- [ ] 新 API 契约单测（先红后绿）+ 各消费者 focused 测试全绿
- [ ] owner docs 已同步（flux-core.md、quick-reference.md、renderer-interfaces.md）
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### 其余 16 包 RendererDefinition 全量 builder 迁移

- Classification: `optimization candidate`
- Why Not Blocking Closure: 试点已证明 builder 可行且输出形状不变；全量迁移**不是纯机械 churn**——会击碎 `check-finite-prop-contracts` 的字面量正则与 `check-schema-prop-coverage` 的 `propContracts:{` 提取，须先改写两个门禁脚本再迁移
- Successor Required: `no`
- Successor Path: 门禁脚本改写 + 分批迁移（触达各包时顺势）

### condition-builder id-utils 计数器 / ai engine 手写 deepClone

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 前者是被测试依赖的确定性 ID 语义（与新 genId 同名不同义，保留并注记防混淆）；后者泛型边界合理
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- dashboard `use-dashboard-editor-handles.ts` 对 industrial handles 的克隆收敛（依赖方向受限，cq-4 内裁定具体路径）
- ownership/statePath 解析样板下沉 flux-react（CQ-D12 根治面）
- form-advanced `src/test-support.tsx`（生产 src 混居的 test-support，含 formulaCompiler 双名导出）迁移

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<>>
- Evidence: <<>>

Follow-up:

- <<>>
