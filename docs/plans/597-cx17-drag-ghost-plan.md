# 597 CX-17 共性重构：拖拽 ghost 共享原语批（ui setDragGhost 三份收敛）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-17 条目（WA-13b 批立案 WA-reportr-003，唯一 P1；台账 successor-required→本批）；先例：plan 596（ui hooks/lib 落位惯例）
> Related: `docs/architecture/renderer-markers-and-selectors.md`

## Purpose

三份同日互抄的 setDragImage drag-ghost（~90% 孪生）收敛为 ui 共享原语 `setDragGhost`；report 独有的 Not-implemented try/catch 防御（全仓零测试覆盖）经统一防御化 propagating 到三面（申报防御增强，判别钉承载）；视觉差异参数化保持。

## Current Baseline（2026-10-14 基线取证实测，HEAD `4d947532c` 之后[并行会话持续提交中，执行首跑重钉]）

- **三份**（~90% 孪生，算法恒同=guard→offscreen fixed div→setDragImage→setTimeout(0) cleanup）：A=page-designer-renderers/palette-panel.tsx:22-57 `setPaletteDragGhost`（plan 527 首生 dd72a80b3）；B=report-designer-renderers/report-field-panel.tsx:11-48 `setFieldDragGhost`（plan 528，25b60edc2，**出生即带 try/catch Not-implemented 防御 ：38-44——唯一实质漂移且全仓零覆盖**[grep Not implemented 测试零命中]）；C=flux-renderers-industrial/src/editor/palette/palette-drag-ghost.ts:7-37 `setScadaPaletteDragGhost`（plan 531，da067c238，**唯一独立模块+React-free 签名 `({dataTransfer}, label)`=正确共享形态种子**；文件头自declared「527 同款移植」）。考古链 dd72a80b3(03:18)→25b60edc2(08:38)→da067c238(20:06) 全 2026-10-06 同日，方向证实。
- **漂移表**：testid 三形/label 组合三形（i18n badge·fieldType·plain）/颜色三形（PD tokens/hsl vars/hsl+surface）/padding-radius-font/offsets（12,12 vs 14,10）/gap:6px（A/B 有 C 无[R1 m2 补]）/try-catch（仅 B）。
- **消费**：palette-panel.tsx:93-98/report-field-panel.tsx:194-198/editor-palette.tsx:70-74——各 dragstart 处理器内部调用，零跨包消费。
- **测试现状**：C 有专属单测 3（appends+setDragImage+cleanup/feature-detect no-op/null dataTransfer no-op=最强）；A 有 palette-panel.test.tsx 部分（创建清理+降级 :132-163）+e2e MutationObserver；**B ghost 单测为零**（仅 e2e）。**try/catch catch 分支全仓零覆盖**。
- **home 裁定输入（基线取证）**：ui 无拖拽工具；纯 DOM helper 惯例落位=`ui/src/lib/`（先例 focus-target.ts；非 hook——industrial 签名刻意 React-free）；ui index selective 导出惯例（isEditableTarget 刻意不导出的反例在案）→ `ui/src/lib/drag-ghost.ts`+index 导出=ask-first 人工门；designer 共享层不存在（CX-16 基线确认仍真）；flux-core 零 document 使用（环境无关契约禁破坏）/flux-react 拒因=R1 M2 勘误[三消费包**均声明依赖** flux-react：page:20/report:23/industrial:33——真拒因=flux-react 系 ui 之上的 React 绑定层而本原语刻意 React-free（仅 document/window）]。
- **家族排外**：scheduling calendar.tsx:577-590 跟随光标 ghost（pointer 驱动，非 setDragImage 技术）=不同问题域不入族（取证确认）；setDragImage 全仓 grep 恰三份+两测试文件。
- **基线计数警示**：取证时 report/page 套件有并行会话中途改动造成的环境性红（其 flux-react schema-renderer/页面壳当时在改，后已提交）——执行首跑以当时 HEAD 重测落字；三 ghost 文件+三消费者在取证时全清洁。
- **授权链**：跨包共享面新增+ui/src/index.ts ask-first——home=ui 即归属裁定，人工确认门=用户 goal 指令四要素（时间=2026-10-14；渠道=ZCode `/goal`；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=随时可撤）。
- **在途**：并行会话 playground/data/ui-overlay 域活跃（三 ghost 文件+消费者清洁，执行前复验）；提交严格限定本批路径。

