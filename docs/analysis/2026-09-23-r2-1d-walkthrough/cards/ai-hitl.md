# [card] page:ai-hitl

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-hitl` ｜ **载体**: 域页面（flux-renderers-ai P3 demo：ai-tool-call 人工审批——批准/拒绝、Tab/Esc 焦点陷阱、决定后徽章；引擎持状态、宿主持工作流）
- **矩阵裁剪**: simplified（matrixReason：单卡片交互 demo，核心即批准/拒绝两路径 + 键盘陷阱，已全数程序化核查；无弹层（卡片内嵌工具卡非 Dialog）→ H n/a；无拖拽/异步流；~375 档未跑）
- 本页实际裁掉的状态：glass 皮肤、Esc 返回焦点的逐帧验证（Tab 陷阱已核，Esc 仅核了 Popover 场景）、~375 移动档

## 1. 截图清单

| 状态                                                                     | light                                                               | dark                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------- |
| 默认（pending：拒绝 + 批准 双钮）                                        | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-hitl/default-light.png` | `pending-dark.png`  |
| 批准后（绿勾 + “已批准”徽章 + 日志行）                                   | `approved-light.png`                                                | `approved-dark.png` |
| 重置后拒绝（“已拒绝”路径）                                               | `rejected-light.png`                                                | —                   |
| 默认 1280（hover/focus 抽样并入默认帧；按钮 focus ring 经 Tab 轮询核实） | 同上                                                                | —                   |

视口裁剪说明：本页为 max-w-2xl 单列居中布局，~800 视口与 1280 无结构性差异，未单独采集（窄视口裁剪理由：无多列壳层可挤压）。

## 2. A–H 维度勾选表

- A 交互：A1 pass（批准/拒绝 hover 反馈为 shadcn Button 族）A2 pass（Tab 在 批准⇄拒绝 间循环——探针 4 连 Tab 输出 `BUTTON:拒绝→BUTTON:批准→BUTTON:拒绝→BUTTON:批准`，focus ring 可见）A3 pass（批准/拒绝 66×28；**收起钮 20×20 → R2-1a A3 小目标族，不另立项**）A4 pass（决定后按钮移除、重复触发被 `approval!=='pending'` 守卫）A5 n/a A6 n/a A7 n/a A8 pass（纯按钮操作，无拖拽依赖）A9 pass（批准 → 徽章“已批准”+ 日志行 "Approved → executing transfer_funds… result: ok"；拒绝 → “已拒绝”+ denial 日志；探针双路径核实）
- B 颜色：B1 pass B2 pass B3 pass（批准=success 绿、拒绝=outline+ban 图标、决定徽章绿描边——语义正确且与 coverage 页 tool-call 状态徽章同构）B4 pass（令牌色）B5 pass（dark pending/approved 复拍正常）B6 pass（未用默认蓝一键切，成功/危险语义分明）
- C 布局：C1 pass（overflow 扫描空）C2 fail→**R2-1d-C2-01**（跨页已知：debugger 球压 Back）C3 pass（说明文案 + 工具卡 + 日志三段清晰）C4 pass（单列自适应）C5 pass C6 n/a
- D 间隔：D1 pass（卡片内 header/args/footer 分隔线节奏一致）D2 pass D3 pass D4 pass D5 pass D6 n/a D7 pass（页内无 0px 贴死；sender 不在本页）D8 pass
- E 排布：E1 pass（首屏即答：要审批什么、怎么批）E2 pass（批准绿色实心为主操作，拒绝 outline 为次）E3 pass（**拒绝左、批准右**，符合 styling-system.md “actions=[secondary, primary]” 约定）E4 pass E5 pass（分割线分组）E6 n/a
- F 一致性：F1 pass（与 coverage 页 tool-call 徽章/按钮同构）F2 n/a F3 n/a F4 fail→**R2-1d-F4-01**（本页显式 `initFluxI18n({lng:'en-US'})` 仍渲染“批准/拒绝/已批准”，英文 "Reset"/英文说明同屏——locale 单例问题的最强证据页）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

本页无独立新发现。跨页已知项引用：R2-1d-C2-01（debugger 悬浮球）、R2-1d-F4-01（locale 混排，本页为根因定位提供最强证据：en-US 资源存在、init 调用存在、渲染仍中文）。

[visual-only] 观察（不立项）：JSON 参数区语法高亮 token（tok-key/tok-str/tok-num）在浅色下对比偏弱但可读，色值走 `--primary/--success/--destructive` 令牌（styles.css L57-70），符合 B4；不做对比度逐 token 立项。

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger。
