# [card] control:empty

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/empty` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic empty state（title+description+默认 icon）/ Host empty actions CTA (C6.2)）
- **矩阵裁剪**: simplified（matrixReason：纯静态占位壳，无交互态矩阵（hover/focus/disabled 均不适用，仅 CTA 按钮态）、无异步、无弹层。实际裁掉：glass 皮肤、lucide 自定义 icon image（fixture 未配置）、actions 区多按钮排布变体（fixture 单 CTA））

## 1. 截图清单

| 状态                    | light                                                                        | dark（真 data-mode，自采）                                                  |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800（全场景） | `_tmp/visual-inspection-2026-09-24/r2-2b/empty/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/empty/default-full-dark.png`       |
| 默认 800×900            | `_tmp/visual-inspection-2026-09-24/r2-2b/empty/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/empty/default-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（本体无交互面）A5 pass（空态本体即"有意义提示非空白"：title "No data yet" + description + icon，双场景皆非空白壳）A6/A8 n/a A7 n/a A9 pass（CTA 点击 `cta-report: pending→fired` 翻转）
- B 颜色：B1 pass（title `rgb(33,53,71)` 14px/500、desc `rgb(72,86,106)`，亮底对比充足；dark 下走令牌变亮文本）B2 n/a B3 n/a B4 pass B5 pass（dark 平价）B6 n/a
- C 布局：C1 pass（双视口 docOverX=0）C2 pass（icon/title/desc 垂直栈无重叠）C3 pass（空态居中占满 stage，主内容占比合理）C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（`gap-4` + `p-6`，icon→title→desc 间距成栅格）D2 pass D8 pass
- E 排布：E1 pass（3 秒可答：无数据 + 引导语）E2 pass（title 字重 500 强于 desc）E3 pass（icon→标题→说明→CTA 自上而下动线）E4 pass（全部水平居中对齐，textAlign center）E5 pass（单一留白分组语言）E6 pass（空态即任务引导形态本体，"Create your first record to get started." 给出下一步）
- F 一致性：F1–F5 n/a（跨页空态一致性归 F3 横切，本卡仅单控件；两场景内 icon/排版模式一致）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无——本控件全部维度 pass，证据落 `_tmp/visual-inspection-2026-09-24/r2-2b/empty/` 与 `_tmp/r2-2b-probes/out-w1-empty.json`。）

## 4. 已知族命中（引用，不另立项）

- **观察（watch 注记，非缺陷）**：默认 icon 仅 16px（size-4），作为空态主视觉偏小、存在感弱；行业惯例空态插画/图标通常 48–96px。当前 fixture 未配置自定义 icon image 时观感偏"轻"。不立项；若后续有空态视觉强化需求，可在 renderer 默认 icon 尺寸上做档位（如 `size-12`）。
- **计划内锚点复检通过**：CTA 动作通道正确（`cta:fired`，报告元素翻转）；`data-slot="empty"` 壳层类串（flex 居中 + dashed 边框）与 styling-system 契约一致。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-empty` → carded（卡列填本路径）；findings 归族后 → digested。
