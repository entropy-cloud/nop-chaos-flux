# 1 check:oversized-code-files 治理债收口（12 文件 >700 行拆分/豁免裁决）

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/logs/2026/08-06.md` 0529-1 Phase 2（14 文件命名清单登记）、`docs/plans/2026-08-06-0343-1-cg-*.md` Deferred（治理归独立 successor）、`docs/plans/2026-08-07-0421-3-file-structure-and-ownership-doc-governance.md` Deferred、`docs/plans/2026-08-07-0819-1-flow-designer-graph-domain-successor-remediation.md` Non-Blocking Follow-ups（12 文件治理债归独立 successor）
> Related: `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`（14-2 拆分先例：coverage-manifest-entries 816 行拆 3 模块，见 `docs/logs/2026/08-06.md` Phase 2）、`docs/plans/2026-08-07-0421-3-file-structure-and-ownership-doc-governance.md`（crud-renderer-state.ts / table-renderer.tsx 拆分先例）
> Mission: component-audit
> Work Item: check:oversized-code-files 治理债（12 文件 >700 行）

## Purpose

把 `pnpm check` 链中唯一仍红的硬门禁 `check:oversized-code-files`（ERROR_LINES=700）的 12 个既有 pre-existing 超限文件全部收口——每个文件要么拆到 ≤700 行，要么通过脚本既有 `OVERSIZED_EXEMPTIONS` 机制登记带文档化理由的豁免（遵循「显式 opt-in，绝不静默通过」的脚本契约）；closure 后 `node scripts/check-oversized-code-files.mjs` exit 0、`pnpm check` 零未登记 red，并把 `docs/context/project-context.md` 中的治理债表述从「14 文件登记」更新为 live 终态。

## Current Baseline

- `node scripts/check-oversized-code-files.mjs` live 实测（2026-08-07）：**12 files exceed 700 lines**（ERROR_LINES=700，WARN_LINES=500；覆盖 `apps/`、`packages/`、`scripts/`、`tests/` 下 .js/.jsx/.ts/.tsx/.mjs/.cjs）：
  - `packages/flux-i18n/src/locales/en-US.ts`: 1021
  - `packages/flux-i18n/src/locales/zh-CN.ts`: 1020
  - `packages/word-editor-core/src/__tests__/document-io.test.ts`: 765
  - `packages/flux-compiler/src/schema-compiler-schema-definition-unified.test.ts`: 764
  - `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`: 750
  - `packages/flux-renderers-form/src/renderers/form.tsx`: 748
  - `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`: 748
  - `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`: 733
  - `packages/flux-runtime/src/__tests__/validation-rule-semantics-and-lifecycle.test.ts`: 725
  - `packages/flux-renderers-data/src/crud-renderer.tsx`: 724
  - `apps/playground/src/route-model.ts`: 708
  - `packages/flux-renderers-form/src/__tests__/form-renderer-lifecycle.test.tsx`: 702
- 历史：0529-1 Phase 2 登记 **14 文件**命名清单（08-06）；`2026-08-07-0421-3` 已拆 `crud-renderer-state.ts`（794→477）与 `table-renderer.tsx`（737→645），故 live 剩 **12 文件**；`docs/context/project-context.md:15` 仍写「14 文件 >700 行（08-06 登记治理债清单）」，数字已 stale。
- 脚本自带 `OVERSIZED_EXEMPTIONS` opt-in 豁免机制（`scripts/check-oversized-code-files.mjs:23-45`，现含 2 条：`form-runtime-owner.ts`、`node-compiler.ts`，均引用已记录架构决策）；豁免条目仍打印在 ERROR 段但标 `[exempt]` 且不翻转 exit code——**豁免是合法终点，但必须引用文档化理由，禁止静默通过**。
- 拆分先例（同一 gate 已收口）：`coverage-manifest-entries.ts` 816 行按分类拆 3 模块（0529-1 Phase 2，104 条目零变化）；`wizard-renderer.tsx` 774 行拆纯函数区 + StepBody（0529-1 Phase 2，`isStepDisabled` re-export 保 API）；`crud-renderer-state.ts` 343 行 load 编排迁 `crud-renderer-load.ts`（0421-3 Phase 2）；`table-renderer.tsx` responsive 122 行迁 `table-renderer/responsive.ts`（0421-3 Phase 3）。
- `pnpm check` 其余 11 项门禁 exit 0（含 `check:workspace-manifest-deps`、`check:audit-renderer-browser-io`、`check:audit-event-dispatch-ctx` 等），仅 oversized 一项红。

## Goals

- 12 个 live 超限文件逐文件裁决：拆分到 ≤700 行或登记带文档化理由的豁免（二选一，无第三种状态）。
- `node scripts/check-oversized-code-files.mjs` exit 0；`pnpm check` 零未登记 red（除既有豁免条目外无 >700 行文件）。
- 拆分不改变任何公共 API / 导出 / 包边界 / 编译期语义（纯内部结构重构）；re-export 保兼容，测试零行为变化。
- `docs/context/project-context.md` 治理债表述更新为 live 终态（12 文件清零或登记豁免清单 + 日期）。
- daily log `docs/logs/2026/08-07.md` 记录逐文件裁决与结果。

## Non-Goals

- **不处理** 153 个 500–700 行 WARN 段文件（WARN 是「评估拆分」提示，非硬门禁；评估归未来治理轮，本 plan 只收口 ERROR 段）。
- 不改变门禁阈值（700）与扫描规则。
- 不重写 `OVERSIZED_EXEMPTIONS` 既有 2 条豁免（不动已登记架构决策）。
- 不合并/不新增 roadmap work item（治理债 successor 按本 plan 独立收口，不挂 component-audit roadmap 表）。

## Scope

### In Scope

- 12 个 >700 行文件的逐文件拆分或豁免裁决（见 Current Baseline 清单）。
- 拆分涉及的 import 更新、测试文件重组、re-export 兼容。
- `check-oversized-code-files.mjs` 如需调整（仅当豁免/拆分需要更清晰输出时），保持门禁语义不变。
- project-context.md 治理债表述同步 + daily log 记录。

### Out Of Scope

- 500–700 行 WARN 段文件治理。
- 非本门禁驱动的代码重构（如行为修复、性能优化）。
- 改变门禁规则本身（阈值、扩展名、忽略路径）。

## Failure Paths

不适用——纯内部重构/治理计划，无外部 API 契约、鉴权、外部集成；失败形态均为「拆分后引入编译/测试回归」，由各 Phase 的 focused 验证与 Closure Gates 全量验证兜底。

## Test Strategy

本档选择：`建议有测`

理由：纯文件结构治理（拆分/豁免），不改变任何行为契约；风险点是「拆分引入 import 断裂/行为漂移」，由受影响包既有测试套件 + focused 单测回归兜底。豁免文件需额外 Proof 项（豁免理由引用文档化决策）。因拆的是既有稳定代码、无新契约，无需 "Must automate" 的 test-first；但每个 Phase 必须跑受影响包的局部 typecheck + 相关测试。

## Execution Plan

### Phase 1 - 裁决与豁免机制对齐

Status: completed
Targets: `scripts/check-oversized-code-files.mjs`、12 文件清单

- Item Types: `Decision | Fix`

- [x] (Decision) 逐文件裁决 12 个超限文件的收口路径：**拆分** 或 **豁免登记**。初步倾向（最终以 live 结构核对为准）：
  - 拆分（9）：`shape-validation-rules.ts`、`form.tsx`、`input-choice-renderers.tsx`、`tree-control-controllers.ts`、`crud-renderer.tsx`、`route-model.ts`（按域拆）、3 个超大测试文件（`schema-compiler-schema-definition-unified.test.ts`、`validation-rule-semantics-and-lifecycle.test.ts`、`form-renderer-lifecycle.test.tsx`，按 describe 主题拆文件）
  - 豁免候选（3，需 Phase 1 逐一核对结构后终裁）：`en-US.ts`/`zh-CN.ts`（i18n 纯数据文件，按命名空间拆模块或登记豁免二选一）、`document-io.test.ts`（word-editor 长测试，若按 fixture 拆分可行则拆，否则豁免）
- [x] (Proof) 对每个「豁免候选」在 live repo 核对：文件结构是否为纯数据/单一职责声明体、拆分是否会破坏 cohesion（对照 `OVERSIZED_EXEMPTIONS` 既有 2 条的理由格式）；裁决结果记录到 daily log。
- [x] (Fix) 若裁决存在豁免：在 `OVERSIZED_EXEMPTIONS` 追加条目，理由引用本 plan Phase 1 裁决记录（符合脚本「每条豁免 MUST cite 决策引用」契约）；若裁决全拆分则跳过。

Exit Criteria:

> 只写本 Phase 交付的可观测结果 + 保证后续 Phase 能继续的局部检查。

- [x] 12 文件逐文件裁决表落地（`docs/logs/2026/08-07.md` 或本 plan 注记）：每文件标 `split` / `exempt`，豁免条目标注引用理由
- [x] 豁免追加（如有）后 `node scripts/check-oversized-code-files.mjs` 输出中的豁免文件带 `[exempt]` 标记且数量与裁决表一致

裁决终态：10 split + 2 exempt（en-US.ts / zh-CN.ts）。document-io.test.ts 按 11 个顶层 describe 主题拆 3 文件，不豁免。

### Phase 2 - i18n locale 文件（en-US.ts / zh-CN.ts）

Status: completed
Targets: `packages/flux-i18n/src/locales/en-US.ts`、`packages/flux-i18n/src/locales/zh-CN.ts`

- Item Types: `Fix | Decision`

- [x] (Decision) 终裁：按命名空间拆多模块（如 `locales/en-US/{common,form,data,...}.ts` + 聚合 index re-export，`enUS` 聚合对象 shape 不变）或登记豁免（纯数据声明体，`Resource` 类型无逻辑 cohesion 损失）。优先尝试拆分；若拆分引入 i18n key 顺序/合并复杂度且零收益，则按豁免收口（引用 Phase 1 裁决）。
- [x] (Fix) 按裁决落地：拆分则建子模块 + 聚合 `enUS`/`zhCN` 聚合对象（`export default enUS` shape 不变）；豁免则仅补 `OVERSIZED_EXEMPTIONS` 条目。
- [x] (Proof) 拆分后验证：`packages/flux-i18n` 既有 i18n 测试全绿；`pnpm check` 的 `check:i18n-keys`（若门禁扫 locale 文件）零命中；`rg "enUS" packages/` 消费点不受影响。

Exit Criteria:

- [x] `en-US.ts`/`zh-CN.ts` ≤700 行（拆分）或 `[exempt]` 标记（豁免），脚本对该文件不再报 ERROR
- [x] flux-i18n 包测试全绿（`pnpm --filter @nop-chaos/flux-i18n test`），聚合导出 shape 不变（既有 import 零改动或仅路径更新）

终裁：豁免（Phase 1 裁决落地）。live 核对确认 `check:i18n-keys`（scripts/check-i18n-keys.mjs:396-397）以 `export const <name>: Resource = {...}` 正则从这两个固定路径内联解析全部 key——拆分需 spread 聚合会直接使门禁解析器失效（defined keys 归零 → 全仓 undefined-key 红），或对第二门禁做手术（超出本 plan scope）。豁免理由已按契约写入 `OVERSIZED_EXEMPTIONS`（引用本 plan Phase 1/2 裁决）。验证：flux-i18n 27 tests 全绿、`check:i18n-keys` exit 0、enUS/zhCN 消费点零变化（en-US.ts 1021 / zh-CN.ts 1020 行带 `[exempt]` 标记，不再翻转 exit code）。

### Phase 3 - flux-compiler + flux-runtime（shape-validation-rules.ts + 2 测试文件）

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`、`packages/flux-compiler/src/schema-compiler-schema-definition-unified.test.ts`、`packages/flux-runtime/src/__tests__/validation-rule-semantics-and-lifecycle.test.ts`

