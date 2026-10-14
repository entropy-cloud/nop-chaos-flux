# 596 CX-16 共性重构：设计器上下文菜单壳跨包共享批（useContextMenuShell + 参数化菜单项模型）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-16 条目（WA-13a 批立案 WA-pager-001；台账 successor-required→本批）；先例：plan 588-594
> Related: `docs/architecture/renderer-markers-and-selectors.md`

## Purpose

三份手写上下文菜单壳（钳制/外点关闭/Escape/roving-focus）收敛为 ui 共享 hook `useContextMenuShell` + 参数化菜单项模型；选择器漂移以统一模型自然消解（零行为变更证明在案）。

## Current Baseline（2026-10-14 基线取证实测，拟制 HEAD `c11731169`[R1 m3 注：评审终态 HEAD=`4d947532c`[CX-15 补遗]，全部声称在其上复验为真；执行首跑以当时 HEAD 重钉]）

- **家族=三孪生（台账「两孪生」勘误）**：A=`page-designer-renderers/src/page-designer-context-menu.tsx`(153L, plan 527)/B=`flow-designer-renderers/src/designer-xyflow-canvas/designer-context-menu.tsx`(129L, plan 526)/C=`flux-renderers-industrial/src/editor/context-menu.tsx`(219L, plan 532——**文件头自declared「527 同款移植」**=族籍自证)。骨架 ≈57-64L/份（~170 行三重制）：menuRef+onCloseRef 同步 effect（语义恒同——A/C byte-verbatim；B 仅空行位差[R1 m1]）→钳制 useLayoutEffect（公式恒同）→外点 pointerdown+Escape 关闭（**19 行 byte-verbatim ×3，同 capture 旗标+Escape stopPropagation 画布屏蔽语义**）→roving ArrowUp/Down（modulo 恒同）→`<div role="menu">` 壳+item map。
- **漂移清单**：①焦点/roving 选择器——A:76/C:142/:106/:172 用 `:not([disabled])`，B:53/:83 素选择器（**根因=B 无 disabled 字段：flow 按只读过滤项而非禁用**）②item 管道——A/C 组件内 action union+`onAction(action,nodeId)`（A:27-28 React Compiler refs 注记）vs B items prop+onSelect 闭包（designer-canvas.tsx:250-320 useMemo）③icon 仅 B④样式三形⑤state 类型 string|null vs string?⑥i18n 三源。
- **统一零行为变更证明思路（本批核心论证）**：统一 item 模型支持 disabled 后，B 的 items 无 disabled 项→`:not([disabled])` 选择器对 B 的 DOM 行为恒等→统一到 A/C 选择器=三面零行为变更（判别钉承载）。
- **消费与覆盖**：A←page-designer-page.tsx（e2e page-designer-ux-visual.spec.ts:121-160 钉）；B←designer-canvas.tsx（e2e flow-designer-ux-visual.spec.ts:277-310+interaction-state-v5:37-42）；C←scada-editor-canvas.tsx（**唯一单测=context-menu.test.tsx 8 测试**[R1 M1 勘误：items per state 系两测试 symbol-state:40+blank-state:51]：items per state ×2/disabled gating/dispatch+close/Escape capture/outside pointerdown/arrow roving/clamp）。**A/B 单测为零**。
- **home 裁定输入**：ui 有 Base UI menu 原语（ContextMenu/DropdownMenu=锚定于触发交互[trigger/光标]，无法自由 clientX/Y 定位+capture 屏蔽 Escape——本 hook 是互补非重复[R1 m2 措辞收紧]）；hook 惯例=`ui/src/hooks/use-*.ts`+`src/index.ts` named export（useGlobalZIndex=最近先例）；**三消费包均已依赖 @nop-chaos/ui**；designer 共享层不存在（两 designer-renderers 零互引，新建包=最结构化）；spreadsheet 上下文菜单=Base UI 组合族（不同家族不入）；flux-react=runtime 域不匹配。
- **基线**（实测全绿）：page-designer-renderers 21/161、flow-designer-renderers 46/296；industrial 套件含 C 8 测试。
- **授权链**：跨包共享面新增+ui/src/index.ts ask-first 保护区——**home=ui 即归属裁定**，人工确认门=用户 goal 指令四要素（时间=2026-10-14；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=随时可撤）。
- **在途**：主工作树并行会话 playground/data 域活跃（三孪生文件+三消费者+ui hooks 零在途，取证核验）；提交严格限定本批路径。