## Goals

- **G1**：`ui/src/lib/drag-ghost.ts` 共享原语（**R1 M3 交付签名**）`setDragGhost(event: {dataTransfer}, options: {testid, label, style?: string, offsetX? = 12, offsetY? = 12})`——**style=cssText 字符串参数禁变体枚举**（page 的 PD tokens 在 ui 上方不可导入，枚举=在 ui 复制 PD 色字面=新漂移向量）：原语只持有共享不变式（`position:fixed; top:-200px; left:-200px; z-index:-1; pointer-events:none; display:inline-flex; align-items:center; white-space:nowrap`）+guard+**统一 try/catch（catch=同步 ghost.remove()+return=B 派语义）**+setTimeout(0) cleanup；label=消费侧已组合终串（i18n/fieldType 组合留消费侧）；A 传 PD-token cssText（含 gap:6px）、C 传 hsl+surface cssText（无 gap）+offsets 14/10、B 仅 label+testid 得缺省 style=三面逐字节保形。统一 guard（feature-detect）+**统一 try/catch Not-implemented 防御**（B 派胜出=申报防御增强：A/C 现裸调用在抛错环境未捕获）+offscreen div。
- **G2**：三消费者改引（testid/label 组合/offsets 经参数保持；A 的 i18n badge 在消费侧组参）。
- **G3**：**补 B ghost 单测**（现零覆盖——迁移 C 的 3 测试模式+try/catch catch-分支钉=全仓首覆盖）+三面防御钉。
- 台账 **WA-reportr-003** `found → verified`（closure 后）[R1 M1 勘误：原引 001=cellAddress 项已 verified]。

## Non-Goals

- scheduling 跟随光标 ghost（不同问题域）；视觉样式统一（参数化保持）；palette-panel/report-field-panel/editor-palette 其余逻辑。

## Scope

### In Scope

- `packages/ui/src/lib/drag-ghost.ts`+测试+`ui/src/index.ts`（+1 导出）
- 三 ghost 函数删除+三消费者改引+report 新单测
- ledger/roadmap/dev log

### Out Of Scope

- 并行会话在途文件；scheduling ghost；视觉统一。

## Failure Paths

不适用（防御增强=严格增防御；判别钉承载）。

## Test Strategy

档位：**必须自动化**。特征化先钉（三面现行为：appends+setDragImage+offsets/cleanup/feature-detect no-op/null no-op+**report try-catch 分支钉[新覆盖]**）→提取→三面同绿+防御增强判别（A/C 旧实现 throw 环境 uncaught→新实现降级=红→绿）；ui+report+page+industrial 四包 filter 门禁+哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: completed（2026-10-14，钉 HEAD `46ad735dd`）
Targets: 测试面

- Item Types: `Proof`

