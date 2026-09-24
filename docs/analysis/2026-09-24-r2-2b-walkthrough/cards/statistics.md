# [card] control:statistics

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/statistics` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：basic statistics，total=60）
- **矩阵裁剪**: simplified（matrixReason：单行文本原子组件（`t('flux.pagination.total')` 一句话渲染，`statistics-renderer.tsx` 全文 20 行）——无交互态、无弹层、无异步、无变体。已查：light/dark 像素对比、1280/800 双视口、data-total 属性契约。裁掉：其余全部交互/弹层维度（组件无对应面））
- **runner dark 列作废声明**：同前——dark 真 data-mode 自采。

## 1. 截图清单

| 状态              | light                                                                            | dark（真 data-mode，自采）                                                 |
| ----------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280         | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/default-light-1280.png`      | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/default-dark-1280.png` |
| 组件根特写        | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/root-light-1280.png`         | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/root-dark-1280.png`    |
| 默认 800          | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/default-800-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/default-800-dark.png`  |
| 默认 1280（整页） | `_tmp/visual-inspection-2026-09-24/r2-2b/statistics/default-1280-light-full.png` | —                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（纯文本展示件）
- B 颜色：B1 pass（light `rgb(72,86,106)` on stage `rgb(252,244,236)` ≈ **6.9:1**；dark `rgb(175,189,207)` on `rgb(20,28,36)` ≈ **9.1:1**——muted-foreground 令牌双主题过线，dark 数值以同款 stage 像素 `rgb(20,28,36)`（statistics-dark 像素实测）复算）B2–B6 n/a/pass
- C 布局：C1 pass（overflow 零命中）C2–C6 n/a/pass
- D 间隔：D1–D8 n/a（单行组件）
- E 排布：E1 pass E2 **watch 观察**（见 §4，不计正式条目）E3–E6 n/a
- F 一致性：F4 **已知族实例**（见 §4）F1–F3/F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无正式条目——本控件渲染面 0 P0–P3；观察与族实例见 §4）

## 4. 已知族命中 / 观察（引用与登记）

- **i18n zh-CN 回退（dialog F4-11 主条目 + 30+ 控件实例族）**：英文宿主页面渲染 `共 60 条`——`statistics-renderer.tsx` 直接 `t('flux.pagination.total', { count })`，playground 未 `initFluxI18n` 时回退 zh-CN。引用族不另立项；本实例可作为“数据域渲染器 chrome 中文”的第 N 实例（table 分页条“第 1-5 条，共 5 条”同根因同文案键）。
- **E2 watch 观察（不立项）**：`共 60 条` 为**单文本节点**（`innerHTML` 无子元素，`children: []` 实证），数值与前后缀同 14px/400/muted-foreground——“关键数字强于标签”未体现。但 schema 声明即“Standalone numeric summary display (total count)”最小实现，且 total 若需强调可走 `data-total` 消费方自样式（属性已在 DOM 暴露，契约通道存在）。登记 watch：若后续 statistics 升级为数字强调型（AMIS statistics 惯例大数字），此处需复检。
- **dark 平价族核对（R2-4 核对点）**：核对通过（9.1:1，无 dark 专有缺陷）。

## 交互键登记

- 无注册交互键：单行文本组件无交互态（closure audit F2 补录 2026-09-24）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-statistics` → carded（卡列填本路径）；findings 归族后 → digested。