## Goals

- **G1**：`ui/src/hooks/use-context-menu-shell.ts` 共享 hook 吸收骨架，**签名=R1 M2 审查员交付**：`useContextMenuShell({position: {x,y}, onClose}): {menuRef, handleMenuKeyDown}`——**选择器 `[role="menuitem"]:not([disabled])` 硬编码于 hook 内**（初始焦点+roving；统一必须结构化禁参数化——选择器形参=保留漂移向量；对 B 恒等见 G3 论证）；clamp effect deps=[menu.x,menu.y]（B clampedX/Y 局部与焦点 effect 形差由 hook 归一）；组件保留自有壳/item map/样式/i18n/testids；**Escape stopPropagation 语义逐字保持**（window capture+close 前 stopPropagation，C:6 header 不变式保持）。
- **G2**：参数化菜单项模型 `{key, label, icon?, disabled?, destructive?, testid?, onSelect}` 吸收三面（B icon、A/C action-union 经消费侧 onSelect 适配；React Compiler refs 约束消费侧保持）。
- **G3**：三菜单改引；**选择器统一到 `:not([disabled])`**（零行为变更论证+判别钉：B 的 DOM 无 disabled menuitem→选择器对 B 恒等）。
- **G4**：壳单测落 ui（以 C 的 8 测试为覆盖基线迁移+三消费形参数化例）；C 既有套件同绿；A/B 补最小单测（现零覆盖）。
- 台账 WA-pager-001 `found → verified`（closure 后，×2→×3 勘误随行）；roadmap CX-16 `todo → done`。

## Non-Goals

- spreadsheet Base UI 组合族（不同家族）；B icon 样式统一/A C 样式收敛（视觉差异保持）；ui Base UI menu 原语改造；三包 i18n 源统一（各自保持）。

## Scope

### In Scope

- `packages/ui/src/hooks/use-context-menu-shell.ts`+测试+`ui/src/index.ts`（+1 hook 导出）
- 三菜单文件改引+三包最小新单测
- ledger/roadmap/dev log

### Out Of Scope

- 并行会话在途文件；spreadsheet 族；视觉样式统一；i18n 统一。

## Failure Paths

不适用（行为保持收敛；选择器统一判别+Escape 语义钉承载）。

## Test Strategy

档位：**必须自动化**。特征化先钉（A/B 现行为单测补零覆盖=迁移 C 模式：clamp/Escape capture[stopPropagation 断言]/外点/roving/禁用项门）→提取→三面同绿+判别（选择器统一对 B 恒等钉+Escape stopPropagation 钉+变异恰红）；ui/page-designer/flow/industrial 四包 filter 门禁+哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: completed
Targets: 三包测试

- Item Types: `Proof`

- [x] Proof：C 既有 8 测试核对+迁移基线落定；A/B 补行为钉（clamp/Escape stopPropagation/外点/roving/禁用项）。（2026-10-14：C 既有套件 8/8 绿实测复核；新增 A=`page-designer-renderers/src/page-designer-context-menu.test.tsx` 11 测试[含 Escape stopPropagation 逐字 spy 断言+尾项环回跳 disabled 判别钉+首焦点 disabled 门]、B=`flow-designer-renderers/src/designer-xyflow-canvas/designer-context-menu.test.tsx` 10 测试[同模式+恒等钉]，首跑均绿）
- [x] Proof：选择器统一恒等钉（B items 构造面无 disabled 项断言）。（DOM 面：node/blank 两态渲染集 `[role="menuitem"]` 与 `:not([disabled])` 选择集逐元素恒等且零 disabled；构造面：designer-canvas.tsx contextMenuItems useMemo 块源级扫描零 `disabled` token——B 的 `DesignerContextMenuItem` 接口本无 disabled 字段）
- [x] Proof：基线落字（page 21/161+flow 46/296+industrial 套件）。（实测：page-designer-renderers 22 files/172 tests 全绿[=基线 21/161+本批 1 文件/11 钉]；flow-designer-renderers 47 files/306 tests 全绿[=基线 46/296+本批 1 文件/10 钉]；industrial C 套件 8/8 绿原数）

