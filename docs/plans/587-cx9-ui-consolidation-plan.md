# 587 CX-9 共性重构：ui 包复制沉积与补偿层收敛批（useSurfaceFocusWrap/tabbable 合一/toolbar 数据驱动/zIndex 共享/media 订阅归一）

> Plan Status: completed
> Last Reviewed: 2026-10-13
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-9 条目（WA-3 批立案 WA-ui-001/002/003/004，台账 101-104 行 successor-required→本批）；先例：plan 579-586
> Related: `docs/architecture/styling-system.md`

## Purpose

ui 包四处收敛（~175 行+补偿层）：①WA-ui-001（P2，E+I）Base UI 1.3.0 焦点缺陷补偿层——wrap-surface-tab-focus.ts ↔ use-dialog-initial-focus.ts 两层手写、4 模态面只接 2（dialog/drawer 接、sheet/alert-dialog 未接）、tabbable 双枚举可见性判定已分叉、无上游升级退出出口→useSurfaceFocusWrap 下沉+tabbable 合一+**上游升级退出出口登记**；②WA-ui-002（P3）toolbar alignment↔text-format 全文件孪生 ~35 行+clipboard 文件内 ×4→数据驱动原语（pressed 样式手写绕开 Button 变体表）；③WA-ui-003（P3）sheet/dialog/drawer/alert-dialog 四文件 zIndex 装配四胞胎 ~40 行逐字（540cb8e40）→overlay-z-index 内部共享模块；④WA-ui-004（P3，H+A）media-query 订阅三代并存（use-mobile/use-breakpoint/use-breakpoints，SSR null/false 契约相反）→订阅原语归一（use-mobile 委托化保布尔契约）。

## Current Baseline（拟制时 HEAD `0d100d016` 实测）

- **位点**：见上（台账 101-104 行）；第 ① 项为补偿层（上游缺陷按住型——升级出口登记为契约收口要件，双落=useSurfaceFocusWrap doc block 移除条件句+docs/components/dialog/design.md「Upstream compensation」小节）。
- **zIndex 裁定（draft review M3）**：四胞胎逐字成立（540cb8e40）——共享模块=`createOverlayZIndex()` **工厂（每家族一个 context 实例，禁合并单例共享 context**：孤儿 overlay 读到他族 zIndex=未申报增量）；特征化补两组钉=孤儿 overlay 无内联 zIndex/嵌套异家族（dialog 内 sheet）不跨读；现 overlay-zindex.test 仅 Popover/Tooltip，四模态面装配零覆盖=缺口。
- **语义张力点三处裁定（draft review R1）**：①**tabbable 合一=统一到 B 形**（checkVisibility 优先+happy-dom 祖先链回退）为 useSurfaceFocusWrap 内唯一枚举原语——两形不可观测等价（真浏览器 fixed 分叉[A 形 offsetParent 恒排 fixed=补偿层现役漏洞]+happy-dom 无 offsetParent 实现→A 形测试环境全通过 no-op），但分叉本身即 roadmap 定性「已漂移」→**按漂移修复申报非保持分叉**；fixed 子元素入环游=有意增量申报（原语注记+判别锚=tests/e2e/component-lab/c1-1-host-surfaces.spec.ts 实浏览器；happy-dom 不可判别禁硬造假红）；禁 A 形/禁参数化双谓词。②**4 面接通=三面增量申报**：dialog 不变/sheet+alert-dialog 双层接入/drawer 初始焦点回退=申报增强（APG 对话框模式焦点入面）；逐面判别测试（接通前恰红：Popup 无 onKeyDown/无 fallback）；回写双层口径（wrap 2/4→4/4、initial-focus 1/4→4/4）。③**media 归一**：`useIsMobile = useBreakpoint('(max-width: 767px)') ?? false` 布尔契约保持；use-breakpoint 为订阅原语本体（boolean|null 公开签名零变更）；use-breakpoints 共享内部 effect 核但**保持数组 API 独立**（按查询委托致 hooks-in-loop 禁）；m4 两条亚可观测差随件注记（分数视口 767-768 带/无 matchMedia 环境冻结初值→false；~25 消费点全布尔真值分支不踩）。
- **m3 pressed 样式裁定**：原语逐字保留 `cn(active && 'bg-accent text-accent-foreground')`（ghost 变体表已含 aria-pressed:bg-muted 特异性更高疑遮蔽手写样式——级联不可 happy-dom 观测，本批禁顺手修）；以 className 字符串断言特征化；「弃手写归变体表」入 follow-up（需真浏览器证据）。
- **m5 onKeyDown 组合次序**：dialog=wrap→props.onKeyDown/drawer=Popup 仅 wrap/sheet+alert-dialog 现无——useSurfaceFocusWrap handler 契约（wrap 先用户后）+{...props} 展开位次特征化钉+判别钉（用户 handler 不被吞）。
- **具名残差风险**：真浏览器焦点时序（happy-dom 掩盖）与 CSS 级联（zIndex 真实叠序/pressed 遮蔽）——隔离 worktree 建议点跑 c1-1 spec，不作门禁阻塞项。
- **在途**：packages/ui 零在途；并行在途 14 文件与本批零交集；提交严格限定本批路径。
- **授权链（draft review m1 实证=已验证不触发分支）**：toolbar 四控件全仓零消费（仅 toolbar 目录内互引）+ui 根 index 无 Controls 导出+exports map 仅子路径——数据驱动原语落包内私有（不进 toolbar/index 亦不进根 index）→**ask-first 门确定不触发**，无需授权四要素记录。
- **公开面**：ui/src/index.ts 导出变动最小化（内部共享件不导出；toolbar 数据驱动原语如需导出则落 ask-first 记录）；既有导出签名零变更。
- **既有测试**：ui 包套件在案（口径以 live 为准）；ui 包是全库渲染器视觉基座——**涉及面广，特征化先钉为硬约束**（四模态面 tab 行为/toolbar pressed 样式/zIndex 装配/media 三代现值）。

