# 3 测试基建模式治理（document-io-test-utils 显式 install / scopeCounter 局部化 / designer Space 断言永真）

> Plan Status: active
> Mission: component-audit
> Work Item: P2-backlog:test-infra-patterns
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（14-2/14-4/14-5+23-3）、`docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」
> Related: `docs/plans/2026-08-07-2228-3-runtime-action-form-p2-remediation.md`（completed，Non-Blocking Follow-ups 登记 14-4/14-5+23-3 P3 测试加固）、`docs/plans/2026-08-07-0819-1-flow-designer-graph-domain-successor-remediation.md`（completed，designer-xyflow-node 键盘路径出处）

## Purpose

把 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」中 **测试基建模式** 的 3 条收口：`document-io-test-utils.ts` 成为「import 即注册全局 hook」的共享模块（14-2，P2）、`table-selection-checkable-scope-dispose.test.tsx` 模块顶层 `let scopeCounter`（14-4，P3）、designer 空槽 Space 用例 `Number.isFinite` 断言对 stub 恒有限输入为永真（14-5+23-3，P3）。全部为测试代码质量/隔离性缺陷，无产品代码变更。

## Current Baseline

- **document-io-test-utils 隐式全局 hook 注册**（14-2，确定）：`packages/word-editor-core/src/__tests__/document-io-test-utils.ts:28-40` 模块级 `beforeEach`（`localStorageState.current = createLocalStorageMock()` + `vi.stubGlobal('localStorage', ...)`）与 `afterEach`（`setRecoveryLoadErrorHandler(undefined)` + `vi.unstubAllGlobals()`）——任何未来仅想引用 `STORAGE_KEY` 常量的测试文件一 import 即被静默注入 localStorage 全局 stub 与清理钩子；`localStorageState` 为可变模块态（test-module-top-let 规则的 const 变体）。现有 2 个 importer（`document-io-datasets.test.ts:9`、`document-io-persist.test.ts:14`）恰好都消费 localStorageState。仓库既有显式 opt-in 先例：`packages/flow-designer-renderers/src/canvas-bridge-test-support.tsx:216` `installCanvasBridgeTestHooks()`。
- **table-selection-checkable-scope-dispose.test.tsx 模块顶层 `scopeCounter`**（14-4，P3）：`packages/flux-renderers-data/src/__tests__/table-selection-checkable-scope-dispose.test.tsx:12` `let scopeCounter = 0`；`pnpm check:audit-test-global-leaks` 实跑确认在命中列表（49 命中/2 桶含本文件），违反 zero-new-hits 治理（2306-2 新建时带入）；断言全为配对相对断言（不依赖绝对 id），隔离风险理论性。同包 `use-table-controls.test-support.tsx:28` 复制了同模式。
- **designer 空槽 Space 用例 Number.isFinite 永真断言**（14-5+23-3，P3）：`packages/flow-designer-renderers/src/designer-xyflow-node.keyboard.test.tsx:107-118` Space 用例 `expect(Number.isFinite(clientX)).toBe(true)`——stubSlotRect 恒返回有限矩形（left:100/top:50/right:300/bottom:130），断言恒真；Enter 用例（:100-103）已把中心值 200/90 精确锁死（同一 `openSlotMenuFromElement` handler 路径）；真实 fail-closed 行为（元素未布局、零尺寸矩形）无任何用例。
- 验证基线：`pnpm check:audit-test-global-leaks` 当前命中 49（含 14-4 所在桶）；word-editor-core、flux-renderers-data、flow-designer-renderers 三包测试当前全绿；`pnpm test:scripts` 独立跑脚本测试。

## Goals

- `document-io-test-utils` 改显式 `installDocumentIoTestHooks()`（仿 canvas-bridge 先例），常量导出与 hook 副作用解耦；两个既有 importer 改为显式调用。
- `table-selection-checkable-scope-dispose.test.tsx` 计数器移入局部作用域（或 `created.length` 派生 id），消除 `check:audit-test-global-leaks` 新命中；同包 `use-table-controls.test-support.tsx:28` 同模式一并收敛。
- designer Space 用例断言改为精确中心值（200/90）或补零矩形/异常值 fail-closed 用例（Enter 精确断言 + Space 对齐，二者取一：对齐精确值）。
- 三条 roadmap Follow-up Backlog 条目勾选并注明 plan 引用（14-5+23-3 无独立 roadmap 行，回写 2228-3 Non-Blocking Follow-ups 引用的收口状态 + 在 roadmap 以行内注记登记）。

## Non-Goals

- 不改变 word-editor-core 产品代码（`document-io.ts`）行为；`installDocumentIoTestHooks` 只做测试侧显式化重构。
- 不重写 designer-xyflow-node 键盘测试整体结构（只修 Space 用例断言与补 fail-closed 用例）。
- 不重跑全量 e2e；验证以三包 focused 单测 + `pnpm check` + 全量验证（Closure Gates）为准。

## Scope

### In Scope

- `packages/word-editor-core/src/__tests__/document-io-test-utils.ts`：`beforeEach`/`afterEach` 模块副作用收敛为导出 `installDocumentIoTestHooks()`（内部注册 localStorage stub + recovery handler 清理）；`localStorageState` 保留为显式可访问的 mock 实例（或改函数内创建 + 返回），常量导出（STORAGE_KEY/DATASET_STORAGE_KEY）与 hook 副作用解耦。
- `packages/word-editor-core/src/__tests__/document-io-datasets.test.ts`、`document-io-persist.test.ts`：文件级调用 `installDocumentIoTestHooks()`（各测试文件开头一次），import 常量路径不变。
- `packages/flux-renderers-data/src/__tests__/table-selection-checkable-scope-dispose.test.tsx:12`：`scopeCounter` 移入 `createSpyHelpers` 局部作用域（或 `created.length` 派生 id）。
- `packages/flux-renderers-data/src/__tests__/use-table-controls.test-support.tsx:28`：同模式计数器局部化收敛。
- `packages/flow-designer-renderers/src/designer-xyflow-node.keyboard.test.tsx:107-118`：Space 用例断言改精确中心值（200/90，与 Enter 对齐）；补 1 条 fail-closed 用例（零尺寸/未布局矩形 → 坐标 NaN 或 fallback 行为断言，按 live 行为裁定）。
- Roadmap Follow-up Backlog 条目勾选 + daily log 登记。

### Out Of Scope

- `check:audit-test-global-leaks` 扫描器自身增强（模块态 const 变体识别，审计 §9.2 建议）——本 plan 只清零 14-4 类已知命中面，扫描器增强归后续工具治理。
- 全仓 test-support 模块的同类隐式 hook 排查（本 plan 只收 word-editor-core 已知面；canvas-bridge 已是显式先例）。

## Failure Paths

不适用（纯测试基建重构，无外部集成与用户可见失败路径；重构正确性由三包测试全绿 + `check:audit-test-global-leaks` 命中数归零验证）。

## Test Strategy

本档选择：`建议有测`（改动全部在测试代码内部：显式化重构后既有用例必须全绿即验证；14-4/14-5 为断言质量修复，其"正确结果"由 `pnpm check:audit-test-global-leaks` 命中归零 + 精确断言用例存在性证明）。

## Execution Plan

### Phase 1 - document-io-test-utils 显式 install（14-2）

Status: planned
Targets: `packages/word-editor-core/src/__tests__/document-io-test-utils.ts`、`document-io-datasets.test.ts`、`document-io-persist.test.ts`

- Item Types: `Fix | Proof`

- [ ] Fix：重构 `document-io-test-utils.ts`——模块级 `beforeEach`/`afterEach` 移除，新增导出 `installDocumentIoTestHooks()`（内部做 `localStorageState.current = createLocalStorageMock()` + `vi.stubGlobal` + afterEach 清理注册）；常量导出保持。
- [ ] Fix：两个 importer 文件各自文件级调用 `installDocumentIoTestHooks()`。
- [ ] Proof：新增/更新用例验证显式化语义——常量-only 导入不触发全局 stub（新建小型合成测试：仅 import 常量 + 断言 `globalThis.localStorage` 未被 stub）；两个既有测试文件全绿。

Exit Criteria:

- [ ] `document-io-test-utils.ts` 无模块级副作用（`rg '^beforeEach|^afterEach' document-io-test-utils.ts` 零命中——注意 `installDocumentIoTestHooks()` 内部必然包含两者，锚定模块顶层形态）；常量-only 导入合成用例证明不注册全局 hook
- [ ] `pnpm --filter @nop-chaos/word-editor-core test` 全绿（含两个 importer 文件）

### Phase 2 - scopeCounter 局部化（14-4）

Status: planned
Targets: `packages/flux-renderers-data/src/__tests__/table-selection-checkable-scope-dispose.test.tsx`、`use-table-controls.test-support.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix：`table-selection-checkable-scope-dispose.test.tsx:12` 模块顶层 `let scopeCounter` 移入 `createSpyHelpers` 局部作用域（或改用 `created.length` 派生 id——两者均符合本项要求，选一即可；断言为配对相对断言，不依赖绝对 id）。
- [ ] Fix：`use-table-controls.test-support.tsx:28` 同模式计数器局部化收敛。
- [ ] Proof：`pnpm check:audit-test-global-leaks` 复跑——14-4 所在两文件命中行消失（49 命中 → 47，两文件各去 1 条；按实际桶变化核对，零新增）；data 包测试全绿（断言全为配对相对断言，不受 id 派生方式影响）。

