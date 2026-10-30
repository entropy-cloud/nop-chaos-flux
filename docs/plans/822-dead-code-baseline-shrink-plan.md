# 822 死代码清理与基线收缩（knip 陈旧行收缩 / as-any 产品码收严 / 杂项裁决）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/audits/deep-audit-2026-10-31.md` §3（C5/C6）、§4（D1/D3）——**D1/D3 初稿声称经评审证伪并修订，见 Current Baseline 勘误说明**
> Related: plan 601（WA-16 引入 as-any-casts 进 scanner-baselines）、cq-1 quality gates、09ed6e5b6（knip 基线 hand-edit 收缩规则）

## Purpose

收缩 knip 基线中的陈旧行并为唯一真死代码补删除；为 as-any 产品码子集（11 处）补真实类型并收缩计数基线；处置 fm3 characterization it.skip 与 gantt undo-stack 的伪 TODO 字面量。收口后：knip 无 live findings 且无陈旧基线行、as-any 计数 41→≤30、两处杂项有明确裁决。

## Current Baseline（含评审勘误）

**初稿误读勘误**：`check:knip-baseline` 的 "9 registered entries can be shrunk" 指**基线中 knip 已不再报告的陈旧行**（`scripts/check-knip-baseline.mjs:50-64,138` resolved 语义），不是"9 项活死代码"。评审以 `npx knip --reporter json` 实跑逐项核实：

- **唯一 live finding**：`UseDataSourcesArgs`（`packages/flux-renderers-3d/src/renderer/hooks/use-data-sources.ts`，类型；初稿所引 `src/index.tsx` 路径不存在——该包 entry 是 `index.ts`，旧路径只是基线行里的陈旧记录）。
- `dragReplicationCard`（tests/e2e/helpers/replication.ts）：**非死代码**——已被已落地 spec 引用（`replication-wms-wave-picking.spec.ts:5,102`、`replication-crm-opportunity-kanban.spec.ts:4,171,232`）；基线行注记"specs 落地后收缩"的条件已成立 → 只收缩基线行，代码保留。
- `renderFileListSidebar`：源码中已不存在（仅基线残行）→ 只收缩基线行。
- `splitResponsiveColumns`（responsive.ts:104 内部使用）、`useRowQuickEditDraft`（use-row-quick-edit-draft.tsx:265 内部使用）、`TouchDirection/TouchState/UseTouchOptions/UseTouchReturn`（use-touch.ts:13,26,35,52 内部使用）：均为内部使用的导出，knip 已不报 → 只收缩基线行；不做 de-export（超出 knip 诉求，避免无谓 churn）。
- **knip 基线收缩机制**：`scripts/baselines/knip-baseline.json` header 明文 "shrink via surgical hand-edit (**do NOT run --update-baselines**: full re-snapshot absorbs parallel churn — see 09ed6e5b6)"——硬规则，禁止 --update-baselines。
- as-any（`find-as-any-casts.mjs` 实测 41 = 基线 41）：产品码子集为 **11 处**（初稿记 8 处系漏计）：`packages/flux-formula/src/evaluator.ts`（:114、:400 共 2）、`flux-renderers-scheduling/src/calendar/calendar.tsx`（2）、`gantt/gantt-grid.tsx`（1）、kanban（2）、`barcode-input`（3：use-barcode-torch.ts:76、barcode-detector-utils.ts:34、barcode-media-io.ts:28）、`packages/flux-compiler/src/schema-compiler/fields.ts`（:84，初稿遗漏）；其余 ~30 处在 playground demo 页（保持登记）。
- `check:console-baseline` 绿，2 条登记可收缩（该基线 header **明确允许** `--update-baselines`）。
- `packages/flux-renderers-form/src/__tests__/fm3-contract-probes.test.tsx:377` 存在 1 处 `it.skip`（characterization 探针，上下文注"Unskip once the guard lands"）。
- `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:194`：字面 `// TODO:` 前缀，但其注释首行（:193）明示 "adjudicated dual-track design, **not an open TODO**"（主题为 undo 粒度统一，非"去重"——初稿表述有误）；find-todo-exitless **基线已登记该命中**（scanner-baselines.json `find-todo-exitless: 1`）→ 可选处置只剩：改写注释去掉扫描器触发的字面量并收缩基线 1→0，或保留 + watch-only 裁决记录。
- 计数型 scanner 基线位于 `scripts/baselines/scanner-baselines.json`（find-as-any-casts 计数 41；find-todo-exitless 计数 1）。

