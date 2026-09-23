# [card] page:w1a-content

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w1a-content` ｜ **载体**: 域页面（content 包 demo：markdown/html/link/image/json-view 经 SchemaRenderer 挂载 + XSS sanitize 门禁说明卡）
- **矩阵裁剪**: simplified（理由：控件 demo 页，按波口径 floor = light+dark × 1280/800 × 元素态抽样 × 中间态有则必查。裁掉：A6 拖拽（无）、A7/H 弹层（无 Dialog/Sheet，popover 仅 json-view 复制 toast 无浮层）、G 设计器 n/a、glass 皮肤（波内统一裁剪）、loading/empty/error 独立触发态——image 错误回退已覆盖 error 态、html/json-view 空态已在默认页呈现）

## 1. 截图清单（状态矩阵）

| 状态                             | light                                                                                    | dark                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 默认 1280×800                    | `_tmp/visual-inspection-2026-09-23/r2-1d/w1a-content/w1a-content-default-wide-light.png` | `…/w1a-content-default-wide-dark.png`                               |
| 默认 800×900                     | `…/w1a-content-default-narrow-light.png`                                                 | `…/w1a-content-default-narrow-dark.png`                             |
| dark 放大（json-view 白底块）    | —                                                                                        | `…/w1a-jsonview-dark-zoom.png`、`…/w1a-fallback-json-dark-zoom.png` |
| hover/focus 抽样                 | link hover 前后 computed style 无差异（程序化，未单独截帧）                              | —                                                                   |
| disabled / 拖拽 / 弹层 / loading | n/a（见裁剪理由）                                                                        | n/a                                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(R2-1d-A1-22)**（link 无 hover 反馈/无样式可供性） A2 ✔（json-view 复制钮、Back 钮同族 focus ring） A3 **warn（既有族）**（`demo-link` 高 20px、json-view "collapse JSON" 控件 11×20，均命中 R2-1a 起已裁定的 A3 小目标族，归族不另立） A4 n/a A5 ✔（html 空态 "No HTML content"、json-view 空态 "No data to inspect" 均有文案非空白；image 错误回退条呈现） A6 n/a A7 n/a A8 n/a A9 ✔（link onClick setValue → `link-click-flag` 翻转，程序化断言）
- B 颜色：B1 **fail(R2-1d-B1-23)**（missing image 回退文字对比不足） B2 ✔ B3 ✔（错误回退=红，语义正确） B4 ✔（颜色均走令牌；唯一字面色源在 react-json-view-lite 第三方样式，归 B5 条目） B5 **fail(R2-1d-B5-20)**（dark 下 json-view 整块白底，第三方硬编码样式） B6 n/a
- C 布局：C1 ✔（overflow 扫描 wide/narrow × light/dark 全空） C2 ✔（ndbg 悬浮球压 Back 钮为已裁定 R2-1d-C2-01，波内复现确认） C3 ✔ C4 ✔（800 下 md:grid-cols-2 仍双列，内容不破版可读） C5 ✔ C6 n/a
- D 间隔：D1 ✔（渲染块间距 16px 落栅格） D2 ✔ D3 n/a D4 n/a D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔（左渲染右说明，3 秒可答） E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 ✔（空态文案有引导）
- F 一致性：F1 ✔ F3 ✔（空态=一行 muted 文案，跨块一致） F4 **warn**（json-view 复制钮文案「复制」为 flux-i18n 中文默认值，宿主页英文——归 R2-1d-F4-01 i18n 族，波内实例确认） F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-B5-20] dark 下 json-view 整块白底（react-json-view-lite 硬编码 light 样式）

- **页面/路由**: `#/w1a-content`（`demo-json-view` 块）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w1a-content/w1a-content-default-wide-dark.png`（页面底部）、`…/w1a-jsonview-dark-zoom.png`
- **目视描述**: dark 页面其余全部随暗，唯独 JSON 查看块保持亮白底深字，刺眼且与 dark 割裂。
- **程序化证据**:
  - 探针: dark 下遍历 `demo-json-view` 子树读 computed backgroundColor（`_tmp/r2-1d-probes/w1a-probe.mjs`）
  - 输出: 内容格 `div._2IvMF._GzYRV` bg=`rgb(238,238,238)`（CSS Modules 哈希类，react-json-view-lite `defaultStyles` 预设）；同块内仅复制钮走令牌（oklab 0.3 dark 底）。溯源 `packages/ui/src/components/ui/json-viewer.tsx` L24 `style={defaultStyles}` 直接消费第三方硬编码样式，未按 data-mode 切换。
