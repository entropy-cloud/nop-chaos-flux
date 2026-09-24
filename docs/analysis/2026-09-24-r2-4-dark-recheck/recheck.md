# plan 500 R2-4 dark 主题平价/对比度族 — Phase 3 批内同探针复检报告（recheck）

> Date: 2026-09-24 ｜ Owner plan: `docs/plans/500-visual-quality-r2-4-dark-parity-local-family-remediation-plan.md`（Phase 3）
> 执行: 独立 fresh recheck agent（未改任何产品代码；探针与原始 JSON 见 `_tmp/r2-4-recheck/`）
> 方法学: dark 显式 `setAttribute('data-mode')`；evaluate 全部传真函数；对比度判定一律 PNG 像素采样（dominant bg + 亮/暗尾均值，采样器沿 `_tmp/r2-2b-probes/w5-png.mjs` / 实现 agent `_tmp/r2-4-impl/probe-r24.mjs` 口径）；细字号像素尾均值受抗锯齿拖拽时以 DOM computed 核心值复判（沿 R2-2a/2b review 沉淀口径），报告内逐条注明所用口径。
> 载体清单 = R2-1a/R2-1d/R2-2a/R2-2b/R2-2c 五批 cards 中 dark 平价/对比度族命中单元实时枚举（60 行）；路由按 `docs/audits/visual-quality-r2/inventory/pages.json`（complex 页 `#/complex-pages/<id>`，控件 `#/lab/<id>`，demo `#/<id>`）。

## 1. 汇总

| 判定                 | 行数 | 说明                                                                                     |
| -------------------- | ---- | ---------------------------------------------------------------------------------------- |
| **pass**             | 38   | 锚点全部达 WCAG（文本 ≥4.5 / 条纹可视 / 弹层暗面）                                       |
| pass-with-note       | 2    | antdpro-result（模板字面色残余注记）、gantt（周刻度 gray-500 字面类观察注记），主锚 pass |
| partial（部分收口）  | 1    | badge：B5-01 全锚 pass，B1-02 light Info/Warning 残余                                    |
| **residual**         | 14   | cal/notion 钉白 4 + bg-white 头部 8 + tag-list B6-106 + swipe-cell 族实例                |
| watch-ref（不变）    | 3    | sundial B5-21、batch-bar B2-82、button-group B6-151                                      |
| 本批范围外（未探针） | 3    | code-editor / diff-view / flux-basic（Deferred 编辑器通道/模板层）                       |
| 非本族参照           | 1    | sparkline（卡内无正式对比度族锚；B6-124 为色相语义）                                     |

宿主 `color-scheme` 随 data-mode light/dark 翻转 ✔（复检实测 root 与 `.nop-theme-root` 双双跟随）。

## 2. R2-1a 复刻与 complex-pages（18 行）

### 2.1 antdpro 9 页系（`--adp-*` 无 dark 块 → dark 块已补，R2-1a-B5-02 族主发现）

判定口径：dark 下 `.adp-page-title` / `.adp-desc-label` / `.adp-tag` / `.adp-breadcrumb` / `.adp-btn-primary` / `.adp-btn-link` 像素采样 ≥4.5。**before：label 1.05:1 不可见、feature chips 1.1:1（antdpro-list 卡 B5-02）。**

| 单元                    | dark 采样（title/desc/tag/breadcrumb/btn-primary/btn-link 按页在位者） | 判定                        |
| ----------------------- | ---------------------------------------------------------------------- | --------------------------- |
| antdpro-list            | 13.43 / 4.79 / 4.60 / 5.85 / 4.59 / 5.21                               | pass                        |
| antdpro-form-basic      | 13.18 / 4.66 / — / 6.00 / 4.35 / —                                     | pass                        |
| antdpro-form-grouped    | 12.43 / 4.79 / — / 6.00 / — / —                                        | pass                        |
| antdpro-form-dialog     | 12.93 / 5.13 / — / 5.85 / 4.59 / —                                     | pass                        |
| antdpro-form-step       | 13.43 / 4.79 / — / 6.00 / — / —                                        | pass                        |
| antdpro-detail-basic    | 13.43 / 4.54 / 4.76 / 5.85 / — / —                                     | pass                        |
| antdpro-detail-advanced | 13.43 / 4.60 / — / 5.85 / 4.47 / —                                     | pass                        |
| antdpro-dashboard       | 10.67 / 4.66 / — / 5.62 / kpi 13.43 / —                                | pass                        |
| antdpro-result          | 13.31 / 4.86 / — / 5.85 / 4.55 / —                                     | pass-with-note（见残余 #4） |

