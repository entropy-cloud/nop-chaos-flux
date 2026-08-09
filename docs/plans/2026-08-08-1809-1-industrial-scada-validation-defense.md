# 1 Industrial SCADA Validation & Input-Defense Layer

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` (F2, F4)
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md`; sibling plans `2026-08-08-1809-2-*` (editor state) and `2026-08-08-1809-3-*` (canvas correctness)
> Execution Order: {1} — foundational, independent; unblocks trusting untrusted SCADA config (the load/import path that plans {2}/{3} harden).

## Purpose

把 `flux-renderers-industrial` 序列化校验层的两类「防御只做了一半」缺陷收口：malformed 数值子字段（NaN/±Infinity）静默放行（F2），以及 symbols/variables 数组无广度上限致不可信 config 无界迭代 / 引擎构建 DoS（F4）。校验层是不可信 config 的第一道也是唯一一道数值防线，本计划把 `assertShape` 的 finite 判定与 `checkNumberField` 对齐，并新增与 benchmark 口径一致的广度/总量上限。

## Current Baseline

- `serialization/validators/helpers.ts:23-30` `checkNumberField` 已收紧为 `Number.isFinite`（plan 2026-08-06-0900-1 P2-3），但同文件 `assertShape:46-60` 的 `'number'` 分支仍是 `ok = typeof v === 'number'`，**不拒 NaN/±Infinity**——同类修复只落了一个 helper。
- `assertShape` 被多处数值子字段消费：`validate.ts:61` (`background.grid.size`)、`validators/animation.ts`（`animation.from/to` 的 `{x,y}`）、`validators/point-declaration.ts:42`（declaration `scale.k/b`）。`JSON.parse('{"size":1e400}')` → `Infinity` 直接通过 → 几何/动画周期/量程 corrupt。
- `serialization/validate.ts:23-40` 对 `symbols`/`variables` 仅 `Array.isArray` 后 `forEach` 全量递归校验；广度上限 grep 全 serialization 子树为空，**仅有深度上限** `MAX_VALIDATE_DEPTH=100`（`helpers.ts:81`，被 `validators/symbol-node.ts:23` 与 `legacy-scan.ts:43` 共用）。
- 10 万图元是 `benchmark-report.md` 的已测上限，但**无任何机制在超该量级时 fail-closed**；攻击者/损坏 host JSON 可注入数百万节点直至主线程冻结 / OOM。低代码渲染器威胁模型里 config 是不可信输入。
- 机械门禁全绿（audit 记录：typecheck/lint/test PASS，~1340 tests；industrial 0 文件超 700 行硬门禁）。

## Goals

- `assertShape` 的数值判定与 `checkNumberField` 同形（拒 NaN/±Infinity），消除「同一类修复只做一半」。
- `validateScadaConfig` 对 symbols / variables / 总节点数有显式广度上限，超限 fail-closed 返结构化 error（O(1) 早退）。
- 两类缺陷各有一组 failing-first 回归测试断言**结果值**（validate 报错 / 早退），而非 `not.toThrow`。

## Non-Goals

- 不改 `parseScadaConfig` 的非对象返回值类型谎言（open-audit F5，P2，归 backlog）。
- 不统一两份 clone 实现（open-audit F6，P2，归 backlog）。
- 不改 `validateBinding` 的 `scale` 仅校验 isPlainObject（open-audit F10，P2，归 backlog；本计划只收敛 `assertShape` 本身，F10 的 binding/declaration 同形化可在 backlog 跟进时复用本计划产出的 finite helper）。
- 不改公共导出面（`ScadaValidationResult` / `validateScadaConfig` 签名不变）。
- 不动 editor / engine / renderer 层（归属 plans {2}/{3}）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/validators/helpers.ts`（`assertShape` finite 判定；可选抽 `isFiniteNumber` 共享 helper）。
- `packages/flux-renderers-industrial/src/serialization/validate.ts`（顶层 symbols/variables 长度守卫 + 节点计数早退）。
- `packages/flux-renderers-industrial/src/serialization/validators/symbol-node.ts`（递归期累加节点计数，超限 push error 并早退——与现有 `MAX_VALIDATE_DEPTH` 同纪律）。
- 对应测试：`serialization-validate.test.ts`（或 validators 子目录既有测试）增 failing-first 用例。

### Out Of Scope

- `serialization/parse.ts`、`serialize.ts`、`diff.ts`、`equality.ts`（无 P1）。
- editor / engine / renderer / hooks（plans {2}/{3}）。
- 公共导出面调整、host 侧校验工具链。

## Failure Paths

| 场景编号        | 触发                                                | 行为                                                                                                           | 可重试                        | 用户可见表现                      |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------- |
| VAL-NaN-grid    | `background.grid.size = 1e400`（→Infinity）或 `NaN` | `validateScadaConfig` 返 `{ok:false, errors:['background.grid.size must be a finite number']}`                 | 否（host 修正 config 后重试） | 画布不构建，host 收结构化校验错误 |
| VAL-NaN-anim    | `animation.from = {x: NaN}`                         | `validateScadaConfig` 报 `animation.from.x must be a finite number`                                            | 否                            | 同上                              |
| VAL-NaN-scale   | declaration `scale.k = 1e400`                       | `validateScadaConfig` 报 `scale.k must be a finite number`                                                     | 否                            | 同上                              |
| VAL-DOS-breadth | `symbols: new Array(2_000_000)`                     | `validateScadaConfig` 返 `{ok:false, errors:['config.symbols exceeds max symbol count']}`，**O(1) 早退**不遍历 | 否                            | 校验即时失败，不卡主线程          |
| VAL-DOS-total   | 嵌套 children 总节点数超 `MAX_TOTAL_NODES`          | 递归期 push error 并早退                                                                                       | 否                            | 同上                              |

## Test Strategy

档位：**必须自动化**。

理由：校验层是不可信 config 的唯一数值防线，且 F4 是安全相邻（DoS）类缺陷。对应 Proof 项在 Fix 之前（failing-first）。

## Execution Plan

### Phase 1 - assertShape finite 数值校验对齐

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/validators/helpers.ts`；测试 `serialization-validate.test.ts` / `validators/*.test.ts`

