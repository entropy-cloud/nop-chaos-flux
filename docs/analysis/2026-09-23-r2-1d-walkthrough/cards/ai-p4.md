# [card] page:ai-p4

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-p4` ｜ **载体**: 域页面（P4 widgets：ai-voice-input / ai-token-usage SVG 环 / ai-suggestions expand+popover 双模式）
- **矩阵裁剪**: simplified（matrixReason：静态 widgets 展示页，无 chat/弹层 Dialog/拖拽 → H 仅 Popover 抽查、A6/A8 n/a；voice 的真实 ASR 结果链路无法在 headless 取证（环境限制，见存疑项）；glass 皮肤统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：voice 听写成功路径（headless 无麦克风/权限链路）、弹层长内容 H3/H8、glass 皮肤、375 移动档

## 1. 截图清单

| 状态                           | light                                                                               | dark                                       |
| ------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800                  | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-p4/ai-p4-default-1280-light.png`        | `…/ai-p4-default-1280-dark.png`            |
| 默认 800×900                   | `…/ai-p4-default-800-light.png`                                                     | `…/ai-p4-default-800-dark.png`             |
| suggestion chip hover          | `…/ai-p4-suggestion-hover-light.png`                                                | —（hover 态族已 light 坐实）               |
| suggestions popover 打开（+3） | `…/ai-p4-suggestions-popover-open-light.png`                                        | —（dark 弹层亮底为已知族，未重复取证）     |
| voice 点击后 listening 态      | `…/ai-p4-voice-error-toast-light.png`（headless 下进入 listening 波形条，无 toast） | `…/ai-p4-token-ring-dark.png`（dark 全件） |

## 2. A–H 维度勾选表

- A 交互：A1 pass（chip hover 有底色变化）A2 pass（Tab 走查 focus 环可见——同族 clip 证据）A3 pass（+3 触发器 31.9×24、chips 24px 高，targetScan=0）A4 n/a A5 n/a A6 n/a A7 warn（见 H——popover 打开态基本完整：有点外关闭/Esc）A8 n/a A9 pass（点击 chip → showToast info 反馈；voice 点击→listening 态切换）
- B 颜色：B1 pass B2 pass B3 pass B4 pass（token 环走 primary 令牌 rgb(28,110,242)）B5 pass（dark token-usage/卡片/chips 全量复检，无纯白块）B6 pass
- C 布局：C1 pass（仅 sr-only 误报）C2 warn(R2-1d-C2-01 全局浮件，见 ai-linkage 卡) C3 pass（四卡纵列分区清晰）C4 pass（800 宽单列自适应）C5 pass C6 pass（SVG 环 28×28 完整无拉伸）
- D 间隔：D1 pass（卡间 gap-6/24px 栅格）D2–D5 pass D6 n/a D7 pass（仅 SVG 内部与 token-usage 行内 span 负 gap，均为组件内有意叠印，目视无异常）D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass（卡片分组语言统一）E6 pass
- F 一致性：F1 warn（P3 观察：本页 suggestions 用 emoji 图标 ✏️🌐💡，ai-widgets 同 5 项用 lucide 线性图标——同为 demo 数据选择，未立案，登记观察）F2–F5 pass/n-a
- G 设计器：n/a
- H 弹层：n/a（无 Dialog/Sheet/Drawer；Popover 为内容型浮层，阶梯外；dark 下 popover 亮底 = 宿主 `--popover` 已知族，确认命中不另立）

## 3. 发现条目

（本页无独立新发现。dark 主按钮对比度 R2-1d-B1-01 与全局浮件 R2-1d-C2-01 本页不命中/命中情况：本页无 dark 主按钮（无发送钮），浮件命中但已在 ai-linkage 卡全文登记，不重复。）

## 4. 误报排除记录与存疑项

- **误报**：GAPS 探针报 token-usage 行内 SPAN 负 gap（-12/-14px）：目视核 `…/ai-p4-default-1280-light.png`，“500 / 4,096 ↑320 · ↓180 · $0.0012” 排布正常，为环上文字绝对定位叠印，不报。
- **误报**：SVG path/rect 负 gap：环形图 track/arc 同心叠印，设计如此。
- **存疑（环境限制，不立案）**：headless Chromium 中 voice 点击进入 listening 波形条后无 onError toast（真实浏览器unsupported/permission-denied 路径由组件源码保证：`ai-voice-input.tsx` mount 时 unsupported → onError({reason:'unsupported'})）。listening 态 UI 从小按钮跳变为整卡宽波形条（686×28），视觉跳跃偏大，P3 观察不立案。
- **确认已知族**：dark 下 popover 亮底（宿主 `--popover: 30 20% 98%` 无 dark 对应值）影响本页 suggestions popover——按 briefing 已知事实只确认影响面，不重复立项。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；无新独立 findings 需归族。