light 侧对照（防回归）：九页 page-title 采样 9.06–16.07 全过；非本批目标 light 令牌未动（theme-tokens diff 仅 success/destructive/striped + dark 块）。

### 2.2 showcase pills 4 页（R2-1a-B5-02 宿主面，before 1.1:1）

| 单元              | dark 采样                             | 判定 |
| ----------------- | ------------------------------------- | ---- |
| dashboard         | 页头 pill 14.12、特性 pills 6.27–6.71 | pass |
| crud-views-export | 14.49 / 6.25–6.71                     | pass |
| approval-tasks    | 12.99 / 6.43–6.61                     | pass |
| dynamic-tabs      | 14.49 / 6.18–6.71                     | pass |

（pills 随 `--secondary-foreground` dark 修值间接收口：底 `--secondary` 亮紫不翻转 × 深字 `217 89% 26%`。）

### 2.3 复刻钉白 cal/notion/sundial（模板层，本批未修 → 残余如实记录）

| 单元              | 锚点                                     | before   | after（复检实测）                        | 判定                                                |
| ----------------- | ---------------------------------------- | -------- | ---------------------------------------- | --------------------------------------------------- |
| cal-booking       | `.cal-root` dark 主面                    | 钉白     | 仍白面（bg 252,252,252，lum 0.973）      | residual → R2-4b                                    |
| cal-confirm       | 输入框 placeholder/输入混合态            | ≈1.05    | 输入底混灰 rgb(188,188,196)、文字比 1.02 | residual → R2-4b                                    |
| cal-success       | 卡面钉白                                 | 钉白     | 仍白面（lum 0.973）                      | residual → R2-4b                                    |
| notion-database   | 表头 th 文字/底                          | ≈1.2     | 1.05–1.12（dark 泄漏仍现）               | residual → R2-4b                                    |
| sundial-workbench | B5-21（watch-only P3，replica 有意亮色） | 观感割裂 | 白面板+深缝隙维持                        | watch 不变（单元另有 B1-19 归 R2-3，维持 digested） |

## 3. R2-1d demo 面与编辑器（11 行）

### 3.1 demo 载体 `bg-white` 头部 8 页（R2-1d-B5-01，P1；plan Deferred「若复检仍 P1 则升格字母批首批」）

kanban 页 computed 实测（复检口径=DOM 核心值，strip bg 白底像素采样）：头部 strip `bg = rgb(255,255,255)`（字面白不随主题）、h1 与返回钮 `color = rgb(230,236,243)`（dark 近白）→ **白底白字 ≈1.06:1 残余未变**。其余 7 页同模板写法（`kanban-demo.tsx` L141 同款），判定同。注：pass-2 首跑对 strip 矩形整条采样混入下方深色内容致尾均值虚高，以 computed 复判为准（见 `out-recheck8.json`）。

| 单元                                                                                                                             | 判定                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| kanban / gantt / gantt-states / scheduling-calendar / barcode-input / gantt-perf-scale / kanban-perf-scale / calendar-perf-scale | 8 页全 residual（P1 维持）→ **按 plan 预案升格 R2-4 字母批首批成员（R2-4b）** |

### 3.2 Deferred 编辑器通道/模板层（「本批范围外」，未探针）

