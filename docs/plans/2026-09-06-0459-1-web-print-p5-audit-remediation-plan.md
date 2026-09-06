# Web Print P5 — 深审缺陷修复（审计驱动收口）

> Plan Status: completed
> Last Reviewed: 2026-09-06
> Source: `docs/analysis/2026-09-06-web-print-deep-audit/code-dimensions.md`（26 项）、`docs/analysis/2026-09-06-web-print-deep-audit/docs-dimensions.md`（20 项）
> Related: 前置 plan `2026-09-06-0426-1-web-print-p4-playground-e2e-plan.md`（completed）；web-print mission roadmap 五 Phase 已闭环，本计划为审计驱动的独立 remediation owner plan（plan guide Rule 25：审计发现合并收口），不新增 roadmap Phase
> 方法: 用户指令"先用单元测试验证问题确实存在，然后修复"——全部代码缺陷以红测先行（Proof → Fix）

## Purpose

收口 web-print 两份深度审核报告的高优先发现：修复分页/渲染数学的 1 个 P0（打印数据丢失）与 3 个 P1（页底孤行/锚定错误/聚合行不可见），补齐"error 诊断阻断打印"契约闸门，修复打印竞态/id 撞号/注入通道/预览重复绑定等 P2，同步 design.md 全部漂移与文档登记。完成后 web-print 交付达到自洽可用状态。

## Current Baseline

- P0–P4 mission 闭环：core 70/70、renderers 69/69、playground 347/347、全仓 72/72 task、typecheck/build/lint 39/39、e2e 1455 passed/0 failed/1 flaky。
- 深审发现（两报告共 46 项）已落盘 `docs/analysis/2026-09-06-web-print-deep-audit/`；其中 P0×1、P1×4（代码 3 + 文档 1）为本计划必修；P2 择高收入（见 In Scope），其余 P2/P3 留原报告为 watch-only。
- 关键缺陷（审计已用数值探针实证）：
  - **D21-04 (P0)** render-html 表格行不设 tr 高度/td 字号（浏览器默认 16px ≈ 7.4mm > 排版 6-7mm），`.fmt-el` overflow:hidden 裁掉满页切片底部行 → 打印数据丢失；
  - **D21-01 (P1)** 跨页表格后普通元素 `targetTopAbs = baseTop + shift` 跨页不重锚定 → 被钉到新页页底（探针：落 267 而非紧跟表格 ≈176）；
  - **D21-02 (P1)** 新页表格起点取页底值 → 强保一行产出页底孤行、切片越界 11mm 侵入页脚；
  - **D21-03 (P1)** placedHeight 不含聚合行高 → tfoot 恒在 frame 外被裁，footerAggregate 三通道不可见；
  - **文档 P1** design.md §10 "error 级阻断打印"未实现（print/export 不消费 validate 诊断）。
- 其余审计 P2（本计划收入）：print.ts srcdoc 加载前同步 print 的空白打印竞态；元素 id 计数器与载入模板不同步（撞号→auto-commit 静默失败）；style 属性/qrcode foreground CSS/属性注入通道；预览诊断重复 + 4 次重复 bind；bind 非 syntax 错误误报 PRINT_BIND_SYNTAX；设计器列宽/对齐/zebra/fontFamily/边框/水印/paperName 打印态静默丢弃（含 P2 plan 漏勾的纸张预设）。
- 文档漂移（docs 审计）：design.md §3 模块清单缺文件、§4.2 缺 autoGrow、§7 PrintBackend 零存在、§8 Zustand 声称失实、§10 warning 归属、§5 dataSchema 记法；docs/index.md 未登记 web-print 三文档；editor-core.md 未记录 dispose 生命周期分歧；research §3 被推翻无注记。
- 全部文件与行号证据见两份深审报告（附录 A 格式）。

## Goals

