# [card] page:bisheng-build

- **批次**: FM-5 渲染面复检 · shard1（新增页全量） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/bisheng-build` ｜ **载体**: 域页面（外部应用复刻 · complex page）
- **矩阵裁剪**: simplified（matrixReason：本分片为 default 视图四态矩阵 light/dark × 1280x800/800x900；hover/focus/弹层/拖拽中间态因主画布 P0 崩溃无意义，待修复后复检补全。裁掉：元素态抽样、弹层打开、拖拽进行中、loading/empty 专项）

## 1. 截图清单

| 状态          | light                                                                        | dark                                                                        |
| ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/bisheng-build-default-1280x800-light.png` | `_tmp/visual-inspection-2026-10-18/bisheng-build-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/bisheng-build-default-800x900-light.png`  | `_tmp/visual-inspection-2026-10-18/bisheng-build-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 ☐ A2 ☐ A3 ☐ A4 ☐ A5 pass(retry 重试入口存在) A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass(错误条与 retry 可读) B2 n/a B3 pass B4 n/a B5 warn(FM5-S1-B-1) B6 n/a
- C 布局：C1 fail(FM5-S1-C-A1 主内容缺失) C2 pass C3 fail(FM5-S1-C-A1) C4 fail(FM5-S1-C-A1) C5 pass C6 n/a
- D 间隔：D1 pass(侧栏/描述区正常) D2 pass D3 n/a D4 pass D5 n/a D6 n/a D7 pass D8 pass
- E 排布：E1 fail(FM5-S1-C-A1 首屏三问无法回答"当前什么状态"以外的内容) E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：G4 fail(FM5-S1-C-A1 画布空但无引导) 其余 n/a（交互态不可达）
- H 弹层：n/a（无弹层；底部调试抽屉仅折叠态可见，头部渲染正常）

## 3. 发现条目

### [FM5-S1-C-A1] bisheng 中央 designer canvas 渲染崩溃（edge-router TypeError），主内容整体不可用

- **页面/路由**: `#/complex-pages/bisheng-build`（默认视图，无需特殊 schema 状态）
- **主题/视口/状态**: light + dark / 1280×800 与 800×900 / 页面加载完成即复现
- **截图**: `_tmp/visual-inspection-2026-10-18/bisheng-build-default-1280x800-light.png`（同 dark 与两张 800x900）
- **目视描述**: 页面仅左侧复刻侧栏、顶部描述与折叠的"调试对话"抽屉头渲染正常；中央 `designer-page` canvas 区域整块空白，仅显示错误条 `__body_0__body_0__panels_0__body_0_: Cannot read properties of undefined (reading 'x')` 与 retry 链接。六节点工作流（客服工单助手）、顶栏、右侧参数面板全部缺失。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-console-probe.mjs`（Playwright 逐路由收集 console/pageerror）
  - 输出: bisheng-build:light 与 :dark 均报 `consoleErr=2`：
    `TypeError: Cannot read properties of undefined (reading 'x') at computeEdgeRoutes (packages/flow-designer-core/src/edge-router.ts:101) at DesignerXyflowCanvas`；
    `[NodeRenderer] Render error in node "_.body_0_.body_0_.panels_0_.body_0_"`。retry 不恢复（四张截图一致复现）。
- **对照基准**: visual-page-quality-inspection-prompt.md P0 定义（功能默认配置不可用/关键信息不可读）；renderers 契约（错误边界呈现错误条合规，但页面主任务不可完成）
- **严重程度**: P0
- **用户影响**: 复刻页核心展示物（工作流编排画布）默认状态下完全不可见，无法完成任务；`edge-router.ts:101` 位于 `Math.min/max(a.x, b.x)` 路径，指向某节点在进入边路由时缺测量几何（node position/box undefined），`computeEdgeRoutes` 对缺位节点无防御。
- **修复方向**: 在 `packages/flow-designer-core/src/edge-router.ts` 的 `computeEdgeRoutes`/`segmentsClearOfBoxes` 入口对缺 position/size 的节点过滤或给默认盒；并排查 bisheng schema 中 `panels_0.body_0` 子画布节点的测量时序（`designer-page` 渲染器在 nodesMeasured 前不应调用边路由）。修后补 hover/拖拽态矩阵复检。
- **归族**: local（bisheng-build 单页复现；但 `computeEdgeRoutes` 缺防御属共享代码，修 shared 时按 systemic 收敛）
- **复核状态**: 未复核

### [FM5-S1-B-1] dark 下画布空白体呈纯白块（随 P0 崩溃出现）

- **页面/路由**: `#/complex-pages/bisheng-build`
- **主题/视口/状态**: dark / 1280×800 / 崩溃态
- **截图**: `_tmp/visual-inspection-2026-10-18/bisheng-build-default-1280x800-dark.png`
- **目视描述**: dark 模式下 canvas body 区域为整块纯白，与深色页面对比刺眼。
- **程序化证据**: 依附 FM5-S1-C-A1（崩溃导致 body 空渲染为浅色纸面底）；无法独立复验，不单独计分。
- **对照基准**: 误报表"画布纸面恒白"豁免条目（biz 画布若为有意纸面则不报）
- **严重程度**: P3（watch-only，随 P0 修复后复检确认是否为有意纸面）
- **用户影响**: 崩溃态的次生观感问题。
- **修复方向**: 随 FM5-S1-C-A1 修复后复检；若 body 为有意纸面语义则登记豁免。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page/bisheng-build.md`）；P0 修复批次完成后复检 → `verified`。
