# 588 CX-10 共性重构：flux-renderers-basic 包内复制沉积收敛批（container 单树/scratch 求值/StructuralLoopScopeProvider）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-10 条目（WA-4 批立案 WA-basic-003/004/005，台账 111-113 行 successor-required→本批）；先例：plan 579-587
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

flux-renderers-basic 包内三组收敛（~107 行+recurse 性能热点）：①WA-basic-003（P2）container.tsx 可点击/非可点击全树复制 ~52 行（:60-109↔:111-162；**内层子树逐字仅缩进差，根 div 差=四交互属性 role/tabIndex/onClick/onKeyDown**[m1 勘误]）→折叠单树+interactiveProps（**真先例=flux-renderers-mobile notice-bar.tsx:236-257**[M1 勘误：WA-4 report「同 commit flex.tsx 单树反例」系四代同传失实——189d1462e 与 HEAD flex 均双树；**下游后果=flex 自身双树残差因失实前提未立案**，登记 follow-up 不本批吸收（flex 可点击分支带 V12e disabled 门与 container 无门形态不同）]）；②WA-basic-004（P2）loop↔recurse itemData scratch-scope 求值双实现已漂移（loop.tsx:99-122↔recurse.tsx:86-100；P14 修复 23ee9a323 单侧落地 loop 侧）→scratch 求值原语（recurse per-item create/dispose=**plan 2026-09-28-6 点名热点形态[原文名 loop 位点]的同形未登记位点**[WA-4 report 已核实未入 targets][M2 归因勘误]——**recurse 热点消除=本批唯一申报行为增强**，判别测试先红[per-item 计数]后绿[共享形态]）；③WA-basic-005（P3）Provider 脚手架孪生（loop.tsx:17-58↔recurse.tsx:23-63；真实差异=recurse `...loopContext` 展开继承+不覆写 renderBody）→StructuralLoopScopeProvider 共享原语[**m7：WA-4 report children-as-function 括注废弃**——两位点现均传 ReactNode children，保持 ReactNode]。

## Current Baseline（拟制时 HEAD `2c355f9a1` 实测）

- **在途**：flux-renderers-basic 零在途；并行在途 14 文件与本批零交集；提交严格限定本批路径。
- **授权**：包内零公共 API 变更，非结构性（roadmap 预裁定，无门标记）。
- **申报增强语义面（draft review m5）**：recurse 改共享 scratch 后新得三条 loop 侧已有残差=①dispose-on-throw 通道消失（finally-dispose→unmount dispose，无泄漏）②实例存续期 bindings 名变更时旧键残留③scope id 由每条目一新→实例级稳定（2026-09-28-6 r2 已裁定残留面，recurse 同款）；**itemData 引用稳定性不变**（两形均 evaluateCompiled 每 call 新值；loopContext.itemData 静态回退分支逐字不动）。
- **既有测试**：basic 套件 live 钉数（拟制时实测：文件/用例数以执行首跑为准落字）；双哨兵 react 580+ai 850 精确数；导出面文件=**index.tsx**[m6 勘误非 index.ts]。

## Goals

- 三组收敛落地（draft review 参数面交付）：
  - container 单树：`interactiveProps = isClickable ? { role: 'button', tabIndex: 0, onClick, onKeyDown } : {}` 单树展开（非可点击分支子树逐字上移；**不带 disabled 门**——container 现无此语义禁从 flex 引入[M1]；container-local 不动 flex）。
  - scratch 原语：新包内私有 `src/structural-loop-scratch.ts` `useItemDataScratchEvaluator({ helpers, bindings, itemDataProgram })`（loop.tsx:68-84/:99-122 逐字上移：helpersRef+programRef+scratchScopeRef/lazy createScope/merge/evaluateCompiled/unmount dispose/eslint disable 随迁）；**逐 render 返回新闭包禁 useCallback**[m5：两 Provider memo deps 含 evaluator 身份，稳定化=重 memo 节奏改变=未申报变更]；recurse bindings/program 读上移 hooks 序，program 回退分支逐字保持。
  - StructuralLoopScopeProvider：新 `src/structural-loop-scope-provider.tsx`——contextValue=useMemo 8 项定长 deps[base/bindings/itemData/evaluateItemData/keyBy/instancePath/depth/renderBody]；**renderBody 条件展开禁显式 undefined 键**[m4：`{...base, renderBody: undefined}` 显式键覆写继承 renderBody=recurse 语义破坏]；ReactNode children[m7]。
