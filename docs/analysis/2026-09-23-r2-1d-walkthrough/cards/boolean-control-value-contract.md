# [card] page:boolean-control-value-contract

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/boolean-control-value-contract` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/boolean-control-value-contract-demo.tsx`，checkbox/switch trueValue-falseValue 契约 ×4 控件）
- **矩阵裁剪**: simplified（控件 demo，全态抽样：点击/键盘 Space/开关标签/dark/800；无弹层无拖拽）

## 1. 截图清单

| 状态                   | light                                                      | dark                                                     |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280（首屏/页尾） | `default-light-1280.png` / `default-light-1280-bottom.png` | `default-dark-1280.png` / `default-dark-1280-bottom.png` |
| 切换后（含键盘 Space） | 全值探针（见发现条目程序化证据）                           | `full-dark-toggled.png`                                  |
| ~800 宽                | `default-light-800.png` / `full-800-light.png`             | —                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 **pass（dark 下 checkbox 聚焦环清晰可见，`full-dark-toggled.png`）** A3 **warn（checkbox 视觉 size-4=16px，点击目标由包裹 label 承担——shadcn 缺省模式，属 A3 小目标族观察口径）** A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 pass（点击/键盘切换后 Live values 同帧更新）
- B 颜色：B1 pass B2 pass B3 pass（开=primary 蓝、关=muted 灰，语义正确）B4 pass（switch/checkbox 走 shadcn 令牌）B5 pass（dark 全要素适配，开关蓝在暗底可辨）B6 pass
- C 布局：C1 pass（recon 的 overflow 命中均为 overflow:visible 元素的 sh>ch 噪声，无真实滚动溢出）C2–C6 pass/n-a
- D 间隔：D1 pass D2–D8 pass
- E 排布：E1 pass（三问可答：值契约演示、切换、当前值）E2–E6 pass
- F 一致性：F4 warn（缺省开关标签「关/开」zh 落在 en 页 = R2-1d-F4-01 语言割裂族实例）其余 n-a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本页无新立 P0–P2 发现；核心契约全部程序化通过。）

**契约验证记录（程序化，`_tmp/r2-1d-probes/w5-bool-out.json`）**:

- 初始回显: `enabled = 0`、`notify = no`、`agree = false`、`featured = false` —— schema data 初始值直接生效 ✔
- 点击 Enabled checkbox → `enabled = 1`（trueValue: 1 生效）✔
- 点击 Notify switch → `notify = yes`（trueValue: 'yes' 生效）；onLabel「Subscribed」随开态显示，offLabel「Unsubscribed」随关态显示（`default-light-1280-bottom.png`）✔
- Agree/Featured 未配置 trueValue/falseValue → 存 true/false（缺省回退无回归）✔
- 键盘 Space 切换 checkbox → `1 → 0`（键盘可操作）✔
- `[role=switch]` aria-checked 与视觉状态一致（true/false）✔

**族实例确认（一句话，不另立项）**: ① Featured switch 缺省标签显示「关」（zh）落在 en 文案页 → R2-1d-F4-01 语言割裂族（缺省词条未走页面语言）；② checkbox 16px 视觉 + 42×30 switch → A3 小目标族观察口径（label 包裹点击目标 ≥24px 行高，实际可点面积合规）。

## 4. 台账回写

- 本卡完成后：ledger.md `boolean-control-value-contract` 行 status → `carded`；本页无需 digested findings。
