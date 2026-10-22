# [card] page:page-designer

- **批次**: FM-5 渲染面复检 · shard1（新增页全量） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/page-designer`（domain 路由；`#/complex-pages/page-designer` 亦可解析到同一页面） ｜ **载体**: 域页面（设计器）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵 + live 定向探针；画布为空态默认视图，拖拽/选中/属性面板联动等 G 维交互态归复检轮补全。裁掉：元素态抽样、拖拽进行中、弹层）

## 1. 截图清单

| 状态          | light                                                                                                                                                                                                | dark                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/page-designer-default-1280x800-light.png`（矩阵，lazy 加载中）；settled 取证 `_tmp/visual-inspection-2026-10-18/page-designer-default-1280x800-light-settled.png` | `_tmp/visual-inspection-2026-10-18/page-designer-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/page-designer-default-800x900-light.png`                                                                                                                          | `_tmp/visual-inspection-2026-10-18/page-designer-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a(空态) A2 pass(撤销/重做禁用态可辨识) A3 pass A4 pass(撤销/重做灰显) A5 pass(lazy 加载有 Spinner；空画布有引导文案) A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass(双态全组件渲染) B6 pass
- C 布局：C1 pass C2 warn(FM5-S1-C-3) C3 pass(三栏分区清晰) C4 pass(800 双态不塌) C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 n/a D6 n/a D7 pass D8 pass
- E 排布：E1 pass(空态引导可答三问) E2 pass E3 pass E4 pass E5 pass E6 pass(空画布 G4 达标)
- F 一致性：F1 pass F2 pass(左侧组件库/右侧属性面板宽度档与其他设计器一致) F3 pass F4 pass F5 n/a
- G 设计器：G1–G3/G5–G7 n/a(空画布无选中/拖拽对象，归复检轮) G4 pass(空画布有引导卡) G8 pass
- H 弹层：n/a

## 3. 发现条目

### [FM5-S1-C-3] nop-debugger 悬浮 launcher chip 固定左下，短视口下遮挡面板内容（shell 级系统性）

- **页面/路由**: `#/page-designer`（同样出现在全部 lab 页与 complex 页，见 shard 汇总）
- **主题/视口/状态**: light + dark / 800×900（1280×800 下遮 sidebar 尾行）/ 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/page-designer-default-800x900-light.png`（chip 压在"select"行上）；crop 取证 `_tmp/visual-inspection-2026-10-18/chip-crop.png`、`_tmp/visual-inspection-2026-10-18/lab-chip-crop.png`
- **目视描述**: `🐞 <n>` 悬浮 chip（`packages/nop-debugger/src/panel.tsx` dock=bottom-left，left 24px / bottom 24px 固定定位）压住左侧组件库滚动区的可见行（select / input-number 一行被盖住约半行高）。
- **程序化证据**:
  - 探针: `document.elementFromPoint(50, 790)` → 返回被盖行的 `button`（"input-number"行）——即该点位顶层可见内容为面板行，chip 以更高 z-index 叠加（截图可见）；panel.tsx:76-80 证实 docked 固定 `left:24px bottom:24px`。
- **对照基准**: WCAG 2.4.11（焦点不得被遮挡的同类遮挡问题）；NN/g 直接操作（悬浮工具不应遮内容）
- **严重程度**: P3
- **用户影响**: 800 高度视口下左侧列表最后一行被遮挡，滚动后可恢复；不影响任务完成。
- **修复方向**: chip 检测宿主面板可滚区域并让位（如 dock 时给主内容 `padding-bottom` 或 chip 可拖离/自动贴边避让）；或在设计器/lab 布局左侧栏底部预留 56px 安全区。
- **归族**: systemic → R2-3 批（同根因跨 ≥3 页：全部 lab carrier + page-designer + pih 侧栏）
- **复核状态**: 未复核

### 误报排除记录（本页）

- 矩阵 light-1280 截图为居中 Spinner 空页：live 复访（`_tmp/fm5-walk1-console-probe.mjs`，settle 后截图 `page-designer-default-1280x800-light-settled.png`）完整渲染设计器三栏。判定为矩阵采集早于 lazy chunk 完成，非页面缺陷（A5 有 loading 指示）。
- dark 截图右下主题选择器显示 "light"：矩阵脚本按检查提示词直接 set `data-mode` 属性，绕过 React store 导致 NativeSelect 显示值不同步（`apps/playground/src/theme-switcher.tsx` 受控组件）。采集工具伪影，非缺陷。

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page/page-designer.md`）。