- Item Types: `Fix | Proof`

- [x] (Fix) `shape-validation-rules.ts`（750 行）：按校验职责拆子模块（structural-path / dependsOn / api-schema / built-in-action / source / reaction 校验组），主文件保留公共入口 re-export（`validateStructuralPathField`/`validateDependsOnRoots`/`validateApiSchemaShape`/`validateActionShape`/`validateSourceShape`/`validateReactionShape` 等导出签名不变）。
- [x] (Fix) `schema-compiler-schema-definition-unified.test.ts`（764 行）：按 describe 主题拆 2–3 个测试文件（保留同目录），共享 fixture 提公共模块。
- [x] (Fix) `validation-rule-semantics-and-lifecycle.test.ts`（725 行）：按语义组（structural/dependsOn/api/action/source/reaction）拆测试文件。
- [x] (Proof) 拆分后：flux-compiler / flux-runtime 包全部测试绿 + 局部 typecheck 过。

Exit Criteria:

- [x] 三个文件 ≤700 行；`shape-validation-rules.ts` 公共导出签名与拆分前一致（既有 import 零行为变化）
- [x] `pnpm --filter @nop-chaos/flux-compiler test` 与 `pnpm --filter @nop-chaos/flux-runtime test` 全绿（拆分前先跑一次记录基线计数）

