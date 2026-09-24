# [card] control:sparkline

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/sparkline` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：基本趋势 / fill·smooth·status·显式域 变体 / 降级路径 / stat-tile 组合位示意；前两者中文标题 → scenario slug 为空串 `data-testid="scenario-"`，探针以“包含 3 个 sparkline-root 的 stage”定位）
- **矩阵裁剪**: simplified（matrixReason：纯展示 SVG 原子组件——无交互态（无 hover/focus/disabled 目标）、无弹层、无异步。已查：light/dark 双主题像素级取色、1280/800 双视口、四种变体渲染、三种降级路径（空/单点/全等值）、stat-tile 组合位。裁掉：glass 皮肤；交互态矩阵（控件无可交互元素，A1–A4/A8 n/a））
- **runner dark 列作废声明**：同 query-filter 卡——dark 全部真 data-mode 自采 + PNG 像素采样。

## 1. 截图清单

| 状态                              | light                                                                           | dark（真 data-mode，自采）                                                 |
| --------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 默认 1280（整页）                 | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/default-1280-light-full.png` | —                                                                          |
| 场景 1 基本趋势                   | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/basic-light-1280.png`        | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/basic-dark-1280.png`    |
| 场景 2 变体行                     | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/variants-light-1280.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/variants-dark-1280.png` |
| 场景 3 降级路径（空/单点/全等值） | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/degraded-light-1280.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/degraded-dark-1280.png` |
| 变体行 @800                       | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/variants-800-light.png`      | `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/variants-800-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（纯 SVG 展示件，无可交互元素）A5 pass（空数据渲染 120×32 空占位 svg，schema 注释声明“空占位”；单点渲染圆点、全等值渲染中线——三降级路径均非崩溃/空白页面）A6–A9 n/a
- B 颜色：B1 n/a（无文本）B2 n/a B3 pass（up=success 绿 / down=destructive 红 / 静态=指定色，语义映射正确）B4 pass（`hsl(var(--success))` / `hsl(var(--destructive))` / `hsl(var(--muted-foreground))` 全令牌取色，`sparkline-renderer.tsx` L19-21 + DOM `stroke="hsl(var(--success))"` 实证）B5 pass（核对点：dark 像素采样成功语义 `rgb(36,220,156)`、破坏语义 `rgb(220,36,36)`——dark 令牌块按预期提亮/压暗，两条线在 dark 下清晰可辨）B6 **warn(R2-2b-B6-124)**（`--chart-2` 与破坏语义同色相，见发现）
- C 布局：C1 pass（1280/800 overflow 扫描零命中）C2 pass C3 pass C4 pass（800 下变体行 flex 换行正常，rootWidths 120/120/120/120/160 保持语义尺寸）C5/C6 n/a
- D 间隔：D1 pass（变体行 gap 4 均匀）D2–D8 n/a
- E 排布：E1 pass E2 n/a E3 n/a E4 n/a E5 n/a E6 **fail(R2-2b-E6-123)**（变体行/降级行无任何标注，控件壳堆叠不可辨识，见发现）
- F 一致性：F1–F5 n/a（stat-tile 组合位蓝色 sparkline 为 design.md §11 明文契约，非不一致，见误报排除）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-E6-123] `label` 键不在 SparklineSchema 契约被静默丢弃：变体行/降级路径 6 个图无一有标注

- **页面/路由**: `#/lab/sparkline`（场景 2 变体行 fixture 每个组件传 `label: 'fill + smooth' / 'status up' / 'status down 显式' / '静态色' / '显式 Y 域'`；场景 3 降级路径同构传 `label: '空数据' / '单点' / '全等值'`）
- **主题/视口/状态**: 双主题 / 1280 + 800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/variants-dark-1280.png`（5 条曲线无一行有标注）、`degraded-light-1280.png`（空占位/圆点/中线三个图形无从区分）
- **目视描述**: 变体行 5 条不同语义的曲线（涨/跌/静态色/显式域）并排渲染，互相之间没有任何文本标注；读者无法知道哪条是“status down 显式”、哪条是“静态色”。降级路径同样只剩三个无名图形。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w4-sv.mjs` variants.info 段（每个 `[data-slot="sparkline-root"]` 的 textContent）+ schema 源码核对
  - 输出: `label: ""`（全部 root 文本为空）；`packages/flux-renderers-data/src/sparkline-schemas.ts` `SparklineSchema` 接口（L10-30）无 `label` 字段——fixture 传入的 `label` 为契约外键，渲染器零消费、零诊断。
