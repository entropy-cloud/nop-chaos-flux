# Web Print P3 — 打印渲染器

> Plan Status: completed
> Last Reviewed: 2026-09-06
> Source: `docs/backlog/web-print-roadmap.md`（P3.1–P3.4）、`docs/components/print/design.md`（§4.3/§6/§7/§11）、`docs/analysis/web-print-research.md`（分页/输出通道结论）
> Related: 前置 plan `2026-09-06-0109-1-web-print-p2-designer-plan.md`（completed，含"预览升级为分页同源"义务）、`2026-09-05-2352-1-web-print-p1-infrastructure-plan.md`（completed，bind/unit 输入契约）

## Purpose

收口 roadmap P3 全部 4 个工作项：实现分页引擎（P3.4 的分页语义 + 表格聚合分组）、HTML 渲染器（P3.1，模板+数据→分页 HTML）、浏览器打印（P3.2）、PDF 导出（P3.3，html2canvas+jspdf），并将 P2 遗留的单页预览升级为分页同源预览。交付后，`renderPrintTemplateToHtml(template, data)` 产出可直接打印的自包含分页 HTML，`printPrintTemplate`/`exportPrintTemplateToPdf` 两条输出通道可用。

## Current Baseline

- P1/P2 已收口：`flux-print-core` 具备 `bindPrintTemplate`（`BoundPrintElement{text,boundRows,value,src}` + 列格式化）、`unit.ts`（getContentRect/getRegionRect/mmToPx）、`validatePrintTemplate`；`flux-print-renderers` 的 `print-preview.tsx` 是单页绑定视图（P2 Non-Blocking Follow-up 义务：升级为 design.md §8 分页同源预览）。
- 分页算法结论（调研，design.md §6）：游标式逐元素分发（hiprint，MIT）+ 表格逐行实测 + autoGrow 文本二分切分 + 防孤行/防死循环（MAX_PAGES=500）；header/footer 区元素与 pageNumber 每页重复。
- 测量约束：分页需要行高；DOM 实测（hiprint 路线）在真实浏览器可用，happy-dom 测试环境无真实布局（offsetHeight=0）——分页引擎必须支持 schema `rowHeight`/估算值驱动的纯几何切片路径（可测），DOM 实测作为运行时增强（`measure` 可注入）。
- 输出通道（design.md §7）：iframe srcdoc + `@page` + `contentWindow.print()`；PDF v1 位图（html2canvas 逐页 + jspdf）；`PrintBackend` 接口位保留。仓库先例：calendar export（html2canvas+window.print）、word-editor 打印按钮。
- 依赖现状：`jsbarcode` 未安装（全仓零命中）；`jspdf@^2.5.2` 已由 flux-renderers-scheduling 声明安装（其 src 未引用，仅 optional-peer 豁免——不构成使用先例）；`html2canvas@^1.4.1`、`qrcode@^1.5.4` 已在仓库使用；P1 audit 同时裁定 flux-print-core 的 manifest 依赖必须被 src 引用（本 Phase 新增依赖均有对应实现文件）。
- 全仓基线：test 71/71、typecheck/build/lint 39/39、新包 print-renderers 69/69、print-core 36/36；`check:i18n-keys` 基线既有红（❌ 4 undefined 与主工作树一致，unused=284）。

## Goals

- `flux-print-core` 新增：
  - `barcode.ts`：`createBarcodeSvg(value, options)`（jsbarcode → SVG 标记串，供 HTML 渲染复用）；
  - `layout.ts`：`layoutPrintTemplate(template, data, options?): {pages, diagnostics}`（bind 内置，纯几何分页 + 可注入 `measure` 行高实测）；
  - `render-html.ts`：`renderPrintTemplateToHtml(template, data)` = bind → layout → 自包含 HTML（`fmt-*` 类名空间、内联样式、`@page` 纸张尺寸、页间 page-break、表格每页重复表头、条码/二维码 SVG 内嵌）；
  - `print.ts`：`printPrintTemplate(template, data, options?)`（隐藏 iframe srcdoc + `contentWindow.print()`）；
  - `export-pdf.ts`：`exportPrintTemplateToPdf(template, data, fileName?)`（逐页 html2canvas 位图 + jspdf 合成下载）。