## Goals

- knip：删除唯一 live dead item（`UseDataSourcesArgs`，删除前复核确无引用）；陈旧基线行手术式收缩至 0；复跑 knip 无 live findings。
- as-any：11 处产品码改真实类型，计数 41→≤30，`find-as-any-casts` 基线同步收缩。
- fm3 it.skip、undo-stack 伪 TODO 各获得明确裁决并落地（含基线/文本落点）。
- console 基线收缩 2 条（`--update-baselines`，该基线明文允许）。

## Non-Goals

- 不处理 react19 651 处 / async 353 处等大批量已登记债务（deep-audit §7 Deferred）。
- 不处理 calendar/gantt 克隆族重构（Deferred）。
- 不动 playground demo 页的 as-any（保持登记）。
- 不对内部使用的导出做 de-export（knip 未要求）。

## Scope

### In Scope

- 上列 knip 1 项真死代码 + 基线陈旧行手术收缩、11 处产品码 as-any、2 处杂项裁决、console 基线收缩。
- 受影响包 focused 单测回归（flux-renderers-3d、flux-formula、flux-renderers-scheduling、flux-compiler、flux-renderers-form）。

### Out Of Scope

- 任何行为变更；demo 页类型治理；scanner 大批量收缩；e2e helpers 代码变动。

## Failure Paths

| 编号             | 触发                                                              | 行为                                                    | 可重试 | 用户可见表现             |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ------ | ------------------------ |
| dead-not-dead    | `UseDataSourcesArgs` 删除时发现存在 knip 未见的引用（动态导出等） | 还原并改判保留（Deferred 登记 knip 误判个案），不得强删 | 是     | 对应包 typecheck/test 绿 |
| as-any-untypable | 某处 as-any 无法在不引入行为变化的前提下给出精确类型              | 保留并改判登记（Deferred 注明原因），只收缩可收缩者     | 是     | 计数下降但非清零         |

## Test Strategy

档位选择：`建议有测`。

本档选择：建议有测。死代码删除与类型收严均应零行为变化；等价声称的判别性证据 = 受影响包既有 focused 单测在改动前后同绿（`use-data-sources`、`evaluator(.test/characterisation)`、`row-quick-edit-draft-version`、`use-touch.test` 等既有文件覆盖调用面）+ typecheck；不新增测试（无新行为）。

## Execution Plan

### Phase 1 - knip 真死代码删除与基线手术收缩

Status: completed
Targets: `packages/flux-renderers-3d/src/renderer/hooks/use-data-sources.ts`、`scripts/baselines/knip-baseline.json`

- Item Types: `Fix`

- [x] `UseDataSourcesArgs` 处置：git grep 复核发现其被 `useDataSources` 内部使用（use-data-sources.ts:6,22），按 Failure Paths dead-not-dead 逻辑不删除，改为 **de-export**（`export interface` → `interface`，消除 knip live finding 的 unused-export 面）
- [x] knip 基线手术式 hand-edit 收缩 10 条陈旧行（dragReplicationCard〔specs 已落地，保留代码〕/ renderFileListSidebar〔源码已不存在〕/ splitResponsiveColumns / useRowQuickEditDraft / use-touch 4 类型 / UseDataSourcesArgs 旧路径 index.tsx 行 + 现路径 use-data-sources.ts 行〔de-export 后 resolved〕）——**未用 --update-baselines**（knip-baseline.json header 硬规则），JSON parse 验证通过
- [x] `pnpm --filter @nop-chaos/flux-renderers-3d typecheck && test` 绿（coverage 表正常输出，0 失败）

Exit Criteria:

- [x] `pnpm check:knip-baseline` exit 0 且输出 "no new hits"（无收缩残留）；knip 复跑无 live findings
- [x] flux-renderers-3d focused typecheck/test 绿
- [x] knip-baseline.json diff 仅含删除行（无新增登记）

### Phase 2 - as-any 产品码收严与计数收缩

