# 248 Unit Test Contract Closure Plan

> Plan Status: in_progress
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-unit-test-contract-audit-01/{round-01.md,round-02.md,round-03.md,round-05.md}`
> Related: `docs/plans/{148-test-contract-gap-closure-plan.md,235-workspace-test-hard-gate-closure-plan.md}`

## Purpose

把 2026-05-11 单元测试逻辑覆盖与契约覆盖审计中最高 ROI 的 package-level unit/integration contract gaps 收口为一轮可关闭的测试补强执行：优先补真实入口、跨层 handoff、owner boundary、shared UI/public API 边界的 focused proof，而不是继续扩张 helper-level coverage 或 page-level E2E 数量。

## Current Baseline

- 仓库已经拥有高密度 package tests；本次审计确认当前主要问题不是“总体测试太少”，而是多处高风险契约只在 helper、mock、内部模块或存在性断言层被覆盖。
- `flux-runtime` / `flux-react` / `flux-renderers-form-advanced` / `flux-renderers-form` 当前最薄弱的地方，是 `SchemaRenderer`、`FormRuntime`、`NodeRenderer`、owner boundary 与 compiled handoff 的真实入口证明，而不是单个 helper 分支数量。
- `docs/analysis/2026-05-11-unit-test-contract-audit-01/round-01.md` 与 `round-02.md` 已确认的高价值缺口包括：child owner submit-gating、non-form owner / surface-root owner 协作、StrictMode 与 source lifecycle stale-result、submit supersession、component handle / import frame 真实入口、以及 relational validation dependency graph 的 runtime 消费证明。
- `round-03.md` 额外确认 `TemplateNode.structuralWhen` 存在 compiler/runtime/react handoff 断层：编译与文档已经声明该通道，但 live runtime/react 仍主要依赖 `meta.when`。
- `round-05.md` 额外确认 shared UI / infrastructure boundary 仍有三类误导性 coverage：`theme-tokens + tailwind-preset + ui` 的 sidebar token 跨包契约未被证明、`@nop-chaos/ui` tests 命中内部文件而不是 public entry boundary、以及 `NativeSelect` 现有测试把错误 disabled 语义固化成“public contract”。
- 其中至少三类事项不能直接“先写测试再说”，需要先裁定 supported baseline：`structuralWhen` 到底是不是 live contract、`NativeSelect disabled` 的正确 repo-level 语义、以及 sidebar token 默认值应由 `theme-tokens` 还是 playground 私有样式承担。

## Goals

- 把本轮审计里最高 ROI 的 unit/integration test gaps 收敛成最小但真实的 contract proof。
- 让新增测试默认走公开入口、真实 owner boundary 或真实 compiled handoff，而不是继续停留在 helper / mock 层。
- 先裁定 disputed contract，再为已裁定的 supported baseline 增加 focused regression tests，避免把错误行为写死成长期契约。
- 为 shared UI、public package API、cross-package styling token 这些 repo-level 稳定接口补最小 contract tests。
- 在计划关闭前，通过独立子 agent closure audit 确认没有剩余 plan-owned test gap 或被测试固化的错误契约。

## Non-Goals

- 不把这份计划扩成“全仓补 coverage 百分比”的全面运动。
- 不新增 page-level Playwright / browser E2E；本计划只处理 package-level unit/integration proof。
- 不把所有历史测试大文件重构或统一整理为本计划 scope；只有直接影响当前 contract proof 的测试文件才在 scope 内。
- 不重做 runtime / renderer / styling 架构；只有当新增测试暴露 live contract drift，才允许最小裁定与必要修正。
- 不把低信息量的“测试密度不足”或“文件没有直测”当作 closure 目标；本计划只收口审计已证明的高价值 contract gaps。

## Scope

### In Scope

- `packages/flux-runtime/src/**/__tests__/*`
- `packages/flux-react/src/__tests__/*`
- `packages/flux-renderers-form/src/__tests__/*`
- `packages/flux-renderers-form-advanced/src/**/__tests__/*`
- `packages/flux-renderers-data/src/__tests__/*`
- `packages/flux-compiler/src/**/__tests__/*` 或直接相关 compile/runtime handoff tests
- `packages/theme-tokens/src/*.test.ts`
- `packages/tailwind-preset/src/*.test.ts`
- `packages/ui/src/**/*.test.tsx`
- 仅限 Phase 1 裁定所必需的最小生产代码 / owner-doc 收敛，以及新增 contract tests 所需的最小 fixtures / helpers 支撑
- 本计划、必要的 owner-doc sync、以及对应 `docs/logs/` 收口记录

### Out Of Scope

- 新的 Playwright / browser-only contract tests
- 面向 coverage 数字的横向补测
- 与当前审计 findings 无关的 renderer/UI 全面测试扩张
- 与本计划无关的业务功能新增、视觉重做、或大规模测试基础设施改造

## Execution Plan

### Phase 1 - Adjudicate Supported Test Baselines Before Authoring Proof

Status: completed
Targets: `structuralWhen`, `NativeSelect disabled contract`, sidebar token ownership, relevant docs/tests

- Item Types: `Decision | Fix | Proof`

- [x] 裁定 `TemplateNode.structuralWhen` 的 supported baseline：要么让 live runtime/react 真正消费它并按该语义写测试，要么收敛文档/编译字段，避免死字段继续制造假覆盖。
- [x] 裁定 `NativeSelect disabled/value/onChange` 的 repo-level public contract，并删除或修正当前把错误语义固化为 contract 的测试断言。
- [x] 裁定 sidebar token 默认值的 owner boundary：由 `theme-tokens` 正式提供，还是明确声明 playground 私有兜底不是公共基线；测试必须与最终裁定保持一致。
- [x] 为 `structuralWhen` 裁定结果落下 repo-observable 收口：若它是 live contract，则列出并实现受影响 runtime/react 消费点与 focused handoff test；若它不是 live contract，则删除或降级相关编译字段/owner doc 承诺，并补防回流 proof。

Completed evidence:

- `packages/flux-runtime/src/node-runtime.ts` now consumes `templateNode.structuralWhen` as the live runtime baseline.
- `packages/flux-react/src/__tests__/schema-renderer-runtime-monitoring.test.tsx` adds the compiler -> runtime -> react handoff proof for `structuralWhen`.
- `packages/ui/src/components/ui/native-select.test.tsx` now asserts the supported public contract through `@nop-chaos/ui` entry behavior and removes the false disabled synthetic-change contract.
- `packages/theme-tokens/src/styles.css`, `packages/theme-tokens/src/styles.test.ts`, and `packages/tailwind-preset/src/index.test.ts` now lock the sidebar token ownership at the shared package boundary.
- Owner-doc sync: `No owner-doc update required`; the runtime fix aligned live behavior to the documented baseline instead of changing the documented contract.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `structuralWhen`、`NativeSelect disabled`、sidebar token ownership 三项都已有明确 supported baseline 裁定。
- [x] `structuralWhen` 已形成 `Decision + Fix/Proof` 闭环，而不是只停留在“已裁定”。
- [x] 不再存在“测试要保护什么语义”仍未裁定的 plan-owned blocker。
- [x] 如裁定改变 live contract 或 owner-doc 叙述，受影响 docs 已同步；否则明确记录 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Add Runtime And Validation Owner Real-Entry Contract Tests

Status: completed
Targets: `packages/flux-runtime`, `packages/flux-react`, `packages/flux-renderers-form`, `packages/flux-renderers-form-advanced`

- Item Types: `Fix | Proof`

- [x] 为 child owner submit-gating 增加真实 `SchemaRenderer` / owner activation proof，覆盖注册、阻断提交、解除阻断与卸载恢复，而不是只测手工 child contract。
- [x] 为 page-root / surface-root non-form validation owner 与复杂控件协作增加真实入口测试，覆盖 `notifyFieldHidden`、`validateSubtree`、错误显示或提交门控的可见结果。
- [x] 为 owner-level async submit supersession 增加真实 `FormRuntime` proof，证明 `submit` / `commit` 会 supersede 低优先级 async validation 并阻止 stale publication。

Progress notes:

- `packages/flux-runtime/src/__tests__/owner-validation-lifecycle-contracts.test.ts` now proves submit-time supersession blocks stale validation publication.
- `packages/flux-renderers-form-advanced/src/__tests__/composite-form-detail-and-loop.test.tsx` already provides the real `SchemaRenderer` child-owner submit-gating proof for `detail-field`, including open-child submit blocking and post-resolution recovery.
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-selector.test.tsx` now proves page-root validation-owner cooperation with `variant-field` by clearing owner-level external errors for hidden branches after variant switching.
- Owner-doc sync so far: `No owner-doc update required`.
- [x] 为 relational validation dependency graph 增加 focused integration proof，证明 runtime 的定向重验语义，而不是只证明 compile 结构存在或最终 UI 恰好正确。
- `packages/flux-renderers-form/src/__tests__/form-validation-rules.test.tsx` already proves live dependent revalidation through the real renderer/runtime entry path (`password -> confirmPassword`, `role -> adminCode`).

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] child owner、non-form owner / surface-root owner、submit supersession、dependency-graph consumption 四类 contract gaps 都有新的 focused tests。
- [x] 新测试默认从真实 runtime / renderer / owner 入口进入，而不是主要依赖手工 contract 对象或大面积 mock。
- [x] 若本 Phase 暴露 live behavior 与 owner docs 不一致，相关 docs 已同步；否则明确记录 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Add React Boundary And Capability-Lookup Contract Tests