- **对照基准**: 检查提示词 E6（非“组件壳堆叠”）；R2-2a A9-42/A9-60 同根因先例（契约外键静默丢弃且零诊断）
- **严重程度**: P3（demo 载体可读性受损；产品面是“未知键零诊断”缺口的一例，实际数据展示不受影响）
- **用户影响**: 使用 lab 学组件的作者会误以为 sparkline 支持 label；真实业务页面上误写 label 键同样静默无效。
- **修复方向**: 短期修 fixture：变体行 label 改为伴行 `type: 'text'`（或 sparkline 增加 label 渲染）；根因面走 R2-3 契约诊断：schema validator 对未知顶层键发 warning。
- **归族**: systemic → R2-3 候选（schema 契约键静默丢弃族，第 6 例：A9-42、A9-60、F4-83、A9-104 之后）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）：SparklineSchema（sparkline-schemas.ts L10–30）确无 label 键——契约键静默族第 6 例

### [R2-2b-B6-124] `--chart-2` 令牌为红色（hue 0），静态色趋势图与“跌势”语义色同色相导致方向误读

- **页面/路由**: `#/lab/sparkline`（场景 2 变体行第 4 条 `color: 'hsl(var(--chart-2))'`，数据为上涨序列 [100…155]）
- **主题/视口/状态**: light + dark / 1280 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/sparkline/variants-light-1280.png`、`variants-dark-1280.png`（第 4 条上涨曲线渲染为红色，与第 3 条“显式 down”肉眼难分）
- **目视描述**: 同一行的第 3 条（显式 down 红线）与第 4 条（静态色红线）颜色几乎一致——上涨数据因选用图表 palette 第二色而被读成下跌。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w4-sv.mjs` variants.strokes 像素采样（PNG 解码取非背景主色）
  - 输出: light 第 3 条 `rgb(236,68,68)`（destructive `0 84% 60%`）vs 第 4 条 `rgb(220,44,44)`（chart-2 `0 72% 51%`）——同 hue 0，Δ 亮度小；dark 同构（`rgb(220,36,36)` vs `rgb(244,100,100)`）。token 表 `packages/theme-tokens/src/styles.css` L35 `--chart-2: 0 72% 51%`。
- **对照基准**: 检查提示词 B3/B6（颜色语义正确：红=破坏性/跌；状态色不与告警混用）
- **严重程度**: P3（图表 palette 谱系设计问题；sparkline 组件本身按契约取色）
- **用户影响**: 任何选用 chart-2 的趋势/KPI 图形都会被读成负面语义；跨组件（chart 系列）同险。
- **修复方向**: theme-tokens 将 `--chart-2` 调离 hue 0（如 teal/amber 谱），或在 sparkline 文档明示 chart-N 静态色与趋势语义色的冲突风险。
- **归族**: watch-only → 台账（token 谱系裁定项，建议随 R2-4 主题令牌包一并核对 --chart-\* 四色语义距离）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **dark 平价/对比度族（R2-4，本控件为任务书点名核对点）**：核对通过——dark 下 success/destructive/muted-foreground 令牌正确翻转，像素采样 `rgb(36,220,156)` / `rgb(220,36,36)`，线条在 dark 底（stage 像素 `rgb(20,28,36)`）上清晰可辨；无 dark 专有缺陷。引用族记录“sparkline dark 核对通过”，不立项。
- **stat-tile 组合位蓝色 sparkline（误报排除）**：`stat-tile-renderer.tsx` L224-228 固定 `hsl(var(--chart-1))` 蓝色，独立 sparkline 自动语义色——design.md §11 复用契约明文“共享 path 纯函数、不共享取色语义”，不按 B3 不一致判。
- **lab 载体族（场景 slug 空串）**：全中文场景标题经 `slug` 派生后 `data-testid="scenario-"`，且两场景重名同 testid——载体探测基建缺口（MultiScenarioLabPage slug 派生对非 ASCII 标题未回退 index），归 lab 载体与环境基建族（R2-3 候选）新实例。

## 交互键登记

- 无注册交互键：纯展示 SVG 控件无交互态（closure audit F2 补录 2026-09-24）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-sparkline` → carded（卡列填本路径）；findings 归族后 → digested。
