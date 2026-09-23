# [card] page:graph-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/graph-demo` ｜ **载体**: 域页面（Graph Viewer：Trace Hierarchy dagre LR 卡 + Flow Layout 卡 + Malformed Data 卡 + Empty Data 卡；SVG DOM 渲染，非 canvas）
- **矩阵裁剪**: simplified（matrixReason：页面无弹层 → H n/a；非编辑型设计器（viewer）→ G4/G6/G7 按 viewer 口径裁剪；G1 节点点击选中态未单独取证（selectable 卡的选中视觉反馈未程序化断言，已列入存疑项）；G5 缩放已程序化验证）
- 本页实际裁掉的状态：弹层、glass 皮肤、节点点击选中态视觉（focusNode 联动已验，直接点击选中未验）

## 1. 截图清单

| 状态                  | light                                                                             | dark                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 默认 1280×800         | `_tmp/visual-inspection-2026-09-23/r2-1c/graph-demo/graph-demo-default-light.png` | `graph-default-dark.png`                                                                                             |
| 默认 ~800 宽          | `graph-narrow-light.png`                                                          | —（窄视口仅 light 拍摄；dark 壳层与 1280 共用同一令牌链路，裁剪理由：窄视口风险点为布局折叠，dark 差异不在布局维度） |
| Focus Error Node 联动 | `graph-focus-error-light.png`                                                     | `graph-focus-error-dark.png`                                                                                         |
| 缩放 2 次（G5）       | `graph-zoom2x-light.png`                                                          | —（缩放行为与主题无关，light 已程序化坐实）                                                                          |
| Search "call"         | `graph-search-light.png`                                                          | dark 全页图中含搜索胶囊（`graph-focus-error-dark.png` 左上）                                                         |
| hover/focus-visible   | pass（搜索输入/按钮为 shadcn 族静态核）                                           | —                                                                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 **warn**（缩放/fitView 按钮 32×32 达标 pass；Malformed/Empty 卡无控件 n/a）A4 n/a A5 pass（Empty 卡 "暂无数据"、Malformed 卡悬垂边跳过 + dev 告警不抛错）A6 n/a A7 n/a A8 pass（Focus Error/Search 按钮为图形操作的按钮替代）A9 pass（focusNode 后视口 pan/zoom、搜索后 1/5 计数胶囊出现）
- B 颜色：B1 **fail(R2-1c-B1-01)**（dark 页头 1.07:1）B2 pass B3 pass（light：Policy Check=amber 边框+amber badge、API Call=red、Compose Reply=green、其余中性灰——状态语义与 badge level 同源一致；边全部中性灰无语义诉求）B4 pass（边框/badge 走 level 类与令牌）B5 **fail(R2-1c-B5-01)**（dark 页头，同 map 卡）、**fail(R2-1c-B5-02)**（dark info badge 1.5:1）B6 pass
- C 布局：C1 pass（四卡均无横向溢出）C2 **fail(R2-1c-C2-01)**（hierarchy 尾节点滑入控制条下方）C3 pass C4 pass（800px 单列折叠正常）C5 pass C6 n/a（SVG DOM 自适应，无 canvas 尺寸问题）
- D 间隔：D1–D5 pass（卡片栅格 gap-4）D6 n/a D7 pass D8 pass
- E 排布：E1 **warn(R2-1c-E1-01)**（hierarchy 首屏主内容不可读）E2 pass E3 pass E4 pass（同列节点左缘对齐 ≤1px）E5 pass E6 pass
- F 一致性：F1 pass（控件按钮组两卡同构）F2 pass F3 pass F4 pass F5 n/a
- G 设计器（viewer 口径）：G1 warn（未取证，见裁剪说明）G2 pass（节点 hover cursor）G3 n/a G4 pass（Empty 卡有引导）G5 pass（缩放 61→88px 程序化坐实、fitView 按钮在列）G6 n/a G7 n/a G8 pass（dark 节点 rgb(248,250,252) on rgb(15,23,41) 可读）
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-E1-01] hierarchy 布局默认视图节点仅 61×27px，标签完全不可读