Status: completed
Targets: `packages/flux-react/src/__tests__/*`, `packages/flux-runtime/src/__tests__/*`, directly affected helpers

- Item Types: `Fix | Proof`

- [x] 为 `SchemaRenderer` import preload 增加 latest-wins stale-result 回归测试，覆盖 A/B schema prepare 并发与旧结果晚到不覆盖新状态。
- [x] 为 source hook lifecycle 增加 StrictMode / rerender / unmount stale-drop proof，验证旧 source 不回灌且 unmount 后不继续回写。
- [x] 为 `component:*` 真实入口增加 mounted child-registry proof，覆盖 `componentId`、`componentName`、`componentRegistryPolicy: 'new'` 与 ambiguous target 行为。
- [x] 为 nested import boundary 增加 lexical alias/action visibility proof，覆盖 child shadowing、unmount restore、sibling non-leak。

Progress notes:

- `packages/flux-react/src/schema-renderer.tsx` now guards schema import preparation with request ids, and `packages/flux-react/src/__tests__/schema-renderer.test.tsx` locks the latest-wins baseline.
- `packages/flux-react/src/__tests__/use-source-value.test.tsx` now proves stale source settlements are dropped across rerender latest-wins, `React.StrictMode` remounts, and unmount cleanup.
- `packages/flux-react/src/__tests__/schema-renderer-runtime-dialogs.test.tsx`, `packages/flux-react/src/schema-renderer-imports-basic.test.tsx`, and `packages/flux-react/src/schema-renderer-imports-boundaries.test.tsx` now cover mounted-child registry preference plus nested import lexical shadowing / fallback semantics, including explicit `componentId` and same-registry ambiguous-target proofs.
- Owner-doc sync so far: `No owner-doc update required`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] import preload latest-wins、source lifecycle stale-drop、component registry lookup、nested import shadowing 四类 contract gaps 都被真实入口测试覆盖。
- [x] 新增断言聚焦 stale-result / lifecycle / boundary semantics，不退化成内部实现探针或单纯存在性断言。
- [x] 本 Phase 如未改变 owner-doc baseline，明确记录 `No owner-doc update required`；若改变则已同步相关 docs。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Add Shared UI, Public API, And Cross-Package Styling Contract Tests

