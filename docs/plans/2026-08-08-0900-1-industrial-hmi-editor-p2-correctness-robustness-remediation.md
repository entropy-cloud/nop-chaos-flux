# 01 Industrial HMI Editor P2 Correctness & Robustness Remediation

> Plan Status: completed
> Last Reviewed: 2026-08-08
> Source: `docs/components/roadmap-industrial-hmi-editor.md` Follow-up Backlog「2026-08-07-1835 post-remediation audit P2」(lines 320-386) — behavior-coupled subset of the 40 P2 findings（来源两份已 closed 审计）。本计划不是 roadmap E-series work item（E0–E10 全 done），而是 deferred P2 backlog 的执行计划。
> Mission: industrial-hmi-editor
> Work Item: post-remediation P2 correctness/robustness (deferred backlog)
> Related: `2026-08-07-1835-1` / `2026-08-07-1835-2`（已收口的 P1 两批）; `2026-08-08-0900-2`（本批次 P2 的 test-fidelity / docs-drift / cleanup 部分，无 live 行为变更）

## Purpose

收口 post-remediation 40 条 P2 findings 中**会改变 live 行为**的子集——让工业组态编辑器在真实使用下：

1. 不产生 NaN/Infinity 往返损坏、不发生 `custom` 引用别名陷阱；
2. 不静默吞错（`engine.applyDiff` / mount setup / adapter 装配失败有错误传播）；
3. 所有声明的 prop / region / lifecycle 真正接线可达。

非行为变更的 test-fidelity 与 docs-drift findings 归 successor plan `2026-08-08-0900-2`。

## Current Baseline

- E0–E10 全 `done`；post-remediation P1 两批（plan `2026-08-07-1835-1` 9 项内部正确性 + `2026-08-07-1835-2` 11 项契约接线/结构/UI/测试/性能）已收口，workspace full-green（typecheck/build/lint 32/32 + test 59/59，industrial 95 files / 1254 tests，coverage ≥90% branches）。
- 40 条 P2 findings 登记在 roadmap Follow-up Backlog（来源 `docs/audits/2026-08-07-1835-open-audit-*.md` 8 条 + `2026-08-07-1835-multi-audit-*.md` 32 条；两份源审计 Audit Status 已 `closed`）。**P2 全部未处理**（"按 mission 节奏择期处理"）。
- **本次起草已 live 核对的确认缺陷**（锚点行号经实测）：
  - **#2** `connection/connection-link.ts:47-48` `recomputeConnectionAnchor` 除以 `junction.width/height` 无零守卫 → 零尺寸 pipe-junction 写 Infinity/NaN → `JSON.stringify(Infinity)→null` 损坏往返。✅ live
  - **#4** `editor-session.ts:123-127` `cloneNode` 只 `{ ...node }`，嵌套 `custom` 子对象在 working / committedBaseline / clipboard 间共享引用（latent aliasing trap）。✅ live
  - **#6** `inspector/inspector-field.tsx:42-48` json-editor 无效按键即 `catch → onChange(rawString)` 写裸字符串到 workingConfig。✅ live
  - **#9** `renderer-definitions.ts:36` `viewport` prop 已注册但 `scada-editor-canvas.tsx` 不消费（grep 仅见定义）。✅ live
  - **#17** `engine.applyDiff` 无 try/catch 有**两个** call site：`runtime-mutators.ts:96`（`applyUndoRedoDiff` undo/redo 路径）+ `runtime-factories.ts:166`（`syncWorkingCopy`，被**所有** mutator 末尾调用）。且多数 mutator 先 `undoRedo.pushOperation(...)` 再 `syncWorkingCopy()`（如 `runtime-mutators.ts:71`→`:72`），故 applyDiff 抛错时 undo 栈已入条目——回滚须含"弹出刚入栈条目 + 从 prevSnapshot 还原 working copy"。✅ live
  - **#19** `editor-adapter.ts:48-51` `attachEditorAdapter` 在 Editor 实例缺失时返 noop（生产 fail-open，仅 mock 环境注释说明）。✅ live
