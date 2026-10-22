# [card] page:scada-gallery

- **批次**: FM-5 渲染面复检 · shard1（新增页全量） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/scada-gallery`（domain 路由） ｜ **载体**: 域页面（数据可视化 · 工业 HMI 场景画廊）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵 + live 取证；场景切换（配电监控/灌装产线 tab）与设备交互归复检轮。裁掉：元素态抽样、弹层、拖拽）

## 1. 截图清单

| 状态          | light                                                                                                                                                                                               | dark                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/scada-gallery-default-1280x800-light.png`（矩阵，场景加载中）；settled 取证 `_tmp/visual-inspection-2026-10-18/scada-gallery-default-1280x800-light-settled.png` | `_tmp/visual-inspection-2026-10-18/scada-gallery-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/scada-gallery-default-800x900-light.png`                                                                                                                         | `_tmp/visual-inspection-2026-10-18/scada-gallery-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass A3 pass(控制 chip ≥24px) A4 pass(故障 chip 红色语义可辨识) A5 pass(场景加载有 Spinner) A6 n/a A7 n/a A8 n/a A9 pass(泵/阀控制 chip 存在)
- B 颜色：B1 fail(FM5-S1-B-3) B2 pass B3 pass(故障=红、正常=绿) B4 n/a B5 fail(FM5-S1-B-3 即 dark 平价反向缺陷) B6 pass
- C 布局：C1 pass C2 pass C3 pass C4 pass(800 双态完整) C5 pass C6 pass(SVG/Canvas 场景随容器 fit)
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 n/a D6 n/a D7 pass D8 warn(FM5-S1-D-1 LED 屏内单位贴边裁切)
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1 pass F2 pass F3 pass F4 warn(FM5-S1-F-1 开发注记文案入 UI) F5 n/a
- G 设计器：n/a（画廊非编辑器） ｜ H 弹层：n/a

## 3. 发现条目

### [FM5-S1-B-3] light 模式下画布控制区组标签对比度 1.48:1（深色画布 + 主题耦合文字色）

- **页面/路由**: `#/scada-gallery`（水处理泵房场景，画布顶部控制条）
- **主题/视口/状态**: light / 1280×800 与 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/scada-gallery-default-1280x800-light-settled.png`
- **目视描述**: "泵 P-101A / 泵 P-101B / 排水阀 DV-101 / 视口" 四个控制组标签在 light 模式下呈深灰字压在固定深蓝画布上，几乎不可读；dark 模式同位置为浅灰字，清晰。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-scada-labels.mjs`（getComputedStyle + WCAG 相对亮度对比）
  - 输出: light：`color=rgb(33,53,71) bg=rgb(11,18,32) contrast=1.48:1`（四个 label 一致，元素为 `<label class="nop-text">`）；dark：`color=rgb(230,236,243) contrast=15.74:1`。
- **对照基准**: WCAG 1.4.3 正文 ≥4.5:1；theme-compatibility.md（固定表面上的文字不得随主题令牌翻转）
- **严重程度**: P1
- **用户影响**: light 模式下控制组标题（功能分组信息）默认不可读；控制 chip 本身可读故未升 P0，但"这个控制区是什么"的信息丢失。
- **修复方向**: HMI 控制条 label 在固定深色画布上应使用固定浅色（画布内语义色，不随 `--foreground` 翻转），如给该 label 挂画布内专用类（`color: #94a3b8` 或 `--nop-scada-label` 令牌），与场景内文字同口径。
- **归族**: local（模式预期会复现于其他"固定深画布 + DOM 控制条"页面，归族时按 systemic 复查 scada 族）
- **复核状态**: 未复核

### [FM5-S1-F-1] 开发注记文案直接渲染在场景内（schema 作者注释泄漏）

- **页面/路由**: `#/scada-gallery`（场景底部）
- **主题/视口/状态**: light + dark / 全视口 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/scada-gallery-default-800x900-light.png`（"流量趋势（trend 图元，height 绑定井径缓冲）" + "压力 > 88 kPa 联动声光闪烁：单击设备灯罩灯点详情"）
- **目视描述**: 场景底部有两行灰色小字，内容为实现层注记（"trend 图元，height 绑定井径缓冲"），非面向用户的说明文案。
- **程序化证据**: 截图文字辨识 [visual-only]（文案意图判定归 schema 作者）
- **对照基准**: F4 术语与文案一致；内容质量（用户可见层不含实现注记）
- **严重程度**: P3（画廊 demo 场景，注记或为有意的图元说明）
- **用户影响**: 轻微——demo 受众可能正是组件开发者。
- **修复方向**: 若为图元说明改写为面向读者措辞（如"流量趋势（面积图，随液位联动）"）；若为开发注释移入 description。
- **归族**: local
- **复核状态**: 未复核

### [FM5-S1-D-1] LED 读数屏内单位小字（m³/h / pH）贴底裁切

- **页面/路由**: `#/scada-gallery`（出水流量 FI-201 / 出水 pH 读数屏）
- **主题/视口/状态**: light + dark / 全视口 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/scada-gallery-default-1280x800-light-settled.png`（左屏左下角 m³/h 半截）
- **目视描述**: 数码管风格读数屏内，单位小字贴住屏体下缘，字形下半被裁。
- **程序化证据**: 截图辨识 + 800 视口复现一致 [visual-only]
- **对照基准**: C1（无意外裁切）/ D8（内容与容器边缘零 padding）
- **严重程度**: P3
- **用户影响**: 单位信息可辨识性受损（主数值清晰）。
- **修复方向**: 图元 schema 内单位文本上移或屏体增高（给单位行留 ≥10px 底 padding）。
- **归族**: local
- **复核状态**: 未复核

### 误报排除记录（本页）

- 矩阵 light-1280 截图仅见控制条 + Spinner：live settle 后完整渲染场景（`scada-gallery-default-1280x800-light-settled.png`，探针 `_tmp/fm5-walk1-scada-probe.mjs`）——采集早于场景数据就绪，非缺陷。
- 画布在 light 模式保持深蓝：工业 HMI 恒深色表面语义（与"纸面恒白"同类的有意表面恒定），不报；其上的 DOM 控制条文字对比度按 B1/B5 正常立案（FM5-S1-B-3）。
- dark 截图右下主题选择器显示 "light"：矩阵脚本直改 `data-mode` 属性的采集伪影（见 page-designer 卡），非缺陷。

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page/scada-gallery.md`）；P1 修复后复检 → `verified`。
