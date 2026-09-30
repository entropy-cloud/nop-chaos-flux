# CQ-2 核心层共享原语下沉（flux-core / flux-react 公开 API 增量）

> Plan Status: completed
> Last Reviewed: 2026-09-30
> As-Built Note: 执行记录见 daily log 2026-09-30「cq-2 落地」；三处 as-built 裁定已回填对应 Phase（防抖不包 scheduleDebounce / editor-canvas 保留注记 / defineRendererFamily 命名）
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

Status: completed
Targets: `packages/flux-core/src/utils/object.ts`、`utils/path.ts`、`utils/id.ts`（新增）、上列消费者

- Item Types: `Proof | Fix`

- [x] Proof：新 API 契约单测（path.test +3：A 组转义/空段/bracket、B 组追加；object.test cloneDeep +2：引用断开/structuredClone 域声明；id.test genId +1：形状+2000 唯一性；host-action-provider.test 契约三场景；先红后绿）
- [x] Fix：实现 toJsonPointer/appendToJsonPointer/cloneDeep/genId；A 组 3 处迁移（batch-bar/data-schema-validation/form-definition，parsePath 随之从消费面移除）；B 组 2 处迁移 + 死三元删除（行为恒等）；C/D/E 组保留并加 cq-2 语义注记
- [x] Fix：裸 JSON 6 处迁 cloneDeep（flow-designer-core ×4 含 clone.ts cloneValue 收敛、report metadata、spreadsheet internal-state——新增 spreadsheet-core→flux-core 依赖边（cq-4 已披露的边提前落地）、page-designer cloneNode）；genId 迁 3 处同形（clone.ts generateId 轫出、barcode-queue ×2），6 处异形保留并注记（tree-structure/tree-session/runtime-factory ×2/dataset-store/upload-field）
- [x] Proof：flux-core 528 绿；受影响包 focused 全绿（flow-designer-core 192、report 186、spreadsheet 277、page-designer 141、scheduling 1070、word-editor-core 274、form-advanced 1144）

Exit Criteria:

- [x] A/B 组旧实现零残留；C/D/E 组保留处均有注记；裸 JSON 6 处零残留
- [x] flux-core 单测绿 + 受影响包 focused 测试绿

### Phase 2 - host action-provider：2a 工厂全迁移（report/spreadsheet）+ 2b 原语吸收（word/flow）

Status: completed
Targets: `packages/flux-core/src/`（工厂 + toActionError/ok/fail 原语落点）、`report-designer-renderers/src/host-action-provider.ts`、`spreadsheet-renderers/src/host-action-provider.ts`、`word-editor-renderers/src/word-editor-action-provider.ts`、`flow-designer-renderers/src/designer-action-provider.ts`

- Item Types: `Proof | Fix`

- [x] Proof：flux-core 工厂契约单测 3 用例（dispatch 命名/校验短路/异常归一+hook）+ toHostActionError 2 用例，先红后绿
- [x] Fix（2a）：flux-core 新增 `createHostActionProvider`（toActionResult 注入 + fallbackErrorMessage + onInvokeError 保持 report 的 console.warn）；report/spreadsheet 迁移为工厂调用（as-built：commandPrefix 由 namespace 派生 `namespace:method`，与两侧字面量一致）
- [x] Fix（2b）：flux-core 公开 `createHostMethodValidator`（四包同形的 validate 绑定器）与 `toHostActionError`；word/flow 的 validateMethodPayload 本地实现替换为 validator 原语，invoke 主体保持现状；**word 的简化版 toActionError 保留并注记**（null→Error(string) 与对象无 message 时的字符串化语义是其错误面刻意行为，换全量版会改变用户可见错误文案）
- [x] Proof：4 包 focused 全绿（spreadsheet 169、report 206、word 164、flow 274）——provider 既有测试零改动通过即等价证明

Exit Criteria:

- [x] 4 包不再各自手写 validate 包装（createHostMethodValidator 单点）；report/spreadsheet 错误助手收敛至 toHostActionError（word 简化版注记保留）；`action-adapter.ts:603` 核心内部直调除外
- [x] report/spreadsheet provider 文件不再含 dispatch 模板复制；4 包 focused 测试全绿

### Phase 3 - flux-react useDebouncedValue / useDebouncedCallback + 迁移（as-built：2/3 迁移 + 1 保留注记）

Status: completed
Targets: `packages/flux-react/src/hooks.ts`（或新文件）、kanban use-kanban-filter、diff-view-renderer、word-editor-renderers/editor-canvas

- Item Types: `Proof | Fix`

- [x] Proof：两 hook 契约单测 4 用例（burst 末值/卸载取消/末次执行+最新闭包/卸载取消），先红后绿
- [x] Fix：实现 `useDebouncedValue` + `useDebouncedCallback`（**as-built：直用 timer，不包 scheduleDebounce**——该原语是 promise 型动作合并，语义不适配值型防抖）；kanban use-kanban-filter 与 diff-view 迁移（diff-view 4 值同 tick 批次的等价性注记在位）；**editor-canvas 保留注记**（其 timer 刻意 effect 域：桥换装清理 + AbortController 联动，组件级 hook 无法等价保留）
- [x] Proof：scheduling 1070 绿（7 个 kanban 测试的 flux-react 部分 mock 转 importOriginal 展开使真实 hook 穿透——M5 预案的同类处置）、content 341 绿、word-editor-renderers 164 绿

Exit Criteria:

- [x] 2 处手写 timer 零残留（kanban/diff-view）；editor-canvas 以注记保留（as-built 裁定，理由如上）
- [x] flux-react 新 hook 单测绿 + 包 focused 绿（flux-react 532）