- **P1 收口后已确认或可能已部分/完全解决，执行时须先复核 live 避免重复修**（Anti-Slacking + Rule 1 先审 baseline）：
  - **#8** dangling 检测 group child 误报：**已 live 确认修复**——`connection/connection-adapter.ts:263-269` 已递归 `collectIds`（含 group 子树），注释标注「plan 2026-08-07-1835-1 Phase 2 / open P2-C4 ... group child target 不再被误报 dangling」。本计划仅写 Proof 复核（断言 group child target 不被误报 dangling），**不重复修**；若复核通过则记 residual。
  - **#18** mount setup 无 try/catch：**部分已解决**——`runtime-factories.ts` `mountEditorEngine`（:101-111 / :117-123）**已有** try/catch 派发 `editor-mount-failed`；但 `createRuntimeCore`（:141-241，装配 adapter/undoRedo/holder）仍无 try/catch。`use-editor-engine.ts` 现仅 258 行（setup 已抽出）。本计划 #18 仅针对 `createRuntimeCore` + mount effect 编排段。
  - **#10** destroy 生命周期：P1-06 已接线 `engine.destroy()` + `setStatus('destroyed')`；须复核 `data-status="destroyed"` 是否真正可达、`component:destroy` 是否完整（multi L306 残留）。
  - **#5** `alignSelection`/`distributeSelection` 顶层 bounds 忽略 group-relative：backlog 标注「与 P1-C2/C3 同根因，随其修复自然收敛」；须复核是否已收敛，未收敛才修。
  - **#36** quick-reference failure-code：plan {2} owner-doc 同步后 `quick-reference.md:827` 已列 7 码；须复核是否仍不全（归 Plan 2 处理，本计划仅复核不堵 closure）。
- **docs 漂移**（#33/#34/#35 design §11 引用不存在的 `use-editor-session.ts`/`use-editor-events.ts`，实际为 `editor-session.ts`/`editor-adapter.ts`）→ 归 Plan 2，不在本计划。

## Goals

- 所有 in-scope 的已确认 P2 live defect 落地修复 + focused 测试证明行为成立（不止"不抛错"）。
- 数据完整性路径（连线锚点计算 / config 克隆 / JSON 往返）有 round-trip 断言。
- 错误传播路径（mutator applyDiff / mount setup / adapter 装配）不再静默吞错。
- 声明但不可达的 prop / region / lifecycle 接线或显式移除（不留 dead 声明）。

## Non-Goals

- 不改 E0–E10 已 done 的功能边界、不改 `scada-editor-canvas` 公共契约的对外签名（仅修内部接线 / fail-open 语义；若修契约触发 roadmap「人工确认阈值」则停下标记）。
- 不动 test-fidelity 重写、docs 文件树/quick-reference/flux-guide 漂移、React19 冗余 useMemo/useCallback 清理、ESLint max-lines 配置（→ Plan 2）。
- 不做纯 cosmetic 样式新增（#14 toolbox 子标记样式化 → Plan 2 评估）。
- 不引入新功能、不做性能优化（除防缺陷触发的最小改动）。

## Scope

### In Scope

- 数据完整性缺陷：#2（div-by-zero）、#4（shallow clone aliasing）、#6（json-editor 裸写）、#7（extractNodeIds 双重解析）、#8（dangling 检测 group child 误报——**仅 Proof 复核**，已 live 确认修复，见 Current Baseline）。
- 错误传播 / 健壮性：#16（errorMessage 丢 cause/stack）、#17（applyDiff 无 try/catch，两 call site）、#18（createRuntimeCore 无 try/catch；mountEditorEngine 已解决部分标注）、#19（adapter fail-open 语义）。
- 接线 / 可达性：#9（viewport prop 不消费）、#10（destroy 残留复核）、#11（statusBar 无 fallback）、#12（loading/empty region 未注册恒 undefined）、#13（empty region 在 error 分支语义错配）、#15（connection pointer-down 双触发）。
- 交互正确性浏览器复核（Proof-first）：#1（pointermove preventDefault vs viewport-pan）、#5（align/distribute group-relative，复核是否已收敛）、#40（leafer canvas 绝对定位覆盖兄弟 panel）。
- 行为耦合的公共面接线：#21（toolbox clipboardCount state mirror → Paste disabled）、#30（ScadaEditorViewportPolicy 类型与 schema 字段脱节）、#29（`use-editor-handles.ts:91` `not-mounted` 返回自由格式 `new Error('...')` 而非 registry code——契约/行为项，从 Plan 2 移入）。

### Out Of Scope

