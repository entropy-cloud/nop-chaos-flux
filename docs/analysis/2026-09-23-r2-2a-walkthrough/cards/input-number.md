# [card] control:input-number

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-number` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：required+stepper / decorated prefix-suffix-precision）
- **矩阵裁剪**: simplified（matrixReason：单行数值输入，无弹层无拖拽；裁掉的状态：glass 皮肤、disabled/readonly 变体（lab fixture 未布置该态，renderer 支持 disabled 但走查矩阵以 fixture 渲染面为准）、min/max 边界钳制探针（fixture 有 min=0 未触发越界路径））

## 1. 截图清单

| 状态                      | light                                                                                                          | dark（真 data-mode）                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 默认 1280×800 s1/s2       | `_tmp/visual-inspection-2026-09-23/r2-2a/input-number/default-s1-light-1280.png` / `default-s2-light-1280.png` | `default-s1-dark-1280.png` / `default-s2-dark-1280.png` |
| focus（程序化 focus 后）  | `focus-s1-light-1280.png`                                                                                      | —                                                       |
| focus（键盘 Tab 后）      | `kb-focus-s1-light-1280.png`                                                                                   | —                                                       |
| stepper 点击后（10→15→5） | `stepper-clicked-s1-light-1280.png`                                                                            | —                                                       |
| 超长值（14 位 / 20 位）   | `longvalue-s2-light-1280.png` / `extreme-longvalue-s2-light-1280.png`                                          | —                                                       |
| error（空 required 提交） | `error-s1-light-1280.png`                                                                                      | `error-s1-dark-1280.png`                                |
| 默认 800×900              | `default-s1-light-800.png`                                                                                     | —                                                       |

## 2. A–H 维度勾选表

- A 交互：A1 pass（输入框 hover 无 border 变化为 shadcn Input 惯例，不按缺陷判）A2 pass（focus ring 经 box-shadow oklab ring 呈现且不被遮挡，`focus-s1-light-1280.png` 可见完整环）A3 **warn（已知族 A3 引用）** stepper 按钮 24×16（短边 16 <24）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 n/a（无弹层）A9 pass（stepper 点击 10→+5→15、两次−5→5，即时回显）
- B 颜色：B1 pass（label 12.61:1、prefix 7.46:1；dark label 目视可读——对比度探针 dark 下 bgComposited 误白为探针伪影，背景非 backgroundColor 链路，已截图复核）B2 pass B3 pass（error 红一致）B4 pass（走令牌）B5 pass（dark 默认/错误态截图复核无新缺陷）B6 n/a
- C 布局：C1 pass（全页 overflow 扫描 0 hits；20 位超长值 scrollWidth=clientWidth=916 无溢出）C2 pass C3 pass C4 pass（800 宽无溢出）C5 pass C6 n/a
- D 间隔：D1 pass（字段间隙 16px 落栅格）D2–D4 n/a/pass D5 pass（label 文本底→控件顶 9px，一致）D6–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用，不另立项）** stepper aria/文本"增加/减少"、错误文案"Count不能为空"为中文 F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新发现。本控件全部疑点命中已知族，见第 4 节。）

## 4. 已知族命中（引用，不另立项）

- **A3 小目标 <24px（已知族）**：`[data-slot="stepper-increase"]/stepper-decrease` 实测 24×16（w4-simple smallTargets 扫描，4 组 stepper 全中）。上下堆叠的 16px 高步进按钮为本族新实例证据。
- **F4-11 i18n zh-CN 回退（已知族）**：stepper 按钮 title/aria"增加/减少"；错误态文案"Count不能为空"（`error-s1-light-1280.png` / `error-s1-dark-1280.png` 红字可见）。
- **弹层 actions 左对齐（R2-3b 已知族）**：Submit 按钮渲染于 form body 尾部左对齐（`default-s1-dark-1280.png` 底部），引用不立项。
- **调试 chip（已知族）**：scope-debug 面板"调试/折叠"chip 及 JSON 面板占据场景块下半部（各 lab 页同），引用不立项。
- 计划内锚点复检通过：focus ring 可见不遮挡（A2）、error 态 border 红 + aria-invalid + role=alert 链路完整、dark 平价通过。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-number` → carded（卡列填本路径）；findings 归族后 → digested。
