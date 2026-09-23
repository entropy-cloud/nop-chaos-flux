# [card] page:ai-linkage

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-linkage` ｜ **载体**: 域页面（P4 Advanced：engine.regenerate 分支 + Decision-A messages→form field + Decision-B data-source reload 双联动演示）
- **矩阵裁剪**: simplified（matrixReason：控件 demo 页，无 Dialog/Sheet/Drawer → H 全列 n/a；无拖拽 → A6/A8 n/a；无独立 loading/empty/error 异步面（mock 流即时返回，空列表即 empty 态已核）→ A5 静态核；glass 皮肤本波统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：弹层打开、拖拽进行中、loading/empty/error 专项、glass 皮肤、375 移动档

## 1. 截图清单

| 状态                                   | light                                                                                                                                    | dark                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 默认 1280×800                          | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-linkage/ai-linkage-default-1280-light.png`                                                   | `…/ai-linkage-default-1280-dark.png` |
| 默认 800×900                           | `…/ai-linkage-default-800-light.png`                                                                                                     | `…/ai-linkage-default-800-dark.png`  |
| 发送后流式中（~250ms 抓帧）            | `…/ai-linkage-streaming-mid-light.png`                                                                                                   | —（light 已坐实，dark 仅复检完成态） |
| 发送完成（联动生效）                   | `…/ai-linkage-completed-light.png`                                                                                                       | —                                    |
| Regenerate 后（分支选择器 2/2 + 联动） | `…/ai-linkage-regenerated-light.png`                                                                                                     | `…/ai-linkage-regenerated-dark.png`  |
| Regenerate 后 800 宽                   | `…/ai-linkage-regenerated-800-light.png`                                                                                                 | —                                    |
| hover/focus/disabled                   | 未单独截帧：发送 disabled 已程序化核（opacity .5+disabled 属性，A4 pass）；focus 环已由 ai-widgets/tools 页同族 clip 截图证实（A2 pass） | —                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（Tab 走查 focus 环可见，clip 证据见 ai-widgets 卡）A3 pass（分支 prev/next 24×24、Regenerate 28px，targetScan=0）A4 pass（发送 disabled+opacity.5 程序化核实）A5 pass（空列表为天然空态，无骨架需求）A6 n/a A7 n/a A8 n/a A9 pass（发送→气泡+Decision-A JSON+Decision-B 计数 1→2 全链路 DOM 断言）
- B 颜色：B1 warn(R2-1d-B1-01，dark 发送 3.26:1，systemic) B2 pass B3 pass B4 pass（按钮走 variant/令牌）B5 pass（dark 双态截图无纯白块/不可读灰字；弹层亮底已知族本页无弹层）B6 pass
- C 布局：C1 pass（overflow 扫描仅 sr-only 误报）C2 warn(R2-1d-C2-01，全局浮件压 Back，shell 级) C3 pass（对话主区+右侧联动卡分区清晰）C4 pass（800 宽保持双栏可读、无溢出）C5 pass（无滚动容器堆积）C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a（无分页条）D7 pass（修复 flexDirection 误报后无 tight/overlap 实体）D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass（卡片分组一致）E6 pass（空对话区有 placeholder 引导）
- F 一致性：F1 pass F2 pass（左右分区与 persistence 页同档）F3 pass F4 pass F5 n/a
- G 设计器：n/a（非画布页）
- H 弹层：n/a（无 Dialog/Sheet/Drawer；无 Popover 面）

## 3. 发现条目

（本页无独立新发现；命中两条跨页族，详见 ai-widgets / ai-tools 卡全文）

### [R2-1d-B1-01] dark 主按钮白字对比度 3.26:1（systemic，本页命中）

- **页面/路由**: `#/ai-linkage`（发送按钮；全部 7 页 dark 复现）
- **主题/视口/状态**: dark / 1280×800 / 默认态（disabled 前后同色）
- **截图**: `…/ai-linkage-regenerated-dark.png`（右下发送钮）
- **目视描述**: dark 下 primary 蓝明显变浅，白字“发送”对比度不足。
- **程序化证据**: 探针: `getComputedStyle` 组色 WCAG 计算（oklab 解析 + 令牌画布回退）；输出: fg rgb(255,255,255) / bg rgb(77,141,245) = **3.26:1**（need 4.5，12.8px）。7/7 页命中。
- **对照基准**: WCAG 1.4.3；theme-tokens classic dark `--primary: 217 89% 63%`。
- **严重程度**: P2（高频主操作按钮；系统性 ×7 页 → 升 P1 边界，本波按 P2 登记）
- **用户影响**: dark 用户看主按钮文字吃力；低视力用户不达标。
- **修复方向**: dark 块 `--primary` 加深一档（如 217 89% 55%，即已有 `--primary-dark`），或 primary 按钮文字在 dark 下改用 `--primary-foreground` 深色变体；一处令牌改全站生效。
- **归族**: systemic → R2-3 批（theme-tokens 令牌族；其他波次若含 dark 主按钮应同源去重）
- **复核状态**: 未复核

### [R2-1d-C2-01] 全局浮件压页头 Back（shell 级，本页命中）

- **页面/路由**: 全部 7 页（含本页）
- **主题/视口/状态**: light+dark / 全视口 / 默认态
- **截图**: `…/ai-linkage-default-1280-light.png`（左上 “流 0” 徽标压 Back 按钮区）
- **目视描述**: 左上角 nop-debugger 浮标（“流 0”）与页头 Back 按钮视觉重叠，Back 文字被遮半截。
- **程序化证据**: 探针: Back rect {x:12,y:12,h:28} + debugger 浮标 fixed(24,24) 求交；输出: 相交（`__NOP_DEBUGGER__.position {x:24,y:24}, dock:'floating'`）。
- **对照基准**: 检查提示词 C2（浮层压内容）；shell 级 fixture，跨域页面共用。
- **严重程度**: P3
- **用户影响**: Back 可点（浮标 28×28 之外区域），但视觉混杂、误读为破损。
- **修复方向**: playground `__NOP_DEBUGGER__.position` 下移（如 y:64）或 demo 页 header 预留位；属 playground 壳层配置非产品代码。
- **归族**: systemic → R2-3 批（shell fixture 全域复用；与其他波次同源去重）
- **复核状态**: 未复核

## 4. 误报排除记录

- 发送 disabled 光标为 pointer（nop-haptic 注入）：pointer-events:none 下不呈现，A4 不报。
- GAPS 探针 flex-row 容器的横向负 gap：flexDirection 修正后消除（脚本误报）。
- 分支按钮 24×24：恰在 WCAG 2.5.8 下限，pass 不报。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；B1-01/C2-01 归族 R2-3 后 → `digested`。