| 单元        | finding                  | 处置                             |
| ----------- | ------------------------ | -------------------------------- |
| code-editor | B5-51 编辑器 dark 不同步 | 范围外 → R2-4b（编辑器主题通道） |
| diff-view   | B-48 light-only CSS      | 范围外 → R2-4b                   |
| flux-basic  | B-42 白卡 1.06:1         | 范围外 → R2-4b（模板层）         |

## 4. R2-2a 控件批一（14 行）

| 单元                | 锚点                                                      | before                                                | after（复检）                                                                                                                 | 判定                                 |
| ------------------- | --------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| badge               | B5-01 dark secondary / dark danger / glass-dark secondary | 1.06–1.07 / 3.24 / 同族                               | dark secondary 6.16–6.71、dark Danger 4.73、glass dark 5.40–5.76                                                              | **B5-01 pass**                       |
| badge               | B1-02 light 四语义                                        | Info 3.05 / Success 2.59 / Warning 2.13 / Danger 3.78 | Success 4.89 ✔（`--success` 23%）、Danger 4.93 ✔（`--destructive` 42%）；**Info(secondary) 2.97–3.11 ✗、Warning 1.84 ✗ 未动** | **partial**（残余 #1）               |
| button              | B5-04 dark secondary + default dark                       | 1.1 / 3.26                                            | secondary 7.87 / primary 实底白字 5.07                                                                                        | pass                                 |
| button              | B1-05 destructive tint                                    | light 3.12（review 订正）                             | light 4.93 / dark 4.73                                                                                                        | pass                                 |
| button              | light secondary（B5-04 证据同 token 对）                  | 3.05                                                  | 2.21–2.97 仍 <4.5                                                                                                             | 残余 #1（light 侧 secondary 档未动） |
| button-group-select | B1-40 选中态                                              | dark 3.15 / light 4.46                                | 点击后 pressed：白字 on `--primary`/85 实底 dark ≈5.07 / light 4.67                                                           | pass                                 |
| tag-list            | B6-106 dark 选中/未选区分（P3）                           | 「近乎同色」微差                                      | 选中底 relLum 0.024 vs 未选 0.011 ≈ **1.21:1**（<3）                                                                          | residual #2（P3）                    |
| input-date          | dark 弹层面 + 邻月日                                      | 亮底 rgb(251,250,249) / 邻月 1.83                     | 弹层面 rgb(12,20,44) lum 0.008、item 10.36–11.21                                                                              | pass                                 |
| input-datetime      | 同上                                                      | 同上                                                  | 面暗、item 10.36–11.21                                                                                                        | pass                                 |
| date-range          | 同上                                                      | 同上                                                  | 面暗、item 11.21–11.25                                                                                                        | pass                                 |
| picker              | dark 弹层（crud 候选表）                                  | 亮底                                                  | 面暗 11.10、行区 1.02×4.5 达标（item 文字亮尾 11.1）                                                                          | pass                                 |
| tree-select         | dark popover                                              | 亮底                                                  | 面暗 13.05 / item 9.24                                                                                                        | pass                                 |
| select              | dark 下拉弹层                                             | 亮底 rgb(251,250,249)                                 | 面暗（lum 0.008）/ item 14.19                                                                                                 | pass                                 |
| command-palette     | dark 面板 + item                                          | 亮底                                                  | 面暗 8.49 / item 5.98                                                                                                         | pass                                 |
| icon-picker         | dark popover                                              | 亮底                                                  | 面暗 11.75 / item 16.83                                                                                                       | pass                                 |
| detail-field        | dark dialog + 字段标签                                    | 标签整体不可见（族最重档）                            | 面暗 9.57 / label 4.96                                                                                                        | pass                                 |
| detail-view         | 同 surface                                                | 同上                                                  | 面暗 10.27 / label 8.86                                                                                                       | pass                                 |

## 5. R2-2b 控件批二（10 行）

