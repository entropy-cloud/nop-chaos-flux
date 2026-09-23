# [card] control:dynamic-renderer

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/dynamic-renderer` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：loadAction 静态加载 / 按钮切换 schema / autoLoad:false + component:refresh / 失败 loadAction 错误态）
- **矩阵裁剪**: simplified + **结构类契约核对**（裁剪理由：dynamic-renderer 为结构类壳控件——本体仅 `nop-dynamic-renderer` marker 壳 + 加载/错误态，被加载内容的视觉面归各自控件卡；A–H 视觉维度大量 n/a：A1–A4 元素交互态 n/a（壳非交互）、A6/A8 n/a、B1–B6 大部分 n/a（壳无自绘色面，仅错误文案一处）、D2–D8/E2–E6 n/a、F/G/H n/a；实际核对项 = 四态完备性（loading/加载成功/切换/错误）、marker 契约、双视口、双主题）

## 1. 截图清单

| 状态                       | light                                                                                        | dark（真 data-mode，自采）                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 默认（四场景终态）1280×800 | `_tmp/visual-inspection-2026-09-23/lab-dynamic-renderer-default-1280x800-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-2a/dynamic-renderer/full-1280-dark.png` |
| 默认 800×900               | `_tmp/visual-inspection-2026-09-23/lab-dynamic-renderer-default-800x900-light.png`           | `_tmp/visual-inspection-2026-09-23/r2-2a/dynamic-renderer/full-800-dark.png`  |
| schema 切换后（button）    | `_tmp/visual-inspection-2026-09-23/r2-2a/dynamic-renderer/switched-to-button-light-1280.png` | —                                                                             |
| 错误态（loadAction 500）   | `_tmp/visual-inspection-2026-09-23/r2-2a/dynamic-renderer/failing-load-error-light-1280.png` | `failing-load-error-dark-1280.png`                                            |

## 2. 结构契约核对 + 四态取证

- marker 契约：壳类仅 `nop-dynamic-renderer` + `data-cid`，错误态追加 `data-error` 属性（`out-structural.json` dynamic.finalStates[3].shellAttrs = `class,data-cid,data-error`）——无视觉类发出，契约 pass。
- 四态完备（`out-structural.json` dynamic.finalStates + afterManualLoad/afterShowText/afterShowButtonHasButton）：
  1. autoload 成功：body 占位 "Loading dynamic schema..." → 替换为 loadAction 返回 badge（A5 loading/loaded 双态存在）。
  2. schema 切换：Show Text → "Dynamically rendered text content."；Show Button → 真按钮渲染成功——schema 响应性族（候选 #7）在本控件复检通过。
  3. 手动刷新：`component:refresh` 后渲染 "Loaded via component:refresh" badge（autoLoad:false 语义正确）。
  4. 错误态：HTTP 500 → `data-error` + "错误：Request failed (status=500)" 渲染进壳内（不崩边界）。文案中文为 flux-i18n 默认 locale 问题，归 R2-2a-F4-11（dialog 卡）同根因实例，不另立项。

## 3. A–H 维度勾选表

- A 交互：A1–A4 n/a（壳非交互）A5 pass（loading 占位文本 + 终态替换 + 错误态有 `data-error` 有意义提示非空白）A6/A8 n/a A7 n/a A9 pass（refresh/切换均有可见结果）
- B 颜色：B1 pass（错误文案对比正常，light/dark 抽查）B2–B4 n/a B5 pass（dark 全页复拍无新缺陷；错误态文案 dark 可读）B6 n/a
- C 布局：C1 pass（1280/800 overflow 扫描零命中）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1–D8 n/a/pass（壳内单内容流，无独立间隔面）
- E 排布：E1–E6 n/a/pass（内容排布归被加载控件）
- F 一致性：F1–F5 n/a（F4 文案语言归 R2-2a-F4-11 引用）
- G 设计器：n/a
- H 弹层：n/a

## 4. 发现条目

无新立项（本控件 pass）。已知族命中引用：

- F4 文案语言：错误前缀"错误："为 R2-2a-F4-11（dialog 卡）同根因实例；
- schema 响应性族（候选 #7）：本控件四条响应链（loadAction 重跑/setValue 切换/component:refresh）全部复检通过，无"数据变更后不更新"命中。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-dynamic-renderer` → carded（卡列填本路径）。