- `flux-print-renderers`：`print-preview.tsx` 升级为分页同源预览（调 `renderPrintTemplateToHtml` 输出到 iframe srcdoc，保留 bind/validate 诊断面板）。
- 分页语义（design.md §6 全量）：header/footer 每页重复 + `$page/$pages` 真实注入；body 游标分发；表格行级切割 + repeatHeader + footerAggregate（lastPage/everyPage，聚合值 sum/count/avg/min/max）；autoGrow 文本二分切分；MAX_PAGES=500、防孤行、防死循环。

## Non-Goals

- 不做矢量 PDF、服务端渲染、静默打印客户端（PrintBackend 扩展位保留）。
- 不做多级表头（二维 columns）、标签拼版（labelGrid）、richText、groupBy 多组分组（design.md §4.2 v2 预留）。
- 不改动 P1/P2 已收口的行为面（bind 校验语义、设计器交互）；发现契约偏差须回写 design.md 并记录。
- 不做 playground 演示页与 e2e（P4）。

## Scope

### In Scope

- `packages/flux-print-core/`：新增 `src/{barcode.ts, layout.ts, render-html.ts, print.ts, export-pdf.ts}` + `*.test.ts`；`package.json` 新增 `jsbarcode`、`html2canvas`、`jspdf`、`qrcode` 依赖（均有引用）；`src/index.ts` 导出更新。
- `packages/flux-print-renderers/`：`print-preview.tsx` 分页同源升级 + 测试更新。
- `docs/logs/` 记录。

### Out Of Scope

- 设计器交互变更、P4 playground/e2e、v2 元素类型、矢量/服务端输出。

## Failure Paths

