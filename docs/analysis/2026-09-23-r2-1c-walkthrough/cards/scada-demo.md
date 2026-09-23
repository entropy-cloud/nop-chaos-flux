# [card] page:scada-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/scada-demo` ｜ **载体**: 域页面（I13.1 工艺流程组态，只读渲染面 + 点表驱动；非 scada-editor）
- **矩阵裁剪**: full（弹层/告警态/hover/平移拖拽/双主题/双视口均覆盖；仅裁剪：glass 皮肤抽查按波次口径省略、双击电机跳转（离开页面域））

## 1. 截图清单

| 状态                        | light                                             | dark                                |
| --------------------------- | ------------------------------------------------- | ----------------------------------- |
| 默认 1280×800               | `…/r2-1c/scada-demo/scada-demo-default-light.png` | `…/scada-demo-default-dark.png`     |
| 默认 ~800 宽                | `…/scada-demo-default-800-light.png`              | `…/scada-demo-default-800-dark.png` |
| hover（电机图元）           | `…/scada-demo-hover-motor-light.png`              | —（cursor 探针双态同值 grab）       |
| 告警/故障态（B3）           | `…/scada-demo-alarm-fault-light.png`              | —                                   |
| 弹层打开（设备详情 Dialog） | `…/scada-demo-dialog-light.png`                   | `…/scada-demo-dialog-dark.png`      |
| 拖拽进行中（画布平移）      | `…/scada-demo-pan-drag-light.png`                 | —                                   |

（`…` = `_tmp/visual-inspection-2026-09-23`，下同）

## 2. A–H 维度勾选表

- A 交互：A1 ✓ A2 ✓ A3 ✓（smallTargets=0）A4 ✓ A5 ✓（loading/empty schema 具备，ready 态正常）A6 ✓（pan 拖拽跟手）A7 ✓（弹层关钮/遮罩/focus 落点齐备）A8 n/a A9 ✓（setPointValue 后图元状态即时变化）
- B 颜色：B1 **fail(R2-1c-B1-02)** B2 ✓ B3 **pass**（run 绿/stop 灰/fault 红语义正确）B4 ✓ B5 ✓ B6 ✓（告警触发非默认蓝）
- C 布局：C1 **fail(R2-1c-C4-01→见 three-canvas 卡，800 视口坐实)** C2 ✓ C3 ✓ C4 **fail(同上)** C5 ✓ C6 ✓（attr 1972×544 = CSS 986×272 ×DPR2，三 canvas 层全过）
- D 间隔：D1 warn(18px 离栅，同 R2-1c-D1-01) D2 ✓ D3 ✓ D4 ✓ D5 n/a D6 n/a D7 ✓ D8 ✓
- E 排布：E1 ✓ E2 ✓ E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：F1 ✓ F2 ✓ F3 ✓ F4 ✓ F5 n/a
- G 设计器：n/a（查看器非编辑器；cursor=grab 平移可供性 ✓）
- H 弹层：H1 ✓（560px = `--overlay-size-base` 档）H2 n/a H3 ✓（bottom 142 ≤ vh-8）H4 ✓（关钮 28×28 不压标题）H5 n/a（信息弹层无 footer）H6 n/a H7 ✓（header/body padding 与 ui Dialog 解剖一致）H8 n/a（短内容）H9 n/a（窄视口未复开弹层）

## 3. 发现条目

### [R2-1c-B1-02] size-sm 按钮标签对比度不达标：secondary 3.05/dark 1.1、destructive 3.78/dark 2.18（族）

