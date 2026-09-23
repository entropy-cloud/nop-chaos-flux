# [card] page:ai-tools

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-tools` ｜ **载体**: 域页面（P2 agentic tool loop：mock 模型 emit tool_calls → toolExecutor 执行 get_weather → 结果回灌第二轮流式回复；渲染 ai-tool-call 卡）
- **矩阵裁剪**: simplified（matrixReason：单聊天面板 demo，无 Dialog/Sheet/拖拽 → H n/a、A6/A8 n/a；briefing 指定“折叠/展开中间态、工具状态色 B3/B6”均未裁剪；failed/cancelled 状态本 demo 无触发路径（toolExecutor 恒成功），状态色以源码+success/running 实测核；glass 统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：tool failed/cancelled 状态实测（无触发路径）、弹层、glass 皮肤、375 移动档

## 1. 截图清单

| 状态                                          | light                                                                              | dark                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------- |
| 默认 1280×800                                 | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-tools/ai-tools-default-1280-light.png` | `…/ai-tools-default-1280-dark.png` |
| 默认 800×900                                  | `…/ai-tools-default-800-light.png`                                                 | `…/ai-tools-default-800-dark.png`  |
| 发送后 ~60ms（工具卡初帧）                    | `…/ai-tools-tool-running-mid-light.png`（含流式光标 + 停止/发送切换态）            | —                                  |
| 工具完成（success，默认折叠）                 | `…/ai-tools-tool-success-light.png`                                                | `…/ai-tools-tool-success-dark.png` |
| 折叠/展开切换（两帧，文件名与实际态互换见注） | `…/ai-tools-tool-collapsed-light.png`（实际=展开态：JSON args 可见）               | —                                  |
|                                               | `…/ai-tools-tool-expanded-light.png`（实际=折叠态：与 success 帧同）               | —                                  |
| textarea Tab focus                            | `…/ai-tools-focus-visible-textarea-clip.png`                                       | —                                  |

注：驱动脚本先点击 toggle 后截帧，两张文件名与实际状态互换；两种状态均已采集（`tool-collapsed-light.png` 为展开态证据，含高亮 JSON args），aria-expanded 断言以程序化输出为准。

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（textarea Tab focus 环 clip 证据）A3 pass（toggle/复制/停止 ≥24px，targetScan=0）A4 pass（发送 disabled+opacity .5；流式中 停止 出现、发送转 disabled）A5 pass（流式中有光标+停止按钮指示，无纯文本假加载）A6 n/a A7 n/a A8 n/a A9 pass（发送→工具卡出现→结果气泡→最终回复；aria-expanded 折叠 "false"/展开 "true" 断言通过）
- B 颜色：B1 warn(R2-1d-B1-01 systemic) B2 pass B3 pass B4 pass B5 pass（dark 工具卡/气泡/边框全量复检，success 边框 oklab 绿色通道在 dark 生效）B6 pass（状态色语义：success=text-success 绿 + border-success/30；running=text-muted-foreground + animate-spin（源码 A-12 映射）；failed=text-destructive/cancelled=text-warning 为源码映射，本 demo 无触发路径）
- C 布局：C1 pass C2 warn(R2-1d-C2-01 shell 浮件) C3 pass C4 pass（800 宽自适应）C5 pass（消息列表单滚动容器）C6 n/a
- D 间隔：D1 pass D2–D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass（页头说明 mock 循环机制）E2 pass E3 pass（时间线：用户→工具卡→工具结果→回复 符合 agentic 惯例）E4 pass E5 pass E6 pass
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本页无独立新发现；B1-01/C2-01 命中，全文见 ai-linkage 卡。）

**briefing 指定项核验记录**：

- 折叠/展开中间态：`[data-slot="ai-tool-call-toggle"]` aria-expanded "false"→点击→"true"，args 区 `{"city": "San Francisco"}` 高亮渲染（tok-key/tok-str 语法高亮），再点击折叠；DOM 断言 `collapsed:{expanded:"true",argsVisible:true}` → 注意首帧默认折叠，两次点击输出对应 展开/折叠 两态（见截图清单注）。**工具卡在 success 后默认保持折叠**——参数属详情层级，符合惯例，不立案。
- 工具状态色 B3/B6：success 卡 `border-success/30` + Check `text-success`（dark 下边框 oklab 绿通道实测）；running Loader2 `text-muted-foreground`+spin（源码 A-12 映射，60ms 帧目视佐证）；语义映射集中于 `ai-tool-call.tsx statusColorClass/StatusIcon`，跨页同源，B3 一致性 pass。

## 4. 误报排除记录

- 工具卡/工具结果气泡为 shrink-to-fit 窄卡（~150–205px）而普通气泡近满宽：agentic 工具卡的紧凑惯例，与主消息层级区分有意，不按 C3/E 报。
- 截图文件名 collapsed/expanded 互换：采集时序造成，证据本身完备，非页面缺陷。
- 停止按钮出现时发送转 disabled：流式锁定的正确互斥态，A4/A9 pass 佐证。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；无新独立 findings。