- [x] Proof：三面现行为钉（各 3-4：appends/testid/offsets/cleanup/feature-detect/null）+report try-catch 分支钉（新覆盖，throw 环境）。
  - A=page-designer-renderers `palette-panel.test.tsx` 9→12（+3：appends+testid+plain label+PD-token cssText gap:6px+setDragImage(ghost,12,12)+fake-timers cleanup；container-badge i18n 组合（期望串经 items+t() 现算）；**判别红腿**=setDragImage throw→window error 事件恰 1+ghost 残留）。
  - B=report-designer-renderers **新文件** `report-field-drag-ghost.test.tsx` ×3（原 ghost 单测零）：appends+`number · Order ID` 组合+hsl-vars cssText+offsets 12,12+cleanup；**try-catch catch 分支钉=全仓首覆盖**（throw→无 uncaught[window error 事件 0]+ghost 同步移除[fake timers 未跑即断言]）；feature-detect no-op。
  - C=flux-renderers-industrial `palette-drag-ghost.test.ts` 3→5（原 3 保持绿）：+offsets(14,10)+cssText 形钉（background var(--nop-surface)/无 gap）；**判别红腿**=`.toThrow()`（React-free 直接断言）+ghost 残留。
  - 环境适配披露 ×2：①组件级 `expect(() => fireEvent.dragStart(...)).toThrow()` 环境不可行——React 19.2.4+happy-dom 15.11.7 下 happy-dom 依 DOM 规范捕获 listener 异常（WindowErrorUtility.captureError→console.error+window ErrorEvent，探针实测 PROPAGATED:false），A 红腿改用 window error 事件观测面（OLD=恰 1 error 事件+ghost 残留；语义同为 uncaught 可观测，Phase 2 重写=0 error+setDragImage 恰一次+ghost 同步移除）。②happy-dom cssText 赋值时静默丢弃嵌套 `hsl(var(--x))` 声明→B 的 hsl-vars cssText 经 document.createElement 拦截捕获赋值原串钉定（live style 只钉幸存属性）。
- [x] Proof：基线落字（四包套件执行首跑实测）。
  - HEAD `46ad735dd`：ui 70 files/347 tests 绿；page-designer-renderers 22/172 绿；report-designer-renderers 21/213（首跑 1 红=page-renderer-init「reports invalid required runtime inputs」——并行会话在途 flux-react schema-renderer/page-renderer-init 自改污染，**非本批路径**[本批仅新增 report-field-drag-ghost.test.tsx]，复跑其改动沉降后 22 files/216 tests 全绿）；flux-renderers-industrial 153/1721 绿。

Exit Criteria:

- [x] 钉全绿（含新补 report 分支钉）。→ A 12/12+B 3/3+C 5/5 实测；report 包全套 22/216、page/industrial/ui 基线绿。

### Phase 2 - 提取与改引

Status: completed（2026-10-14，执行 session；Phase 3 留编排者）
Targets: ui lib+三消费者

- Item Types: `Fix | Proof`

- [x] Fix：setDragGhost 提取（统一防御）+ui index +1 导出+三消费者改引+三旧函数删除。
  - `packages/ui/src/lib/drag-ghost.ts` 新建：R1 M3 交付签名 `setDragGhost(event: { dataTransfer }, options: { testid, label, style?, offsetX?=12, offsetY?=12 })`；原语仅持有共享不变式 cssText（`position:fixed; top:-200px; left:-200px; z-index:-1; pointer-events:none; display:inline-flex; align-items:center; white-space:nowrap`）+feature-detect guard+统一 try/catch（catch=同步 `ghost.remove()+return`=B 派语义）+setTimeout(0) cleanup；`options.style`=消费方 cssText 附加（缺省=B 的 hsl-vars 体）；`DragGhostOptions` 接口刻意不导出（knip unused-export 零命中，消费侧结构化传参）。
  - ui index diff=精确 +1 行（`export { setDragGhost } from './lib/drag-ghost.js';`，diff 已核）。
  - 三消费者改引+三旧函数删除：A=palette-panel.tsx（消费侧组参：i18n badge 组合终串+PD-token cssText 含 gap:6px，PD tokens 仍本包导入）；B=report-field-panel.tsx（仅 label+testid=缺省 style）；C=editor-palette.tsx（hsl+surface cssText+offsetX:14/offsetY:10）；`palette-drag-ghost.ts`+`palette-drag-ghost.test.ts` 整文件删除（C 面钉迁 editor-palette.test.tsx 消费级 ghost describe ×3，testid 三形逐字保持[e2e MutationObserver testid 锚定，tests/e2e/{page-designer,report-designer}-ux-visual.spec.ts 零改动]）。
  - 原语单测 `packages/ui/src/lib/drag-ghost.test.ts` ×5（appends/缺省 style+offsets/消费方 cssText 附加+offsets 覆盖/guard null+缺 setDragImage/统一防御）。
