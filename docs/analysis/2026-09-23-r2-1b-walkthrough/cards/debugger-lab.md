# [card] page:debugger-lab

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/debugger-lab` ｜ **载体**: lab 页（DebuggerLabPage：固定深色 DevTools 皮肤的四组 SectionCard（Panel Controls / Event Injection / Snapshot & Diagnostics / Automation API / Inspect by CID / Output）+ 浮动调试面板联动）
- **矩阵裁剪**: simplified（裁剪理由 matrixReason：本页为调试工作台，无画布面——**G 维度按波特定裁剪**：G1 选中态/G3 拖拽/G5 缩放/G6 undo n/a（无画布对象与历史栈），G4 n/a（无空画布态，Output 空态在 E6 评估），G7 n/a（无属性面板↔画布），G8 n/a（无画布）；浮动调试面板的状态可视化归 A9/B 维度取证，其布局归 C 维度。其余裁剪：glass 未抽查、面板 dark 态未单独截帧（面板为 nop-theme-root 自带主题，默认关闭态））

## 1. 截图清单（状态矩阵）

| 状态                            | light                                                                                      | dark                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-23/r2-1b/debugger-lab/debugger-lab-default-wide-light.png` | `…/debugger-lab-default-wide-dark.png`   |
| 默认 800×900                    | `…/debugger-lab-default-narrow-light.png`                                                  | `…/debugger-lab-default-narrow-dark.png` |
| 操作反馈（Get Snapshot→Output） | `…/debugger-lab-output-light.png`                                                          | —（同构）                                |
| 浮动面板 Show                   | `…/debugger-lab-panel-show-light.png`                                                      | —（裁剪，见上）                          |
| 面板 tab 切换（timeline）       | `…/debugger-lab-panel-tab-timeline-light.png`                                              | —                                        |
| Fire Error 注入后面板态         | `…/debugger-lab-panel-error-light.png`                                                     | —                                        |
| 弹层打开                        | n/a（本页无弹层）                                                                          | n/a                                      |
| 拖拽进行中                      | n/a（无拖拽）                                                                              | n/a                                      |
| loading/empty/error             | n/a（同步 API 页面；Output 空态见默认帧）                                                  | —                                        |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（按钮 hover:bg 加深，类 transition-all 常驻） A2 ✔（ui Button `focus-visible:ring-3 focus-visible:ring-ring/50` 类在 DOM——键盘焦点环由组件基线保证；程序化 `.focus()` 不触发 focus-visible 属浏览器正确行为，不判缺陷） A3 ✔（ActionButton 实测 ≥30px 高，smallTargets 扫描 0 命中） A4 n/a（无 disabled 面） A5 ✔（Output 空态=区块隐藏，非空白壳；无异步 loading 面） A6 n/a A7 n/a（无弹层） A8 n/a A9 ✔（Get Snapshot→Output pre 节点即时出现并渲染 JSON（探针 `preExists: true, text: "[Snapshot]…"`）；Fire Error 后浮动面板计数联动——截图三连）
- B 颜色：B1 **warn(R2-1b-B1-01)**（white/40 11px 辅助标签对比不足） B2 ✔ B3 ✔（红=Clear/Fire Error 破坏语义、琥珀=primary、绿=available 成功语义，页面内一致） B4 warn（整页 slate/amber/sky literal 皮肤不走令牌——watch-only，见下） B5 ✔（卡片固定深色皮肤双主题一致，dark 平价由构造保证；标题/正文/eyebrow 双主题实测 9.09–12.61 / 6.15–6.43 / 4.92–5.62 全部达标） B6 ✔
- C 布局：C1 ✔（1280 无横向溢出；html sh=829 页面级 29px 纵向滚动属正常文档流） C2 **warn**（浮动面板默认位 (24,24) 遮压页面 Hide 按钮——探针 `covered: true`；浮动 overlay 遮压内容属其本性且有拖拽/收起手段，记观察不立项） C3 ✔（左 3 卡/右 3 卡双列，主次清晰） C4 ✔（800 视口塌单列 `grid-template-columns: 670px`，卡片纵排不挤） C5 ✔ C6 n/a（无 canvas 元素）
- D 间隔：D1 ✔（卡片 gap-5、卡内按钮 gap-2 成栅格） D2 ✔（组内 gap-2 < 组间 gap-5） D3 n/a D4 ✔ D5 n/a D6 n/a D7 ✔ D8 ✔（卡 p-[18px] 一致）
- E 排布：E1 ✔（DevTools eyebrow+标题+说明 3 秒可答） E2 ✔（primary 琥珀/危险红/普通灰三档分明） E3 ✔（控件左→右、输出右下，动线顺） E4 ✔ E5 ✔（六卡统一圆角深卡+琥珀标题语言） E6 ✔（Output 空态为空但触发即有内容，符合 lab 页口径）
- F 一致性：F1 ✔（按钮三态样式全页统一） F2 n/a F3 ✔ F4 ✔（API 名/控制器 id 术语一致） F5 n/a
- G 设计器：**n/a（按矩阵裁剪注明——无画布面，逐项裁剪理由见卡头 matrixReason）**
- H 弹层：n/a（本页无弹层；浮动面板非 Dialog/Sheet/Drawer/Popover 四族）