- Test-fidelity 重写（#22–#28）、design/quick-reference/flux-guide docs 漂移（#33–#37）、error-code 文档化（#31）、test-handle 契约文档（#32）→ Plan 2。
- React19 冗余 useMemo/useCallback 清理（#20）、ESLint max-lines 配置（#39）、跨包导入 trivial errorMessage（#38）→ Plan 2。
- Toolbox 子标记样式化（#14）、死字段 SnapHighlightMark.tooltip 文案（#3）→ Plan 2（cosmetic/dead-code）。
- roadmap E-series 任何 work item（全 done）。
- M3 后能力（InnerEditor / OS clipboard / 断开连接工具 / 撤销历史面板 UI / ActionSchema 编辑器）。

## Failure Paths

| 场景编号            | 触发                                 | 行为                                                                                | 可重试 | 用户可见表现                             |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ------ | ---------------------------------------- |
| fp-divzero          | 零尺寸 pipe-junction 写连线          | 锚点计算零守卫：返回 junction 自身坐标，不写 NaN/Infinity；序列化可往返             | 否     | 连线视觉落在 junction 上，无序列化损坏   |
| fp-shallowclone     | undo/redo/group 后改 `custom` 子对象 | 深克隆 `custom` + children.custom，working/baseline/clipboard 不共享引用            | 否     | 无串改污染                               |
| fp-applydiff-throws | engine.applyDiff 抛错（非法 diff）   | mutator 捕获 → 不入 undo 栈 → 经 onError 派发 `editor-internal-error`（含 cause）   | 否     | 错误提示 + working copy 保持上一致态     |
| fp-adapter-noop     | 生产环境 Editor 实例装配失败         | 不再静默 noop → 经 onError 派发 `editor-mount-failed`（mock 环境仍 noop，区分两者） | 否     | 错误态显示（status='error'），非静默失活 |
| fp-viewport-prop    | host 传 `viewport` prop              | mount 时应用到 engine（setViewport）；不传走默认                                    | 是     | 视口按 host 指定初始化                   |

## Test Strategy

档位选择：**必须自动化**。

理由：数据完整性往返（NaN/aliasing/round-trip）与错误传播（applyDiff/onError）属核心回归路径——缺陷根因非显然、跨函数边界、易被重构回退。每条确认缺陷须先写失败测试再修（Proof 先于 Fix）。

## Execution Plan

### Phase 1 - 数据完整性缺陷修复

Status: completed
Targets: `connection/connection-link.ts`、`editor-session.ts`、`inspector/inspector-field.tsx`、`editor-adapter.ts`、`connection/connection-adapter.ts`

- Item Types: `Proof | Fix`

- [x] **Proof-first** #2：写失败测试——零尺寸 junction 调 `recomputeConnectionAnchor` 经 serialize→parse 往返后不产生 `null`/`NaN`
- [x] **Fix** #2：`recomputeConnectionAnchor` 加 `width/height` 零守卫（退化到 junction 自身坐标）
- [x] **Proof** #4：写测试——undo 后 mutate working.custom 不影响 baseline/clipboard.custom 子对象
- [x] **Fix** #4：`cloneNode` 深克隆 `custom`（`custom: node.custom ? structuredClone(node.custom) : undefined`）+ clipboard.ts:105-109 同步深克隆
- [x] **Fix** #6：json-editor 引入局部 draft 文本态，parse 失败时显示 field-error 且**不**写裸字符串到 workingConfig（仅 parse 成功才 onChange）
- [x] **Proof** #7：写测试——group 容器 `name===node.id` 时 `extractNodeIds`（editor-adapter.ts:118-143）不双重解析
- [x] **Fix** #7：消歧 fallback（`leaf.name` vs `id` 命中同值时取唯一来源）
- [x] **Proof-only** #8（**不重复修**）：`connection/connection-adapter.ts:263-269` 已递归 `collectIds` 修复（P1-02/P2-C4）——写复核测试断言 group child 作为 connection target 不被 `listAllConnections` 误报 dangling；复核通过则记 residual，不写 Fix

Exit Criteria:

- [x] #2/#4/#6/#7/#8 各有 focused 测试且从"失败→通过"证明修复成立（非仅 `not.toThrow`）
- [x] serialize→parse 往返在零尺寸 junction + nested custom 场景下值不变（round-trip 断言）
- [x] 局部 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（后续 Phase 依赖该模块类型）

