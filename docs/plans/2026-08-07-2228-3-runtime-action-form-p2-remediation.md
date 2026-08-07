# 3 公共层 + form 域 P2 修复（action-core seam/runtime surface scope/form 守卫与构建 + 治理文档）

> Plan Status: active
> Mission: component-audit
> Work Item: P2-backlog:runtime-action-form
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1747-open-audit-component-audit.md`（2-3/2-4 部分/2-5/2-6/2-12/2-16）、`docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（01-01/02-05/14-3/16-1/16-4）
> Related: `docs/plans/2026-08-07-1747-2-form-data-p1-remediation.md`（completed，1-1/1-12 与本批 2-5/2-6/14-3 同源同文件）、`docs/plans/2026-08-07-1747-3-content-runtime-p1-remediation.md`（completed，1-10 async-data child scope 与本批 2-12 同属 runtime 生命周期域）

## Purpose

把 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」中 **公共层（flux-action-core / flux-runtime）+ form 域** 的 10 条 P2 收口：`finishAction` 恒等函数死管道、`onErrorError` 重包装丢失 caught-failure 抑制标记、surface scope dispose 缺口 + GC 测试假保障、form `importsReady` 死守卫、input-choice append 远端空结果分支、input-choice-utils 纯函数零单测、form 构建排除缺 test-support 模式，以及 3 条治理文档漂移（module-boundaries shape-validation 条目、pc-index 台账行、nested-schema 行段引用）。公共层修复按「必须自动化」纪律 test-first。

## Current Baseline

- **`finishAction` 恒等函数死管道**（2-3，确定）：`flux-action-core/src/action-dispatcher/action-runners.ts:46-53` 原样返回 result；14 个调用点（action-runners 6 + action-execution 3 + built-in-actions 5）构建的 `ActionMonitorPayload` + `dispatchMode`（action-execution.ts:263）全部被丢弃——死计算 + 误导性 seam（`docs/architecture/action-scope-and-imports.md:617,1397` 暗示 monitor 细节流）。
- **`onErrorError` 重包装丢失 caught-failure 抑制标记**（2-16，很可能）：`action-execution.ts:579-591` `{...result, onErrorError}` 未保留 `preserveCaughtFailureMarker`（:402/:455 retry 路径在用）——外层 onError 分支失败时 `caughtFailureResults` WeakSet（:207）抑制失效，可能重复错误上报（需嵌套链触发）。
- **surface scope dispose 缺口 + GC 测试假保障**（2-12，确定机制）：`runtime-factory.ts:598-625` `createSurfaceScope` 直用 `createScopeRef`（含 `openingScope` :608-612 同源）绕过 `createChildScope` → 不进 `ownedScopeDisposers`（`createChildScope` :353-374 注册真实 `scope.dispose()`）；`surface-runtime.ts:121` `disposeOwnedScope` 默认 fallback `disposeScopeTree`（runtime-owned-factories.ts:280）只清 source/reaction 注册不调 `scope.dispose()`；`surface-teardown-gc.test.ts:25-29` 注入 mock disposeScope 绕过生产链——「L1 regression gate」对真实路径零判别力。
- **`form.tsx:50` `importsReady = true` 硬编码死守卫**（2-5，确定）：form.tsx:50 恒 true；两个新 hook（init/load，1053-1 拆分）均以 `!importsReady` 门控 → early-return 不可达、参数误导；`preparedImports` 意图（门控 init/load）已失效。
- **input-choice append 模式远端空结果展示全部未过滤 raw options**（2-6，确定）：`input-choice-utils.ts:142-150` `resolveChoiceVisibleOptions`——`remoteOptions === []`（空结果或搜索错误）时 `[...rawOptions, ...[]]` 在用户输入 query 时展示全量未过滤列表，与 replace 模式（空列表 + ComboboxEmpty）及本地过滤分支不一致。
- **input-choice-utils.ts 9 个纯函数零直接单测**（14-3）：1747-2 修复 1-12 时拆出的纯函数（sanitize/matchChoice 等）无直接单测；补 boolean 矩阵与 mobile trigger 文本选择用例。
- **flux-renderers-form 构建排除缺 test-support 模式**（01-01，确定）：`tsconfig.build.json:12-20` exclude 有 `src/**/*-test-support*` 但 **`src/test-support.tsx`（src 根级）与 `src/test-dom-polyfills.ts` 不被任何模式覆盖**——`dist/test-support.js` + `dist/test-dom-polyfills.js` live 存在（imports `@testing-library/react`/`vitest` 等 devDep-only 依赖，含 devDep 声明 `@nop-chaos/flux-formula`），dist 泄漏含 devDep-only 依赖的测试模块。
- **治理文档漂移**：`docs/architecture/flux-runtime-module-boundaries.md:90-96` 只列 `shape-validation-rules.ts` 单条，缺 5 个拆分后子模块（rules-structural/api-schema/action/source/reaction，02-05）；`docs/audits/per-component/pc-index.md:370` `check:oversized-code-files` 行仍标「16 文件 >700 pre-existing red」（live 终态：exit 0，2 豁免，1053-1 已收口，16-1）；`docs/architecture/nested-schema-field-classification.md:260` 引 `shape-validation-rules.ts:278-326` 行段（现为 10 行 hub re-export，16-4）。
- **验证基线**：2026-08-07 全量 typecheck/build/lint 32/32、test 59/59（flux-action-core/runtime/form 家族全绿）、`pnpm check` exit 0。

