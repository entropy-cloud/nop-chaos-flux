# [card] page:w4c-composite-form-family

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w4c-composite-form-family` ｜ **载体**: domain demo 页（`apps/playground/src/pages/w4c-composite-form-family-demo.tsx` + `flux-renderers-form-advanced` combo/input-table + form transfer/picker）
- **矩阵裁剪**: simplified+弹层专项（控件 demo 页但弹层为波特定 H 专项：picker 单选/多选弹层 light+dark 双开；执行 light+dark × 1280/800、A9 增/删/排序/穿梭全链路、transfer 双栏几何、focus 环、Tab 键序；裁掉：H9 窄视口重开弹层（Dialog 组件自带 `max-w-[calc(100%-2rem)]` 窄视口回退，plan 490 契约内，未复测）、拖拽排序（combo/input-table 排序为按钮式，无拖拽）、键盘操作 transfer 穿梭）

## 1. 截图清单

| 状态                     | light                                                                                             | dark                          |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| 默认 1280×800            | `_tmp/visual-inspection-2026-09-23/r2-1d/w4c-composite-form-family/default-light-1280.png`        | `default-dark-1280.png`       |
| 默认 ~800 宽             | `default-light-800.png`                                                                           | `default-dark-800.png`        |
| combo 添加项后           | `combo-added-light-1280.png`                                                                      | —                             |
| combo 删除项后           | `combo-removed-light-1280.png`                                                                    | —                             |
| combo 排序后（Bob 上移） | `combo-reorder-light-1280.png`                                                                    | —                             |
| input-table 新增行后     | `inputtable-added-light-1280.png`、`inputtable-area-light-1280.png`                               | —                             |
| transfer 选中/移动后     | `transfer-select-light-1280.png`、`transfer-moved-light-1280.png`、`transfer-area-light-1280.png` | `transfer-area-dark-1280.png` |
| picker 单选弹层          | `picker-open-light-1280.png`                                                                      | `picker-open-dark-1280.png`   |
| picker 多选弹层          | `picker-multi-open-light-1280.png`                                                                | —                             |
| focus（input/button）    | —（3px oklab ring 程序化判定）                                                                    | —                             |

## 2. A–H 维度勾选表

- A 交互：A1 pass（按钮 nop-haptic） A2 pass（input focus 3px oklab 环、button 边框转 primary） A3 **warn（已知 A3 族确认：input-number 步进钮 24×16，见 §3 族注，不重复立项）** A4 pass（transfer 选择/移除钮 disabled 半透明可辨） A5 **fail(A5-30：picker 弹层空白 body 无空态指示)** A6 n/a（无拖拽） A7 pass（弹层有关闭钮/遮罩） A8 n/a A9 **pass（combo 2→3→2、Bob/Alice 排序互换、input-table +1 行、transfer 全选→选择 (2/2)→(0/0)+(1/1)→(3/3)）**
- B 颜色：B1 pass B2 pass B3 pass（删除 destructive 语义） B4 pass B5 **已知族确认（dark 弹层亮底 = 宿主 --popover，R2-4 已裁定，一句话确认见 §3 族注）** B6 pass
- C 布局：C1 pass（checkbox 内部 clip 为 svg 可见溢出，视觉无损 FP） C2 pass C3 pass C4 pass（800 下 transfer 双栏 303/301 均分不破版） C5 pass C6 n/a
- D 间隔：D1 pass（表单 FieldFrame 基线） D5 pass（label-control 间距统一） D6–D8 pass
- E 排布：E1 pass E2 pass（添加项/新增行次钮 vs 主流程清晰） E3 pass E4 **pass（transfer 双栏同顶 y=930.1/930.1、同高 196、等宽 543/543）** E5 pass E6 fail→并入 A5-30（弹层空态无引导）
- F 一致性：F1 pass（combo/input-table 操作钮同 上移/下移/删除 图标语义） F5 n/a
- G 设计器：n/a
- H 弹层：H1 **pass（弹层 content 宽 560px = `--overlay-size-base` 档，阶梯合规）** H2 n/a H3 pass（高 122px ≤ 视口） H4 pass（标题 Pick owner + 右上关闭钮无重叠） H5 **pass（取消 outline 左 / 确认 primary 右，footer 72px 最小宽、gap 8px；探针 variant 误报 outline 已排除，computed bg=rgb(28,110,242) 实心主色）** H6 n/a（body 空，见 A5-30） H7 pass（三段 padding 走 anatomy 令牌） H8 n/a（内容不滚动） H9 裁剪（见矩阵裁剪）

## 3. 发现条目

### [R2-1d-A5-30] picker 弹层 body 全空白，无空态/加载指示（v3 空 pickerSchema 场景）

- **页面/路由**: `#/w4c-composite-form-family`（demo-picker 单选、demo-picker-multi 多选同）
- **主题/视口/状态**: light / 1280 / 打开「Pick owner」弹层（dark 同态：`picker-open-dark-1280.png`）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w4c-composite-form-family/picker-open-light-1280.png`
- **目视描述**: 打开弹层后 header（Pick owner + ×）与 footer（取消/确认）之间是一整块空白区域，无任何文案、骨架或选项列表；确认按钮仅关闭弹层。
- **程序化证据**: 探针：`[data-slot="dialog-body"]` innerHTML = `<div class="flex flex-col gap-2"></div>`（0 子节点）、弹层总高仅 122px；源码契约（demo inventory 自述）「v3：无 pickerSchema 时空弹层，Confirm 仅关闭」。红线口径：演示数据简化属有意设计，但**须有 loading/empty 指示即合规**——本场景两者皆无。
- **对照基准**: A5「empty 有意义提示非空白」/ E6 空态任务引导；styling-system.md 弹层解剖学（body 为内容区，空内容应至少有空态插槽）。
- **严重程度**: P3（demo 无数据为有意；但空态无指示越红线，组件层缺空态插槽）
- **用户影响**: 用户打开选择器只见空白框 + 确认/取消，无法区分「没有数据」「加载中」「配置错误」。
- **修复方向**: picker 渲染器在 `pickerSchema` 缺省/渲染为空时于 body 渲染 `Empty` 组件（ui 包已有 `Empty`）或 i18n 文案「暂无可选项」，并禁用确认钮；demo 可另配带 pickerSchema 的正例。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**族注（记录）**: ①**已知 A3 小目标族确认（不重复立项）**：input-table Amount 单元格 input-number 步进钮实测 24×16（短边 16px，WCAG 2.5.8 阈值 24px），源为 `nop-input-number` stepper 尺寸；并入 R2 已裁定 A3 小目标族，波内同证见 text-icon 卡 copy 钮 20×20、layout 卡 remark ⓘ 16×16。②**已知 R2-4 dark 弹层族确认**：dark 下 picker 弹层亮底 `rgb(251,250,249)`（宿主 --popover 未切），与 briefing 已裁定族同根因，一句话确认不立项；连带确认钮在亮底上呈浅蓝，同族表现。③已知 watch-pool 确认：input-table Amount 数值列/输入左对齐（watch-pool 已裁定族）。④误报排除——probe 以 className 正则猜按钮 variant 把确认钮误读为 outline（匹配到 `outline-none` 类），computed style 复核为 `bg-primary text-primary-foreground` 实心主色，H5 合规；`候选项（2/2）` 头部 5px clipY 为 range 内联溢出、overflow:visible 无视觉裁切。⑤A9 全链路正例：combo 增(2→3)/删(3→2)/上移排序（Alice/Bob 顺序互换）均即时生效；transfer 头部全选 + 选择 → 左 (0/0) 右 (3/3)，移除钮 disabled 联动正确。⑥combo/input-table 28×28 上移/下移/删除图标钮（aria-label 齐备）A3 合规。

## 4. 台账回写

- 本卡完成后：ledger.md `w4c-composite-form-family` 行 status → `carded`；findings 归族后 → `digested`。
