# 586 CX-8 共性重构：flux-react 包内复制沉积收敛批（useDeferredDispose/PanelResizer/SurfaceChromeShell）

> Plan Status: active
> Last Reviewed: 2026-10-13
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-8 条目（WA-3 批立案 WA-react-001/002/003+WA-4 批增补第 7 份，台账 88/89/90 行 successor-required→本批）；先例：plan 579-585
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

flux-react 包内三组复制沉积收敛（~245 行）：①StrictMode 延迟 dispose 骨架 6 份跨 3 文件→提取 `useDeferredDispose` hook；②workbench 左右面板 resize 镜像→`createPanelResizer(side)`/`ResizablePanelSlot`+宽度常量收敛；③dialog-host DialogView/DrawerView 视觉壳残差→`SurfaceChromeShell`（children-as-function）。

## Current Baseline（拟制时 HEAD `c1df7a4eb` 实测）

- **WA-react-001（P2）6 份**：use-node-scopes.ts:62-103 / schema-renderer.tsx:283-356 / render-nodes.tsx:431-461[draft review M1 引文勘误：台账 :449-478 系照抄未复核，HEAD 实测 effect 跨度 :431-461，:463-478 为无关段]（d1dce1e20→5b267f6f9 复制链；actionScope 版守卫已单侧漂移——漂移语义保持现行为）。**第 6 份异型裁定（draft review M2，选 b）**：render-nodes 份守卫族不同（同 owner 重在位+缓存条目已替换双谓词+微任务入口无条件副作用 pendingFragmentScopeVersionRef 清位+无 mountedRef）——**提取范围=5 份同型，render-nodes 份原位保留 bespoke effect**（不强行并入）。**WA-4 增补第 7 份（form.tsx）位点物理在 flux-renderers-form——该包整包并行在途（form.tsx M 状态），本批排除**，落 Deferred 并在 roadmap CX-8 行注记「第 7 份随在途批收口后独立小批或下一触点顺带」。
- **WA-react-002（P2）**：workbench-shell.tsx:162-301,366-464 左右镜像（af3805e49 一次落两份）+宽度字面 :89-106,:307-330 双编码。
- **WA-react-003（P2）**：dialog-host.tsx:338-365,498-512 / :389-399,542-552 / :419-450,572-603 三对（5a8baa1ca 双写；cq-3 已收敛生命周期此为视觉壳残差；isTopmost 抑制单侧存在——单侧语义保持）。
- **在途**（draft review m1 补全）：flux-core types/scope.ts+flux-runtime 三件+flux-renderers-{data ×5,form ×3,layout ×3} 共 14 文件——flux-react 零在途；**第 7 份位点 form.tsx 在途=排除依据**；提交严格限定本批路径。
- **公开面**：全包内提取，flux-react index 零变更（契约 §7c 无需人工确认——roadmap 预裁定，无门标记）。
- **既有测试**：flux-react 套件 570 用例（CX-7 后口径）在案=行为守卫；特征化先钉（actionScope 守卫漂移形态/面板 resize 现行为/dialog 壳现行为含 isTopmost 单侧）。

## Goals