Exit Criteria:

- [x] 钉全绿；A/B 零覆盖缺口已补。（三面 29 钉全绿：C 8+A 11+B 10；A/B 单测零覆盖已补）

### Phase 2 - 提取与改引

Status: completed
Targets: ui hooks+三菜单

- Item Types: `Fix | Proof`

- [x] Fix：useContextMenuShell+item 模型提取+ui index +1 导出；三菜单改引（B icon 经模型 icon?）。（2026-10-14：`ui/src/hooks/use-context-menu-shell.ts` 落地，签名=审查员交付 `({position:{x,y},onClose})→{menuRef,handleMenuKeyDown}`，选择器 `[role="menuitem"]:not([disabled])` 硬编码于 hook 内（初始焦点+roving），VIEWPORT_MARGIN=8，clamp deps=[position.x,position.y]；19 行外点+Escape 块内部 17 行与 HEAD A 文件 diff 实证 byte-identical（仅 `useEffect`→`React.useEffect` 包装行差）；ui index diff 实测=+1 行 named export；A/C 组件内 items 改 G2 形（action 字段→onSelect 闭包内联调 props.onAction，React Compiler refs 注记原位保持），B `DesignerContextMenuItem` 增 `disabled?` 并渲染 `disabled={item.disabled}`（undefined→不落属性，DOM 恒等），icon/icon? 原样；三面自有壳/样式/i18n/testids 原样）
- [x] Proof：三面钉同绿+选择器恒等钉+判别变异恰红→sha256 恢复。（改引后 C 8/8+A 11/11+B 10/10+ui hook 10/10 同绿；变异 M1=roving 选择器去 `:not([disabled])`→外科手术红 ui 2（尾项环回+全 disabled 早退）+A 1（尾项环回判别钉），B 10/10 绿=恒等实证，C 8/8 绿（其 traverse 不含尾项跨 disabled 环回向=模式缺口，判别由 A/ui 钉承载）；变异 M2=去 Escape stopPropagation→红 ui/A/B 各 1（stopPropagation 逐字 spy 钉），C 8/8 绿（其 Escape 钉仅断 onClose，先于 spy 强化）；恢复后 hook sha256 `a788860f…6566c` 两次变异均 byte-identical 复验）

Exit Criteria:

- [x] 三重制骨架归零（grep 计数落字）；四包套件同绿；ui index diff=+1 hook 导出。（grep 实测：三菜单文件 `VIEWPORT_MARGIN|onCloseRef|querySelectorAll` 计数 0/0/0，roving modulo 全仓仅存 hook；四包门禁 typecheck/build/lint 全 exit 0+套件 ui 70 files/347 tests、page 22/172、flow 47/306、industrial 153/1721 全绿；ui index diff=+1 行）

### Phase 3 - 回写与收口