## Goals

- `finishAction` 死管道收敛：移除死 seam 或恢复 monitor 语义（二选一裁决），`action-scope-and-imports.md:617,1397` 同步。
- `onErrorError` 重包装保留 `preserveCaughtFailureMarker`，嵌套 onError 失败不重复 toast。
- surface scope 生命周期收口：`createSurfaceScope` 产物纳入 disposer 管理或显式 dispose 路径，`surface-teardown-gc.test.ts` 改走生产链（mock 移除或降级为生产路径旁证）。
- form `importsReady` 死守卫收敛（移除或恢复真实门控语义）。
- input-choice append 远端空结果分支与 replace/本地模式一致。
- input-choice-utils 纯函数直接单测补齐；form 构建 exclude 补 test-support 模式，dist 不再泄漏测试模块。
- 3 条治理文档漂移修正。

## Non-Goals

- 不改变 `finishAction` 之外的动作执行语义；不重构 action-monitor 机制（若裁决移除 seam，不留半套）。
- 不做 runtime-factory 整体重构（仅 surface scope 生命周期路径）。
- 不处理工具链扫描器其他条目（01-02/03-01/03-02/03-03/14-1/14-2 归后续工程治理轮次）。
- 不修改 `@nop-chaos/ui` 公共导出。

## Scope

### In Scope

- `packages/flux-action-core/src/action-dispatcher/`（action-runners.ts、action-execution.ts）。
- `packages/flux-runtime/src/`（runtime-factory.ts、surface-runtime.ts、runtime-owned-factories.ts）。
- `packages/flux-renderers-form/src/`（renderers/form.tsx、renderers/input-choice-utils.ts、tsconfig.build.json、相关测试）。
- `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`（2-4 部分：无消费者 re-export）。
- `docs/architecture/action-scope-and-imports.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/nested-schema-field-classification.md`、`docs/audits/per-component/pc-index.md`。
- `docs/backlog/component-audit-roadmap.md` Follow-up Backlog 对应条目勾选（2-3/2-4/2-5/2-6/2-12/2-16/01-01/02-05/14-3/16-1/16-4）。

### Out Of Scope

- 其余工程治理条目（01-02/03-01/03-02/03-03/14-1/14-2/14-4/14-5+23-3）——归后续轮次。
- 其他包的构建/文档改动。

## Failure Paths

| 场景                | 触发                                 | 预期行为                                       | 可重试 | 用户可见表现                  |
| ------------------- | ------------------------------------ | ---------------------------------------------- | ------ | ----------------------------- |
| 嵌套 onError 失败   | 外层 onError 分支动作失败            | 保留 caught-failure 抑制标记，不重复 toast     | 否     | 单一错误提示                  |
| surface 销毁        | dialog/drawer 关闭销毁 surface scope | scope 实际 dispose（store 快照/依赖链回收）    | 是     | 无泄漏（GC 测试走生产链实证） |
| form init/load 守卫 | preparedImports 场景                 | 守卫语义收敛后无死分支（行为不变或按裁决恢复） | 是     | 无静默不可达路径              |
| form dist 产物      | 包构建                               | 不含 test-support/test-dom-polyfills 模块      | 否     | dist 无 devDep 泄漏           |

## Test Strategy

本档选择：**必须自动化**（2-3/2-12/2-16 属公共层契约修复——先写失败测试再实现；2-5/2-6/14-3/01-01 建议有测，行为修复 test-first）。

## Execution Plan

### Phase 1 - flux-action-core 公共层（finishAction 死管道 + onErrorError 抑制标记）

Status: planned
Targets: `packages/flux-action-core/src/action-dispatcher/action-runners.ts`、`action-execution.ts`、`docs/architecture/action-scope-and-imports.md`

- Item Types: `Decision | Fix | Proof`

