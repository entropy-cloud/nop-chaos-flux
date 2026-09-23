# [card] page:component-handles

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/component-handles` ｜ **载体**: 域页面（X1 component:<method> 句柄调试面）
- **矩阵裁剪**: simplified（light/dark × 1280 + 800 窄视口 + 元素态扫描；裁掉弹层/拖拽——无此面；控件交互抽样的句柄按钮非本波重点）

## 1. 截图清单

| 状态          | light                                                                              | dark                    |
| ------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/component-handles/default-1280-light.png` | `default-1280-dark.png` |
| 默认 800×900  | `default-800x900-light.png`                                                        | —                       |

## 2. A–H 勾选

- A: A1✔ A2✔ **A3 族确认（两个 24×16 图标按钮，短边 16px → 已知 A3 小目标族新实例，不新立；1×1 input 为隐藏原生件误报族）** 其余 n/a
- B: B1✔ B5✔（dark 全控件平价，探针+截图双确认）B4✔
- C: **C1/C4✖(C-53: 1280 内溢 14px；800 docX 324px)** C3✔
- D: D1✔ D5✔（字段间距均匀）其余 n/a
- E: E1✔（标题+说明可答三问）E4✔
- F: F1✔（与 flux-basic 同表单控件渲染）
- G n/a ｜ H n/a

## 3. 发现条目

### [R2-1d-C-53] 800px 视口 324px 横向溢出 + 1280 下 14px 内溢

- **页面/路由**: `#/component-handles`（schema 表单区 + 句柄按钮行）
- **主题/视口/状态**: light / 800×900（及 1280）/ 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/component-handles/default-800x900-light.png`（"Move Review…"按钮被截出屏）
- **目视描述**: 窄视口下表单/按钮行整体超宽，文档级横向滚动 324px；1280 下 section 内也溢出 14px。
- **程序化证据**: 探针=OVERFLOW_SNIPPET + 最宽元素定位；输出=800px `docX: 324`（SECTION.nop-page / MAIN `min-h-screen grid place-items-center p-6` 同链）；1280 `clipX: SECTION.nop-page 14px`，源头含 `.nop-flex.flex-row.gap-4 overflow 30`。
- **对照基准**: C1/C4；已知"窄视口 flex/固定壳层（R2-3c 候选）"族——本页是该族迄今最重实例（324px >> flux-basic 61px）。
- **严重程度**: P2（窄视口下三分之一内容不可达）
- **用户影响**: 800 宽（分屏/小本）用户必须横向滚动才能点到句柄按钮。
- **修复方向**: 按钮行 `flex-wrap`、外层 grid 改单列 fallback；SECTION 内容 min-width 约束（与 R2-3c 族统一修）。
- **归族**: systemic → R2-3 批（R2-3c 候选族证据 +）
- **复核状态**: 未复核

### [R2-1d-D-54] Language 选择器空 placeholder + Pick 控件常开列表（P3）

- **页面/路由**: `#/component-handles`（Language / Pick 字段）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `default-1280-light.png`（Language 空框、Pick 带焦点环+内联 Apple/Banana 列表）
- **目视描述**: Language select 无占位/值为空白；Pick 控件在默认态（两次独立会话、light/dark 一致）显示为常开 listbox 且带 focus ring，疑似控件态异常或 demo 误配 size/multiple。
- **程序化证据**: 探针=截图目视 + 默认态 DOM（未做任何交互即有列表与焦点环）；输出=两主题一致复现。[visual-only 倾向，复核时读 Pick 控件 aria/size 属性]
- **对照基准**: A4/A5（控件状态完备性、无意外焦点）。
- **严重程度**: P3
- **用户影响**: 观感与键盘 Tab 顺序可能受干扰，不影响主任务。
- **修复方向**: 查 demo schema 中 Pick/select 渲染器参数（size/listbox 常开配置）；Language 加 placeholder。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 备注

- 46 个句柄按钮全部 ≥24px 高（除两个 16px 图标钮）；dark 平价为本批最佳之一。