### Phase 4 - useRendererRuntimeOrNull + table 旁路删除（含 5 个部分 mock 测试适配）

Status: completed
Targets: `packages/flux-react/src/hooks.ts`、`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、5 个部分 mock 测试文件

- Item Types: `Proof | Fix`

- [x] Proof：flux-react 全套 532 绿（新 hook 经 index 导出面测试与既有 context 测试覆盖；data 侧 5 文件 mock 转换即真实行为验证）
- [x] Fix：实现 `useRendererRuntimeOrNull`（runtime-context-hooks + hooks.ts + index 导出）；table-body-row-rendering 改官方 hook，删 MissingRuntimeContext/私有 useFluxReactRuntime/命名空间 try-catch 抓取
- [x] Fix：5 个部分工厂 mock 测试全部转 `importOriginal` 展开（真实 useRendererRuntimeOrNull 穿透，G3-R3 容忍语义由 hook 本体承接）
- [x] Proof：flux-renderers-data 1200 绿（含 5 文件）

Exit Criteria:

- [x] `table-body-row-rendering.tsx` 仅命名导入 `useRendererRuntimeOrNull`（import 清单核验）
- [x] focused 测试全绿（含 5 个适配后 mock 测试）

### Phase 5 - defineRenderer builder + content 试点

Status: completed
Targets: `packages/flux-core/src/`（builder 落点）、`packages/flux-renderers-content/src/content-renderer-definitions.ts`

- Item Types: `Proof | Fix`

- [x] Proof：等价性证明——content 20 条迁移后 content 341 focused 绿 + 三契约门禁（schema-prop-coverage/renderer-definition-fields-only/finite-prop-contracts）exit 0 + 类型系统强制（entry 参数类型为 Omit<RendererDefinition,...>，产出一个字面量 RendererDefinition）
- [x] Fix：实现 `defineRendererFamily({ sourcePackage?, defaultSchema? })`（**as-built 命名**：family 闭包钉 sourcePackage+defaultSchema 工厂，category 保留在 entry——card=layout、cards=data(各自刻意类别,不可族化)）；content 20 条迁移，纯 `{type}` defaultSchema 上提族工厂（3 条带额外默认值的保留原位）
- [x] Proof：content 341 绿；三门禁 exit 0

Exit Criteria:

- [x] 行数下降有记录：666 → 635（净 -31；≤450 需 propContracts 深度压缩，属 Deferred 的全量迁移面）+ 等价性证明如上
- [x] 三个契约门禁 exit 0

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_08cbce36，两轮）
- Verdict: 首轮 `revise`（0 Blocker + 6 Major）→ 修订 → 第二轮 `pass-with-minors`（零 Blocker/Major；3 条 Minor：A 组路径笔误已当场修正、2b toActionError 语义基准注记执行时补、本记录回填已完成）
- Rounds: 2
- Findings addressed: M1（toJsonPointer 4 组语义分别处置 + appendToJsonPointer）、M2（genId 清单修正 + id-utils 裁定）、M3（Phase 2 拆 2a/2b + exit 排除 action-adapter:603）、M4（useDebouncedCallback + editor-canvas 回调型）、M5（5 个部分 mock 测试适配 + G3-R3 承接）、M6（裸 JSON 6 处）；7 条 Minor 全吸收

## Closure Gates

- [x] 所有 in-scope 重复实现已迁移至共享层且 grep 证明零残留（A/B 组指针、裸 JSON 6 处、genId 同形 3 处、validate 包装 4 包、防抖 2 处、table 旁路；语义差异保留处 C/D/E/word-toActionError/editor-canvas/genId 异形 6 处均有注记）（语义差异保留处均有注记）
- [x] 公开 API 增量全部向后兼容（无既有签名变更；spreadsheet-core→flux-core 为新增依赖边，cq-4 已披露）
- [x] 新 API 契约单测（先红后绿）+ 各消费者 focused 测试全绿（flux-core 533→534→528+6、受影响 10+ 包 focused 全绿，详见各 Phase）
- [x] owner docs 已同步（flux-core.md 新节、quick-reference.md 3 hook 条目、renderer-interfaces.md builder 条目；check-active-doc-code-anchors exit 0）
- [x] 不存在被静默降级的 in-scope live defect（三处 as-built 保留裁定均有 plan+代码双注记；本 plan 新增的两处未消费导出类型被自家 knip 门禁拦截后内联化）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（含 oversized——执行中新增 core.ts 701 行超限已以复用 clone.ts 既有导出收敛回 697，未新增豁免）

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

Status Note: 五 Phase 全部落地。独立 fresh-session closure audit 首轮 verdict `approved`（3 Minor 非 blocking，均已顺手修复）。关键等价性证据：四包 provider 测试零改动通过（audit 以 `git show --name-only` 证实 commit 未触碰任何 provider 测试文件）；flux-core 534/534、content 341/341 复跑绿；A/B 组与裸 JSON/genId 零残留经 audit 独立 grep 复核。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_6b9ba58f）
- Verdict: `approved`（3 Minor：card/cards 类别表述以偏概全、clone.ts 回退分支无注记、C 组注记缺 cq-2 字样——全部已修）
- Evidence: 审计独立复跑 flux-core 534、content 341、report/word/flow/spreadsheet provider 子集全绿；逐分支比对新旧 toActionError 语义恒等；spreadsheet-core→flux-core 边核实无环；导出面新增仅限声明集合。

Follow-up:

- 其余 16 包 RendererDefinition 全量迁移（先改写 finite-prop-contracts/schema-prop-coverage 提取逻辑，见 Deferred）
- ownership/statePath 解析根治性下沉 flux-react；dashboard handles 跨包收敛（cq-4 裁定路径）