- Item Types: `Proof` | `Fix`

- [x] (Proof / failing-first) 增 3 条用例：`background.grid.size=1e400`、`animation.from={x:NaN}`、declaration `scale.k=1e400` 各期望 validate 报对应 finite error；当前断言会失败（assertShape 放行）。
- [x] (Fix) `assertShape` 的 `'number'` 分支改为 `ok = typeof v === 'number' && Number.isFinite(v)`；或抽 `isFiniteNumber(v)` 共享 helper 供 `checkNumberField` 与 `assertShape` 共用，消除两套并行判定。错误文案与 `checkNumberField` 同形（`{scope}.{field} must be a finite number`）。
- [x] (Proof) Phase-1 failing-first 3 条用例转 pass；既有 finite 用例（viewport/deadband/period/loop 走 checkNumberField）零回归。

Exit Criteria:

- [x] `assertShape` 数值分支在 live 代码中显式拒 NaN/±Infinity（`grep -n "isFinite" validators/helpers.ts` 命中 `assertShape` 与 `checkNumberField` 两处共享判定）。
- [x] failing-first 3 条用例（grid.size / animation.from.x / scale.k）在 `serialization-validate.test.ts` 或 validators 测试中存在并 pass；既有 `checkNumberField` finite 用例零回归。

### Phase 2 - validate 广度/总量上限（DoS 早退）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/validate.ts`；`validators/symbol-node.ts`；`validators/helpers.ts`（常量）；测试

- Item Types: `Proof` | `Fix` | `Decision`

- [x] (Decision) 确定阈值：`MAX_SYMBOLS`、`MAX_VARIABLES`、`MAX_TOTAL_NODES` 参考 benchmark 10 万图元口径留余量（如 2× = 200_000 顶层 symbols / 同量 variables / 500_000 含嵌套总节点），与 benchmark 口径一致或略宽，写在 `helpers.ts` 常量区（紧邻 `MAX_VALIDATE_DEPTH`）。
- [x] (Proof / failing-first) 增用例：`{version:1, symbols: new Array(MAX_SYMBOLS+1)}` 期望 `{ok:false}` 且 errors 含超限文案；另一条深嵌套 children 总节点数超 `MAX_TOTAL_NODES` 期望递归早退报错。两条当前会失败（无广度守卫，会全量遍历或栈深）。
- [x] (Fix) `validate.ts` 顶层：`config.symbols.length > MAX_SYMBOLS` → push error 并跳过 forEach（早退）；`config.variables.length > MAX_VARIABLES` 同形。
- [x] (Fix) `validators/symbol-node.ts` 递归期维护节点计数（透传或闭包累加器），超 `MAX_TOTAL_NODES` → push error 并早退（与既有 `MAX_VALIDATE_DEPTH` 早退同模式）。
- [x] (Proof) Phase-2 failing-first 用例转 pass；阈内合法 config（含 10 万量级构造的小用例与既有 nested children fixtures）行为不变、零回归。

Exit Criteria:

- [x] `validate.ts` 顶层对 symbols/variables 长度有显式 `> MAX_*` 守卫并早退（live 代码可见）。
- [x] `symbol-node.ts` 递归含总节点计数早退（与 `MAX_VALIDATE_DEPTH` 早退同纪律，live 代码可见）。
- [x] 超阈 config 返 `{ok:false}` 且不进行 O(n) 全量遍历（failing-first 用例证明早退：可断言校验耗时为 O(1) 或直接断言 errors 文案 + ok:false）。
- [x] 阈内既有 fixtures 全 pass（`serialization-validate.test.ts` 零回归）。