落地记录：

- `shape-validation-rules.ts` 750 → **10 行** re-export hub；子模块 `shape-validation-rules-{structural(95),api-schema(36),action(265),source(89),reaction(275)}.ts`，函数体逐字迁移零改动；consumers（shape-validation-node-fields.ts / shape-validation-analyze.ts）import 路径不变；`ActionValidationContext`/`emitSchemaDiagnostic` re-export 语义保持。
- `schema-compiler-schema-definition-unified.test.ts` 764 → 拆 `-extraction.test.ts`（346 行，describe 1-4）+ `-parity.test.ts`（375 行，describe 5-6）+ `-test-support.ts`（61 行，compileFixture/compiledPropValue/PRESERVE_LITERAL_MARKER）。
- `validation-rule-semantics-and-lifecycle.test.ts` 725 → 拆 `validation-rule-semantics.test.ts`（355 行，V10/V4/V5/V15/V6/V6-integration）+ `validation-rule-lifecycle.test.ts`（256 行，V9/V17/V20/V21/V18）+ `-test-support.ts`（133 行，7 个 helper）。
- 验证：flux-compiler 38→39 files / **550 tests 不变**、flux-runtime 121→123 files / **1399 tests 不变**（+1 skipped 同步），两包 typecheck 绿；脚本 ERROR 段 12 → 9（3 文件清零）。