- [ ] 2-3 `finishAction` 裁决：live 核对 15+ 调用点的 `ActionMonitorPayload`/`dispatchMode` 构造与丢弃点；二选一——(a) 移除 `finishAction` seam 与死参数构造（runner 签名瘦身），或 (b) 恢复 monitor 细节流语义（如 monitor 持久化/promise 回传）；裁决记录于 daily log；`action-scope-and-imports.md:617,1397` 按最终设计状态同步。
- [ ] 2-16 `action-execution.ts:578-591` 重包装补 `preserveCaughtFailureMarker` 透传（对齐 :402/:455 retry 路径）；用例：嵌套 onError 失败链 → `reportUnhandledFailureClass`（:165，WeakSet 抑制检查所在地；`reportActionError` :140-163 不查 WeakSet）单元级抑制生效（单一错误上报），先红后绿。

Exit Criteria:

- [ ] 2-3 裁决落地（`rg "finishAction" packages/flux-action-core/src/` 与裁决形态一致；或 monitor 语义已恢复并有用例）。
- [ ] 2-16 嵌套失败用例先红后绿；flux-action-core 包测试绿。

### Phase 2 - flux-runtime surface scope dispose 收口

Status: planned
Targets: `packages/flux-runtime/src/runtime-factory.ts`、`surface-runtime.ts`、`runtime-owned-factories.ts`、`surface-teardown-gc.test.ts`

- Item Types: `Fix | Proof`

- [ ] 2-12 `createSurfaceScope` 生命周期收口：surface scope（主 scope 与 `openingScope` :608-612 两个 raw `createScopeRef` 产物）纳入 dispose 管理（经 `createChildScope` 或显式 disposer 注册——opening scope 的 id 非 `${mainScopeId}:` 前缀，tree-dispose 前缀匹配不覆盖，须显式登记），`disposeOwnedScope` 对 surface scope 走真实 `scope.dispose()`（对齐 async-data 1-10 已落地模式）；生产链 dispose 实测（surface 打开→关闭→scope store 无残留）。
- [ ] `surface-teardown-gc.test.ts:25-29` 去 mock：改走生产链断言（mock disposeScope 移除或仅作旁证），「L1 regression gate」恢复判别力。

Exit Criteria:

- [ ] surface 生命周期用例走生产链先红后绿（关闭后 scope 无残留）；flux-runtime 包测试绿。
- [ ] `surface-teardown-gc.test.ts` 不再注入绕过生产链的 disposeScope mock（或注释说明旁证用途）。

