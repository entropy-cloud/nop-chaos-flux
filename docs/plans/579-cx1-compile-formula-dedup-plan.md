# 579 CX-1 共性重构：编译公式层复制沉积收敛批（commitCompositeState 原语下沉 + value-adapter 三联骨架提取）

> Plan Status: active
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-1 条目（WA-1 批立案 WA-formula-001[P1]+WA-core-002[P2]，台账 72/73 行 successor-required→本批）；先例：plan 576/577/578 批内修模式
> Related: `docs/audits/workaround-code-smell/ledger.md`；`docs/architecture/flux-core.md`

## Purpose

收敛两处跨包/包内复制沉积：①WA-formula-001 状态提交策略块 4 份跨包逐字重复（flux-formula/evaluate.ts:154-181/:219-246 ↔ flux-compiler/schema-compiler/runtime-value-compilation.ts:164-187/:266-289，8181fff2a 提取时复制未共享，object key 检查已单向/双向分叉）——flux-core 新增 `commitCompositeState` 共享原语，4 份收敛；②WA-core-002 value-adapter in/out/validate 三联 ~95 行双份（value-adapter.ts:286-390 actionAdapter ↔ :503-599 孪生体，ccc4ac7ed cq-4 Phase 2 整段复制，formatIssues 接缝单侧生效）——包内 `buildActionBackedMethods` 骨架提取（零 API 变更）。

## Current Baseline

- **四份状态提交块**（拟制时 HEAD `342820269` 实读）：形如 `if (!anyChildChanged && state.initialized && state.lastValue) return {value: lastValue, changed:false, reusedReference:true}; if (initialized && lastValue && shallowEqual(lastValue, nextValue)) return {...}; state.initialized = true; state.lastValue = nextValue; return {value: nextValue, changed: true, reusedReference: false}`——formula 侧泛型无 cast、compiler 侧带 `as T`；四份语义一致（同 shallowEqual、同 reusedReference 协议）。**needsRebuild 检查两轴分叉已核验**（draft review m2 实测定案）——①方向轴：formula 双向（evaluate.ts:196-198 键缺失∪多余键）vs compiler 单向（runtime-value-compilation.ts:248 仅缺键，:245-247 注释自证「反向检查是死 O(K²)」）；②重建策略轴：formula 重建时保留既有子状态（:200-206 `key in entries ? 旧 : 新建`）vs compiler 整体重建丢弃全部子状态（:250-252）。两轴均属 needsRebuild 检查、不在提交块内；本批原语仅收敛提交块，两轴分叉就地注记裁定（不强行合一——批内改语义超行为保持边界）。
- **value-adapter 双份**：actionAdapter(:286-390) 与孪生体(:503-599) 骨架同构，差异清单（draft review m3 补全）——①执行 helper 整体（runAction 4 参 `(action,payload,ctx,dispatch)` vs runValueAdaptationAction 4 参 `(action,payload,runner,ctx)` 含 compiled-program clone 语义）；②formatIssues 接缝单侧生效（:485 默认同函数/:462-469 注释自证单侧——漂移证据一）；③validate 的 ctx 转发不对称（actionAdapter.validate 传 ctx→runAction :148 内转发 `{scope,form}`；孪生体 validate 3 参不传 ctx→runner 收 undefined——**第二处已兑现漂移**）；骨架签名=双缝 `buildActionBackedMethods({ execute, toValidationIssues })`，提取后两体薄壳化；漂移②③的收敛方向以行为保持为准（若双侧化改变现行为则保持单侧+注记）。
- **在途**：flux-formula/flux-compiler 零在途；flux-core 有并行会话在途文件（`packages/flux-core/src/types/scope.ts` 等）——本批只动 `value-adapter.ts` 与新增原语文件，与并行文件零交集（执行/收口时逐一核对 git status）。
- **公开面影响与授权链（draft review M2 裁定落字）**：flux-core `src/index.ts` 新增 `commitCompositeState` 导出（纯增量：全仓零重名[实测 grep=0]、同批内即被 flux-formula/flux-compiler 双消费[knip unused 不可达]、零既有签名/语义变更）。授权链：roadmap CX-1 条目**正文明文预裁定**「均非结构性增量，契约 §7c 无需人工确认」，且 CX-1 行尾**无人工确认门标记**——对照姊妹条目 CX-5/CX-6（「执行前人工确认门」显式标记）构成 roadmap 自身的差异化裁定；用户 goal 指令「执行 workaround-code-smell-audit-roadmap.md 直到彻底完成」为本条执行的常设授权。flux-formula/flux-compiler 公共导出零变更（仅内部实现改引）。
- **既有测试基线（draft review M1 修订）**：flux-core value-adapter.test+contract.test 在案；formula 侧 evaluate.test/template-exec.test 已断言 `reusedReference` 协议=可承认为基线；**compiler 侧对两份提交块零协议级覆盖（实测 reusedReference/compileRuntimeValueTree 零匹配）→ 须无条件先补 reuse/changed 两态特征化用例再动代码**。特征化测试先行（行为保持铁律：四份提交块与两份三联先钉后改，提取后同绿）。