## Draft Review Record

> 起草后、执行前的独立审查证据（见 guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01f22f8dfffeDi0HDlbjhDmIwJ`（general）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major → 共识达成（连续一轮零 Blocker/Major）。Minor 已处理：`validate.ts` 的 `background.grid.size` call site 行号由 `:75` 修正为 live 核对的 `:61`。reviewer 独立核对 live 代码确认 F2（`helpers.ts:55` number 分支无 finite 判定 vs `checkNumberField:23` 有 `Number.isFinite`）与 F4（`validate.ts` 无广度上限、仅 `MAX_VALIDATE_DEPTH=100`）成立。

## Closure Gates

- [x] F2（assertShape 不拒 NaN/Infinity）已修复：数值分支显式 finite 判定，3 个 call site（grid.size / animation.from / scale.k）malformed 数值被拒。
- [x] F4（validate 无广度上限）已修复：symbols/variables/总节点数超限 fail-closed 早退。
- [x] failing-first 回归测试已落地并断言结果值（非 not-to-throw）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [x] 公共导出面（`validateScadaConfig` / `ScadaValidationResult`）签名不变；受影响 owner doc（若有阈值数值说明）已同步，或明确写明 No owner-doc update required。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

_无（本计划 in-scope 的 F2/F4 均为 Fix，不延期）。_

## Non-Blocking Follow-ups

- F10（`validateBinding` 的 `scale` 仅校验 isPlainObject，与 declaration scale 不一致）—— P2，归 mission follow-up backlog；可在跟进时复用本计划产出的 `isFiniteNumber` helper 做同形化。
- animation `from`/`to` 的**裸数值形态**（`animation.ts:17` `if (typeof v === 'number') continue`）仍 bypass finite 检查（如 `from: 1e400 → Infinity`）—— F2 邻接缺口，但本计划 Phase 1 scope 明确为 assertShape 的 3 个 call site（裸数值形态不经 assertShape），closure audit 独立判定为 out-of-scope Minor。跟进时可复用 `isFiniteNumber` 同形收紧。

## Closure

Status Note: F2 与 F4 均已 test-first 修复落地。F2：`assertShape` 数值分支复用新增 `isFiniteNumber` 共享 helper（与 `checkNumberField` 同形，消除「同类 finite 修复只做一半」），3 个 call site（background.grid.size / animation.from-to 对象形态 / declaration scale.k-b）malformed 数值被拒。F4：`validate.ts` 顶层 symbols/variables 广度守卫 O(1) 早退 + `symbol-node.ts` 递归期总节点计数早退（与 `MAX_VALIDATE_DEPTH` 同纪律），阈值取 benchmark 10 万图元上限的 2×（200_000）留余量。公共导出面（`validateScadaConfig` / `ScadaValidationResult`）签名不变，新增常量/helper 均为包内 internal。industrial 1349 tests（+9 failing-first）/ workspace 59/59 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_01ece5f09ffelaMWMFqJ5u73pE`（general，非执行 session）
- Verdict: `approved`（0 Blocker / 0 Major / 1 out-of-scope Minor）
- Evidence: fresh session 独立 live 复核——F2（`helpers.ts:64` assertShape number 分支调 `isFiniteNumber` + 文案 `must be a finite number` + `checkNumberField:30` 共享判定；3 call site 全路由 assertShape）/ F4（`validate.ts:25-28,40-42` else-if 早退跳过 forEach + `symbol-node.ts:33-40` 计数早退不递归 children）/ 公共面 intact（`src/index.ts` 未变，`MAX_SYMBOLS`/`isFiniteNumber`/`NodeCounter`/`validateSymbolNode`/`assertShape` 均 internal-only）/ 9 条新测断言 `ok===false` + error 文案（非 not.toThrow）且真 failing-first / deferred 诚实（仅 F10 + animation 裸数值邻接缺口，均 Non-Goal）/ 200k 阈值 defensible（2× benchmark、距 DoS 量级两个数量级）。full-green 复跑：industrial 100 test files / 1349 tests passed + typecheck clean + lint exit 0。Minor（animation 裸数值 `continue` bypass）显式 out-of-scope，已登入 Non-Blocking Follow-ups。

Follow-up:

- F10（binding.scale 同形化）+ animation `from`/`to` 裸数值 finite 收紧——均 P2 non-blocking，可复用本计划 `isFiniteNumber` helper；归 mission follow-up backlog（`docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog）。
- 无剩余 plan-owned work（F2/F4 in-scope 已全收口）。