Status: completed
Targets: `packages/flux-formula/src/evaluator.ts`、`packages/flux-renderers-scheduling/src/calendar/calendar.tsx`、`gantt/gantt-grid.tsx`、kanban 相关文件、`barcode-input` 3 文件、`packages/flux-compiler/src/schema-compiler/fields.ts`、`scripts/baselines/scanner-baselines.json`

- Item Types: `Fix`

- [x] 11 处逐一处置：evaluator.ts:114 注释字面量改写（历史括号引用触发扫描器）；evaluator.ts:400 `Record<PropertyKey, unknown>` 结构化；use-barcode-torch `MediaTrackConstraintSet & { torch?: boolean }` 扩展类型；barcode-detector-utils 枚举正查 entries 替代字符串索引 cast；barcode-media-io `Window & { BarcodeDetector?: NativeBarcodeDetectorCtor }`；calendar.tsx 78/80 抽取 `legacyEventsField` 结构化访问（含 CalendarSchema 类型）；gantt-grid `Record<string, unknown>` + `as string` 保运行时恒等；use-kanban-board-state `{ collapsed?: unknown }` 结构化（**closure audit B1 勘误：初改丢了一个 `!` 致 controlled collapsed 语义反转，已还原 `!!` 并按审计员 M1 要求补判别性回归测试** `kanban-ownership-gating.test.tsx` "controlled collapsedOwnership: columnsConfig seeds collapsedMap truthfully"——反转实现下必挂〔实测 1 failed〕、修复后通过〔6/6〕，满足 guide When-Drafting-13 判别性声称）；kanban-column.tsx:19 注释字面量改写
- [x] fields.ts:84 按 Failure Paths **as-any-untypable 改判保留**（`as any` 在掩盖 NodeMetaProgram 按键分组的赋值目标交叉类型——string 族/boolean 族/boolean|undefined 三类，逐键拆分属契约级改动，超出本计划零行为边界；落 Deferred But Adjudicated）
- [x] `find-as-any-casts` 基线 41→31 手术 hand-edit（scanner-baselines.json；不跑 --update-baselines 以免吸收并行会话 non-retained 漂移）
- [x] `pnpm --filter flux-formula test`（239）`scheduling test`（1094）`flux-compiler test`（575）全绿

Exit Criteria:

- [x] `node scripts/audit/find-as-any-casts.mjs` 输出 Found 31 < 41 且与基线 31 一致
- [x] `pnpm check:scanner-baselines` 除并行会话 non-retained 漂移外无新增红（as-any 维度收缩生效）
- [x] flux-formula / scheduling / flux-compiler focused 单测全绿

### Phase 3 - 杂项裁决（fm3 skip / undo 伪 TODO / console 基线）

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/fm3-contract-probes.test.tsx`、`packages/flux-renderers-scheduling/src/gantt/undo-stack.ts`、console 基线

- Item Types: `Decision | Fix`

- [x] fm3 `it.skip`（:377）裁决：**保留为在案 filed-defect 记录**（input-suggest IME Enter 合成期缺口为既有真缺陷记录，注释自带 unskip 条件与目标契约）；就地补 plan 822 disposition 注释行完成登记（successor= form 包 functional plan）——三选一中的"注明归属"路径
- [x] undo-stack.ts:193-194 注释改写：`not an open TODO:` → `not an open work item:`（去扫描器触发字面量，dual-track 裁决语义原样保留）；`find-todo-exitless` 基线 1→0 hand-edit，复跑 "No suspect matches found."
- [x] console 基线收缩（`--update-baselines`，该基线 header 明文允许；27 entries）
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 1160 passed | 1 skipped（skip 即被保留的 filed-defect 探针）绿

Exit Criteria:

- [x] `node scripts/audit/find-todo-exitless.mjs` 零命中且基线为 0
- [x] `pnpm check:console-baseline` exit 0 且登记数下降（27 entries）
- [x] flux-renderers-form / scheduling focused 单测全绿

## Draft Review Record

- Reviewer / Agent: 独立子代理 round-2（general-purpose fresh session，2026-10-31）
- Verdict: `pass-with-minors`（round-1 `fail`：2 Blocker + 3 Major，修订后复审全数确认收敛）
- Rounds: 2
- Findings addressed: Blocker-1/2 与 3 个 Major 见首轮记录（Current Baseline 勘误已实证回写）；round-2 新增 2 Minor——①"8 条陈旧行"计数笔误改为 9（已改）②console "2 条可收缩"未独立复核（执行时以 `check:console-baseline` 实跑输出为准，Exit Criteria 已覆盖）

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` exit 0（typecheck/build/lint 实测绿；test 17,347 passed / 0 failed，46 project）
- [x] `pnpm check` 822 触达项全绿（knip-baseline / find-todo-exitless / find-as-any-casts / console-baseline / deps-baseline / owner-doc-semantics / audit-ui-consistency-gaps / e2e-flake-ledger / focus-ledger）；scanner-baselines 唯一红为 find-non-retained-renderer-references 158>155，审计员实证超额 3 hits 全部来自并行会话 untracked `crm-customer-360.json`（C2 WIP），非本 plan 触达面——798-801 归因协议
- [x] 无删除项被静默还原或改判未落账（fields.ts 改判已落 Deferred But Adjudicated）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（round-1 issues → B1/M1 修复 → round-2 approved，双向判别独立复现）
- [x] `docs/logs/` 收口记录已更新