- **对照基准**: 检查提示词 B5（dark 专有缺陷：纯白底块）；theme-compatibility.md 令牌化规约。
- **严重程度**: P2
- **用户影响**: dark 用户查看 JSON 数据（调试/详情场景高频）遭遇整块白底，视觉负担大；是页面内最大面积的主题破块。
- **修复方向**: `json-viewer.tsx` 弃用 `defaultStyles`，改为按 `--nop-*`/语义令牌自定义 `react-json-view-lite` 的 darkStyle 或在 `nop-json-viewer` 标记上用令牌化 CSS 覆盖 `.json-viewer` 各嵌套类（bg-card/text-foreground/边框 token）。
- **归族**: local → R2-4 批（dark 平价增量；根因=第三方组件样式未令牌化，与已裁定的 `--secondary` 令牌对破损（R2-1c）不同根因）
- **复核状态**: 未复核

### [R2-1d-C1-21] markdown GFM 表格零样式塌缩（16.6px 宽、无格线无内边距）

- **页面/路由**: `#/w1a-content`（`demo-markdown`，schema 明示 "GFM table below"）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `…/w1a-content-default-wide-light.png`（"ab / 12" 两行挤在左上）、dark 同构
- **目视描述**: 表格不成为表格——表头 "a b" 连成 "ab"，数据 "1 2" 连成 "12"，无边框无列分隔，阅读不可辨。
- **程序化证据**:
  - 探针: `demo-markdown` 内 `table` 元素 computed style（`_tmp/r2-1d-probes/w1a-probe.mjs`）
  - 输出: `<table>` 存在（borderCollapse=collapse）但 width=**16.6px**、th/td `border=0px`、`padding=0px`、无 header 底色——GFM 表格渲染为裸 `<table>`，content 包无任何 markdown typography 基线 CSS（`flux-renderers-content/src/styles.css` 仅 separator/progress/diff-view 规则）。
- **对照基准**: 检查提示词 C1（文本溢出容器/画布被裁的近邻：内容塌缩不可辨）；markdown 渲染器行业惯例（GFM 表格至少格线+单元格 padding）；`markdown.tsx` L137 注释自述"GFM tables scroll instead of blowing out the layout"说明有意图无实现。
- **严重程度**: P2
- **用户影响**: 任何经 markdown 渲染的表格（release notes、AI 输出、文档块）在该场景下信息不可读；表格是 markdown 高频语法。
- **修复方向**: 在 `flux-renderers-content` 增加 `.nop-markdown` 基线 CSS：`table { width:100%; border-collapse:collapse } th,td { border:1px solid var(--border); padding:6px 12px } th { background: var(--muted); text-align:left }`（走令牌，随主题）。
- **归族**: local → R2-4 批（单包根因，markdown/复用 sanitize 门禁的 w3d editor 预览等同消费面受益）
- **复核状态**: 未复核

### [R2-1d-A1-22] link 渲染器无链接可供性（同正文色、无下划线、hover 零反馈）