- [x] Proof：三面钉同绿+防御增强判别（A/C throw 环境 uncaught→降级=红→绿）+判别变异恰红→sha256 恢复。
  - 三面钉同绿：A 12/12、B 3/3、C 消费级 8/8（editor-palette.test.tsx）、ui 原语 5/5。
  - 防御增强判别：Phase 1 红腿（A=window error 事件恰 1+ghost 残留；C=`.toThrow()`+ghost 残留）→Phase 2 重写绿腿（A/C=无 uncaught[error 事件 0]+setDragImage 恰一次+ghost 同步移除）。
  - 判别变异 ×2（`ui/src/lib/drag-ghost.ts`）+外科手术式恢复：①去 try/catch 裸调用→恰 4 红（ui 防御钉/B catch 分支钉/A 判别腿/C 判别腿，余全绿[**closure m2 口径注记：整包 scope 下第 5 红=report-field-panel payload 级联（fireEvent 合并真 DataTransfer 抛错，handler 提前中止）——强化防御主张，非削弱**]）→恢复；②去 setTimeout(0) cleanup→恰红（三面+ui cleanup 钉；page 包内 plan-527 既有 2 测试因同文件 ghost 泄漏级联红=同根因）→恢复；实施时点两次 sha256 均=cbfbf2769fdd…（逐字节）[**closure m1 版本漂移注记：实施后文件经精修，终态字节=274b34c89706…，审计员以终态字节重跑两组变异恰红并逐字节恢复至 274b34c8…=终态重证在案**]。
  - 环境披露：RTL `fireEvent` 在 `window.DataTransfer` 可构造时（happy-dom）恒以真实 DataTransfer 为底拷贝 mock 自有属性（@testing-library/dom createEvent dataTransferProperties 分支）——原型 setDragImage 恒在，feature-detect guard 经 fireEvent 不可达（B/C 面初版 guard 钉真空通过）→guard 钉改原生 Event+dataTransfer defineProperty（A 面既有 degrade 钉同法），修复后变异恰红复验。

Exit Criteria:

- [x] 三旧函数 grep 归零；四包套件同绿；ui index diff=+1 导出。
  - grep（packages/apps/tests，排除 dist/node_modules）：`setPaletteDragGhost`/`setFieldDragGhost`/`setScadaPaletteDragGhost` 代码引用零命中（仅历史考古注释+陈旧生成物 .turbo/coverage 残留，非源码）。
  - 四包门禁全绿：typecheck ×4 OK/build ×4 OK/lint ×4 OK/test=ui 71 files/352 tests+page 22/175+report 22/216+industrial 152/1721。
  - knip `check:knip-baseline`：本批路径零命中（`DragGhostOptions` unused-export 命中已以不导出消除）；余 3 命中均并行在途非本批路径[非归因：`flux-guide/scripts/validate-pages-setup-docs-components.mjs` 与 `flux-react/src/schema-diagnostics-reporter.ts` 均 `??` untracked=并行会话文件；`flux-renderers-form/.../form-load-action.ts#FormLoadState`=plan 593 域、HEAD 4d947532c 提交信息已登记为并行未提交项]。
  - 全仓五门禁未跑（编排者隔离 worktree 承载，per 指令）。

### Phase 3 - 回写与收口

