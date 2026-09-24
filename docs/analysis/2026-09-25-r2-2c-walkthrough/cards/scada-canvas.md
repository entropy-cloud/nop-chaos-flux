# [card] control:scada-canvas

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/scada-demo` ｜ **载体**: 域 demo 页（I13.1 工艺流程组态演示，只读渲染面 + 点表双轨；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）。注意：`#/scada-demo` **页面级**走查已在 R2-1c 完成（carded）；本卡为**控件契约面**首查，独立台账单元
- **契约面**: `scada-canvas` type 渲染区 = `[data-slot="scada-canvas"]`（leafer 三层 canvas：`[data-slot="scada-canvas-canvas"]` + loading/error/empty region + 点表桥接图元）
- **矩阵裁剪**: simplified（matrixReason：查看器控件无选中/拖拽对象/undo 语义（G1/G6 n/a），状态面 = 双主题/双视口/加载错误 region/hover 可供性/详情弹层。裁掉：glass 皮肤（波次统一）、告警/故障注入态（R2-1c B3 专项已全过）、双击跳转（离开页面域，R2-1c 同裁剪））
- **探针**: `_tmp/r2-2c-probes/w5-scada.mjs`、`w5-scada2.mjs` → `out-w5-scada*.json`

## 1. 截图清单

| 状态              | light                                                                         | dark（真 data-mode）                    |
| ----------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| 画布默认 1280×800 | `_tmp/visual-inspection-2026-09-25/r2-2c/scada-canvas/default-1280-light.png` | `…/scada-canvas/default-1280-dark.png`  |
| 默认 ~800 宽      | `…/scada-canvas/default-800-light.png`                                        | `…/scada-canvas/default-800-dark.png`   |
| 电机图元 hover    | `…/scada-canvas/motor-hover-light.png`                                        | —                                       |
| 点表按钮触发后    | `…/scada-canvas/motor-started-light.png`                                      | —                                       |
| 平移拖拽 mid      | `…/scada-canvas/pan-mid-light.png`                                            | —                                       |
| 设备详情弹层      | `…/scada-canvas/device-dialog-light.png`                                      | `…/scada-canvas/device-dialog-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover 命中 `leafer-app-view`，`cursor: grab`；平移中 `grabbing` 探针坐实） A2 pass（页面 chrome 按钮 focus 族正常，R2-1c 口径） A3 pass（`smallTargets` 仅历史命中项，画布区无新增） A4 n/a A5 pass（`scada-canvas-loading`/`error` region DOM 契约在，本页恒 ready；`pixelNonBgSamples: 4220` 画布非空渲染坐实） A6 pass（pan 拖拽跟手、cursor 态切换 grab→grabbing） A7 pass（点击电机 → 详情弹层 560×82、bottom 142、有关闭钮、Esc 可关，复检通过） A8 n/a A9 pass（点表按钮→图元状态：R2-1c A9 已证；本波 motor-started 帧留档）
- B 颜色：B1 **warn（家族引用：R2-1c-B1-02 维持——视口组 Fit/Center secondary 按钮对比度，见 §4）** B2 pass B3 pass（run 绿/stop 灰/fault 红维持 R2-1c B3 全过结论） B4 pass（chrome 走 `--nop-*`；画布图元预设色 = V12a 既往裁决） B5 pass（chrome dark 平价；画布恒暗 = R3 编写期主题裁定既往裁决，双主题同观感，不报） B6 pass
- C 布局：C1 pass（1280 docOverX=0、hits=0） C2 pass C3 pass C4 **warn（家族引用：R2-1c-C4-01 维持——800 视口 docOverX=324，见 §4）** C5 pass C6 pass（`leaferAttr 986×272 == rect 986×272`，DPR1 探针环境下 attr==rect×dpr 成立；三 canvas 分层为引擎常态）
- D 间隔：D1–D8 pass/n-a（R2-1c D1 18px 离栅为页面控制栏事项，本卡不重复）
- E 排布：E1–E6 pass（控制分组/画布/说明区层次清晰）
- F 一致性：F1 pass（控制按钮语义与其它 scada 页一致）
- G 设计器：n/a（查看器非编辑器；平移可供性已按 G2 口径验证）
- H 弹层：H1 pass（详情弹层 560px = `--overlay-size-base` 档维持） H3 pass（bottom 142） H4 pass（关闭钮不压标题） H5–H9 n/a/pass——**B5 注：弹层 dark 亮底见 §4 已知族**

## 3. 发现条目

（本卡无新立项发现：三条既有族均「维持」，新实例证据见 §4；画布/弹层其余维度复检通过。）

## 4. 已知族命中（引用，不另立项）

- **R2-1c-C4-01（800 视口横向溢出，systemic → R2-3c 候选）— 复检：维持**。新实例证据：`w5-scada.mjs narrowOverflow.docOverX = 324`（与 R2-1c 记录的 scrollWidth 1124−800=324 逐值一致，宽度冻结机制未变）。
- **R2-1c-B1-02（size-sm secondary/destructive 标签对比度，systemic → R2-3）— 复检：维持**。新实例证据：default-1280-light.png 视口组 Fit/Center 仍为紫底 secondary 变体（R2-1c 实测 light 3.05:1 / dark 1.10:1），令牌未收敛，同一按钮对仍在本载体渲染。
- **宿主级 `--popover` dark 亮底族 — 维持**。新实例证据：`w5-scada2.mjs dialogDark.bg = rgb(251,250,249)`（设备详情弹层 dark 亮底，与 R2-1c dialog-dark 帧同象）；归 R2-4 dark 族收口。
- 误报排除：① 画布双主题恒暗 = R3 编写期主题裁定（plan 474 Non-Goals），不按 B5 报；② canvas attr==rect 为 DPR1 探针环境（Playwright newContext 默认 deviceScaleFactor=1），非 DPR 适配回归；③ motor-started 帧点表采样无变化 = 初始态已为运行态（启动→启动无视觉差），非 A9 失效（R2-1c A9 已证）。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/scada-canvas/design.md（owner-doc-missing，review-b 2026-09-25）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `scada-canvas` → carded（card 列填本路径）；三条族维持记录回写原条目链路。