- **页面/路由**: `#/scada-demo` 控制栏（视口组 Fit/Center = secondary；电机组「故障」、报警组「触发」= destructive）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `…/scada-demo/scada-demo-default-light.png`、`…/scada-demo-default-dark.png`（dark 下 Fit/Center 近乎不可见）
- **目视描述**: light 下 Fit/Center 为紫底蓝字，与整排 outline 按钮放在一起突兀；dark 下两枚按钮退化为浅紫块、标签几乎不可辨认。
- **程序化证据**: 探针 computed 色 → WCAG：secondary 前景 rgb(10,71,169) / 底 rgb(166,137,250) = **3.05:1**（light），dark 合成 **1.10:1**；destructive 前景 rgb(239,67,67) / 底 oklab(…/0.1) 叠白 ≈ 3.78:1（light）、2.18:1（dark）；字号 12.8px（非大字，需 ≥4.5）。800 视口复测同值。
- **对照基准**: WCAG 1.4.3；检查提示词 B1/B5；@nop-chaos/ui Button variant 令牌对（`--secondary`/`--secondary-foreground`、destructive-soft 前景）。
- **严重程度**: P1（dark secondary 标签不可读，控件语义失效；light 侧 3.05 为 P2 量级，合并按高频控件升 P1）
- **用户影响**: 所有使用 size-sm secondary/destructive 按钮的页面（本波 5 页控制栏均命中）；dark 模式下视口控制按钮不可辨认。
- **修复方向**: `packages/theme-tokens/src/styles.css` classic/glass × light/dark 四块中复核 `--secondary-foreground` 与 `--secondary` 配对（dark 下 secondary 底过浅而前景仍取深蓝）；destructive-soft 前景在两主题下换更深红阶（≥4.5），或 ui Button destructive variant 前景改 `--destructive` 深阶。
- **归族**: systemic → R2-3 批（与 R2-1c-B1-01 同「前景/底配对对比度」根因族）
- **复核状态**: 未复核

### [R2-1c-C4-01] （族引用）800 视口横向溢出 1124 vs 800

- **页面/路由**: `#/scada-demo`（族主条目见 three-canvas-demo 卡 R2-1c-C4-01）
- **主题/视口/状态**: light / 800×800 / 默认
- **截图**: `…/scada-demo/scada-demo-default-800-light.png`（Center 按钮与画布右缘被裁）
- **程序化证据**: 溢出扫描 html scrollWidth 1124 vs 800；宽度链探针：canvas 内联 `width:986px` 冻结，section 恒 1100（grid 壳层不收缩）。1280 下 C6/C1 全过（无溢出），仅窄视口触发。
- **对照基准**: C1/C4；R2-1a「窄视口 flex/固定壳层（R2-3c 候选）」族。
- **严重程度**: P1（族内共享判级）
- **修复方向**: 同族主条目（壳层弹性 + 画布随容器 resize）。
- **归族**: systemic → R2-3 批（R2-3c 候选）
- **复核状态**: 未复核

## 4. B3 语义色专项（重点维份，全过）

- 设备状态语义（`deviceStates`：run #00cc66 / stop #9e9e9e / fault #e53935+blink）：默认态电机/泵/阀/风叶全绿（run）目视确认；点「故障」后电机转红（blink 中相采样 rgb 变暗证实动画在跑）——截图 `…/scada-demo-alarm-fault-light.png`。
- 报警指示灯 alarm=1 → fault 红；管线/仪表配色为 schema 有意主题（暗色控制室工况屏），非语义色，不按 B3 判。
- 画布尺寸自适应：CSS 986×272 下 fit-contain 正确 letterbox（scale 0.523，ox=242 居中），无拉伸。
- 附带影响记录（不计新发现）：画布高度被页面头文压缩到 272px → 场景以 52% 呈现、textSize 11 标注渲染约 5.8px，可读性弱；根因即壳层空间分配，随 R2-1c-C4-01 修复后复检。

## 5. 误报排除记录

- 画布截图整体暗色调：控制室工况屏主题（schema `theme.bg #0e1729`）有意设计，非 dark 平价问题。
- fault 采样点未见红色：blink（500ms 周期 opacity 1→0.2）相位所致，视觉确认红色已生效；非状态机缺陷。
- 弹层宽 560：落在 `--overlay-size-base` 档（plan 490 阶梯），非偏离。
- 主题下拉显示不同步：探针 setAttribute 伪影（同 three-canvas 卡）。

## 6. 台账回写

- 本卡完成后 `ledger.md` 对应行 status → `carded`；findings 归族后 → `digested`。