Exit Criteria:

- [ ] `rg '^let .*Counter = 0' table-selection-checkable-scope-dispose.test.tsx use-table-controls.test-support.tsx` 零命中（模块顶层形态）；局部作用域或 derived id 均可
- [ ] `pnpm check:audit-test-global-leaks` 该两文件零命中；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿

### Phase 3 - designer Space 断言对齐精确值 + fail-closed 用例（14-5+23-3）

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-xyflow-node.keyboard.test.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix：Space 用例 `Number.isFinite` 断言改精确中心值断言（200/90，与 Enter 用例 :100-103 对齐——同一 handler 路径）。
- [ ] Proof：新增 fail-closed 用例——stub 零尺寸矩形（left:0/top:0/right:0/bottom:0），按 live 行为断言：`openSlotMenuFromElement`（designer-xyflow-node.tsx:205-216）当前**无 NaN 保护**（零尺寸矩形 → 中心 (0,0) 有限值、不抛错），故断言**精确 (0,0)** + `onPlusButtonClick` 仍被调用 1 次（锁定"坐标按矩形中心推导、零矩形落到原点"的真实语义，而非 `Number.isFinite` 永真）。

Exit Criteria:

- [ ] Space 用例断言精确中心值（无 `Number.isFinite` 永真断言残留）；fail-closed 用例断言精确 (0,0) + 调用计数（live 行为锁定）
- [ ] `pnpm --filter @nop-chaos/flow-designer-renderers test` 全绿（含键盘测试族既有用例零回归）