Status: completed
Targets: `packages/ui`, `packages/theme-tokens`, `packages/tailwind-preset`, directly affected docs/tests

- Item Types: `Fix | Proof | Decision`

- [x] 为 `theme-tokens + tailwind-preset + ui` 的 sidebar token 组合增加跨包 contract proof，并让测试断言与 Phase 1 的 token ownership 裁定一致。
- [x] 为 `@nop-chaos/ui` 根入口与公开 subpath 增加 entry-boundary tests，保护 `src/index.ts` 与 `package.json.exports` 的稳定对齐，而不是只测内部文件。
- [x] 修正并补强 shared UI repo-level contract tests，确保 `disabled/value/onChange`、`data-slot`、代表性 public exports 反映真实用户语义，而不是 synthetic false contract。

Completed evidence:

- `packages/theme-tokens/src/styles.test.ts` and `packages/tailwind-preset/src/index.test.ts` now prove the shared sidebar token contract.
- `packages/ui/src/public-entry-contract.test.ts` now guards root entry and public subpath alignment against `package.json.exports`.
- `packages/ui/src/components/ui/native-select.test.tsx` now reflects the supported disabled/value/onChange semantics through the public package entry.
- Owner-doc sync: `No owner-doc update required`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] sidebar token cross-package contract、UI public entry boundary、shared disabled/value/onChange 语义三类缺口都已有 focused proof。
- [x] `NativeSelect` 不再把错误 disabled 语义注册为 public contract。
- [x] 新测试命中公开入口与 repo-level 稳定接口，而不是内部实现层级。
- [x] 若本 Phase 改变 styling/public-entry baseline，相关 docs 已同步；否则明确记录 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 5 - Workspace Verification And Independent Closure Audit