- **页面/路由**: `#/w1a-content`（`demo-link` "View detail"）
- **主题/视口/状态**: light+dark / 1280×800 / hover 强制态
- **截图**: `…/w1a-content-default-wide-light.png`（"View detail" 与正文无法区分）
- **目视描述**: 链接与正文完全同貌——同色、无下划线、无 hover 变化，仅光标变 pointer；不悬停无法知道可点。
- **程序化证据**:
  - 探针: hover 前后读 computed `color/textDecorationLine`（`_tmp/r2-1d-probes/w1a-probe.mjs` linkHover）
  - 输出: before=`none/rgb(2,8,23)`，after=`none/rgb(2,8,23)`——零变化；源码 `flux-renderers-content/src/link.tsx` 仅发 `nop-link` marker，无任何视觉类，`styles.css` 亦无 `.nop-link` 规则（widget 渲染器应自完整样式，违反 styling-system.md「Widget Renderer Styling」契约）。
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）；WCAG 2.4.4 链接可辨识惯例（非纯 color 依赖也需至少一种区分维度）；styling-system.md widget 渲染器自带完整视觉设计。
- **严重程度**: P2
- **用户影响**: 链接可点性完全不可供；导航类内容（详情跳转、外链）点击率/可发现性受损。
- **修复方向**: `link.tsx` 增加默认可供性类（如 `text-primary underline-offset-4 hover:underline`，与 ui Button `link` variant 同语言），或 `styles.css` 增加 `.nop-link` 基线规则；`disabled` 态已有 opacity-60 可保留。
- **归族**: local → R2-4 批（单组件根因）
- **复核状态**: 未复核

### [R2-1d-B1-23] image 错误回退文字对比不足（light 3.78:1 / dark 3.62:1）

- **页面/路由**: `#/w1a-content`（`demo-image-error` 加载失败回退条）
- **主题/视口/状态**: light+dark / 1280×800 / 默认（src 404 自动触发）
- **截图**: `…/w1a-content-default-wide-light.png`（"missing image" 红字条）、dark 同构
- **目视描述**: 淡红底条上一行 12px 红字 "missing image"，light 下偏浅、dark 下偏暗，均临界。
- **程序化证据**:
  - 探针: 回退元素 computed color 与复合背景 WCAG 对比度（`_tmp/r2-1d-probes/w1a-probe.mjs` / `w1ab-probe.mjs` darkFallback）
  - 输出: light `rgb(239,67,67)`/白底 = **3.78:1**；dark `rgb(217,38,38)`/`rgb(15,23,41)` = **3.62:1**；均 <4.5:1（12px 非大字）。
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；检查提示词 B1。
- **严重程度**: P3（一次性错误态、短文案；但错误信息本身可读性重要，随族升级）
- **用户影响**: 图片加载失败时错误说明辨识吃力；弱光/低分屏更差。
- **修复方向**: 回退文字在 light 用 `--destructive` 的 600 档加深（≥4.5:1），dark 提亮至 success 同族的 300–400 档（dark 实测 success 亮色 6.4:1 可参照）；或将回退文字提到 13px/500。
- **归族**: local → R2-4 批（B1 对比度族输入；与 R2-1c-B1-01（dark primary 按钮白字 3.26:1）同为「色彩对比」族输入，根因各自独立）
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                         | 排除理由                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 左上角悬浮球压 "Back to Home" 按钮           | 已裁定族 R2-1d-C2-01（playground ndbg debugger 悬浮球，波内 7/7 页复现，systemic → R2-3）；本页 elementsFromPoint 复现同构（pill 与 Back 重叠），不另立 |
| dark 截图右下主题切换器仍显示 "light"        | 探针以 `setAttribute('data-mode')` 直改根节点、不同步宿主 select——取证口径固有限，非页面缺陷                                                            |
| markdown 列表缩进偏大（~80px）               | react-markdown 默认 ul padding，跨主题一致，属正常排版                                                                                                  |
| json-view "collapse JSON" 控件 11×20 命中 A3 | 属 ui JsonViewer（react-json-view-lite）内部控件，归已裁定的 A3 小目标族，随族处理                                                                      |
| script 标签是否真被 strip                    | 属功能门禁非视觉走查面；demo 页 `window.__W1A_XSS_HTML__` 断言已由包测试覆盖                                                                            |
