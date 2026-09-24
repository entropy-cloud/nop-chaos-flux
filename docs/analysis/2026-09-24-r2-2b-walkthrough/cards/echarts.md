# [card] control:echarts

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/echarts` ｜ **载体**: lab 页（MultiScenarioLabPage，18 场景：dataset 绑定+换批钮 / svg renderer 变体 / click→action / 显式 dark 主题透传 / sankey / treemap / tree / boxplot / gauge / funnel / radar / map / candlestick / graph / sunburst / themeRiver / custom renderItem / 显式空态）
- **矩阵裁剪**: simplified（matrixReason：Canvas 渲染（场景 2 为 svg 变体），DOM 探针只能到 canvas 边界，图内文字/配色以 PNG 像素采样判读；裁掉的状态：glass 皮肤、18 图型的逐一 tooltip/hover 态（echarts 原生行为，非渲染器契约面）、resize 拖拽（视口切换等价覆盖）、`renderer:'svg'` 变体深度走查（结构确认即可）；已覆盖 light+dark（真 data-mode，含加载后切 dark 的重主题验证）、1280+800 双视口、换批重设 option、click→action、显式空态、显式 dark 主题透传场景存在性）
- **探针**: `_tmp/r2-2b-probes/w3-echarts.mjs`（主探针：C6 DPR 几何 + dark 像素采样 + 交互，`out-w3-echarts.json`）、`probe-ech2.mjs`（空态 DOM 契约 + svg 变体，`out-w3-ech2.json`）
- **探针方法注记**: ①canvas 图内文字无法 DOM 取证——dark 判读走 PNG 解码像素采样（本卡首采样条带取位过窄未含 y 轴文字，以全页截图目视+图内灰阶字形复核，dark 主题成立）；②空态场景无 `canvas` 元素（echarts 空 option 不出 canvas），契约以 `[data-empty]` 属性判读；③echarts 内部测量 svg 的 scrollWidth 假阳性（overX 7–30）误报排除

## 1. 截图清单

| 状态                               | light                                                                    | dark（真 data-mode）                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 默认 1280（首屏 dataset 绑定柱图） | `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/default-1280-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/default-1280-dark.png`（加载后切 dark：轴/图例自动重主题） |
| 默认 800×900                       | `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/default-800-light.png`  | —（窄视口仅 light 复跑）                                                                                    |
| click→action 点击后                | —                                                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/after-click-dark.png`（无可见反馈，notify no-op 族）       |
| dataset 换批后                     | —                                                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/after-swap-dark.png`                                       |
| 显式空态（data-empty=true）        | —                                                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/empty-dark.png`（320px 空白区）                            |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（canvas 图非 DOM 控件；按钮归 button 卡）A5 **warn(R2-2b-A5-93)**（显式空态=纯空白 320px 区，无任何空态提示；data-empty 契约本身成立）A6–A8 n/a **A9 warn（已知族注记）**：click→action 点击后无可见反馈——`notify` 在 lab 沙箱 env 为 no-op 吞 toast（lab 载体与环境基建族既有裁定），动作桥本身无法目视证伪，交互键可注册但断言落空；dataset 换批钮点击→option 重设（canvas 重绘，截图级可辨）
- B 颜色：B1–B2 n/a（canvas 内文字以像素目视判读：dark 轴刻度/图例文字浅灰可读，automatic flux theme 映射 CSS 变量成立）B3 n/a B4 n/a **B5 pass**（dark 平价：default 图加载后切 `data-mode=dark` 自动重主题（轴/网格/图例均暗色化）；另设"Explicit theme passthrough (dark)"场景；无 dark 白底块）B6 n/a
- C 布局：**C6 pass**（16 个 canvas 全部 `canvas.width/height ≈ rect×DPR`（w/h ratio ∈ 0.98–1.02），无写死宽高比拉伸；场景 2 svg 变体 950×320 与容器一致）C1 pass（docOverX 0；内部测量 svg 假阳性排除）C2 pass C3 pass C4 pass（800 视口画布等比缩放）C5 pass
- D 间隔：D1 pass（场景块节奏同 lab 其他页）D2–D8 n/a/pass
- E 排布：E1 pass（每场景标题+图型一目了然）E2–E5 n/a/pass **E6 见 R2-2b-A5-93**（空态无引导）
- F 一致性：F1–F3 pass（图题/说明/图面三段式跨 18 场景一致）F4 **warn**（i18n 族：echarts 容器 `aria-label="图表"` 中文——R2-2a-F4-11 族实例）F5 n/a
- G 设计器：n/a
- H 弹层：n/a（echarts 原生 tooltip 非 DOM 弹层，未逐图触发）

## 3. 发现条目

### [R2-2b-A5-93] echarts 空态渲染为完全空白画布区：`data-empty="true"` 契约成立但无任何视觉提示——与 chart 渲染器"暂无数据"空态不一致

- **页面/路由**: `#/lab/echarts`（场景 18 "Explicit empty state"；任何空 option/空数据的 echarts 实例同险）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 空态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/echarts/empty-dark.png`
- **目视描述**: 空态场景渲染为 918×320 的纯空白块，无"暂无数据"、无占位图形、无引导；对照同批 recharts `chart` 渲染器空态有"暂无数据"文案（`chart.md` A5）。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/probe-ech2.mjs`
  - 输出: `<div class="nop-echarts" data-empty="true" style="height: 320px">`（`data-empty` 全页 1 命中，契约成立）；容器内部 echarts 实例 div 存在但无 canvas 子节点、无任何文本节点；`emptyText` 扫描 0 命中（无 `[class*="empty"]` 提示元素）。
- **对照基准**: 检查提示词 A5（empty 有意义提示非空白）/ F3（同类空态跨页同模式）；lab 场景说明明示这是 DD1 风格显式空态契约（"never throws"）——契约与呈现是两层
- **严重程度**: P3（契约设计使然：空态呈现未定义；但同批两图表渲染器空态呈现不一致）
- **用户影响**: 数据为空时用户看到一块空白区域，无法区分"无数据"与"加载失败/渲染中"。
- **修复方向**: echarts-renderer 在 `data-empty=true` 时渲染默认空态层（复用 chart 的 `t('flux.common.noData')` 空态插槽或 Spinner/Skeleton 档），样式与 chart 渲染器对齐；若裁决"空态呈现归宿主"，在 flux-guide 双渲染器文档同步声明。
- **归族**: watch-only → 台账（空态呈现一致性，chart↔echarts 对齐裁决项）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **lab 载体与环境基建族（notify no-op 吞 toast）**：场景 3 click→flux action 后无任何可见反馈（`afterClickToast: []`），动作桥无法在沙箱目视验证——既有裁定引用；交互键仍可注册 click，但断言目标不存在。
- **默认栈宽基线族**（R2-2a-E2-26）：场景 1 "Load Apr–Jun batch" 按钮全宽拉伸（default-1280-dark.png 目视）。
- **i18n zh-CN 回退族**（R2-2a-F4-11）：echarts 容器 `aria-label="图表"` 中文实例。
- **计划内锚点复检通过**：C6 DPR 画布几何 16/16 达标（echarts 内部按 DPR 出图，无拉伸/模糊证据）；dark 自动主题（CSS 变量映射）加载后切换即时重绘；svg renderer 变体结构正常；显式 dark 主题透传场景存在；map/candlestick/graph 等 12 种图型首屏渲染非空白（scenarioChars 全部 >200）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-echarts` → carded（卡列填本路径）；findings 归族后 → digested。