### Phase 4 - form 包 + form-advanced（form.tsx / input-choice-renderers.tsx / tree-control-controllers.ts / form-renderer-lifecycle.test.tsx）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`、`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`、`packages/flux-renderers-form/src/__tests__/form-renderer-lifecycle.test.tsx`

- Item Types: `Fix | Proof`

- [x] (Fix) `form.tsx`（748 行）：按职责拆（如 form 生命周期编排 / 布局与 field-frame 组装 / 提交与校验联动），主组件保留入口。
- [x] (Fix) `input-choice-renderers.tsx`（748 行）：选择控件共享工厂按控件族拆子模块（choice 值适配 / combobox 列表 / radio/checkbox 渲染），公共导出 re-export 保签名。
- [x] (Fix) `tree-control-controllers.ts`（733 行）：按控件控制器拆（tree-select / input-tree 控制逻辑分模块）。
- [x] (Fix) `form-renderer-lifecycle.test.tsx`（702 行）：按生命周期主题拆测试文件。
- [x] (Proof) form / form-advanced 包测试全绿 + 局部 typecheck 过；既有 DOM 契约测试（field-controls-dom-contract 等）零行为变化。

Exit Criteria:

- [x] 4 个文件 ≤700 行；renderer 公共导出（组件名、props 类型）与拆分前一致
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test`、`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿

落地记录：

- `form.tsx` 748 → **518 行**；`form-init-action.ts`（88 行 `useFormInitAction`）/ `form-load-action.ts`（113 行 `useFormLoadAction`）/ `form-lifecycle-helpers.ts`（105 行 createFormLifecycleScope/resolveLifecycleWriteScope/reportFormInitActionError）三模块，函数体逐字迁移；setLifecycleHandlers 提交编排 effect 保留主组件；hooks 无条件调用、顺序与原 effect 一致。
- `input-choice-renderers.tsx` 748 → **614 行**；`input-choice-utils.ts`（224 行：getSourceErrorMessage/getChoiceOptionKey/sanitizeChoiceOptions/sanitizeChoiceGroups/matchChoiceLabel + SelectRenderer 纯派生 resolveChoiceVisibleOptions/VisibleGroups/ComboboxValue/MobileTriggerText）；ChoiceOption/OptionTemplateRenderer 类型 + 3 个函数 re-export 保 7 个 consumer（input.tsx/checkbox-group/button-group/select-combobox-lists/select-mobile/use-dict-options/use-select-remote-search）零改动。
- `tree-control-controllers.ts` 733 → **432 行**；`tree-control-sources.ts`（313 行：executeTreeSource/useTreeRemoteSearch/useTreeLazyChildren + 3 接口类型），主文件 re-export 保 tree-controls.tsx / tree-option-list.tsx 消费。
- `form-renderer-lifecycle.test.tsx` 702 → 拆 `-scopes.test.tsx`（330 行，3 用例）+ `-init.test.tsx`（341 行，6 用例）+ `-test-support.tsx`（83 行 makeScope/buildProps/getCallOptions）；vi.mock 前导块按 vitest 语义保留在各测试文件（vi.hoisted 不可跨文件导出），it 块逐字迁移零改动。
- 验证：form 88→89 files / **736 tests 不变**、form-advanced **1049 tests 不变**，两包 typecheck 绿；脚本 ERROR 段 9 → 5（4 文件清零）。