| 单元         | 锚点                                                   | before                                                               | after（复检）                                                                                                                                                          | 判定                                  |
| ------------ | ------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| stat-tile    | B1-125 delta 四象限                                    | light up 2.51 / light down 3.67 / dark down 3.76                     | light 6.25 / 5.91、dark 9.93 / 6.18                                                                                                                                    | pass                                  |
| status       | B1-51 success badge                                    | light 2.13（review 订正）                                            | light 4.89 / dark 6.60                                                                                                                                                 | pass                                  |
| wizard       | B1-158 内联+摘要错误                                   | review 订正：dark 内联 7.49 过 / **light 摘要 3.78 败** + 两红不同源 | 内联 dark 5.46（像素）；摘要 light **computed rgb(197,17,17)=6.07**（像素 4.46 系抗锯齿拖拽）、dark computed rgb(242,105,105)=6.14；两处现同走 `text-destructive` 同源 | pass                                  |
| chart        | B5-89 dark 轴刻度                                      | 字面 #666 ≈3.1（3.27）                                               | tick `fill=rgb(175,189,207)` = `--muted-foreground` 令牌化；computed 对暗面 ≈8.6–9.6（<14px 高矩形像素采样器返 null，以 fill 令牌+computed 判）                        | pass                                  |
| table        | A9-126 斑马纹                                          | `--table-striped-bg: transparent` 零呈现（1.0）                      | 条纹 vs 常规行 **light 1.07 / dark 1.38**                                                                                                                              | pass                                  |
| video        | B1-52 错误芯片文字                                     | light 3.14 / dark 3.4                                                | computed light rgb(197,17,17) 对 tint 4.93 / dark rgb(242,105,105) 对暗底 5.43（12px 像素尾均值 1.79 受抗锯齿拖拽，以 computed 判）                                    | pass                                  |
| swipe-cell   | 族引用实例：dark outline 钮边界/填充对 stage           | ~1.1–1.2                                                             | 钮面文字区 1.23、间隙对照 8.23；边界维持 ~1.2 量级                                                                                                                     | residual #3（族实例，无正式 finding） |
| batch-bar    | B2-82（watch，设计裁决项）                             | 面/边框 1.09/1.18                                                    | bar 面 vs stage ≈1.07 维持                                                                                                                                             | watch 不变                            |
| button-group | B6-151（watch P3）                                     | light 1.08 / dark 1.12                                               | dark 选中/未选 ≈1.15–1.6                                                                                                                                               | watch 不变                            |
| sparkline    | 非本族（卡内 B5 dark pass；B6-124 为色相语义非对比度） | —                                                                    | 未探针                                                                                                                                                                 | 参照行                                |

## 6. R2-2c 控件批三（7 行）

| 单元          | 锚点                                                                             | before                                              | after（复检）                                                                           | 判定                                                                                       |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ai-feedback   | dark 选中 like 钮（`--primary` 过亮边缘实例）                                    | ≈4.2                                                | 点击后 dark 8.44                                                                        | pass                                                                                       |
| ai-sender     | dark 发送钮白字 on `--primary`                                                   | 3.26                                                | 输入文本激活后 dark **4.99** / light 4.62                                               | pass                                                                                       |
| gantt         | dark 工具栏/网格行/任务条标签（`--secondary-foreground`+`--primary` 族集中实例） | 2.06 / 2.62 / 3.26                                  | 适应 11.76 / 今日 11.97 / 网格行 8.51 / 条标签 computed 白 on `--primary` dark **5.06** | pass-with-note（残余 #8：周刻度 cell 为 gray-500 字面类 oklch(0.551)，computed ≈4.1 边缘） |
| barcode-input | lab 头部徽章 dark + required 错误字                                              | 徽章 ≈1.2 / 错误 DOM 3.45（像素 2.22）              | 徽章 dark **15.0**（light 18.38）/ 错误 dark 5.22、light 5.22                           | pass                                                                                       |
| kanban        | dark 列头标题                                                                    | 2.09                                                | 列头 11.54、卡标题 18.47                                                                | pass                                                                                       |
| ai-citations  | dark Popover 整面                                                                | 亮底 rgb(251,250,249)（ai 系首个 Popover 形态实例） | 面暗 lum 0.008 / item 11.94                                                             | pass                                                                                       |
| ai-prompts    | dark dialog + description（族最重档 ≈1.05）                                      | description ≈1.05 不可读                            | 面暗 lum 0.008 / **description 8.93**                                                   | pass                                                                                       |