## Goals

- flux-core 新增共享原语（新文件 `src/commit-state.ts` 或并入既有 utils，含判别性单测）；4 份提交块改引，formula/compiler 两包行为零变化。
- value-adapter 内部 `buildActionBackedMethods` 骨架提取；两孪生体薄壳化；formatIssues 接缝双侧生效或单侧裁定落字（漂移消除方向以行为保持为准——若双侧化改变现行为则保持单侧+注记）。
- 台账 WA-formula-001/WA-core-002 `found → fixed → verified`（closure 后）；roadmap CX-1 `todo → planned`（draft review pass 后）`→ done`（closure 收口动作）。
- 三包 filter 门禁 + 隔离五门禁全绿；`flux-core/src/index.ts` 公共导出仅增 commitCompositeState（git diff 逐行核对）。

## Non-Goals

- needsRebuild object key 检查的跨域合一（分叉裁定注记即可）；value-adapter 公共 API/签名任何变更；跨包重排/文件移动。
- 其他 CX 条目的顺手实施。

## Scope

### In Scope

- `packages/flux-core/src/`（新原语+value-adapter 内部提取+index 导出行+测试）
- `packages/flux-formula/src/evaluate.ts`、`packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts`（四份提交块改引）
- 特征化/判别测试 + 台账/roadmap/dev log 回写

### Out Of Scope

- 上述三包其他文件；并行在途文件；其他 CX。

## Failure Paths

不适用（零新增运行时错误处理面）。

## Test Strategy

档位：**必须自动化**（重构批=行为保持型，特征化测试先钉后改为硬约束）。三包 filter typecheck/build/lint/test + 隔离五门禁；flux-core 求值面触及（原语入 index）→ 双哨兵（flux-renderers-ai + flux-react 全量）。

## Execution Plan

### Phase 1 - 特征化钉住与原语提取

Status: done（2026-10-12：实施派驻 agent agent_4a12a070 执行——特征化基线 16 条先钉[compiler 7 条新[M1]/value-adapter 7 条[m3 两处漂移现行为钉住]/formula 2 条]，重构前后同绿；commitCompositeState 原语落 commit-state.ts[+判别单测 7 条]+index.ts 仅 +1 行；四份提交块改引净删 ~148 行；buildActionBackedMethods 双缝骨架两体薄壳化；formatIssues 裁定=骨架双侧化+观测行为保持单侧[fallthrough 现行为]；三包 filter 门禁+双哨兵 ai 850/flux-react 550+加验 form-advanced 1150 全绿）
Targets: flux-core 新原语 + 四份提交块 + value-adapter 双份

- Item Types: `Fix | Proof`
- [x] Proof：特征化测试先行——①formula 两块：既有 evaluate.test/template-exec.test 基线确认+不足处补；**compiler 两块：无条件新增 reuse/changed 两态特征化用例（现零协议级覆盖，M1）**；②value-adapter in/out/validate + formatIssues + validate ctx 转发行为钉住（既有测试基线+不足处补，含 m3 两处漂移的现行为钉住）。
- [x] Fix：flux-core `commitCompositeState` 原语 + 4 份改引；`buildActionBackedMethods` 提取 + 两体薄壳化；formatIssues 接缝裁定落字。
- [x] Proof：三包 filter 门禁 + 双哨兵；index.ts 公共导出 diff 逐行核对（仅 +commitCompositeState）。