- 台账 WA-basic-003/004/005 `found → fixed → verified`（closure 后）；roadmap CX-10 `todo → planned → done`。
- basic filter 门禁+双哨兵+隔离五门禁全绿；index 零变更。

## Non-Goals

- 23ee9a323 P14 修复语义变更（保持 loop 侧现行为）；recurse 其他语义。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/`：container.tsx、loop.tsx、recurse.tsx（+新共享件 structural-loop-scratch.ts/structural-loop-scope-provider.tsx 与测试；**flex.tsx 不动**[M1 裁定：双树残差 follow-up]）
- ledger/roadmap/dev log

### Out Of Scope

- 并行在途文件；P14 修复语义变更。

## Failure Paths

不适用。

## Test Strategy

档位：**必须自动化**。特征化先钉（container 两树输出/scratch 语义/recurse per-item 热点计数）→提取→套件同绿+申报增强判别（recurse 红→绿）；basic filter 四门禁+双哨兵（ai+react——basic 为渲染器被 react/ai 消费）+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住与三组收敛

Status: done（2026-10-14：接手前序中断现场完成——特征化双新件在位[container-interactive-contract 9 钉两分支+loop-recurse-scratch-provider-contract 5 钉=P14 形态/嵌套继承面/重 memo 节奏]+dispose 契约测试按新契约具名改写[plan-588 依据落字]；三组收敛落地[container interactiveProps 单树/scratch 原语 loop 逐字上移/Provider 8-deps useMemo]；动态判别两组恰红留证[①显式 undefined 键变异=嵌套继承钉恰 2 红→恢复绿②HEAD 旧 recurse per-item=新契约测试恰 1 红 loop 侧保持绿→恢复绿]；执行期披露=前序会话中断残留 provider 探针变异[PROBE 注释+显式 undefined 键]由本会话恢复终态；basic 72 文件/666 用例全绿+react 580/580+ai 850/850 精确同数+index.tsx 零变更；lint 收口=loop.tsx 未使用 eslint-disable 删除+契约测试探针组件块级带理由 disable[react-compiler+react-hooks/immutability——render 期记录系探针本职，仓内测试文件首例落字]）
Targets: flux-renderers-basic 包内

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线（draft review m2/m3/m4 清单）——①container：role/tabIndex 存在性/Enter-Space 键盘激活/Space preventDefault/两分支 body data-flex 属性组/header-footer slot 输出[现仅 click 派发+无 handler 两例=缺口]②契约测试具名改写：`basic-loop-recurse-scope-dispose.test.tsx:146-202` per-item 契约按新契约改写+注 plan-588 依据[23ee9a323 loop 侧先例]；loop 侧保持面=`loop-itemdata-parent-scope-baseline.test.tsx` 2 用例+loop scratch 契约用例③Provider：嵌套 recurse 继承面（bindings/itemData/keyBy/instancePath/depth+覆写优先）+两位点 context 身份/重 memo 节奏 probe 渲染计数钉④recurse 热点判别红=既有 installRuntimeSpies harness（rerender bindings-shape create=0 为绿态）。重构前后同绿。
- [x] Fix：三组提取+消费改引（recurse scratch=申报增强）。
- [x] Proof：basic filter 四门禁+双哨兵+index 零变更。

Exit Criteria:

- [x] 特征化前后同绿；recurse 热点判别红→绿在案。
- [x] filter 门禁+双哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-14：台账三行 verified[220=found 71+verified 149/未处置 0]；roadmap CX-10 done；dev log 10-14 条目；隔离五门禁首跑全链 exit 0；closure audit agent_a15dac87 R1 approved 后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账三行 `found → fixed → verified`（closure 后）；roadmap CX-10 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_a15dac87 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_5ebb9729-bad8-4c20-93b7-e88339a61b68，review-only）
- Verdict: `有条件通过`（0B/2M/7m）——M1/M2 落字后转 active（最小参数面=审查员交付）
- Rounds: 1
- Findings addressed: **M1** 「同 commit flex.tsx 单树反例」系四代同传失实（189d1462e 与 HEAD 均双树；真先例=notice-bar.tsx:236-257；下游=flex 双树残差未立案）→先例引用改 notice-bar+flex follow-up 登记+container-local 不动 flex；**M2** recurse 热点出处归因勘误（2026-09-28-6 原文名 loop 位点，recurse=同形未登记位点）；**m1** 根 div 差=四交互属性勘误；**m2** 契约测试具名改写（basic-loop-recurse-scope-dispose:146-202）+loop 侧保持面具名；**m3** container 特征化缺口枚举（role/tabIndex/键盘/preventDefault/data-flex 组/slot）；**m4** Provider useMemo deps 8 项+renderBody 条件展开禁显式 undefined 键+probe 计数钉；**m5** scratch 原语禁 useCallback+申报增强三条残差清单+itemData 稳定性不变；**m6** 基线精确数钉+index.tsx 勘误；**m7** children-as-function 括注废弃。审查员 12 项实测（HEAD/在途/双树逐字/flex 189d1462e 考古/notice-bar 全仓唯一命中/P14 考古/Provider 真实差异/harness 可红先例/既有覆盖面/index.tsx 26 行/台账 roadmap/2026-09-28-6 约束）。

## Closure Gates

- [x] 三组收敛落地+recurse 热点消除
- [x] 行为保持+申报增强判别（特征化同绿+热点红→绿+filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_a15dac87 R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx10-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红；新文件 git add -N；首跑即全链 exit 0，日志 \_tmp/cx10-gates-0..5）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- flex.tsx 双树残差（M1：失实前提未立案，可点击分支带 V12e disabled 门与 container 不同形态，吸收需独立裁定）；WA-4 report :79 引文勘误+:110 children-as-function 括注废弃[m7]随 Phase 2 回写落字。

## Closure

Status Note: 2026-10-14 收口。三组收敛落地（container interactiveProps 单树/useItemDataScratchEvaluator/StructuralLoopScopeProvider），recurse per-item create/dispose 热点消除=申报增强（判别双留证）；执行会话接手前序中断现场（恢复残留探针变异+重建被误还原的 recurse.tsx），特征化 14 钉重构前后同绿+动态判别 2 组恰红→恢复；隔离五门禁(HEAD 2c355f9a1+本批 11 路径)首跑全链 exit 0；台账三行 verified；Non-Blocking Follow-ups 两条留字（flex 双树残差+WA-4 report 勘误落字）。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_a15dac87-a207-46c4-b06c-e232d3dd4552，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/1m informational——cx10-gates typecheck 日志含 turbo 缓存回放行[cx7-verify 同内容路径]，合法缓存复用非假绿）
- Findings addressed: 审计员逐字开档（HEAD 双树对照/scratch 原语逐字上移核对/Provider 8-deps+条件展开/no useCallback）+动态判别 2 组亲手恰红→sha256 恢复[①显式 undefined renderBody 键→恰 2 红嵌套继承钉②HEAD 旧 recurse→恰 1 红recurse scratch 钉]+两树 11 路径 shasum 一致+门禁日志真实性核验+PROBE 零残留+flex.tsx 零触碰。

Follow-up:

- flex.tsx 双树残差（M1 失实前提未立案：可点击分支带 V12e disabled 门与 container 不同形态，吸收需独立裁定）。
- WA-4 report :79 引文勘误+:110 children-as-function 括注废弃落字（随本批 dev log/台账注记已落，report 文件本体按历史文档不动）。