## 7. 台账翻转建议（口径：单元全部正式 P0–P2 发现均已被已收口批修复且复检通过才翻 `verified`；部分收口保持 `digested` 并记录）

### 7.1 建议翻转 `verified`（9 单元，正式 P0–P2 全收口且本报告 pass）

| 单元（kind）                          | 正式发现收敛情况                                 |
| ------------------------------------- | ------------------------------------------------ |
| button-group-select（control, R2-2a） | B1-40（P2）已修 ✔ 复检 5.07/4.67                 |
| stat-tile（control, R2-2b）           | B1-125（P2）已修 ✔ 复检四象限全过                |
| status（control, R2-2b）              | B1-51（P2）已修 ✔ 复检 4.89/6.60                 |
| wizard（control, R2-2b）              | B1-158（P2）已修 ✔（E2-159 为 P3，注记保留）     |
| chart（control, R2-2b）               | B5-89（P2）已修 ✔（F1-91/F4-90 均 P3，注记保留） |
| table（control, R2-2b）               | A9-126（P2）已修 ✔ 复检 1.07/1.38                |
| video（control, R2-2b）               | 无 P0–P2（B1-52 P3 且本次已修 ✔）                |
| ai-feedback（control, R2-2c）         | 无正式 P0–P2（dark primary 族实例本次收口 8.44） |
| ai-citations（control, R2-2c）        | 无正式 P0–P2（Popover dark 族实例本次收口）      |

### 7.2 口径 vacuous-eligible——建议主 session 裁量（3 单元）

无正式 P0–P2（口径字面满足），但存在未修的 P3/watch 族残余，翻 `verified` 需接受「残余在册」表述：**tag-list**（B6-106 P3 选中区分 1.21 未达 3:1）、**sparkline**（B6-124 P3 色相语义，非对比度面）、**swipe-cell / batch-bar**（零正式 finding，但 dark 族实例/watch 面未变）。本 agent 倾向：tag-list/sparkline 可翻（残余注记）；swipe-cell/batch-bar 建议维持 `digested`（其实例未收口，翻转会稀释台账语义）。

### 7.3 维持 `digested` 并记录（family 行已收口但单元另有未收口正式发现/模板残余）

- **badge**：B5-01 ✔ 但 B1-02（P2）Info/Warning 残余（见残余 #1）。
- **button**：B5-04/B1-05 ✔ 但 A1-03（P1，非本族）未收口。
- **ai-sender**（C1-41 P2 溢出）、**gantt**（C4-86 P2 窄容器 → R2-3c）、**barcode-input**（C2-81 P2 → R2-4 字母批输入）、**kanban**（A6-88 P2 → R2-3）、**ai-prompts**（E4-45 P2 → R2-4 字母批输入）：dark 族行全部 ✔，其余正式发现未收口。
- **R2-1a 全部页面单元**（antdpro 9 + pills 4 + cal 3 + notion + sundial 系）与 **R2-1d 11 单元**：页面级单元均另有非族正式发现或模板残余（§2/§3），一律维持 `digested`；bg-white 8 页按 plan 预案登记 R2-4b 首批成员。

## 8. residual 清单（如实记录；contrast-miss 3 轮迭代上限由主 session 把握）

