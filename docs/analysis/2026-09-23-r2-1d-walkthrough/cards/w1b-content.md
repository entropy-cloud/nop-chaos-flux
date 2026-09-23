# [card] page:w1b-content

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w1b-content` ｜ **载体**: 域页面（content 包 demo：separator/spinner/progress/empty/card 经 SchemaRenderer 挂载）
- **矩阵裁剪**: simplified（理由：控件 demo 页，floor 矩阵。裁掉：A6 拖拽（无）、A7/H 弹层（无）、G n/a、glass（波内统一裁剪）、error 态独立触发（页面无失败路径；spinner 为静态演示态非异步窗口，A5 以 empty/error 回退结构检查替代））

## 1. 截图清单（状态矩阵）

| 状态                                    | light                                                                                    | dark                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| 默认 1280×800                           | `_tmp/visual-inspection-2026-09-23/r2-1d/w1b-content/w1b-content-default-wide-light.png` | `…/w1b-content-default-wide-dark.png`   |
| 默认 800×900                            | `…/w1b-content-default-narrow-light.png`                                                 | `…/w1b-content-default-narrow-dark.png` |
| 交互后（spinner 隐藏 + 卡片点击 + CTA） | `…/w1b-spinner-hidden-light.png`                                                         | `…/w1b-interacted-dark.png`             |
| hover/focus 抽样                        | card/card-action hover+focus computed style（程序化，见发现）                            | —                                       |
| disabled / 拖拽 / 弹层                  | n/a（见裁剪理由）                                                                        | n/a                                     |

## 2. A–H 维度勾选表

- A 交互：A1 **warn(R2-1d-A1-24)**（可点卡片 hover 零反馈；按钮 hover 无反馈=R2-1a-A1-01 既有族确认） A2 ✔（按钮 focus ring 同族；watch：可点卡片为 div 不可聚焦） A3 ✔（targetScan 0 命中，全部 ≥24） A4 ✔（无 disabled 演示；无伪 disabled） A5 ✔（spinner 有环+标签；empty 有图标/标题/描述/CTA 非空白） A6 n/a A7 n/a A8 n/a A9 ✔（Hide spinner→消失、卡片点击→`card-click-flag` "clicked"、empty CTA 可点，DOM 断言）
- B 颜色：B1 ✔（正文/标签对比正常） B2 ✔ B3 ✔（success 进度=绿，语义正确） B4 ✔（progress 指示走 `--success` 族令牌：light rgb(16,183,127) / dark rgb(38,217,157) 双主题换挡） B5 ✔（dark 全页随暗无破块） B6 ✔
- C 布局：C1 **warn**（一个 1px span 内容溢出 scrollWidth7>clientWidth1——视觉不可见，见误报表） C2 ✔（ndbg 压 Back=R2-1d-C2-01 既有族复现） C3 ✔ C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（块间距 16px 序列：16/16/16/16/16/16 全落栅格） D2 ✔（empty 图标-标题-描述-CTA 组内紧凑组间留白） D3 n/a D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 ✔（空态四件套齐全）
- F 一致性：F1 ✔ F3 ✔ F4 ✔（本页控件文案全英文） F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A1-24] 可点卡片 hover 零反馈（Card 组件无 hover 规则）

- **页面/路由**: `#/w1b-content`（`demo-card` "Clickable card"，onClick 翻转 flag）
- **主题/视口/状态**: light / 1280×800 / 指针 hover 强制态
- **截图**: `…/w1b-content-default-wide-light.png`（卡片）；hover 前后 computed style 为主要证据
- **目视描述**: 悬停可点卡片，边框、底色、阴影均无变化；与 w2a cards 集合（hover 有 `hover:border-primary/60`）行为不一致。
- **程序化证据**:
  - 探针: `stateProbe`（hover 前后读 `bg/borderColor/boxShadow/cursor`，`_tmp/r2-1d-probes/w1ab-probe.mjs` cardHover）
  - 输出: before=`bg rgb(255,255,255) / border rgb(225,231,239) / shadow 全零`，hover=完全同值；class 探针确认 `nop-card` 仅带 `nop-haptic`（`:active opacity .7` 按压反馈），无 `hover:` 规则。cursor=pointer 是唯一可供性。
- **对照基准**: 检查提示词 A1；w2a 同包 cards 集合卡片 hover 有边框反馈（包内自不一致）。
- **严重程度**: P3
- **用户影响**: 可点卡片可发现性弱；按压(:active)有反馈但悬停阶段无预告。
- **修复方向**: `card.tsx` 在 onClick 存在时追加 `hover:border-primary/60 transition-colors`（与 w2a cards-renderer 卡片项同一语言），或提取共享的 `data-clickable` 卡片样式。
- **归族**: local → R2-4 批（与 R2-1a-A1-01 primary 按钮 hover 族、w2a cards 同为「hover 可供性缺失」模式输入，但根因组件不同）
- **复核状态**: 未复核

## 4. 既有族确认（不另立）

- **R2-1a-A1-01（primary `<button>` hover 无反馈）**: 本页 `toggle-spinner`/`card-action`（default variant）hover 前后 `bg rgb(28,110,242)` 不变，根因 `[a]:hover:bg-primary/80` 仅对 `<a>` 生效——波内实例确认。
- **R2-1d-C2-01（ndbg 悬浮球压 Back 钮）**: 本页同构复现。
- **A3 小目标族**: 本页 targetScan wide/narrow 均 0 命中（Empty CTA 59×32、卡动作 64×32），不扩面。

## 5. watch-only（不立项）

- 可点卡片为 `<div>` 无 `role=button`/`tabindex`，键盘不可达（w2a cards 集合卡片项有 `role=button tabindex=0`，同包两处不一致）；a11y 域，建议随 A1-24 一并修。
- `demo-progress` 无 `[role=progressbar]` 可寻（base-ui 结构），showValue 文本 "100"（value 120 归一化正确，指示条满宽不溢出——探针证实 `indicatorW=514=trackW`）。
- "Hide spinner" 按钮在垂直栈内全宽拉伸：flux-react 默认栈宽基线，与 data-verify 卡 watch 记录同款，产品面出现再评估。

## 6. 误报排除记录

| 疑点                                     | 排除理由                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| C1 扫描 `span` scrollWidth7>clientWidth1 | 1px 宽装饰 span 内 7px 不可见内容（separator 基线的 stretch 内件），无任何可视影响         |
| progress 值文本 census 读到 "100x" 尾巴  | textContent 串接把 base-ui 隐藏 value 节点的残留并入；截图证实可视文本为 "100"，无渲染缺陷 |
| dark 交互截图右下主题 select 仍 "light"  | 取证口径固有限（直改 data-mode 不回写宿主控件），非页面缺陷                                |