| 可测场景编号     | 触发                                  | 行为（含诊断/返回）                                            | 可重试 | 用户可见表现                |
| ---------------- | ------------------------------------- | -------------------------------------------------------------- | ------ | --------------------------- |
| p-table-oversize | 单行高度超过整页内容区高              | 该行独占一页并按内容截断（clip），不死循环                     | 是     | 行内容被裁切                |
| p-page-limit     | 分页超过 MAX_PAGES=500                | 停止分页，输出已有页 + warning 诊断（PRINT_LAYOUT_PAGE_LIMIT） | 是     | 预览显示 500 页上限提示     |
| p-orphan-row     | 表格首行放不进当前页且当前页已有内容  | 整表移到新页（防孤行）                                         | 是     | 表格从新页开始              |
| p-zero-loop      | 切点为 0 且已在页顶（行高异常）       | 强制保留至少一行推进游标（防死循环）                           | 是     | 正常出页                    |
| print-blocked    | 浏览器拦截 iframe print / 无 DOM 环境 | printPrintTemplate 抛出带原因的 Error（调用方可提示）          | 是     | 打印失败提示（P4 演示接入） |
| pdf-empty        | 模板渲染出 0 页                       | exportPrintTemplateToPdf 抛 Error（EXPORT_EMPTY）              | 是     | 导出失败提示                |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化` —— 分页引擎与 HTML 渲染是打印体系的公共契约（P4 e2e 与所有输出通道依赖其确定性），Proof 项先于或伴随 Fix 项；输出通道（print/export-pdf）以依赖注入/mock 驱动的单测固化链路。

## Execution Plan

### Phase 1 - 分页引擎 layout.ts（P3.4 分页语义）

Status: completed
Targets: `packages/flux-print-core/src/{layout.ts, layout.test.ts}`、`package.json`

- Item Types: `Proof | Fix`

- [x] `src/layout.ts`：`PlacedElement`（页内绝对定位 mm + bound 字段）、`PrintLayoutPage`（design.md §6 形状：pageIndex/pageSize/header/footer/body/pageNumberToken）、`LayoutOptions {measureRowHeight?, maxPages?}`；**签名 `layoutPrintTemplate(template, data, options): {pages, diagnostics}`**——bindPrintTemplate 在 layout 内部调用（design.md §5 纯函数契约：输入是原始模板+数据）；header/footer/pageNumber 的 `${$page}/${$pages}` 由 layout 在分页完成后按页局部重插值（pageNumber 的 format 与 header/footer 区 text 元素），body 元素内容不依赖页变量（P1 bind 一次性解析）
- [x] 分页算法：body 元素按 top 排序游标分发（普通元素放不下整体移下页）；header/footer/pageNumber 每页重复 + `$page/$pages` 按页真实重插值；表格 rowHeight 驱动逐行几何切割 + repeatHeader + footerAggregate 聚合行（sum/count/avg/min/max，按列 format 输出）；**流式元素膨胀下移（design.md §6 规则 3）**：表格先按行高总和计算膨胀量，其下方 top 更大的元素按原间距整体下移（跨页落到对应页）；autoGrow 文本二分切分（基于 measure 注入的行高）；MAX_PAGES=500 + 防孤行 + 页顶强保一行；**行高回退规则（Decision）**：table 无 rowHeight 时先取注入 measure 的实测值，无 measure（如 node 测试环境）回退固定估算常量 `ESTIMATE_ROW_HEIGHT_MM = 6`——design.md §4.3 缺省语义与 §12 策略按此回写。**裁定（与 §12 一致）**：v1 交付为估算回退 + measure 可注入扩展点，内置 print/export/preview 链路不自动注入，宿主/真机链路可自行构造隐藏容器经 options 注入
- [x] 本 Phase 无新增依赖（layout 纯逻辑复用既有 deps）
- [x] Proof（先行）：`layout.test.ts`——①单页模板页数 1；②多页表格（rowHeight 累计超页）页数与每页行数；③repeatHeader 每页表头；④footerAggregate lastPage/everyPage 聚合值正确；⑤header/footer 元素每页出现；⑥$page/$pages 按页注入；⑦防孤行；⑧MAX_PAGES 上限触发 warning；⑨区域坐标转页内绝对坐标；⑩规则 3：表格下方的普通元素随膨胀整体下移并落到对应页；⑪autoGrow 文本二分切分（注入 stub measure 断言切分点与后半段续排页）；并声明：无 measure 时 autoGrow 不切分（整体移下页）

Exit Criteria:

- [x] `layoutPrintTemplate` 实现且 `layout.test.ts` 覆盖上列 11 类场景全绿（15 用例）
- [x] `pnpm --filter @nop-chaos/flux-print-core test` 全绿；typecheck 通过

### Phase 2 - HTML 渲染器 render-html.ts + 条码（P3.1）

Status: completed
Targets: `packages/flux-print-core/src/{barcode.ts, render-html.ts}`、`package.json` + 对应测试

- Item Types: `Proof | Fix`

- [x] Proof（先行）：`render-html.test.ts`（**per-file pragma `// @vitest-environment happy-dom`**——条码内嵌走 createBarcodeSvg 需 DOM；barcode 用例同落此文件，执行期合并文件布局）——文档结构。happy-dom 下 jsbarcode 内部失败（SVGElement.style=null）→ 契约断言为“不抛错+空串降级”，`<svg` 真机断言归 P4 e2e（doctype/@page 尺寸/页数）、元素定位样式断言、表格每页 thead、条码/二维码 SVG 内嵌、文本转义（`<script>` 值不产生可执行节点）、含中文内容渲染；
- [x] `package.json` 声明 `jsbarcode` + `qrcode`（+ devDeps `@types/qrcode`）并 `pnpm install`（本 Phase 起被 barcode.ts/render-html.ts 引用，manifest-deps 硬门禁要求 declared 即 referenced）
- [x] `src/barcode.ts`：`createBarcodeSvg(value, {format, textVisible})`——jsbarcode 渲染到 SVG 元素后序列化为标记串（happy-dom 下可测）；非法值/不支持格式返回空串 + 不抛错
- [x] `src/render-html.ts`：`renderPrintTemplateToHtml(template, data, options?)`——layoutPrintTemplate（内含 bind）→ 逐页 HTML：`<!doctype html>` 自包含文档、内联 `<style>`（`fmt-*` 类 + `@page { size: <W>mm <H>mm; margin: 0 }`）、页容器 `fmt-page` + 页间 `page-break-after`、元素 `fmt-el` 内联定位样式（区域原点偏移已由 layout 展开为页内绝对坐标）、文本含 `${}` 结果、表格 `fmt-table`（thead 每页、boundRows、聚合行样式）、条码内嵌 `createBarcodeSvg`、二维码内嵌 `qrcode` SVG、pageNumber/printDate 文本；HTML 转义（escapeHtml，防注入）

Exit Criteria:

- [x] `renderPrintTemplateToHtml` 端到端（bind→layout→HTML）用例全绿；escapeHtml 有注入防护用例（<script> 注入断言）
- [x] `pnpm --filter @nop-chaos/flux-print-core test` 全绿；typecheck 通过

### Phase 3 - 输出通道：浏览器打印 + PDF 导出（P3.2 + P3.3）

Status: completed
Targets: `packages/flux-print-core/src/{print.ts, export-pdf.ts}` + 对应测试

- Item Types: `Fix | Proof`