### Phase 3 - form 域（importsReady 守卫 + append 空结果 + 纯函数单测 + 构建排除）

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`、`input-choice-utils.ts`、`tsconfig.build.json`、相关测试

- Item Types: `Fix | Proof`

- [ ] 2-5 `form.tsx:50` `importsReady` 守卫收敛：live 核对两个 hook 的 `!importsReady` 门控与 `preparedImports` 意图——移除死守卫（清理参数）或恢复真实就绪门控语义（二选一裁决）；行为不变由既有 form 测试锁定。
- [ ] 2-6 `resolveChoiceVisibleOptions` append 模式：`remoteOptions === []` 且 query 非空时展示空列表 + ComboboxEmpty（对齐 replace 模式），本地过滤分支语义不变；用例：append + 远端空结果 → 不展示全量 raw。
- [ ] 14-3 input-choice-utils 纯函数直接单测：sanitize/matchChoice boolean 矩阵、mobile trigger 文本选择等 9 个纯函数（1747-2 拆分产物）补直接单测。
- [ ] 01-01 `tsconfig.build.json` exclude 补 `src/**/test-support*` 与 `src/test-dom-polyfills*`（src 根级形态，roadmap 措辞 `src/**/test-support*` 对根级文件同样匹配）；重跑 build 后 `dist/` 无 `test-support`/`test-dom-polyfills` 产物。

Exit Criteria:

- [ ] 2-5 裁决落地（死守卫移除或语义恢复），form 测试绿（行为零回归）。
- [ ] 2-6 用例先红后绿；form 包测试绿。
- [ ] 14-3 纯函数用例绿（以 `input-choice-utils.ts` 导出纯函数面为覆盖清单：每个导出纯函数至少 1 条直接单测，用例名与函数名对应可 grep 验证）。
- [ ] `ls packages/flux-renderers-form/dist/ | grep -i "test-support\|test-dom"` 零命中；`pnpm --filter @nop-chaos/flux-renderers-form build` 绿。

### Phase 4 - 治理文档漂移 + flux-compiler 死 re-export

Status: planned
Targets: `docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/nested-schema-field-classification.md`、`docs/audits/per-component/pc-index.md`、`packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`

- Item Types: `Fix | Decision`

- [ ] 02-05 `flux-runtime-module-boundaries.md:90-96` 补 5 个 shape-validation 子模块条目（shape-validation-rules-{structural,api-schema,action,source,reaction}.ts），hub 条目改 re-export hub 描述。
- [ ] 16-4 `nested-schema-field-classification.md:260` 行段引用更新为 `shape-validation-rules-action.ts`（analyzeSchemaInput 递归路径）或去行段。
- [ ] 16-1 `pc-index.md:370` `check:oversized-code-files` 行更新为 live 终态（exit 0，2 豁免，plan 2026-08-07-1053-1）。
- [ ] 2-4 部分：`shape-validation-rules.ts:6` re-export `validateStructuralPathField` 无消费者（live 核对：唯一消费者直接 import 子模块；hub 其余 6 个 re-export 被 `shape-validation-node-fields.ts:14-23` 消费，**保留**）——移除该单一死 re-export；hub 保持 re-export hub 形态（与 02-05「hub 条目改 re-export hub 描述」一致，无冲突）。

Exit Criteria:

- [ ] 三份治理文档与 live 代码一致（module-boundaries 生产模块条目人工核对无缺漏——`check:active-doc-code-anchors` 只验证锚点、不验证模块完整性、pc-index 台账行为 live 终态）。
- [ ] `check:active-doc-code-anchors` / `pnpm check` 无新增失效。
- [ ] shape-validation-rules.ts re-export 清理或登记裁决；flux-compiler 包测试绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）round 1 `ses_0235c4dceffeTXO3dqo35vudpS`（revised：1 Major）、round 2 `ses_023558f59ffeCKpPYboBYAAFqO`（pass）
- Verdict: `pass`（round 2 共识，零 Blocker 零 Major）
- Rounds: 2
- Findings addressed: round 1 Major M1（2-4 收窄为单一死 re-export `validateStructuralPathField`，hub 其余 6 个 re-export 被 `shape-validation-node-fields.ts:14-23` 消费保留，与 02-05 keep-hub 措辞显式对账）已修复；round 1 Minor m1-m5 全部处理——openingScope :608-612 纳入 dispose 设计、module-boundaries 完整性改人工核对表述、01-01 用 roadmap 措辞 `src/**/test-support*`、14-3 exit 绑定 input-choice-utils 导出面、2-16 测试钉在 `reportUnhandledFailureClass`；round 2 Minor 处理——2-16 用例目标函数更正为 :165（`reportActionError` :140-163 不查 WeakSet）、finishAction 调用点数更正为 14（action-runners 6 + action-execution 3 + built-in-actions 5）、01-01 基线表述修正（dist 泄漏模块 imports 含 @testing-library/react/vitest 等 devDep-only 依赖）。

## Closure Gates

- [ ] 所有 in-scope 已确认 P2 缺陷（2-3/2-5/2-6/2-12/2-16）已修复并带 focused 测试
- [ ] 01-01 构建排除修复（dist 零 test-support 泄漏）
- [ ] 14-3 纯函数单测补齐；2-4 flux-compiler re-export 清理或登记
- [ ] 02-05/16-1/16-4 治理文档漂移修正
- [ ] 不存在被静默降级到 deferred 的 in-scope 缺陷
- [ ] roadmap Follow-up Backlog 对应条目勾选（2-3/2-4/2-5/2-6/2-12/2-16/01-01/02-05/14-3/16-1/16-4）并注明 plan 引用
- [ ] 受影响的 owner docs 已同步（action-scope-and-imports.md、flux-runtime-module-boundaries.md、nested-schema-field-classification.md、pc-index.md）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` 零新增命中

## Deferred But Adjudicated

无（所有 in-scope 项均为已确认缺陷或文档漂移，全部入 Fix/Decision/Proof，无延期项）。

## Non-Blocking Follow-ups

- 其余工程治理条目（01-02 manifest-deps 未跟踪扫描、03-01 fork JSDoc/单测、03-02 graph 死依赖、03-03 raw-schema-reads 块注释盲区、14-1 浏览器 IO 夹具目录、14-2 document-io-test-utils 显式 install、14-4/14-5+23-3 P3 测试加固）归后续工程治理轮次，不影响本 plan 收口。
- `docs/logs/2026/08-07.md` 登记本轮裁决记录（finishAction 去向、importsReady 收敛、shape-validation re-export 去向）。

## Closure

Status Note: 待执行完成后填写。

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 待执行完成后填写（non-blocking follow-up 或 no remaining plan-owned work）。