- 分页/渲染数学闭环：渲染行高与排版行高一致（tr 高度 + td 字号显式化），切片不裁行；跨页后元素锚定跟随流式游标；强保一行不越界；聚合行落在 frame 内可见。
- 打印契约闸门：print/export 前置 `validatePrintTemplate`，error 级诊断拒绝并抛 `PRINT_VALIDATION_BLOCKED`（可配置关闭）。
- P2 修复：print 等 iframe load 后再 print；元素 id 计数器从载入模板播种；style/qrcode 值 CSS/属性消毒；预览单次 bind + 诊断去重；bind 错误分类精确化；inspector 补 paperName 预设；设计器字段打印态补齐（列宽/对齐/zebra/fontFamily/边框/水印/方向）。
- 文档收口：design.md 全部漂移修正（含 §7 PrintBackend 改为现实链路描述）、docs/index.md 登记、editor-core.md 生命周期分歧记录、research §3 注记。
- 全部修复以先红后绿的单测锁定；全仓四项验证 + print e2e 全绿。

## Non-Goals

- 不做矢量 PDF、静默打印、富文本、二级表头、groupBy（能力增强归后续计划，非缺陷修复）。
- 不重构 editor-core dispose 机制（仅文档记录分歧与现有裁定）。
- 不处理深审报告中未列入 In Scope 的 P2/P3（保留原报告为 watch-only 清单）。

## Scope

### In Scope

- `packages/flux-print-core/src/`：layout.ts（锚定/越界/聚合行高）、render-html.ts（tr 高度/td 字号/列宽/对齐/zebra/字体/边框/水印/方向）、bind.ts（错误分类）、print.ts（load 等待 + 校验闸门）、export-pdf.ts（校验闸门）、print-preview/print-designer 协同（预览单次绑定）；对应测试。
- `packages/flux-print-renderers/src/`：print-inspector（paperName 预设 + 边框输入）；use-print-editor（id 播种）；schemas.ts（id 计数器播种）；print-preview（诊断去重）。
- `packages/flux-print-core/src/barcode.ts`（createQrcodeSvg foreground 属性转义 chokepoint）。
- `docs/analysis/2026-09-06-web-print-deep-audit/red-verification.md`（红测验证记录，Phase 1 产出）。
- 文档：`docs/components/print/design.md`（漂移修正）、`docs/index.md`（登记）、`docs/architecture/editor-core.md`（生命周期分歧注记）、`docs/analysis/web-print-research.md`（§3 注记）。
- `docs/logs/` 记录。

### Out Of Scope

- 深审报告未列入的 P2/P3、新能力、editor-core 重构。

## Failure Paths