- [x] `src/print.ts`：`printPrintTemplate(template, data, options?)`——内部调 `renderPrintTemplateToHtml`（§7 唯一打印真理源），隐藏 iframe（`display:none`、`title="print-frame"`）写入 srcdoc → `onload` 后 `contentWindow.print()` → 移除 iframe；支持经 options 透传 `measure`（扩展点，v1 不自动注入）；Failure Path print-blocked 抛带原因 Error
- [x] `src/export-pdf.ts`：`exportPrintTemplateToPdf(template, data, fileName?)`——同源调 `renderPrintTemplateToHtml` 产出的每页 `fmt-page` 容器渲染（支持经 options 透传 `measure`，扩展点，v1 不自动注入）→ html2canvas 位图 → jspdf@^2.5.2 按纸张 mm 自定义页面尺寸逐页 addImage → `save(fileName)`；0 页抛 EXPORT_EMPTY
- [x] Proof：`print.test.ts` + `export-pdf.test.ts`（**per-file pragma `// @vitest-environment happy-dom`**）；print 用 DOM 断言 iframe srcdoc 包含渲染 HTML、print 调用、清理；export-pdf 用 vi.mock html2canvas/jspdf 断言逐页 addImage 调用序、自定义页面格式、save 文件名、0 页抛错
- [x] `package.json` 声明 `jspdf@^2.5.2` + `html2canvas@^1.4.1`（本 Phase 被 print.ts/export-pdf.ts 引用；jspdf 版本对齐 scheduling 既有解析版本）并 `pnpm install`

Exit Criteria:

- [x] 两条输出通道实现且有 mock 驱动单测（打印链路、PDF 页序/尺寸/空页错误）
- [x] `pnpm --filter @nop-chaos/flux-print-core test` 全绿（68/68）；typecheck 通过；`check:workspace-manifest-deps` exit 0

### Phase 4 - 预览升级与全量收口（P2 遗留义务；P3.4 聚合已在 Phase 1 交付）

Status: completed
Targets: `packages/flux-print-renderers/src/print-preview.tsx`、`docs/logs/`

- Item Types: `Fix | Proof`

- [x] `print-preview.tsx`：预览改为分页同源——`renderPrintTemplateToHtml(working, testData)` → iframe srcdoc 逐页呈现（缩放适配面板宽），诊断面板保留（bind + layout 诊断合并）；Failure Path d-preview-bind-fail 语义保持
- [x] 更新 `print-designer.test.tsx` 预览用例（分页页容器、诊断面板仍显示 PRINT_BIND_PATH_MISSING）
- [x] 全量验证：`pnpm test` 71/71、`pnpm typecheck` 39/39、`pnpm build` 39/39、`turbo run lint --force` 39/39、`check-i18n-keys` 基线比对一致
- [x] `docs/logs/` 记录 P3 收口（执行当日）

Exit Criteria:

- [x] 预览与打印产物同源（同一 renderPrintTemplateToHtml 输出写入 iframe srcdoc，页数徽标可见），69/69 全绿
- [x] 全仓四项验证通过；`docs/logs/` 已记录

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_f7d23c7b-de4d-4c32-a208-757c1e83c70a）
- Verdict: `pass-with-minors`（round 1 fail：6 Major；round 2 复核收敛清单 4 处，按审阅意见直接升级）
- Rounds: 2
- Findings addressed:
  - Round 1 M1（layout 输入契约自相矛盾：bound vs template+data、$page/$pages 时机）→ 签名写死 `layoutPrintTemplate(template, data, options)`，bind 内置，页变量分页后按页局部重插值
  - Round 1 M2（§6 规则 3 无 item 无 Proof）→ 补算法项 + Proof ⑩
  - Round 1 M3（jspdf 已由 scheduling 声明安装的事实错误）→ baseline 改写 + 版本对齐 ^2.5.2
  - Round 1 M4（barcode/print 测试落 node 环境包）→ per-file happy-dom pragma；round 2 补 render-html.test.ts 同 pragma
  - Round 1 M5（行高回退与 measure 注入未收口）→ Decision：measure 优先 → ESTIMATE_ROW_HEIGHT_MM=6 回退；注入方 print/export-pdf/preview；§4.3/§12 回写列入 Closure Gates
  - Round 1 M6（Phase 2 缺依赖声明）→ Targets 补 package.json + jsbarcode/qrcode 声明 item
  - Round 1 m1–m7 → 全部处理（Proof 先行标签、barcode.ts 归属回写、Phase 4 标题、同源点名、Related 文件名、§5 命名对齐、Rule 18 归属知悉）
  - Round 2 N1（autoGrow 缺 proof）→ 补 Proof ⑪ + 无 measure 行为声明；计数 9→11 同步
  - Round 2 M1 残留（Goals 旧签名）→ 已改新签名
  - Round 2 N2/N3（列表顺序、概念链措辞）→ 按审阅意见不阻塞，保留

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（audit 驱出：bind sourceRows 填充缺失已补、壳外无遗留）
- [x] 所有 in-scope confirmed contract drifts 已收敛（design.md §3/§4.3/§5/§6/§12 已回写并与代码对齐，audit round-3 实证）
- [x] 行为/契约结果已达成（Failure Paths 6/6 场景有测试证明；分页语义 11 类场景 + 2 条补充覆盖）
- [x] 必要 focused verification 已完成（audit 实跑：core 70/70、render-html 10/10、print 5/5、export-pdf 4/4、renderers 69/69）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（measure 注入按显式裁定为扩展点，P4 后增强；非静默降级）
- [x] 受影响的 owner docs 已同步到 live baseline（§3 模块清单补 barcode.ts、§4.3 行高缺省语义、§5 命名对齐 layoutPrintTemplate/renderPrintTemplateToHtml + body 元素内容不依赖页变量的语义裁定、§12 测量策略表述——均已回写，audit round-3 确认）
- [x] roadmap P3 状态回写（两处同步）：Phase Status 区 `P3. 打印渲染器` 行 + Work Items 表 P3.1–P3.4 四行 → `done`（closure audit round-3 approved 后）
- [x] `docs/logs/` 已记录 P3 收口（docs/logs/2026/09-06.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_e25ccacf-f726-4160-b1b7-43c2065768af，三轮：issues → issues → approved）
- [x] `pnpm typecheck`（39/39）
- [x] `pnpm build`（39/39）
- [x] `pnpm lint`（turbo lint --force 39/39；根 lint 链仅败于基线既有 check:i18n-keys）
- [x] `pnpm test`（71/71 task）
- [x] `pnpm check`（零新增红项：check:i18n-keys ❌ 4 undefined 与基线逐条一致、unused=284=基线；其余门禁 exit 0）

## Deferred But Adjudicated

### 表格 groupBy 多组分组

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4.2 已将 groupBy 列为 v2 预留；P3.4 的"表格分组"语义由 columns.aggregate + footerAggregate（组内聚合行）承载，roadmap 交付面成立；多组分组为独立增强，不阻塞输出通道闭合。
- Successor Required: `no`（design.md v2 预留即为归属）

## Non-Blocking Follow-ups

- P4 演示页接入 print/export 通道的失败提示 UI（Failure Path print-blocked/pdf-empty 的用户可见表现）。

## Closure

Status Note: 2026-09-06 收口。P3.1–P3.4 全部落地：layoutPrintTemplate 分页引擎（§6 全量语义 + 15 用例）、renderPrintTemplateToHtml/renderPrintPages 自包含分页 HTML、createBarcodeSvg/createQrcodeSvg（优雅降级）、printPrintTemplate（iframe srcdoc 链路）、exportPrintTemplateToPdf（html2canvas+jspdf 位图路线）、预览升级为分页同源。独立子 agent closure audit 三轮：round-1 提出 2 Major（bind sourceRows 死分支、measure 注入声称未实现）+ 4 Minor，round-2 收窄至 3 行 plan 文本（F-2 措辞与 live 不符），round-3 live grep 终审 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_e25ccacf-f726-4160-b1b7-43c2065768af）
- Evidence: 三轮审计记录——round-1 实跑 layout 13/13、render-html 10/10、print 5/5、export-pdf 4/4、renderers 69/69、全仓四项 39/39/39/71、manifest-deps exit 0、i18n 红项与主工作树 diff 为空；驱出实质修复：bind sourceRows 真实填充（聚合 field 路径可达）、p-table-oversize/p-zero-loop 回归测试（Failure Paths 6/6）、design.md §3/§4.3/§5/§6/§12 回写对齐、measure 显式裁定（估算回退 + 可注入扩展点）。round-3 终审 live grep 四处修复全部实证。记录同步至 docs/logs/2026/09-06.md。

Follow-up:

- P4 承接：playground 演示页接入 print/export 失败提示 UI；条码 `<svg` 真机断言（e2e）；measure 精确实测注入（P4 后增强）。均非本 plan 债务。