## 3. 发现条目

### [R2-1b-B1-01] white/40 极小号辅助标签（"Active Tab"、CID helper）对比度约 3.4:1，低于小字 4.5:1

- **页面/路由**: `#/debugger-lab`（Panel Controls "ACTIVE TAB" 标签、Inspect by CID 说明文字、Clear output 等同款 `text-white/40` 11px 文本）
- **主题/视口/状态**: light+dark（双主题同值——固定深色卡上） / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/debugger-lab/debugger-lab-default-wide-light.png`（ACTIVE TAB 与 CID helper 行）
- **目视描述**: 两组 11px 白色 40% 透明度说明文字在深色卡上偏灰弱，需凑近辨认。
- **程序化证据**:
  - 探针: computed color 采样 + 手工合成计算（`debugger-lab-out.json` → colorsLight/colorsDark；注：oklab 前景与渐变卡底无法被自动探针精确合成，探针输出无效值已弃用，以下为手算复核）
  - 输出: 前景 = white 40% α 合成到 slate-900/94 卡底（≈rgb(28,35,45)）得 ≈rgb(119,124,135)，对比 ≈**3.4:1** < 4.5:1（11px 小字阈值）；同页 amber 标题/正文/h1 均达标（手算 9–12:1）
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；检查提示词 B1
- **严重程度**: P3（辅助说明文字、非任务关键信息；但同款用量多、全部低于线）
- **用户影响**: 低视力/强光环境下辅助说明（如何用 CID、当前 tab 提示）不可辨。
- **修复方向**: `debugger-lab-page.tsx` 内 `text-white/40` 统一提到 `text-white/60`（合成后 ≈5.4:1）或改 `text-slate-400`；字号 ≥12px 更佳。
- **归族**: local → R2-4 批（debugger-lab 页面级）
- **复核状态**: 未复核

### watch-only（不立项）

- **B4 令牌外皮肤**：全页用 slate/amber/sky/red literal 类构建固定 DevTools 皮肤（源码 debugger-lab-page.tsx SectionCard/ActionButton），不消费 --nop-\*/语义令牌。lab 页性质 + 双主题自洽 + 页内一致，按"replica/皮肤有意差异"误报口径不立项；若后续推行 lab 页令牌化再统一处理。
- **C2 浮动面板遮压**：面板 Show 后遮压页面自身 Hide 按钮（`covered:true`，DOM click 绕过取证）。浮动 overlay + 默认位 (24,24) + 页面控件区同在左上所致；面板可拖拽/收起，功能可达，仅记录交互摩擦。
- Output 区在无输出时仅剩标题（空态无占位说明）——lab 页可接受，E6 判 pass 附注。

## 4. 误报排除记录

| 疑点                                                 | 排除理由                                                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| light 模式下页面仍是深色卡                           | 固定 DevTools 皮肤为该 lab 页有意设计（双主题一致、页内自洽），按皮肤差异误报口径不报；B5 dark 平价由构造满足                       |
| 探针输出 card-title 18.17:1 / cid-input 1.0:1 矛盾值 | oklab/oklab-alpha 前景与渐变底无法被 rgb 探针正确合成，自动对比值作废；已用截图评审 + 手工合成替代（见 B1-01 手算），不采信矛盾数值 |
| G 维度全空是否漏查                                   | 无画布面对象，逐项裁剪理由已在卡头 matrixReason 注明（波特定允许）                                                                  |
| 面板 Show 后 Hide 点不到                             | 非页面缺陷：浮动面板 intercepts pointer events 属 overlay 本性，探针已用 DOM click 完成闭环并记 C2 watch                            |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：B1-01 → R2-4 local 批；
- 批内复检通过后 → `verified`。
