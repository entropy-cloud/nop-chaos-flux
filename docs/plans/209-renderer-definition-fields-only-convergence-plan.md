# 209 Renderer Definition Fields-Only Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-05
> Source: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/renderer-runtime.md`, `docs/index.md`
> Related: `docs/plans/117-renderer-definition-unified-static-contract-plan.md`, `docs/plans/196-interface-contract-alignment-and-api-hygiene-plan.md`, `docs/plans/205-doc-boundary-and-test-hardening-closure-plan.md`

## Purpose

把 renderer definition 的字段语义声明收敛到唯一入口：`RendererDefinition.fields`。本计划的完成态是：定义层不再使用 `RendererDefinition.regions` 作为第二条 authoring/compile hint 路径，所有 region / value-or-region / event / prop / ignored 语义都统一由 `fields` 承载；运行时归一化通道 `props` / `regions` / `events` 保持不变。

## Current Baseline

- 当前 architecture 已明确 `renderer fields metadata` 是字段语义第一真源，字段应通过 `fields` 声明为 `prop` / `region` / `value-or-region` / `event` / `ignored`，而不是由 renderer local guessing 或全局硬编码决定。
- 当前 live compiler 仍保留双入口：`classifyField()` 先读 `renderer.fields`，再回退到 `renderer.regions`。
- live repo 仍存在大量 `regions: ['...']` 定义，分布于 production renderer definitions、test-support fixtures、compiler fixtures、shape-validation/static-analysis tests、runtime/react test fixtures、以及部分 owner docs 对 `RendererDefinition.regions` 的表述。
- `RendererDefinition.regions` 只能表达“纯 region 简写”，无法承载 `value-or-region`、`event`、`params`、`isolate`、`allowSource` 等更完整的字段语义，因此它与 `fields` 并存会形成双轨 authoring/maintenance 心智。
- 如果要满足长期稳定演化，定义层应收敛到单一路径；但运行时归一化输出 `props` / `regions` / `events` 不是本计划要移除的对象。

## Goals

- 移除 `RendererDefinition.regions` 作为定义层公开/内部主路径，只保留 `RendererDefinition.fields` 作为字段语义唯一声明入口。
- 让 compiler、validator、authoring transform、tests、fixtures、docs、scripts 都以 `fields` 为唯一 structural hint baseline。
- 增加自动化守卫，确保仓库内不再新增 `RendererDefinition.regions` 残留或回退逻辑。
- 用脚本化全仓搜索覆盖所有可能修改点，并把“残留命中数为 0”写成 closure gate，而不是依赖人工抽样。

## Non-Goals

- 不移除运行时 `props.regions` / `TemplateRegion` / `RenderRegionHandle` 这条归一化执行通道。
- 不把所有 `region` 字段一律改成 `value-or-region`；字段语义仍按各 renderer 真实契约保留。
- 不在本计划中顺带重命名业务字段，如 `body` / `toolbar` / `viewer` / `content`。
- 不处理与 `fields-only` 无关的 broader renderer API 收敛议题。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-compiler/src/schema-compiler/fields.ts`
- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts`
- `packages/flux-compiler/src/schema-compiler/authoring-transform.ts`
- all production renderer definitions currently using `regions: [...]`
- all test fixtures / test-support utilities / registry fixtures currently using `regions: [...]`
- docs under `docs/architecture/`, `docs/components/`, `docs/references/`, and active `docs/plans/` that still describe `RendererDefinition.regions` as a first-class declaration path
- repository guard scripts and package/root verification wiring needed to enforce the convergence baseline

### Out Of Scope

- runtime `regions` payload structure
- schema authoring names and end-user JSON field names
- unrelated contract cleanup in renderers that already use `fields`

## Execution Plan

### Phase 1 - Freeze The Target Contract And Search Surface

Status: completed
Targets: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/renderer-runtime.md`, `packages/flux-core/src/types/renderer-core.ts`, search/guard script locations

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] [Decision] 明确冻结目标 contract：`RendererDefinition.fields` 是定义层唯一字段声明入口；`RendererDefinition.regions` 进入 deprecated/remove track；运行时 `props.regions` 保留。
- [x] [Fix] 更新 owner docs，使其不再把 `RendererDefinition.regions` 描述为与 `fields` 并列的正常定义路径，而是明确 `fields` 为 authoritative path。
- [x] [Fix] 设计全仓搜索清单与 guard baseline，至少覆盖以下残留模式：
- [x] [Fix] `regions:\s*\[` in `packages/**/*.{ts,tsx}` for renderer definitions and fixtures
- [x] [Fix] `renderer\.regions|RendererDefinition\.regions` in `packages/**/*.{ts,tsx}` and `docs/**/*.md`
- [x] [Fix] `classifyField\(` fallback branches that still consult `renderer.regions`
- [x] [Fix] any script/docs text that still calls `regions` a normal shorthand or first structural hint
- [x] [Proof] 记录初始命中面，作为执行基线，避免后续 closure 时遗漏 tests/fixtures/docs 中的残留点。