### Phase 5 - data 包 + word-editor + playground（crud-renderer.tsx / document-io.test.ts / route-model.ts）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、`packages/word-editor-core/src/__tests__/document-io.test.ts`、`apps/playground/src/route-model.ts`

- Item Types: `Fix | Decision | Proof`

- [x] (Decision) `document-io.test.ts`（765 行）：若测试可按 fixture 主题拆（doc/io 格式 x 场景矩阵）则拆；若为单一长流程串行断言且拆分破坏可读性，则豁免登记（Phase 1 已列候选）。
- [x] (Fix) `crud-renderer.tsx`（724 行）：按职责拆（toolbar / table 区域 / pagination / infinite-scroll 联动逻辑模块化，对照 0421-3 已拆 `crud-renderer-load.ts` 的先例方向继续）。
- [x] (Fix) `route-model.ts`（708 行）：按域拆路由表（如 domain-routes 子模块聚合），DOMAIN_RENDERER_ROUTES 导出 shape 不变。
- [x] (Proof) data 包 / word-editor-core / playground 相关测试全绿（route-model 拆分验证 playground-entry-pages e2e 相关断言不受影响——该 e2e 断言的是路由 id 非模块结构，不重跑全量 e2e，Phase 内跑相关 spec 或注明 closure 全量覆盖）。

Exit Criteria:

- [x] 3 个文件 ≤700 行或豁免（document-io 按裁决）；`CrudRenderer` 导出与 `DOMAIN_RENDERER_ROUTES` shape 不变
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test`、word-editor-core 相关测试绿

落地记录：

- `document-io.test.ts` 765 → **裁决 split**（11 个顶层 describe 主题清晰，非单一长流程串行断言）→ 拆 `document-io-persist.test.ts`（410 行 save/load/clear）+ `-datasets.test.ts`（88 行 save/loadDatasets/loadRecoveredState）+ `-normalize.test.ts`（235 行 normalize\*5）+ `-test-utils.ts`（40 行 localStorage mock + before/afterEach）。
- `crud-renderer.tsx` 724 → **625 行**；`crud-renderer-schema-builders.ts`（176 行 buildCrudTableSchema + buildCrudCarrierSchema + extractRegionSchema，函数体逐字迁移）；`resolveToolbarBlocks` 迁 `crud-renderer-toolbar.tsx`（改参数化 isMobile/hasListActions）；`CrudRenderer` 导出与全部 props 行为零变化。
- `route-model.ts` 708 → **116 行**；`basic-route-entries.ts`（118）/ `data-route-entries.ts`（62）/ `domain-route-entries.ts`（419），route-model 保留 types + RouteSpec/parseRoute/buildRoute + ALL_SHARED_RENDERER_ROUTES 聚合 + 全部 re-export（form/layout/content/mobile/ai/scheduling 既有 entries 先例对齐）；route-matrix.test.ts / component-lab 消费零改动。
- 验证：data 107 files/**753 tests 不变**、word-editor-core 11→13 files/**247 tests 不变**、playground 22 files/**143 tests 不变**（route-matrix 全绿含 DOMAIN/BASIC/DATA 计数断言），三包 typecheck 绿；`check-oversized-code-files` **exit 0**（零未登记 ERROR，2 条豁免 `[exempt]` 可查）。

### Phase 6 - 门禁复验与基线同步

Status: completed
Targets: `scripts/check-oversized-code-files.mjs`、`docs/context/project-context.md`、`docs/logs/2026/08-07.md`

- Item Types: `Proof | Follow-up`

- [x] (Proof) `node scripts/check-oversized-code-files.mjs` exit 0（零 >700 行 ERROR 文件，豁免条目 `[exempt]` 输出可查）
- [x] (Proof) `pnpm check` 全链零未登记 red（除既有豁免外无新增）
- [x] (Fix) `docs/context/project-context.md:15` 治理债表述更新：14 文件 → live 终态（「12 文件已收口（拆分 N / 豁免 M），`check:oversized-code-files` exit 0」+ 日期），删除「治理归独立 successor」残留表述
- [x] (Follow-up) daily log `docs/logs/2026/08-07.md` 记录逐文件裁决表 + 各 Phase 验证结果

Exit Criteria:

- [x] `check-oversized-code-files.mjs` exit 0（脚本级可复现）
- [x] project-context.md 治理债表述与 live 一致（`rg "14 文件|治理归独立 successor" docs/context/project-context.md` 零命中）
- [x] daily log 有本 plan 收口记录（裁决表 + 验证）

验证记录：

- 脚本 exit 0：ERROR 段仅 2 条豁免文件带 `[exempt]`，EXEMPT 段 reason 可查；WARN 156（153 基线 + 拆分产物 3 个新 WARN 候选——WARN 非硬门禁）。
- `pnpm check` 全链 exit 0；附带修复 `check:active-doc-code-anchors` 2 处旧文件名引用（docs/architecture/form-validation.md:718、docs/components/amis-bug-driven-improvements/\_b7-triage.md:197 → validation-rule-semantics.test.ts）。
- project-context.md 治理债段更新为「12 全部落定（10 拆 + 2 豁免），exit 0，plan 2026-08-07-1053-1 引用」；`rg "14 文件|治理归独立 successor"` 零命中。
- daily log 本 plan 逐文件裁决表（Phase 1 条目）+ 各 Phase 验证结果（Phase 6 条目）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_025557812ffeewtTJpstZ15rbQ`）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: 4 Minor 全部处理——M-1 Related 行引用 0556-1 改为 0529-1（coverage-manifest 拆分先例出处）；M-2 脚本豁免机制行号 19-47 更正为 23-45；M-3 Source 归属收紧为 CG/0421-3/0819-1 实际记录处（移除 0329-1/0329-2 泛化引用）；M-4 Phase 6 project-context 同步项类型 `Follow-up` 改 `Fix`（doc-drift 属 Fix 类）。审查同时确认：12 文件清单与 live 脚本输出逐字节一致、WARN 153 一致、无既有 plan 重复覆盖本治理债（0421-3 仅拆 2 文件已关闭）。

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 12 个 >700 行文件全部落定（≤700 行或 `[exempt]` 豁免），脚本 exit 0
- [x] 拆分零公共 API / 导出 / 包边界 / 编译期语义变化（各 Phase re-export 兼容核对完成）
- [x] 受影响包全部既有测试绿（拆分前后基线对比无回归）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 超限文件（每个文件都有明确裁决）
- [x] `docs/context/project-context.md` 治理债表述已同步 live 终态
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 153 个 500–700 行 WARN 段文件