## Goals

- 四组收敛落地+上游升级退出出口登记（WA-ui-001 契约要件）。
- 台账 WA-ui-001/002/003/004 `found → fixed → verified`（closure 后）；roadmap CX-9 `todo → planned → done`。
- ui 包 filter 门禁+双哨兵（ai+react——ui 为全库基座，双哨兵必跑）+隔离五门禁全绿。

## Non-Goals

- Base UI 升级本体（只登记出口）；toolbar 导出重构（只做数据驱动原语，导出面变化最小化）；media 契约语义统一（保持各代现值）。

## Scope

### In Scope

- `packages/ui/src/`（补偿层两件+zIndex 四文件+media 三件+toolbar 三件[alignment/text-format/**clipboard-controls** m2 补计]+新共享件与测试；**undo-redo-controls.tsx 禁顺手并入**[含 disabled||!canUndo 语义，不在 WA-ui-002 行]）
- ledger/roadmap/dev log

### Out Of Scope

- 并行在途文件；Base UI 升级；导出面重构。

## Failure Paths

不适用。

## Test Strategy

档位：**必须自动化**。特征化先钉（四模态面 Tab 环游/初始焦点/toolbar pressed 样式/zIndex 值/media 三代 SSR 现值）→提取→套件同绿+新件单测判别；ui filter 四门禁+双哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住与四组收敛

Status: done（2026-10-13：实施派驻 agent agent_80ca0b02 执行——特征化基线先绿[ui 254+react 580+ai 850+环境探针在案]→接通前判别红 12 留证[sheet/alert 4+4/drawer 1]→四组落地→ui 67 文件/324 用例[254+70 新钉]全绿+react 580+ai 850 精确同数；动态判别 3 组恰红→恢复[枚举退 A 形恰 5 红/初始焦点层禁用恰 5 红/工厂改单例恰孤儿钉红]；执行期披露=drawer 面初始焦点丢失路径判别 happy-dom 不可表达[DrawerContent 不转发 initialFocus 击穿杠杆]由原语级判别+c1-1 实浏览器锚承载[sheet/alert 经 Base UI 公开 initialFocus 击穿法非 hack]）
Targets: packages/ui

- Item Types: `Proof | Fix`（Proof 先于 Fix）
- [x] Proof：特征化基线（draft review 缺口点名全补）——组① wrap 零直测+drawer wrap 零 Tab 测+隐藏元素环游双向未钉+initial-focus 时序自注；组② toolbar 四控件全仓零测试；组③ 四模态面 context 装配零覆盖[孤儿/嵌套异家族两钉]+Popover/Tooltip 既有；组④ media 三代 SSR 契约零钉+m5 onKeyDown 组合次序逐面钉。重构前后同绿。
- [x] Fix：四组收敛+出口登记。
- [x] Proof：ui filter 四门禁+双哨兵+公开面核验。

Exit Criteria:

- [x] 特征化前后同绿；张力点裁定落字。
- [x] filter 门禁+双哨兵 exit 0。

### Phase 2 - 回写与收口

Status: done（2026-10-13：台账四行 fixed→verified 翻转[终读 220=74+0+146]；closure audit R1 approved[agent_00a7bee4，0B/0M/2m+1xm：m1 门预勾回退回勾/m2 knip 口径 2 条持久化/xm 第三条亚可观测差注记]；roadmap CX-9 done；执行期 R3-U9 mock 适配+module-load 冷缓存披露+icon-toggle re-export 收私）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`
- [x] Proof：台账四行 `found → fixed → verified`（closure 后）；roadmap CX-9 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_00a7bee4 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_9f8f1d48-4c71-4e25-b4ed-8be94203ea72，review-only）
- Verdict: `有条件通过`（0B/3M/5m）——修完 3M 转 active（张力点三项裁定=审查员交付）
- Rounds: 1
- Findings addressed: **M1** 补偿层「只接 2」系 wrap 层口径失准（initial-focus 实为 1/4；drawer 迁移净获初始焦点=第三未申报增量）→双层口径+三面增量申报+逐面判别测试；**M2** tabbable 两形不可观测等价[A 形 offsetParent 排 fixed=现役漏洞+happy-dom 无 offsetParent=A 全通过 no-op；B 形 checkVisibility 功能完好]→按漂移修复统一到 B 形（fixed 入环游=有意增量申报，禁 A 形/禁参数化双谓词/判别锚 c1-1 e2e）；**M3** zIndex 禁合并单例共享 context（孤儿 overlay 读他族=未申报增量）→createOverlayZIndex() 工厂+两钉；**m1** ask-first 门实证不触发（四控件零消费+根导出本无→原语包内私有）；**m2** scope 补 clipboard-controls+undo-redo 禁并入注记；**m3** pressed 疑被变体表遮蔽[级联不可观测]禁顺手修+className 断言特征化；**m4** use-mobile 两条亚可观测差注记；**m5** onKeyDown 组合次序逐面钉。审查员 11 项实测（HEAD/ui 零在途/台账/roadmap/考古 540cb8e40/两形逐字/接通现状/toolbar 孪生+clipboard/media 三代+消费面[useBreakpoints 唯一消费 strict ===true；useBreakpoint 零消费；useIsMobile ~25 点全布尔]/ui 254 绿 live/模板）。**基座风险面具名**：四模态面消费 15+ 包——真浏览器焦点时序与 CSS 级联两项 happy-dom 不可观测=具名残差（c1-1 点跑建议）。

## Closure Gates

- [x] 四组收敛落地+出口登记
- [x] 行为零变化（特征化前后同绿+filter 门禁+双哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_00a7bee4，0B/0M/2m+1xm），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——零新增未登记红；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- Base UI 升级本体（出口已登记双落）；toolbar 导出合并条目删除[m1 实证原语保持私有]；「弃手写 pressed 归变体表」需真浏览器证据[m3]。

## Closure

Status Note: done（2026-10-13 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_00a7bee4，review-only）
- Rounds: R1 `approved`（0B/0M/2m + 1xm informational）
- m1 两处 closure 依赖门预勾回退回勾（本节即证据）；m2 knip 口径注记（持久化日志两轮各 2 条=IconToggleControlsProps+IconToggleItem；re-export 行删除轮未持久化；终态亲验清洁）；xm useIsMobile 委托继承 rAF 重同步=第三条亚可观测差（毫秒级竞态窗，方向与原语一致，下次触碰该族文档补注记）。
- 审计员独立实证：四组逐字开档（B 形与旧 isElementVisible 逐字+wrap 层逐字[可见性谓词换 B 形=申报漂移修复]+两旧件 selector 序差不可观测+三面接入 diff+退出出口双落/IconToggleControls 输出形态逐字+clipboard 同构+pressed m3 原样/工厂每调用新建 context 四家族私有实例/media 三代签名与初始化原样）；动态判别 2 组亲手恰红（①枚举退 A 形恰 5 红=外科手术式 B 形钉②工厂改单例恰孤儿钉红）→sha256 恢复；旧件名代码零残留；R3-U9 mock 适配最小且真浏览器语义镜像；公开面四点零 diff；reconcile 亲跑 220=74+4+142；35 路径两树逐字节一致+3 删除件一致缺失。