### Phase 2 - 错误传播与健壮性

Status: completed
Targets: `renderer/scada-errors.ts`、`runtime-mutators.ts`、`runtime-factories.ts`、`editor-adapter.ts`

- Item Types: `Proof | Fix | Decision`

> 注：`errorMessage` 当前返回 `string` 且被 `onError?.(code, errorMessage(error))` 等调用方按 string 消费。#16 修法为**字符串富化**（附 cause/stack 文本），**不改返回类型 / 公共签名**（对齐 Non-Goals）。

- [x] **Proof** #16：写测试——`errorMessage` 保留 `Error.cause`/stack 信息（断言返回字符串含 cause/stack 片段，不丢）
- [x] **Fix** #16：`renderer/scada-errors.ts` `errorMessage` 在 message 后附 cause.message + 截断 stack（仍返回 string）
- [x] **Proof** #17：写测试——`engine.applyDiff` 抛错时 mutator 不入（或弹出）undo 栈、working copy 保持一致、onError 派发
- [x] **Fix** #17：包两个 call site——`runtime-mutators.ts:96`（`applyUndoRedoDiff`）+ `runtime-factories.ts:166`（`syncWorkingCopy`，所有 mutator 末尾调用）。失败回滚语义：多数 mutator 先 `undoRedo.pushOperation` 再 `syncWorkingCopy()`，故 applyDiff 抛错时须**弹出刚入栈条目** + 从 `prevSnapshot` 还原 working copy + 经 onError 派发 `editor-internal-error`
- [x] **Proof** #18：写测试——`createRuntimeCore` 装配步骤抛错不使整 hook 静默半初始化（经 onError 派发 + status='error'）
- [x] **Fix** #18：`runtime-factories.ts` `createRuntimeCore`（:141-241）关键装配段加 try/catch（不吞错；保持 cleanup/detach 路径）。**注**：`mountEditorEngine`（:101-123）已 try/catch 派发 `editor-mount-failed`，不重复改
- [x] **Decision** #19：裁定生产 vs mock 区分口径（如 `import.meta.env.MODE`/engine 实例缺失且非 mock → 视为生产装配失败）
- [x] **Fix** #19：`attachEditorAdapter` 在生产装配失败时经 onError 派发 `editor-mount-failed`（mock 环境保留 noop 不阻断渲染）

Exit Criteria:

- [x] #16/#17/#18/#19 各有 focused 测试证明错误被传播而非吞没
- [x] #17 两个 call site（`runtime-mutators.ts:96` + `runtime-factories.ts:166`）均被守卫；applyDiff 失败时 working copy 与 undo 栈状态可观测地保持一致（断言：刚入栈条目被弹出 / 栈长度不变 + working copy 从 prevSnapshot 还原）
- [x] 局部 typecheck 通过

### Phase 3 - 接线与可达性

Status: completed
Targets: `renderer-definitions.ts`、`scada-editor-canvas.tsx`、`connection-wiring.ts`

- Item Types: `Proof | Fix | Decision`

> Decision #9：消费 viewport prop（fit/center policy，mount-once 应用到 engine），不移除 prop。
> Decision #12：注册 `loading`/`empty`/`error` regions 到 renderer-definitions（使 host 可覆盖三态显示）。
> Decision #13：error 分支用 `error` region（非 `empty` region），消除语义错配；`empty` region 归所到 ready+空场景提示。
> Decision #10：复核确认 `component:destroy` 句柄完整接线（engine.destroy + onDestroyed → setStatus('destroyed')），`data-status="destroyed"` 可达；residual 无，不修。

- [x] **Proof** #9：写测试——host 传 `viewport` prop，mount 后 `engine.getViewport()` 反映该值（当前恒默认）
- [x] **Fix** #9：canvas mount 时消费 `viewport` prop → `engine.setViewport(...)`（或显式移除 prop 并回写 renderer-definitions，二选一由 Decision 裁定）
- [x] **Proof** #10（复核）：复核 P1-06 后 `data-status="destroyed"` 是否可达、`component:destroy` 是否完整接线；若已收敛则记 Decision 标 residual，不修
- [x] **Fix** #10（条件）：仅当复核确认残留才修
- [x] **Fix** #11：`scada-editor-canvas.tsx:351` `statusBar` consult 改 `props.regions.statusBar?.render(...) ?? <内置 fallback>`（发射 `nop-scada-editor-status-bar` marker）
- [x] **Fix** #12：`scada-editor-canvas.tsx:228/247/253`——要么注册 `loading`/`empty` regions 到 renderer-definitions（使 canvas 读到值），要么 canvas 改用内置 fallback（Decision 裁定）
- [x] **Fix** #13：`scada-editor-canvas.tsx:253` `empty` region 不再在 error 分支带 error binding 渲染（语义错配）
- [x] **Proof** #15：写测试——connection pointer-down 不再同时触发 leafer Editor select + 近空 transform transaction（pointerdown/move 处理在 `connection-wiring.ts:58-64`；选区/transform 编排在 editor-adapter.ts:84-94）
- [x] **Fix** #15：pointer-down 路径守卫空选区不开 transform transaction