Exit Criteria:

- [x] 唯一路径目标在 architecture docs 中写清，不保留双轨表述
- [x] 全仓搜索模式列表冻结，并覆盖代码、测试、fixtures、docs 四类位置
- [x] 明确列出将来必须清零的残留 grep/script 命中项
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Remove Definition-Layer Fallback And Migrate All Codepaths

Status: completed
Targets: compiler/classification code, production renderer definitions, fixtures/tests

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] [Fix] 从 `RendererDefinition` 类型中移除或停用 `regions?: readonly string[]` 定义，使新代码不能再把它当正常 API 使用。
- [x] [Fix] 移除 `classifyField()` 对 `renderer.regions` 的 fallback；所有 region fields 必须通过 `fields` 显式声明。
- [x] [Fix] 将 production renderer definitions 中的 `regions: ['...']` 全部改写为等价 `fields` entries，显式声明 `kind: 'region'` 或 `kind: 'value-or-region'` 并提供 `regionKey`。
- [x] [Fix] 将 test-support fixtures、registry fixtures、compiler/runtime/react test renderers 中的 `regions: ['...']` 全部改写为 `fields`。
- [x] [Fix] 补齐必要 typing/test adjustments，确保 shape validation、authoring transform、static analysis、validation collection、host contract tests 都不再依赖 `renderer.regions` fallback。
- [x] [Proof] focused tests 覆盖：纯 region fields、value-or-region fields、parameterized regions、shape validation traversal、static analysis / validation collection / authoring transform 等关键编译分支。

Exit Criteria:

- [x] live code 中不再存在 compiler/runtime 对 `RendererDefinition.regions` 的 functional dependency
- [x] production definitions 与 test fixtures 均已迁移到 `fields`
- [x] focused verification 覆盖纯 region 与 value-or-region 的主要编译/验证分支
- [x] 若 live baseline 改变：相关 `docs/architecture/` / `docs/components/` 已更新；否则明确写 `No owner-doc update required`
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Add Hard Guards And Exhaustive Zero-Residual Verification

Status: completed
Targets: `scripts/`, root `package.json`, verification docs/logs, any audit helper tests

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] [Fix] 新增仓库 guard script，fail-fast 检查 production code、tests/fixtures、docs 中 `RendererDefinition.regions` / `regions: [...]` 残留，至少允许对运行时 `props.regions` 和文档中明确保留的 runtime channel 描述做精确白名单。
- [x] [Fix] 将该 guard script 接入 root verification（至少 `lint` 或等价 fail-fast 路径），使其成为不可降级硬门禁。
- [x] [Proof] 使用脚本化全仓搜索重新核对 Phase 1 冻结的所有模式，并记录残留命中为 0 或仅剩明确白名单命中。
- [x] [Proof] 运行 full verification：`pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- [x] [Decision] 若仍需要保留任何 compatibility-only 白名单文本，必须明确写入 docs 为 runtime-channel explanation，而不是定义层 residual。

Exit Criteria:

- [x] 仓库存在自动化硬门禁，能阻止 `RendererDefinition.regions` 或等价 shorthand 回流
- [x] Phase 1 冻结的所有搜索模式都已重新核对，残留命中全部清零或明确列入白名单
- [x] full verification 全部通过
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] `RendererDefinition.fields` 已成为定义层唯一字段声明入口
- [x] compiler / validator / authoring transform / test fixtures 不再依赖 `RendererDefinition.regions`
- [x] 已完成脚本化全仓搜索，覆盖 production code、tests、fixtures、docs、scripts 五类位置
- [x] Phase 1 冻结的所有残留模式已验证为 0 命中，或仅剩明确批准的 runtime-channel 文档白名单
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] 仓库 guard script 已接入 fail-fast verification，防止回归
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Runtime Regions Channel

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划收敛的是定义层 declaration path，不是运行时 normalized channel。`props.regions` / `TemplateRegion` / `RenderRegionHandle` 仍是当前 architecture 正常执行模型的一部分。
- Successor Required: no

## Non-Blocking Follow-ups

- 如需进一步减少 `kind: 'region'` 样板代码，可在本计划关闭后单独评估更高层 codegen/helper，但不得重新引入定义层双入口。

## Closure

Status Note: Completed. `RendererDefinition.regions` has been removed from the definition-layer contract, compiler fallback logic now relies on `fields` only, all migrated production/test renderer definitions declare region semantics through `fields`, and the repository guard plus scripted searches keep `RendererDefinition.regions` / `regions: [...]` from re-entering definition-layer code.

Closure Audit Evidence:

- Reviewer / Agent: general subagent closure audit
- Evidence: Repo-wide searches over `regions:\s*\[`, `renderer.regions`, and `RendererDefinition.regions` found only plan text and runtime-channel documentation after migration; root lint now runs `check-renderer-definition-fields-only` as a hard guard.

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