Status: in_progress
Targets: affected packages, this plan, daily log, closure review evidence

- Item Types: `Proof | Decision`

- [x] 运行受影响 package 与 workspace 验证，处理由本计划引入的所有 test/build/lint/typecheck 问题。
- [ ] 逐条复核 Phase 1-4 的 exit criteria，不把“接口出现”或“测试文件变多”误判为 contract closure。
- [ ] 启动独立子 agent 做 closure audit，确认没有剩余 plan-owned test gap、错误契约或被静默降级的 live defect / contract drift。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 全部通过。
- [x] 所有新增测试已在 workspace 正式验证链路中运行，而不是只通过单文件或局部未纳入配置的路径。
- [ ] 独立子 agent closure audit 明确确认无剩余 plan-owned blocker；closure audit 新发现且经裁定为 out-of-scope / non-blocking 的 residual 才允许移交 successor ownership，已在 `Current Baseline` 或 Phase 1-4 明确确认的项不得在此阶段降级移出本计划。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] `structuralWhen` disposition 已收口为 live handoff proof 或显式降级/删除的 supported baseline，且不存在只裁定不落地的残留状态。
- [x] child owner submit-gating、non-form / surface-root owner、submit supersession、dependency-graph consumption 四类 runtime/validation contract gaps 已得到 focused proof。
- [x] import preload latest-wins、source stale-drop、component registry lookup、nested import boundary 四类 React/capability boundary gaps 已得到 focused proof。
- [ ] sidebar token cross-package contract、UI public entry boundary、`NativeSelect` disabled/value/onChange contract 三类 shared UI/public API gaps 已得到 focused proof。
- [ ] 不再存在被现有测试固化的 plan-owned 错误 public contract。
- [ ] 不再存在只靠 helper/mock/存在性断言维持的 plan-owned 高风险契约空白。
- [x] 必要 focused verification 已完成。
- [x] 受影响 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`。
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- 如果后续要继续扩大 page-level browser contract coverage，应开独立 successor plan，不和本 unit/integration closure plan 混写。
- 如果 closure audit 识别出新的低 ROI coverage-density issue，但它不构成 live contract gap，应作为单独 follow-up，而不是阻塞本计划关闭。

## Closure

Status Note: Pending. This plan closes only after disputed baselines are adjudicated, the owned runtime/react/UI/public-entry contract tests land, workspace verification is green, and an independent closure audit confirms no plan-owned contract gap remains hidden behind helper coverage, mock coverage, or false public contracts.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: to be filled after implementation, verification, and closure review

Follow-up:

- None yet; any residual browser-only coverage or broader coverage-density expansion must move to explicit successor ownership rather than remain implicit here.