Exit Criteria:

- [x] #9 viewport prop 要么被消费（有测试证明）要么被显式移除（renderer-definitions 同步）
- [x] #11/#12/#13 各有 focused 测试证明 region 行为（statusBar marker 发射 / loading-empty 不恒 undefined / error 分支不带错配 binding）
- [x] #10 复核结论写入 plan（landed 或 adjudicated residual + 理由）

### Phase 4 - 交互正确性浏览器复核（Proof-first）

Status: completed
Targets: e2e（`tests/e2e/` 下 scada-editor 相关）+ playground demo

- Item Types: `Proof | Decision`

> 三项均标注「需浏览器验证」。先 Proof：在真实浏览器 e2e（程序化断言、禁截图，遵守 roadmap 测试纪律）复现/证伪；确认才 Fix，不可复现则 adjudicate 为 residual。

- [x] **Proof** #1：connection drag `pointermove` 是否与 viewport-pan 冲突（use-editor-engine 连线拖拽路径）——复现则 Fix（preventDefault/手势仲裁），证伪则 residual
- [x] **Proof** #5：`alignSelection`/`distributeSelection` 是否仍用顶层 bounds 忽略 group-relative（复核 P1-C2/C3 后是否已收敛）——未收敛则 Fix，已收敛则 residual
- [x] **Proof** #40：leafer canvas `view`=外层容器 + 绝对定位 canvas 是否覆盖兄弟 panel（editor-engine.ts:75-84 + styles.css:14-18）——复现则 Fix（z-index/containment），证伪则 residual

Exit Criteria:

- [x] #1/#5/#40 各有 e2e 程序化断言证据（复现 or 证伪）
- [x] 确认缺陷已 Fix 并有测试；证伪项写入 `Deferred But Adjudicated`（watch-only residual + 理由）

### Phase 5 - 行为耦合的公共面接线

Status: completed
Targets: `toolbox/toolbox-panel.tsx`、`schemas.ts`、`renderer/hooks/use-editor-handles.ts`

- Item Types: `Proof | Fix`

- [x] **Proof** #21：写测试——程序化 copy/cut 后 `clipboardCount` 更新、Paste 按钮 enabled（当前因 React state mirror 闭包失效保持 disabled）
- [x] **Fix** #21：移除 `clipboardCount` React state mirror，改读 canonical `editorClipboard` 闭包（或经 session 派生）
- [x] **Proof** #30：写测试——`ScadaEditorViewportPolicy` 类型实际被对应 schema 字段（schemas.ts:31）引用
- [x] **Fix** #30：接线类型到 schema 字段（或移除未用导出 + Decision）
- [x] **Proof** #29：写测试——`not-mounted` 失败路径返回 registry error code（非自由格式 `new Error('scada editor is not mounted')`）
- [x] **Fix** #29：`renderer/hooks/use-editor-handles.ts:91` 改返回 registry code（对齐 `editor-errors.ts` 已注册码面），而非自由格式英文 Error

Exit Criteria:

- [x] #21 程序化 copy/cut 后 Paste 可用（focused 测试断言按钮 disabled 状态翻转）
- [x] #30 类型与 schema 字段一致（无悬空导出或已接线）
- [x] #29 `not-mounted` 返回 registry code（focused 测试断言）
- [x] 局部 typecheck 通过

## Draft Review Record

> 独立子 agent（fresh session）审查，对照 `00-plan-authoring-and-execution-guide.md` Plan Review Rule（可想象性 / 格式完整性 / 内容稳健性 / 引用准确性）。达成共识（零 Blocker/Major）后升 `active`。