- Classification: `watch-only residual`
- Why Not Blocking Closure: WARN 段（500–700）是脚本「评估拆分」提示而非 ERROR 硬门禁；`pnpm check` 聚合只吃 ERROR 段 exit code。治理价值存在但属持续优化轮，不影响本 plan 收口的「ERROR 段清零」目标。
- Successor Required: `no`（既有登记机制已承载：`docs/logs/2026/08-06.md` 0529-1 Phase 2 以 700 行为门槛登记；未来如需下沉阈值另议）

### 豁免文件的行为演进风险

- Classification: `watch-only residual`
- Why Not Blocking Closure: 豁免条目一旦登记，后续行数增长不会重新触发 ERROR（脚本只打 `[exempt]` 不翻转 exit）。脚本输出仍打印该文件（可见性保持），`pnpm check` 聚合可见 `[exempt]` 条目；若未来行数膨胀到影响可维护性，由日常 review / 既有 500 行 WARN 提示承接。
- Successor Required: `no`

## Non-Blocking Follow-ups

- WARN 段 153 文件治理（500–700 行）留待未来治理轮，本 plan 不承接。
- 若拆分过程中发现非本门禁驱动的低成本结构问题（同文件内顺手可治理），当场处理或登记 daily log，不静默跳过。

## Closure

Status Note: completed via closure audit

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (fresh session, task `ses_024e6c528ffebs4jlVFNQudHtV` + re-audit)
- Evidence: 首轮 audit findings 2 Major + 1 Minor 全部修复并经 re-audit 复验：`_b7-triage.md:30` / `01-form-validation.md:78` 旧文件名引用已改为 `validation-rule-semantics.test.ts`（`rg` 于 docs/components + docs/architecture 零命中）；plan Phase 4 记录与 daily log 行数更正为 518；`node scripts/check-oversized-code-files.mjs` exit 0（2 条豁免 `[exempt]`）、`pnpm check` 全链 exit 0；closure-audit gate 由独立 auditor 勾选。verdict: approved

Follow-up:

- none