Status: done（2026-10-14：台账 WA-pager-001 verified[×2→×3 勘误随行]；roadmap CX-16 done；dev log 10-14；隔离五门禁=4 绿+check 披露部分[审计员独立重跑全部 20 子门禁=19 绿+knip 唯一命中属并行]；closure audit agent_594b8642 R1 approved 后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 WA-pager-001 verified（×2→×3 勘误随行）；roadmap CX-16 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_594b8642 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_35c53795-bca7-4fdf-8f89-9a05295a8743，review-only）
- Verdict: R1 `fail`（0B/2M/3m）→全修；R2 `fail`（0B/1M/0m——仅残留 :19 一处 7→8 token）→修复后**pass**（审查员预授权免第三轮）
- Rounds: 2
- Findings addressed: **M1** C 套件 7→8 勘误（items per state 系两测试）三处落字；**M2** G1 参数面修正=去选择器形参+hook 内硬编码 `:not([disabled])`（统一必须结构化）+最终签名 `{position,onClose}→{menuRef,handleMenuKeyDown}`+clamp deps/B 局部与 effect 形差由 hook 归一落字；**m1** 同步 effect 措辞软化（A/C byte-verbatim;B 空行位差）；**m2** Base UI 锚定措辞收紧；**m3** HEAD 漂移注记。R1 verified-clean：三孪生位点/19L outside-close+Escape byte-verbatim[diff 零差]/选择器漂移行号/B 无 disabled 字段+designer-canvas 构造面/消费三件/测试覆盖（C 8+A/B 零+e2e 三 spec）/ui hook 惯例+useGlobalZIndex 先例/Base UI 触发锚定/三包 ui 依赖/公共入口契约测试与 knip 无碍/人工门四要素/模板合规（Rule 18/When-Drafting 13/同 tick 判别钉）。

## Closure Gates

- [x] 壳+item 模型落地+三面改引（×2→×3 勘误在案）
- [x] 行为保持判别（特征化同绿+选择器恒等+Escape 语义钉+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_594b8642 R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx16-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——**披露部分通过**：abort 于第三子门禁 oversized[react19/src-artifacts 先过]，红源=并行会话已提交的 data 两文件 708/706[其 plan-593 仍在迭代禁拆]；审计员独立重跑全部 20 子门禁=19 绿+knip 唯一命中属并行[form-load-action#FormLoadState，已提交 0eb4bddd6]；本批零命中；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 三面样式收敛与 icon 统一（视觉域，successor）。
- B 无 disabled 语义与 A/C disabled 语义的跨面统一（行为变更域，successor）。

## Closure

Status Note: 2026-10-14 收口。useContextMenuShell（ui hooks 惯例，签名={position,onClose}→{menuRef,handleMenuKeyDown}，选择器硬编码结构化统一）+参数化菜单项模型落地；三菜单改引（骨架标记 grep 归零；ui index 精确 +1）；B 恒等=差分变异+DOM/构造双面钉实证；判别两组变异外科手术式恢复+审计员亲判 M2 签名精确复现；29 钉先绿（A 11+B 10+C 8 基线）；**check 门=披露部分通过**（红源=并行 plan-593 已提交 data 文件超限且仍在迭代禁拆；审计员独立重跑 20 子门禁 19 绿）；实施=派驻 agent，本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_594b8642-a0ae-4463-8818-2b8ecd52e29f，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/3m——m1=收口证据引审计员 20 子门禁全清单重跑+check 门记披露部分[已履行]/m2=「未提交」措辞勘误[form-load-action 已提交 0eb4bddd6]+链中止于第三子门禁注记[已履行]/m3=注释 typo 修[已履行]）
- Findings addressed: 审计员逐项对账（hook sha256+签名逐项/三菜单骨架标记归零+逐面保留/ui index +1/消费者零触碰/保护零标识符/29 钉判别器全在位/门禁日志实跑计数）+Escape 块与 HEAD 程序化 diff 逐字[18 行空差]+**亲判 M2**（去 stopPropagation→ui/A/B 各 1 红[spy 钉]+C 8/8 绿[前 spy 套件]→sha256 逐字节恢复→ui 10/10 绿）+**独立重跑全部 20 check 子门禁**（19 绿+knip 单命中属并行）+9 路径两树 sha256 逐字节核验。

Follow-up:

- 三面样式收敛与 icon 统一（视觉域，successor）。
- B 无 disabled 语义与 A/C disabled 语义跨面统一（行为变更域，successor）。
- C 遍历不跨尾随 disabled 的模式缺口由 ui hook 钉+A 组件钉承载（已披露）；并行会话 data 文件超限拆分归其 plan-593 收口。
