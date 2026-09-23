# [card] page:ai-citations

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-citations` ｜ **载体**: 域页面（flux-renderers-ai P3 demo：ai-citations inline + list 双模式，`[N]` 标记 → 来源卡）
- **矩阵裁剪**: simplified（matrixReason：单控件静态 demo，唯一中间态为来源卡 Popover（点击开合），已按 H 弹层口径核查；无拖拽/无异步 loading；~375 档未跑）
- 本页实际裁掉的状态：glass 皮肤、`[N,M]` 复合标记逐一枚举（inline 渲染逻辑同路径）、source 缺失空态卡（探针核实空态文案存在）

## 1. 截图清单

| 状态                      | light                                                                    | dark                      |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| 默认 1280×800             | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-citations/default-light.png` | `default-dark.png`        |
| 默认 ~800 宽              | `default-narrow-light.png`                                               | `default-narrow-dark.png` |
| sup hover（500ms）        | `hover500-light.png`（无卡片出现 → A1-01 证据）                          | —                         |
| 来源卡打开（点击 sup[1]） | `click-open-light.png`（长 URL 右侧溢出可见）                            | `citation-hover-dark.png` |
| 点击来源链接 → toast      | `citation-click-toast-light.png`、`toast-recheck-light.png`              | —                         |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(R2-1d-A1-01)**（宣传 hoverable，hover 无效）A2 pass（sup 触发钮 focus 可达，Popover Esc 可关——探针核实 `afterEsc:false`）A3 **已知族**（sup 触发钮 9×24 <24px → R2-1a A3 小目标族）A4 n/a A5 n/a A6 n/a A7 pass（Popover 打开有内容/有关闭路径）A8 n/a A9 pass（点击来源链接 → toast “List source #1 → …” 可见，探针证实）
- B 颜色：B1 pass B2 pass B3 pass B4 pass（链接 primary 令牌色）B5 pass（dark 卡片 bg-popover 令牌化）B6 pass
- C 布局：C1 **fail(R2-1d-C1-01)**（卡片内长 URL 溢出容器右缘）C2 pass C3 pass C4 pass（800px 下两模式纵排正常）C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass（inline 卡片区 + list 区分组清晰）E6 n/a
- F 一致性：F1 pass F2 n/a F3 pass（list 模式与 inline 来源卡字段结构一致）F4 fail→**R2-1d-F4-01**（跨页已知）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（Popover 为 content-sized hover 浮层，styling-system.md 明文在阶梯之外）H2 n/a H3 pass（卡高 111px < 视口）H4 pass（无 header 重叠）H5 pass H6 pass（卡内 title/snippet/url 三段间距 4px 栅格）H7 pass（p-3 内边距）H8 n/a（内容短不滚动）H9 pass（800px 下卡片不溢出视口，align=start 贴 sup 左缘）

## 3. 发现条目

### [R2-1d-C1-01] 来源卡长 URL 溢出弹层右缘 17px（双主题复现）

- **页面/路由**: `#/ai-citations`（inline 与 list 模式的来源卡均含长 GitHub URL）
- **主题/视口/状态**: light+dark / 1280×800 / 点击 sup 打开来源卡
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-citations/click-open-light.png`（URL 尾部画出卡片右缘外）
- **目视描述**: 卡片内的完整 URL 是不可断行的长串，右侧溢出 Popover 圆角边界，文字被悬空画在卡片外。
- **程序化证据**:
  - 探针: link/pop `getBoundingClientRect()` + computed `wordBreak/overflowWrap`
  - 输出: `linkRight: 955 > popRight: 938`（溢出 17px）；`wordBreak:'normal', overflowWrap:'normal'`；dark 下 overflow 扫描同型命中（popover content sw306/cw288、article sw294/cw264）。
- **对照基准**: 检查提示词 C1（文本溢出容器）；Design QA 内容类（长 token 断行）。
- **严重程度**: P2
- **用户影响**: 来源 URL 视觉破版、可读性差；深浅主题一致复现。
- **修复方向**: `packages/flux-renderers-ai/src/renderers/ai-citations.tsx` CitationBody 的 `<a data-slot="ai-citation-url">` 加 `break-all`（或 `break-words min-w-0`），并给卡片容器加 `overflow-hidden` 兜底。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-A1-01] 文案承诺 "hoverable" 来源卡，实际 hover 无效仅点击可开

- **页面/路由**: `#/ai-citations`（页面提示 "[N] markers → hoverable <sup> source cards"；路由描述同）
- **主题/视口/状态**: light / 1280×800 / sup 悬停 500ms
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-citations/hover500-light.png`（悬停中无卡片）
- **目视描述**: 按页面指引把鼠标悬到 [1] 上没有任何反馈；必须点击才出现来源卡（shadcn Popover 默认 click 触发）。
- **程序化证据**:
  - 探针: hover 500ms 后查 `[data-slot="ai-citation-card"]` 可见性；click 后复测
  - 输出: `afterHover500:false`，`afterClick:true`；点击 URL 链接 toast 正常 → 绑定本身无恙，纯触发方式与文案不符。
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）/E3（可供性）；文案-行为一致性。
- **严重程度**: P3（功能可达，指引误导；交互可发现性受损）
- **用户影响**: 按提示悬停的用户判定“功能坏了”；来源卡触达率下降。
- **修复方向**: 二选一：① demo 文案与路由描述改 "clickable"；② `ai-citation-trigger` 包 `HoverCard` 或给 Popover 加 hover-open（`onMouseEnter` 受控 open），保留点击锁定。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger。