Status: done（2026-10-14：台账 WA-reportr-003 verified[220=found 57+verified 163/未处置 0]；roadmap CX-17 done；dev log 10-14；隔离五门禁=4 绿+check 继承 CX-16 披露部分[审计员裁定 INHERITED+独立再证]；closure audit agent_65f3f9b1 R1 approved[0B/0M/2m 证据线修正已履行]后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 WA-reportr-003 verified；roadmap CX-17 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] `pnpm workaround:reconcile`（scripts/workaround-audit/reconcile-coverage.ts）exit 0；closure audit approved。（closure audit agent_65f3f9b1 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_669fe528-5fd6-42cd-99cd-be8d570aeffa，review-only）
- Verdict: R1 `fail`（0B/3M/3m）→全修；R2 `pass`（0B/0M/0m）
- Rounds: 2
- Findings addressed: **M1** 台账 ID 勘误 ×2（WA-reportr-**003** 非 001[001=cellAddress 已 verified]）；**M2** 「三消费包不依赖 flux-react」失实勘误[三者均声明依赖 page:20/report:23/industrial:33]→真拒因=层级+刻意 React-free；**M3** style 参数=cssText 字符串禁变体枚举[PD tokens 在 ui 上方不可导入，枚举=新漂移向量]+交付签名（共享不变式清单+统一 try/catch=同步 remove+B 派语义+label 消费侧组合+三面逐字节保形映射：A 传 PD cssText 含 gap/C 传 hsl+surface+14,10/B 缺省）；**m1** reconcile 命令具名；**m2** 漂移表补 gap:6px；**m3** 披露部分通过增非归因证明条件[红须在无本批路径同钉 HEAD 复现]。R1 verified-clean：三份位点+try/catch :38-44（同步 remove 语义）+漂移表全维+消费者三位点+测试覆盖（C 3/页部分/B 零+catch 分支全仓零覆盖）/考古链时刻/scheduling 排外[路径勘误 src/calendar/calendar.tsx]/setDragImage 全仓恰三份/ui lib 先例+selective 反例/flux-core 零 document/designer-shared 缺失/人工门四要素/模板合规。

## Closure Gates

- [x] setDragGhost 落地+三旧函数删除+report 零覆盖补齐
- [x] 行为保持+防御增强判别（特征化同绿+throw 环境红→绿+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_65f3f9b1 R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx17-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——check 继承 CX-16 披露部分并经审计员独立再证[oversized 红=并行已提交 data 文件 708/706，非归因结构性成立；其余子门禁全绿]；新文件 git add -N）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- scheduling 跟随光标 ghost 与本原语的关系（不同问题域，注记保持）。
- 视觉样式三形统一（视觉域，successor）。

## Closure

Status Note: 2026-10-14 收口。setDragGhost（ui lib，R1 M3 交付签名，style=cssText 字符串）落地，三消费者改引+三旧函数删除，testid 逐字保持（e2e 免改）；**report ghost 单测=全仓首覆盖**（含 try/catch 分支钉）；统一防御=申报增强（A/C 裸调用 throw 环境未捕获→降级，判别红→绿+两组变异外科手术式恢复+审计员以终态字节重跑恰红→逐字节恢复）；两项环境发现落字（React19+happy-dom 异常捕获面/fireEvent DataTransfer 合并）；check 门=继承 CX-16 披露部分+审计员独立再证；实施=派驻 agent，本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_65f3f9b1-cd80-427d-a53e-a0b847fee07b，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/2m——m1=证据线 sha256 版本漂移注记[已履行：终态 274b34c8… 由审计员终态字节重跑两组变异恰红并逐字节恢复]/m2=「恰 4 红」scope 依赖口径修正[整包第 5 红=payload 级联，已落字]）
- Findings addressed: 审计员逐项对账（签名逐项+三面 cssText/testid/label 对 `git show HEAD:` 旧源逐字节映射+ui index +1+删除完整+grep 零引用+report 首覆盖真实性含 catch 分支[HEAD git grep 证零前覆盖]+防御增强真实性[旧 A/C 裸调用/旧 B try-catch]+react 19.2.4 安装与 window-error 可观测面适配核验）+**亲判**（删统一 try/catch→四面包各 1 红+payload 级联第 5 红[整包 scope]→sha256 274b34c8… 前后一致逐字节恢复→四包全绿）+披露部分=INHERITED 裁定+独立再证（cx17-verify worktree git status=HEAD+恰 12 路径；红源结构性与 CX-16 同源+knip 3 外来命中逐一对账）+10 现存路径两树逐字节核验。

Follow-up:

- scheduling 跟随光标 ghost 与本原语关系（不同问题域，注记保持）。
- 视觉样式三形统一（视觉域，successor）。