| 可测场景编号        | 触发                                         | 行为                                                           | 可重试 | 用户可见表现                    |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------- | ------ | ------------------------------- |
| f-validate-block    | 打印/导出时模板存在 error 级诊断             | 抛 `PRINT_VALIDATION_BLOCKED`（携带诊断摘要），不进入打印/导出 | 是     | 失败提示（demo 行内提示已就绪） |
| f-validate-skip     | options.validate = false                     | 跳过校验闸门，按原链路输出                                     | 是     | 按原行为                        |
| f-id-collision      | 载入含 text_1 的模板后点击 palette 添加 text | 新 id 不与存量冲突，添加成功且可 undo                          | 是     | 正常添加                        |
| f-row-clip          | 满页表格切片（行数×行高=片高）               | 渲染后每行完整可见（tr 高度=排版行高），无行被裁               | 是     | 数据完整                        |
| f-aggregate-visible | footerAggregate≠none                         | 聚合行落在末片 frame 高度内                                    | 是     | 合计行可见                      |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化` —— 用户指令即"先用单元测试验证问题确实存在，然后修复"：Phase 1 全部 Proof 项先红（逐条展示失败输出），Phase 2 修复后转绿；真机行可见性以 print e2e 增补断言收口。

## Execution Plan

### Phase 1 - 红测：证明审计缺陷真实存在

Status: completed
Targets: `packages/flux-print-core/src/{layout.test.ts, render-html.test.ts, bind.test.ts, print.test.ts, export-pdf.test.ts}`、`packages/flux-print-renderers/src/{editor/use-print-editor.test.ts, print-preview.test.tsx（新建）, print-inspector.test.tsx}`

- Item Types: `Proof`

- [x] 红测①D21-04：满页切片（如 23 行×7mm=161+表头）渲染后，断言 tr 元素带显式 `height` 行高样式且 td 带字号样式——当前缺失必红；并断言切片行数 = 布局行数（渲染不裁行）
- [x] 红测②D21-01：40 行表格（**fixture 显式 `footerAggregate: 'none'`**，避免聚合行余量干扰断言）+ 下方 top:100 文本，断言文本落在表格末片所在页且 pageTop ≤ 末片底（当前实现 restarted = max(baseTop+shift, cursorY) = 496 → clipped 到 267 钉底必红）
- [x] 红测③D21-02：**显式 fixture** 两张 15 行表格（tb2.baseTop=120，rowHeight=10），断言**全称不变式**——所有表格切片满足 `pageTop + pageHeight ≤ contentBottom(277)`（当前强保片 272+16=288 违例必红）；并加一条「tb2 续排首片 pageTop = contentRect.top」锁定修复语义（round-2 Major-B：修复生效后强保分支消失，存在性断言会空真，必须全称不变式）
- [x] 红测④D21-03：footerAggregate=lastPage 的末片 placedHeight 含聚合行高（当前 56 不含 62 必红）
- [x] 红测⑤文档 P1：printPrintTemplate/exportPrintTemplateToPdf 遇 error 级诊断模板抛 `PRINT_VALIDATION_BLOCKED`（当前正常打印必红）；validate=false 跳过
- [x] 红测⑥P2 组（分文件落点）：print 等 load 后再 print（当前同步调用必红，print.test.ts）；id 播种（载入含 text_1 模板后添加新 text，use-print-editor.test.ts 断言新 id 不冲突——当前必红）；bind exec 段错误 → PRINT_BIND_EVAL（table source 运行期抛错构造，bind.test.ts）；render-html style 属性注入（color 值含 `;}` 被消毒）与 qrcode foreground 属性转义（render-html.test.ts 承载，当前必红）；预览诊断同 code 不重复（print-preview.test.tsx 新建，当前诊断重复必红）
- [x] 逐条运行并记录红输出（证明问题存在），将红测清单与失败摘要写入 `docs/analysis/2026-09-06-web-print-deep-audit/red-verification.md`（12/12 红实证；修复后同批用例全部转绿为回归测试）

Exit Criteria:

- [x] 全部红测存在且确认红（失败原因与审计结论一致），红测记录文件落盘
- [x] 既有用例不受红测影响（存量套件仍绿）

### Phase 2 - 修复：分页数学、闸门与 P2 批

Status: completed
Targets: `packages/flux-print-core/src/*`、`packages/flux-print-renderers/src/{print-inspector.tsx, use-print-editor.ts, print-preview.tsx}`

- Item Types: `Fix | Proof`

- [x] 修 D21-04：render-html 表格 tr 显式 `height:${rowHeightMm}mm`（layout 在 PlacedElement 补 `rowHeightMm` 元数据）、td 字号/行高**按片推导**而非静态缺省：`rowPx = rowHeightMm × 3.7795`，`fontSize = max(8, min(style.fontSize ?? 12, (rowPx − 2×paddingPx − borderPx) / (lineHeight ?? 1.1)))`，`.fmt-td` 收紧预算 `line-height:1.1; padding:0.4mm 2mm`（内容预算 ≈4.55mm ≤ 5mm——覆盖 80mm 小票 rowHeight=5、estimate 6mm 与 A4 7mm 全部场景；round-2 Major-A：静态 12px 缺省 6.08mm > 5mm，关不掉自带小票模板）；切片容器总高 = 片高且不裁内容（thead/tbody/tfoot 总高 = 片高）。红测①的红性只来自样式断言（happy-dom 观测不到 overflow 裁行，真机闭合靠 Phase 3 e2e 数值判据：实测行高 ≤ 排版行高 + 容差）
- [x] 修 D21-01（翻页前先试流式锚点，review round-1 B-1 方案）：溢出分支内先判 `if (cursorY + item.height <= contentBottom) { place(pageTop=cursorY); cursorY += h; continue; }`——同页放得下就跟随流式游标（表格末片之后），放不下才翻页且新页落 contentRect.top；同页语义仍由 startY 尊重 baseTop+shift（规则 3 不受影响）。已对既有 15 用例逐一仿真：⑩ 转绿、⑪ 无 measure 子例不变、⑦ 不走此分支
- [x] 修 D21-02（review M-1 方案）：「本表未因翻页重启」才尊重 targetTopAbs；**翻页后续排首片 start = contentRect.top**（整表从新页顶流排，孤行与越界同时消除）；强保一行仅保留给 infeasible 场景（rowHeightMm > 本页可用高，即 p-table-oversize/p-zero-loop 语义）；红测③转绿（防孤行翻页后 ⑦ 的 start 由 260 变 20，断言仍绿）
- [x] 修 D21-03：聚合行高计入片高——`avail` 预扣（everyPage 恒扣；lastPage 仅本片将尽时扣——**将尽判定以 `floor((avail − aggregateHeightMm)/rowHeightMm)` 对比剩余行数**，否则 25 行×10mm 在 251 可用高时末片 262 > 277），placedHeight 相应含之；layout.ts 现有的 `cursorY += aggregateHeightMm` 仅在片高未含聚合时保留（everyPage 计入后跳过，防双记）；render-html 聚合行落在片高内。**连带：既有用例 ③ 的片高算术断言（`片高−6` 能否被 10 整除）绑定了旧契约，需同步修订为新算术（末片含聚合行高），属正当更新非断言弱化**；红测④转绿
- [x] 修文档 P1 红测⑤：print/export 前置 validate（error 级抛 `PRINT_VALIDATION_BLOCKED`；`validate:false` 跳过）；demo 无需改动（行内提示已捕获）
- [x] 修 P2 批：print **无条件等 iframe `load` 事件**（once）后再 printFrame，同步快速路径仅保留 `typeof document === 'undefined'` 环境守卫（同步判定即竞态本体）；use-print-editor 创建时从模板存量 id 播种计数器；bind 错误分类改**位置判别**（review B-2：flux-formula 的 FormulaSyntaxError 是纯 type interface，运行时 name 恒为 'Error'，name 判别永假）——interpolate 已有 compile/exec 两段 try，catch 改带 `error.message` 拼入诊断，compile 段 → PRINT_BIND_SYNTAX、exec 段 → PRINT_BIND_EVAL，table source 同样拆 compile/exec 两段 try；render-html 增加 `cssSafe()` 消毒 style 值与 qrcode foreground（属性上下文转义，chokepoint 在 barcode.ts 的 createQrcodeSvg）
- [x] Proof（先行，与红测⑥同批）：render-html 输出断言——列宽/align/zebra/fontFamily/边框/水印/landscape @page 当前缺失必红；print-inspector paperName 预设下拉当前缺失必红
- [x] 设计器打印态字段补齐：render-html 表格列宽（col 宽度）、列 align、zebra 斑马纹、fontFamily、rect/line 边框色与粗细（style.borderColor/borderWidth）、watermark（页面级半透明文字层）、paper.direction（landscape 时 @page 交换宽高）；inspector 补 paperName 预设下拉（PAPER_SIZE_PRESETS + custom）与 StyleSection 边框输入（borderWidth/borderColor——否则边框输出为死代码）
- [x] 返修 print.test.ts 同步契约用例（`toHaveBeenCalledTimes(1)` 改为 load 契约 + 「未 load 不得 print」反向断言——旧断言绑定竞态行为，属正当更新）
- [x] 全部红测转绿；`pnpm --filter @nop-chaos/flux-print-core test` 与 `--filter @nop-chaos/flux-print-renderers test` 全绿；typecheck 通过

Exit Criteria:

- [x] Phase 1 红测全部转绿且无断言弱化（不得删除/放松红测断言）
- [x] 两包测试全绿；typecheck 通过

### Phase 3 - 文档收口与真机断言

Status: completed
Targets: `docs/components/print/design.md`、`docs/index.md`、`docs/architecture/editor-core.md`、`docs/analysis/web-print-research.md`

- Item Types: `Fix | Proof`

- [x] design.md 漂移修正（docs 审计清单）：§3 renderers 清单补 print-designer.tsx 与 editor/；§4.2 text 行补 autoGrow；§5 dataSchema 记法修正；§7 删除 PrintBackend 声称改为现实链路（renderPrintTemplateToHtml → printPrintTemplate/exportPrintTemplateToPdf）；§8 Zustand 表述改为 editor-core 会话；§10 warning 归属改 bind、补 PRINT_VALIDATION_BLOCKED 闸门；§10 诊断码清单与实现同步
- [x] docs/index.md 登记 `docs/components/print/design.md` 与 `docs/analysis/web-print-research.md`；`docs/architecture/editor-core.md` 补"StrictMode 下不可在 effect 中 dispose"生命周期注记；research §3 追加"RendererComponentProps 同契约"已被 P1 裁定推翻的注记
- [x] e2e 增补：预览 iframe 内断言表格行可见性（真实 Chromium 中行高闭合——D21-04 真机验证）与聚合行文本可见（D21-03 真机验证）
- [x] 全量验证：`pnpm test`、`pnpm typecheck`、`pnpm build`、`turbo run lint --force`、`pnpm test:e2e`、`pnpm check`（基线比对口径同 P1–P4）
- [x] `docs/logs/` 记录 P5 收口（执行当日）

Exit Criteria:

- [x] design.md 与 live 代码逐节一致（无已知漂移残留）；docs/index.md 含 web-print 文档条目
- [x] e2e 增补断言全绿；全量验证通过并记录
- [x] `docs/logs/` 已记录 P5 收口

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_8b9db808-8eeb-4354-91e5-b21fb8f6f445）
- Verdict: `pass`（round 1 fail：2 Blocker + 6 Major；round 2 fail：2 Major + 6 Minor；round 3 确认 pass）
- Rounds: 3
- Findings addressed:
  - Round 1 B-1（D21-01 修复公式与 ensurePage cursorY 重置互斥，红测②无法转绿）→ 改「翻页前先试流式锚点」；红测② fixture 显式 footerAggregate:'none'
  - Round 1 B-2（FormulaSyntaxError name 判别永假）→ 改 compile/exec 位置判别 + error.message 透传；红测⑥ EVAL 用 table source exec 抛错构造
  - Round 1 M-1（clamp 打破 oversize 且不修孤行）→ 采审计方案：翻页续排首片 start=contentRect.top，强保一行仅 infeasible
  - Round 1 M-2（聚合行高语义未定义+双记）→ avail 预扣 + placedHeight 含之 + 防双记；用例 ③ 算术修订列为正当更新
  - Round 1 M-3 → td 字号/行高按片推导（round 2 升级为覆盖 rowHeight=5 小票）
  - Round 1 M-4/M-5/M-6（红测落点/print load 无条件等待/print.test 返修/In Scope 漏件）→ 全部落实
  - Round 2 Major-A（静态缺省字号关不掉 rowHeight=5 小票）→ td 字号/行高按 rowHeightMm 推导 + .fmt-td 预算收紧 ≈4.55mm；e2e 增补小票场景
  - Round 2 Major-B（红测③存在性断言在修复后空真）→ 改全称不变式 + 显式 fixture 参数 + 续排首片语义断言
  - Round 2 minors 1–6 → 全部落实

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（红测→绿全程可追溯；closure audit 做了变异验证：逐一回退修复后红测全部转红）
- [x] 所有 in-scope confirmed contract drifts 已收敛（design.md 与 live 逐节一致，round-3 1:1 对照 live 树实证）
- [x] 行为/契约结果已达成（Failure Paths f-\* 5 场景有测试证明，含 round-2 补的 validate:false 用例）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（design.md §3/§7 与 live 树 1:1，round-3 确认）
- [x] `docs/logs/` 已记录 P5 收口（docs/logs/2026/09-06.md P5 三段）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_177ddbb1 三轮 + agent_4dc856f4 复审终审 approved）
- [x] `pnpm typecheck`（39/39）
- [x] `pnpm build`（39/39）
- [x] `pnpm lint`（turbo lint --force 39/39）
- [x] `pnpm test`（72/72 task；core 82/82、renderers 72/72）
- [x] `pnpm test:e2e`（print spec 8/8 于 P5 验证轮实跑；全量 1455 passed/0 failed 记录于 P4 轮）
- [x] `pnpm check`（零新增红项：check:i18n-keys ❌ 与基线逐条一致——F1 修复后 borderWidth/borderColor 已定义，unused=284=基线；其余门禁 exit 0）

## Deferred But Adjudicated

### 深审报告未列入 In Scope 的 P2/P3（约 20 项）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 两份深审报告本体即为完整 watch-only 清单（含逐条严重度/建议）；本计划已收入全部 P0/P1 与高影响 P2，其余为边缘场景或维护性项，逐条修复 ROI 不足。
- Successor Required: `no`（报告路径即归属；后续可按需单开计划）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-09-06 收口。深审报告（46 项发现）中的全部 P0/P1 与高影响 P2 已修复并有三轮独立审计背书：D21-04 (P0) 行高闭环（tr 高度 + td/th 字号按片推导，预算覆盖 rowHeight=5 小票）、D21-01/02/03 (P1) 流式锚点/防孤行重锚定/聚合行可见、文档 P1 打印校验闸门（PRINT_VALIDATION_BLOCKED，validate:false 可跳过并有用例）、P2 批（打印 load 竞态/id 播种/注入消毒/预览诊断去重/bind 错误分类/设计器打印态字段/纸张预设）。红测先行全程可追溯（12 条红测 → 全部转绿；审计员做过变异验证确认断言真锁定缺陷）。最终：core 82/82、renderers 72/72、全仓 72/72 task、typecheck/build/lint 39/39、i18n 基线一致零新增。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_177ddbb1-b9d5-4986-99e1-fab159b374db 三轮审计 + agent_4dc856f4-72b3-4286-97cf-a096e4745e28 复审终审 approved）
- Evidence: round-1 实跑全部验证并做变异验证（回退修复→红测转红→恢复→byte-exact 复绿），驱出 F1 i18n 新增红（硬门禁）、F4 source compile/exec 未拆、F5 skip 无覆盖、F2/M1 文本-代码漂移；round-2 实证 F1/F3/F4/F5/M3/M4/M5 全部 PASS、F2/M1 未落盘（批量替换静默漏改）；round-3 live grep 终审 F2 §3 清单与 live 树 1:1、M1 compileMessage 透传 + 新断言双落实。修复记录见 docs/logs/2026/09-06.md 续 3 段。

Follow-up:

- no remaining plan-owned work。深审报告未列入 In Scope 的 P2/P3（约 20 项）保留于 `docs/analysis/2026-09-06-web-print-deep-audit/` 作 watch-only 清单；能力增强（measure 真机注入、富文本、二级表头、groupBy、静默打印、矢量 PDF）归后续计划。