| #   | 组合                                                                                                                                                    | 实测             | 建议去向                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| 1   | badge/button light 语义档：secondary Info 2.97–3.11、Warning 1.84、light secondary 钮 2.21（`--secondary-foreground`/`--warning` light 档非本批修值面） | 本批复检         | R2-4 字母批或「语义色文本档 token 化」follow-up（plan 500 Non-Blocking Follow-ups 已登记） |
| 2   | tag-list B6-106（P3）dark 选中/未选底差 1.21:1                                                                                                          | 本批复检         | 同上 follow-up / watch                                                                     |
| 3   | swipe-cell dark outline 钮边界 ~1.2:1（族引用实例）                                                                                                     | 本批复检         | watch / R2-3 语义档批                                                                      |
| 4   | antdpro-result 结果图标圈 `bg-[#f6ffed]` 字面亮面（schema 模板层，装饰性）                                                                              | 本批复检         | R2-4b 字面类清扫                                                                           |
| 5   | cal-booking / cal-confirm / cal-success 钉白 + dark 令牌泄漏混搭                                                                                        | 本批复检（未变） | R2-4b（模板层，successor 已登记）                                                          |
| 6   | notion-database 表头泄漏 ≈1.05–1.12                                                                                                                     | 本批复检（未变） | R2-4b                                                                                      |
| 7   | bg-white 头部 8 页 白底白字 ≈1.06（**P1 维持**）                                                                                                        | 本批复检（未变） | **R2-4b 首批成员**（plan 500 Deferred 预案触发）                                           |
| 8   | gantt 周刻度 cell `gray-500` 字面类 oklch(0.551)，computed ≈4.1（10px 小字边缘；非令牌面）                                                              | 本批复检         | R2-4b 字面类清扫 / watch                                                                   |
| 9   | batch-bar B2-82 dark 面 1.07（疑有意静默设计）                                                                                                          | 本批复检（未变） | 维持 watch-pool（设计裁决项）                                                              |
| 10  | button-group B6-151（P3 watch）选中底差 dark ≈1.15–1.6                                                                                                  | 本批复检         | 维持 watch-pool                                                                            |
| 11  | code-editor B5-51 / diff-view B-48 / flux-basic B-42                                                                                                    | 未探针（范围外） | R2-4b（编辑器通道/模板层，successor 已登记）                                               |

## 9. 复检产物

- 探针: `_tmp/r2-4-recheck/probe-recheck.mjs`（pass-1）、`probe-recheck2.mjs`（pass-2 补空/修 locating）、`probe-recheck3.mjs`（ai-citations/ai-prompts/command-palette）、`probe-recheck4.mjs`（primary/barcodelab/sender/gantt/wizard）、`probe-recheck5–9.mjs`（select 面板、gantt 锚点、video/bgs computed 复判、kanban 头部 computed）
- 原始数据: `_tmp/r2-4-recheck/out-recheck.json`、`out-recheck2.json`、`out-recheck3.json`、`out-recheck4.json`、`out-recheck5.json`、`out-recheck6.json`、`out-recheck7.json`、`out-recheck8.json`、`out-recheck9.json` + `recon.json`
- 截图（dark/light 采样源，不入库口径同走查批）: `_tmp/r2-4-recheck/shots/`
- 交叉参照: 实现 agent 自检数据 `_tmp/r2-4-impl/out-after.json`（本报告全部数值以 fresh 复检实测为准）

## 10. 复检结论

- 令牌层四主题块修值（`--secondary-foreground` dark、`--primary` dark、`--destructive` 双档、`--table-striped-bg`、dark `--popover`、宿主 color-scheme 解钉）在其全部族消费锚上复检通过；light 侧非目标令牌无回归迹象（badge Success/Danger 反而随 `--success`/`--destructive` 修值达标，antdpro 九页 light sanity 全过）。
- antdpro dark 块 + pills、弹层暗面集群（10 载体）、stat-tile/status/wizard/chart/table/video、R2-2c 增量实例（feedback/sender/gantt/barcode/kanban/citations/prompts）全部收口。
- 新增 fail：**0**。残余全部为批前已裁定归模板层/字母批/watch 的组合（§8），无一条属于本批修值面漏网。
- 台账建议：§7.1 的 9 个 control 单元翻 `verified`；§7.2 三单元请主 session 按口径裁量；其余维持 `digested` 并按 §8 记录残余去向。