## Deferred But Adjudicated

### flux-compiler fields.ts:84 的 `value as any`（as-any-untypable 改判）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 该 cast 在掩盖 `NodeMetaProgram`（flux-core node-identity.ts:106-114）按键分组的赋值目标交叉类型——string 族（CompiledRuntimeValue<string|undefined>）、boolean 族（boolean|unknown）、disabled（boolean|undefined）三类共存于一个 `meta[key]` 联合写目标；精确化需把 switch 按键组拆分并为每组建立类型化编译路径（含 transform 的输入/输出类型衔接），属契约级重构而非类型收窄，无法在不引入行为变化风险的前提下在本计划（死代码/基线收缩）内完成。运行时行为由 flux-compiler 既有 575 测试钉住，计数字段保留为基线内登记。
- Successor Required: `yes`
- Successor Path: flux-compiler 类型契约后续轮次（可并入下次触达 NodeMetaProgram 的 functional plan）

## Non-Blocking Follow-ups

- react19 651 处 / async 353 处基线内收缩（分批后续轮次）
- calendar/gantt 克隆族重构（独立 plan 节奏）
- input-suggest IME Enter 合成期缺口：既有 filed defect（fm3 探针在案承载，非本 plan 引入/触达），successor = form 包 functional plan 补 isComposing 守卫后 unskip 探针

## Closure

Status Note: knip 唯一 live dead item de-export + 10 条陈旧基线行手术收缩（no new hits）；as-any 41→31（10 处结构化收严，fields.ts 按 as-any-untypable 改判落 Deferred）；undo-stack 伪 TODO 字面量改写 + find-todo-exitless 基线 1→0；fm3 it.skip 裁决保留为在案 filed-defect 记录并补 disposition 登记；console 基线收缩 27 entries。closure audit round-1 **issues**（1 Blocker B1：解 any 丢失一个 `!` 致 controlled collapsed 反转 + 1 Major M1：判别性证据缺口）→ 修复 + 补判别性回归测试 → round-2 **approved**（零 Blocker/Major，审计员独立完成反转双向判别验证并确认还原无残留）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_383415fd（round-1：issues）→ 独立子代理 agent_b2da386e（round-2：approved）
- Evidence: round-1 逐项直观测验——knip/todo/as-any/console 四 scanner 复跑绿；knip-baseline diff 恰 10 删除；fields.ts 零 diff 与 Deferred 诚实性确认；non-retained 超额 3 hits 逐条归因 untracked crm-customer-360.json（非本 plan 文件）；form 1160+1skip 精确复核。round-2 六项全过——`!!` 还原 diff 恰一行（运行时语义与 HEAD 恒等）；判别测试断言路径端到端 traced（hook 75-89 → board:527 → column:238）；**双向判别独立复现**（临时反转 → 恰新测试 1 failed | 5 passed，还原 → 6/6，最终 git diff 确认无实验残留）；scheduling 116 files/1095 tests 绿；as-any 31=基线、knip no new hits 维持；plan 文本诚实性（round-2 槽位未预填、状态未预翻转）

Follow-up:

- 见 Non-Blocking Follow-ups（react19/async 批量收缩、克隆族重构、input-suggest IME filed defect 的 form 包 successor）