- **页面/路由**: `#/graph-demo`（Trace Hierarchy 卡，dagre LR + node region）
- **主题/视口/状态**: light+dark / 1280×800 / 默认进入即可复现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/graph-demo/graph-demo-default-light.png`（左上一排微型节点，文字缩至不可辨）
- **目视描述**: 六个节点被压成 ~61×27px 的小块（节点文本 "Agent Plan/Web Search/…" 仅剩模糊线条），卡片其余 ~80% 面积空白；同数据的 Flow Layout 卡节点为 184×56px 清晰可读。
- **程序化证据**:
  - 探针: `.nop-graph-node` rect 遍历 + bbox 覆盖率 + 缩放对照
  - 输出: hierarchy 节点 `w:61, h:27`（×6），bbox 381×61 / 覆盖率 X 0.91 Y 0.25；flow 卡同内容节点 `w:184, h:56`；node region schema 声明 `min-w-40`（160px）未生效于 hierarchy 布局；G5 探针证明视口缩放可放大节点（2 次放大后 61→87.8px），即默认态既未 fitView 也未按内容尺寸布局。Focus Error Node 点击后节点被缩放至可读（93px+），进一步证明默认视图缺一次 fit。
- **对照基准**: 检查提示词 E1（首屏可答三问——当前"图里是什么"不可答）、G 系画布可读性；dagre/antv G6 等图查看器默认 fitView 惯例。
- **严重程度**: P1（首屏关键信息不可读）
- **用户影响**: 打开页面第一眼无法读取任何节点文字，必须手动放大或点 Focus 按钮；核心演示目的（trace 执行流）在默认态失效。
- **修复方向**: `flux-renderers-graph` hierarchy 布局初始化后调用 fitView（控件已有 `适应视图` 能力，默认态复用同一变换）；同时排查 foreignObject/节点容器 `min-w-40` 在 dagre 量测时丢失导致节点固有宽只有文本换行宽的问题。
- **归族**: local → R2-4 批（graph renderer 单根因；若 R2-1 其他域图组件有同症状可升 systemic）
- **复核状态**: 未复核

### [R2-1c-C2-01] hierarchy 尾节点滑入浮动控制条下方被遮挡

- **页面/路由**: `#/graph-demo`（Trace Hierarchy 卡）
- **主题/视口/状态**: light+dark / 1280×800 / 默认（放大后同样存在）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/graph-demo/graph-demo-default-light.png`（"Compose Reply" 右半压在控制条下）、`graph-focus-error-light.png`（"Compose" 文字被控制条截断更明显）
- **目视描述**: 图的最后一个节点与右侧浮动控制条（zoom/fit/布局切换）发生重叠，节点被压住。
- **程序化证据**:
  - 探针: 控制条 rect 与各节点 rect 求交
  - 输出: rail `{x:360, w:79}`（360–439），"Compose Reply" 节点 `{x:372, w:61}`（372–433）整体落入 rail 区间 → 求交命中；其余 5 节点不相交。
- **对照基准**: 检查提示词 C2（浮层压内容）；图查看器惯例（viewport 内容应避让常驻控件或控件避让内容）。
- **严重程度**: P2
- **用户影响**: 尾节点信息不可读也不可完整点击；用户可能误认为图中只有 5 个节点。
- **修复方向**: hierarchy LR 布局的 fitView padding 右侧预留控制条宽度（~90px），或控制条改为底部居中悬浮并半透明避让。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-B5-01] dark 模式页头硬编码 bg-white，标题对比度 1.07:1 不可见

- **页面/路由**: `#/graph-demo` 页头（与 `#/map-demo` 页头同根因同字面类）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/graph-demo/graph-default-dark.png`（左上标题成暗影文字）
- **目视描述**: dark 下页头白底保留，"Graph Viewer Demo" 浅色字几乎不可见，返回箭头同灭。
- **程序化证据**:
  - 探针: `getComputedStyle` 页头容器与 h1
  - 输出: barBg `rgb(255,255,255)`（class `bg-white`）、h1Color `rgb(230,236,243)`，对比度 ≈1.07:1；light 下正常（h1 rgb(33,53,71) on white ≈12:1）。
- **对照基准**: WCAG 1.4.3；检查提示词 B5 dark 平价、B4 字面色。
- **严重程度**: P2
- **用户影响**: dark 用户读不到页标题；系统性——map/graph 两页同一字面类。
- **修复方向**: `apps/playground/src/pages/graph-demo.tsx` 页头 `bg-white` → `bg-background`。
- **归族**: systemic → R2-3 批（与 map-demo 卡 R2-1c-B5-01 同族合并跟踪）
- **复核状态**: 未复核

### [R2-1c-B5-02] dark 模式 info 级节点徽标前景/背景同为浅色，对比度 ≈1.5:1

- **页面/路由**: `#/graph-demo`（Trace Hierarchy / Flow 卡节点内 badge，level=info 分支）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/graph-demo/graph-focus-error-dark.png`（Extract Entities 下 model_call 徽标成实心浅紫块无字）
- **目视描述**: dark 下 agent/tool_call/model_call 三种 info 徽标变成浅紫实心胶囊、文字消失；warning/danger/success 徽标正常可读。
- **程序化证据**:
  - 探针: `.nop-graph .nop-badge` computed color/bg 采样
  - 输出: info 徽标 `color: rgb(178,206,251)` on `bg: rgb(203,186,252)` → 对比度 ≈1.5:1；同屏 warning `rgb(237,175,69)` on amber/20、danger `rgb(217,38,38)`、success `rgb(38,217,157)` 均可读。light 下 info 徽标正常（深紫字浅紫底）。
- **对照基准**: WCAG 1.4.3；检查提示词 B5（dark 专有不可读缺陷）。
- **严重程度**: P2
- **用户影响**: dark 用户丢失节点类型信息（占节点语义的一半）；warning/danger/success 正常唯独 info 失效，易被当成"渲染坏了"。
- **修复方向**: badge info 级 dark 变量的前景/背景配对（`@nop-chaos/ui` badge cva 的 info 档 dark token）——核查该配对在非 graph 页 dark 下是否同样异常，若同异常升 systemic 并入 R2-4 dark 族。
- **归族**: local → R2-4 批（跨页面是否复现存疑，复核时抽查 1-2 个使用 info badge 的页面）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本卡路径）；
  findings 归族：B5-01 → systemic（R2-3，与 map 页头同族）；E1-01/C2-01/B5-02 → local（R2-4）；
  批内复检通过后 → `verified`。