- 三组收敛落地（draft review 最小参数面交付）：
  - `useDeferredDispose<T>({ value: T | undefined, isEnabled?: boolean = true, dispose: (disposed: T) => void }): void`——收敛 **5 份同型**（render-nodes 异型原位保留）；内部 `[]` effect 维护 mountedRef+`[value, isEnabled]` effect 维护 activeRef；cleanup 捕获 disposed+queueMicrotask 内 `!disposed→return/mounted&&activeRef===disposed→return/dispose(disposed)`；**disposer 不入 deps**（闭包经回调透传，防 runtime 换值多余排队）；null 早退归一+`.dispose?.()` vs `.dispose()` 归一到调用侧。
  - `createPanelResizer`/panel 参数表：`{ side: 'left'|'right', width, min, max, isControlled, onCommit }`——拖拽符号 dir=±1/键盘 ArrowLeft-Right 反转/手柄 right-0 vs left-0/rail justify 由 side 派生[Chevron 图标仍为 shell 两 rail 分支字面——closure m3：行为零变化，派生归 follow-up]/宽度常量单一来源 `{ expandedRem: 15|22, collapsedRem: 2, defaultPx: 240|352 }`（15rem=240px、22rem=352px 已核）派生 grid 字符串/i18n resizeLeft-Right/testid 与 data-slot 前缀由 side 派生；不变式保持=pointer capture/rAF 合帧/pointerup 一次 commit/cancelAnimationFrame 清理。
  - `SurfaceChromeShell`（children-as-function）：`{ kind: 'dialog'|'drawer', chrome: {Header,Title,Body,Footer}, titleNode…, closeSlotName, confirmBarClass, shouldClose? }`——对 1 单侧 isTopmost 抑制=DialogView 传 shouldClose Drawer 不传（**单侧语义保持禁静默统一**）；第 4 块镜像 SurfaceScopeProviders+边界包裹（dialog :401-418 ↔ drawer :554-571 各 18 行）**并入 shell 范围**[m 级补记]；DialogView/DrawerView 保留包装差异（modal/noOverlay/direction/showMask/resizable/size/topAnchored）。
- 台账 WA-react-001/002/003 `found → fixed → verified`（closure 后）；roadmap CX-8 `todo → planned → done`。
- flux-react filter 门禁+双哨兵（ai+react 本体→哨兵=ai）+隔离五门禁全绿；index 零变更。

## Non-Goals

- 第 7 份（form.tsx，在途包）；dialog/panel 语义增强；isTopmost 单侧差异统一。

## Scope

### In Scope

- `packages/flux-react/src/`：use-node-scopes.ts、schema-renderer.tsx、render-nodes.tsx、workbench/workbench-shell.tsx、dialog-host.tsx（+新共享件与测试）
- ledger/roadmap/dev log

### Out Of Scope

- flux-renderers-form（在途）；并行在途文件；漂移语义统一。

## Failure Paths

不适用。

## Test Strategy

档位：**必须自动化**。特征化先钉（三组现行为含漂移形态）→提取→套件同绿+新件单测判别；flux-react filter 四门禁+ai 哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住与提取

Status: done（2026-10-13：实施派驻两 agent[首 agent 用量上限中断于第 3 组前，续作 agent 完成剩余]——第 1 组 useDeferredDispose 收敛 5 份同型[render-nodes 异型原位保留]+第 2 组 panel-resizer+第 3 组 SurfaceChromeShell[含第 4 块镜像并入]；特征化 10 钉先绿[含 m4 宽度字面钉 4 组+registry spy 直钉]重构前后同绿[580=570+10]；动态判别 2 组恰红[删 activeRef 守卫 StrictMode 钉红/反转拖拽符号 inverts-drag 钉红]→恢复；执行期披露=use-deferred-dispose disposer 携带机制由闭包直捕改 ref 快照配对[react-compiler/exhaustive-deps 双 error 仓规所迫，语义等价 8 钉全绿]+ui mock 补 DialogFooter/DrawerFooter 导出[断言零变更]+前作 2 个 lint 报错修复[disable 指令触发 react-compiler error 改 ref 快照形态/冗余 no-explicit-any disable 删除]）
Targets: flux-react 包内

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线（draft review m2/m4 指名缺口）——①StrictMode 双调用+runtime 换 value 不换时序②零额外 dispose 调用（deps 纪律）③isEnabled=false→零调用④undefined value→零调用⑤**workbench 宽度字面钉**（17 测试无一断言轨道字面值——常量收敛前须补 style/track 断言防静默改宽）⑥registry 侧换值释放 spy 直钉（现仅间接覆盖）⑦面板镜像既有覆盖确认[inverses drag/commits once/keyboard step/i18n 四测在案]+isTopmost 单侧钉[dialog-host-close-behavior:102 在案]。重构前后同绿。
- [x] Fix：三组提取+消费点改引。
- [x] Proof：flux-react filter 四门禁+ai 哨兵+index 零变更。

Exit Criteria:

- [x] 特征化前后同绿；漂移形态逐字保持。
- [x] filter 门禁+哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账三行 fixed→verified 翻转[终读 220=78+0+142]；closure audit R1 approved[agent_4d1c577f，0B/0M/4m：m1 两处门预勾回退回勾/m2 台账钉数口径订正/m3 Chevron 措辞→follow-up/m4 窄视口字面 follow-up 登记]；roadmap CX-8 done；执行期 knip 两轮收私[11 条]与终态门禁全绿）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账三行 `found → fixed → verified`（closure 后）；roadmap CX-8 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。（closure audit agent_4d1c577f approved 后据实回勾）

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_6c689913-5cf9-47f0-8072-31805641e75a，review-only）
- Verdict: `有条件通过`（0B/2M/4m）——修订 M1/M2 落字后执行（三原语最小参数面=审查员交付）
- Rounds: 1
- Findings addressed: **M1** render-nodes 引文漂移勘误（:449-478→:431-461）；**M2** 第 6 份异型裁定选 b（5 份同型提取+render-nodes bespoke 原位保留——异型=双谓词守卫+微任务入口无条件清位副作用+无 mountedRef）；**m1** 在途清单补 flux-core 一件；**m2** 三处形态差异入特征化清单（mounted 熔合 vs 独立/deps 纪律零额外 dispose/所有权门两写法+undefined value 容忍）；**m3** roadmap 行矛盾窗口（Phase 2 回写消除）；**m4** 特征化缺口点名（workbench 宽度字面钉+registry 侧 spy 钉+已覆盖确认四测）。审查员 9 项实测（HEAD/在途 14 文件/台账/roadmap/第 7 份同型确认+M 状态/index 零变更可行/570 口径/模板/引文逐一比对）。

## Closure Gates

- [x] 三组复制沉积已收敛
- [x] 行为零变化（特征化前后同绿+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_4d1c577f，0B/0M/4m 随收口修正），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红；新文件 git add -N）

## Deferred But Adjudicated

- **第 7 份（form.tsx StrictMode 延迟 dispose）排除裁定（2026-10-13）**：位点物理在 flux-renderers-form——该包整包并行会话在途（form.tsx M 状态），本批触碰即冲突；排除归「在途批收口后独立小批或下一触点顺带」，roadmap CX-8 行注记在案。

## Non-Blocking Follow-ups

- 第 7 份收敛（随在途批后）；isTopmost 单侧差异语义统一（如需）归独立行为批。
- workbench-shell.tsx :246 窄视口字面 `max-[1023px]:grid-cols-[15rem_…]` 为宽度第三处重述[closure m4：HEAD 原样非本批引入]——派生入单一来源归 follow-up。
- schema-renderer-deferred-dispose #1 钉 spy 前置加强（informational：现对该变异观测盲，判别由另两枚 StrictMode 钉承担）。

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_4d1c577f，review-only）
- Rounds: R1 `approved`（0B/0M/4m 随收口落字修正）
- m1 两处 closure 依赖门预勾回退回勾（本节即证据）；m2 台账钉数口径订正（dispose 特征化 8=4+4，批合计 10）；m3 Chevron 措辞修正+follow-up；m4 :246 窄视口字面 follow-up 登记。
- 审计员独立实证：三原语逐字开档（useDeferredDispose De Morgan 严格等价+ref 快照配对论证[disposeRef 声明序先写后捕获]+5 调用点逐一保形；panel-resizer 参数表逐项映射+宽度常量等值核实+不变式四件+release 时序逐字同构；SurfaceChromeShell 三对+第 4 块+isTopmost 单侧保持+包装差异留双 View）；render-nodes 两树零 diff（M2 铁律）；动态判别 2 组亲手恰红（A 删 activeRef 守卫恰 2 红=StrictMode 钉 B 符号反转恰 5 红含 inverts-drag 钉）→sha256 恢复+恢复后 580/580 绿；收私 11 符号文件内自用核验；门禁诚实轨迹（首跑 check exit=1→5b exit=1→5c/5d exit=0）；reconcile 亲跑 220=78+3+139；两树 16 路径逐字节一致。