- Reviewer / Agent:
  - Round 1（revised）: `ses_022cd2e21ffel9K2PvoFqynhON`
  - Round 2（pass-with-minors）: `ses_022c5f06bffeuoZWtmJS23xJ4d`
- Verdict: `pass-with-minors`（零 Blocker / 零 Major / 4 非阻断 Minor·Nit）
- Rounds: 2
- Findings addressed:
  - **B1** #8 已被 P1-02/P2-C4 修复（`connection-adapter.ts:263-269` 递归 collectIds）→ 改为 Proof-only 复核 residual，移出无条件 Closure Gate
  - **M1** #18 目标文件错误（`use-editor-engine.ts` 现 258 行；setup 已抽至 `runtime-factories.ts`）→ 重新指向 `createRuntimeCore`（:141-241），标注 `mountEditorEngine`（:101-123）已有 try/catch
  - **M2** #17 遗漏第二 call site（`runtime-factories.ts:166` syncWorkingCopy，被所有 mutator 调用）+ 回滚语义（undo 条目先于 syncWorkingCopy 入栈）→ 两 call site 均守卫 + 弹出刚入栈条目 + 从 prevSnapshot 还原
  - **M3** 4 处 stale 行号（#12→228/247/253、#13→253、#15→`connection-wiring.ts:58-64`）→ 全部 live 校正
  - 非阻断 Minor/Nit（#15 行段范围 / #17 Failure Paths 表措辞简化 / #29 registry 码面精确归属 / #4 cloneNode 描述精度）由 Proof-first 执行纪律吸收

## Closure Gates

- [x] 所有 in-scope 已确认 P2 live defect（#2/#4/#6/#7/#16/#17（两 call site）/#18（createRuntimeCore）/#19/#9/#11/#12/#13/#15/#21/#29/#30）已修复且有 focused 测试证明行为成立
- [x] #8/#10/#5/#1/#40 复核结论落定（#8 已 live 确认修复→Proof residual；#10/#5/#1/#40 landed 或 adjudicated residual + 明确理由）
- [x] 数据完整性 round-trip 断言 + 错误传播断言存在
- [x] 无 in-scope live defect 被静默降级到 deferred/follow-up
- [x] 受影响 owner docs（若 Phase 改了 live baseline/public 行为）同步；无改动则不写凑数项
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（执行 session 不得自审勾选本项）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 执行中证伪的 #1/#5/#40 复核结论填入此处（Classification: watch-only residual + Why Not Blocking Closure）。

### #1 connection pointermove vs viewport-pan 冲突

- Classification: `watch-only residual`
- Why Not Blocking Closure: e2e 程序化断言（`tests/e2e/scada-editor-interaction-correctness.spec.ts` #1 test）证伪——在 junction 上 pointerdown + 拖拽期间 viewport 不被平移（`vpAfter === vpBefore`）。`connection-wiring.ts:47` `onConnectionPointerDown` 在命中 junction 时已 `e.preventDefault()` + 设 `connectionDragActiveRef.current = true`，leafer viewport 插件的 drag-pan 不触发。无手势冲突，无需 Fix。
- Successor Required: `no`

### #5 alignSelection/distributeSelection group-relative

- Classification: `watch-only residual`
- Why Not Blocking Closure: focused 单测（`align-distribute.test.ts` group-relative convergence recheck）证明：P1-C2 修复后 group child 经 `collectAllSymbols` 正确进入 selection（收敛）；扁平算法对「同父兄弟」自洽（local 坐标一致）；「跨层级混选」使用各节点 local 坐标是文档化的 M3 T1 接受限制（align-distribute.ts:6 注释），非 P1-C2/C3 回归。完整 group-relative 世界坐标对齐属 post-M3 scope。
- Successor Required: `no`

### #40 已确认并修复（非 residual）

- 结论：**confirmed + fixed**。e2e 证伪前发现 canvas 区宽度为 0（toolbox/statusBar 与 palette/canvas/inspector 同处一行 flex，toolbox 1226px 挤尽 canvas）。Fix：`.nop-scada-editor-layout` 改 `flex-direction: column`，palette|canvas|inspector 包入 `.nop-scada-editor-body` 行，toolbox 顶栏 / statusBar 底栏为列方向兄弟。e2e 断言 canvas-area 不与 palette/inspector 水平重叠，通过。