### Phase 4 - 收口

Status: planned
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-08.md`

- Item Types: `Follow-up`

- [ ] roadmap Follow-up Backlog 三条（14-2/14-4/14-5+23-3）勾选并注明本 plan 引用（14-5+23-3 在 roadmap 行内注记登记收口）；daily log 登记执行记录与 fail-closed 行为裁定。

Exit Criteria:

- [ ] roadmap 条目 `[ ]`→`[x]`（附 plan 引用）；daily log 收口记录已写

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session）：`ses_022a4eba5ffeXbGGvafUWXCMHm`（round 1）
- Verdict: `pass`（round 1，零 Blocker/零 Major，5 Minor 全部修订处理）
- Rounds: 1
- Findings addressed:
  - Minor 1：Phase 1 Exit Criteria `rg "beforeEach|afterEach"` 无法通过——锚定模块顶层形态 `rg '^beforeEach|^afterEach'`
  - Minor 2：Phase 2 Exit Criteria 与 Fix 选项一矛盾（局部作用域计数器仍匹配字面模式）——改为锚定模块顶层 `rg '^let .*Counter = 0'`，局部/derived 均可
  - Minor 3：Phase 2 Proof 计数 off-by-one——49 → 47（两文件各去 1 条）
  - Minor 4：Phase 3 fail-closed 断言近永真（零矩形中心仍有限）——改断言精确 (0,0) + 调用计数（live 核对 `openSlotMenuFromElement` 无 NaN 保护）
  - Minor 5：Phase 4 `❌→✅` 措辞改 `[ ]`→`[x]`

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 14-2 document-io-test-utils 显式 install 落地（常量/hook 解耦 + 两 importer 迁移 + 常量-only 合成用例）
- [ ] 14-4 scopeCounter 局部化落地（两文件模块顶层计数器零残留，`check:audit-test-global-leaks` 两文件零命中）
- [ ] 14-5+23-3 Space 精确断言 + fail-closed 用例落地
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷
- [ ] roadmap Follow-up Backlog 三条已勾选并注明 plan 引用；daily log 已登记
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### check:audit-test-global-leaks 扫描器「const 变体模块态」识别增强

- Classification: `optimization candidate`
- Why Not Blocking Closure: 14-2 的 `localStorageState` 显式化后已不构成新命中面；扫描器增强（审计 §9.2 建议）属工具演进，不实施不影响当前门禁成立（14-4 类新命中已清零）。
- Successor Required: `no`
- Successor Path: 无（归未来 audit 工具治理轮次）

## Non-Blocking Follow-ups

- 全仓其他 test-support 模块的隐式 hook 模式排查（canvas-bridge 已显式先例，其余包如有同型模块由未来治理轮次处理）。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