Exit Criteria:

- [x] 特征化测试提取前后同绿（钉住证据在案）。
- [x] 三包 filter 门禁 exit 0；双哨兵全绿。

### Phase 2 - 回写与收口

Status: in_progress（2026-10-12：台账两行 found→fixed 完成[220=92+2+126——closure audit M1 修复台账断列后实跑读数]；dev log 落盘；隔离五门禁全绿；closure audit R1 issues[0B/1M/2m：M1 台账断列解析丢弃→已修+reconcile 复跑 220=92+2+126；m1 三处 closure 依赖门回退未勾/m2 fixed 行处置列清空→已修]；delta 复核进行中）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账两行 `found → fixed`（closure 后 `→ verified`）；roadmap CX-1 回写；dev log。
- [x] Proof：隔离五门禁（HEAD+本批 diff）；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_bfeba87b-2c22-4da6-94f3-19ef83599cd0，review-only）
- Verdict: `revised`（零 Blocker、2 Major、4 Minor → 修正后共识达成；12 项实测清单全过）
- Rounds: 1
- Findings addressed: **M1** compiler 侧两份提交块零协议级测试覆盖（实测 reusedReference/compileRuntimeValueTree 零匹配）→ Phase 1 改无条件先补特征化用例；**M2** index.ts 导出授权链矛盾（§7c 豁免子句 vs 导出面）→ 落差异化裁定[roadmap CX-1 正文预裁定+行尾无确认门标记 vs CX-5/6 显式标记+用户 goal 常设授权]；**m1** 行号对齐台账（154-181/:219-246 与 164-187/:266-289）；**m2** needsRebuild 两轴分叉定案（方向轴 compiler 单向+注释自证/重建策略轴保留子状态 vs 整体重建）；**m3** value-adapter 差异清单补全（validate ctx 转发不对称=第二处已兑现漂移+骨架双缝签名 `{execute, toValidationIssues}`）；**m4** roadmap 流转补 planned 边+Closure Gates 五命令分行。

## Closure Gates

- [x] 所有 in-scope 复制沉积已收敛（4 份→1 原语+薄壳；2 份→1 骨架+薄壳）
- [x] 行为零变化（特征化测试提取前后同绿+三包 filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log 四件齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- needsRebuild object key 检查分叉的跨域合一（如后续裁定需要）归独立批。

## Closure

Status Note: done（2026-10-12 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_723a47e3，review-only）
- Rounds: R1 `issues`（0B/1M/2m）→ 修复 → **delta 复核 `approved`**（0B/0M/0m 残留）
- R1 findings 处置：**M1** 台账两行行尾双管道断列→解析器整行丢弃→reconcile 218 假基线（执行会话台账编辑脚本缺陷）→ 删管道修复+reconcile 复跑实读 220=92+2+126[fixed 2 首次真实入账]；**m1** 三处 closure 依赖门被预勾（执行会话批量勾选越界）→ 回退未勾、audit approved 后据实回勾；**m2** fixed 行保留 successor-required 处置字与台账惯例不符 → 处置列清空（语义并入行尾说明）。
- 审计员独立实证：两处收敛逐字段开档（commit-state.ts 与四份原块逐字段等价[reuse 真值门/shallowEqual 二门/写回/返回协议]；buildActionBackedMethods in/out/validate 与 HEAD 两体逐字段等价[m3 三处差异按现行为承载]）；动态判别 2 组恰红→字节级恢复绿（①commit-state reuse 真值门反转→commit-state.test 恰 4 failed+formula 恰 2 failed 跨包判别 ②孪生壳 validate ctx 反转→m3 漂移钉住测试恰 1 failed）；公开面（index.ts 恰 +1 行/两包导出零变更/零重名）；needsRebuild 两轴未动；reconcile 终读 220=92+0+126；两树 13 路径逐字节一致；门禁证据有效性论证（ledger 文档不入任何门禁消费面，代码文件字节恒等）。