## Non-Blocking Follow-ups

- #38 编辑器从 runtime `renderer/scada-errors.ts` 导入 trivial `errorMessage`：若 Phase 2 #16 修复后该函数仍跨模块，可考虑就近内联（→ Plan 2 cleanup 评估，非本计划堵点）。
- [E0-spike] InnerEditorEvent 在 `research-render-engines.md §5:122` 未枚举（无害漂移）→ Plan 2 docs 阶段处理。

## Closure

Status Note: 5 Phase 全交付。Phase 1–3（数据完整性 / 错误传播 / 接线可达性）由前序执行完成；Phase 4（交互正确性浏览器复核）#40 confirmed+fixed（layout 重构 column + body row）、#1/#5 adjudicated residual（e2e/单认证伪）；Phase 5（公共面接线）#21 移除 clipboardCount state mirror→canonical clipboard 派生、#30 ScadaEditorViewportPolicy 接线到 schema 字段、#29 not-mounted 返回 registry code。workspace full-green：typecheck 32/32 + build 32/32 + lint 32/32 + test 59/59（industrial 97 files / 1301 tests）+ e2e 2/2。test-fidelity / docs-drift / cleanup 子集归 successor plan `2026-08-08-0900-2`。

Closure Audit Evidence:

- Auditor / Agent: `closure-auditor`（独立 fresh-session sub-agent，未参与执行）
- Verdict: `pass`
- Evidence（live repo 核验，非信任 summary）:
  - **Phase 4 #40**：`scada-editor-canvas.tsx` 根 `.nop-scada-editor-layout` 内 toolbox（:268-272）→ `.nop-scada-editor-body`（:275-386，含 palette|canvas|inspector 三栏）→ statusBar（:387-392）为列方向兄弟；`styles.css` `.nop-scada-editor-layout { flex-direction: column }`（:92）+ `.nop-scada-editor-body`（:99）存在。layout 重构真实。
  - **Phase 5 #21**：`toolbox-panel.tsx:43` `canPaste = (runtime.getClipboard()?.symbols.length ?? 0) > 0`，无 `clipboardCount` useState（rg 仅命中注释/历史测试文本）。canonical 派生真实。
  - **Phase 5 #30**：`schemas.ts:31` `viewport?: ScadaEditorViewportPolicy`（命名类型，:9 export），非 inline。
  - **Phase 5 #29**：`use-editor-handles.ts:93/95` not-mounted/destroyed 均返回 `new Error('not-mounted')` registry code（注释 :91-92 对齐 scada-errors.ts 码面）。
  - **i18n keys**：`emptyScene`（en-US.ts:956 / zh-CN.ts:954）、`invalidJson`（en-US.ts:963 / zh-CN.ts:961）双 locale 均定义。
  - **inspector-field.tsx #6**：parse 失败仅 `setParseError` 不调 onChange（:134-137）；render 期 derived-state 模式（:116-124）非 ref-during-render lint。
  - **Deferred #1/#5 诚实性**：e2e `scada-editor-interaction-correctness.spec.ts` #1 test 断言连线拖拽期 viewport 不平移（:104-105 `vpAfter === vpBefore`，依据 `connection-wiring.ts` preventDefault + connectionDragActiveRef）；#5 单测 `align-distribute.test.ts:156-178` 确认同 group 兄弟 local 坐标自洽 + 跨层级为文档化 M3 T1 限制（非 P1-C2/C3 回归）。理由可信，非隐藏 bug。
  - **无 in-scope 静默降级**：in-scope 19 项（#2/#4/#6/#7/#8 Proof/#16/#17×2/#18/#19/#9/#10 复核/#11/#12/#13/#15/#21/#29/#30 + Proof #1/#5/#40）全部在 Phase 1–5 落定或 adjudicated residual。
  - **tests**：`pnpm --filter @nop-chaos/flux-renderers-industrial test` → 97 files / 1301 tests passed（独立重跑确认）。

Follow-up:

- successor plan `2026-08-08-0900-2`：test-fidelity 重写 / docs 文件树漂移 / quick-reference / flux-guide / React19 冗余清理 / ESLint max-lines 配置 / cosmetic 子标记 / 跨包 errorMessage 内联评估
- #1/#5 watch-only residual（详见 Deferred But Adjudicated）
- no remaining plan-owned work（本计划 in-scope 全部收口）
