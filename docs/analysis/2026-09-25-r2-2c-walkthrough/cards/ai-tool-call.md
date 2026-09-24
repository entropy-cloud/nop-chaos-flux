# [card] control:ai-tool-call

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-tool-call` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：①host-tool-dialog — openDialog 内 running→success 状态翻转 + args 展开；②host-hitl-dead — wired 审批卡（approve/reject + probe + setValue）与 no-handler 禁用卡并列）
- **矩阵裁剪**: simplified（matrixReason：五态中载体可达 3 态。裁掉的状态：failed / cancelled 两态（fixture 只接 running→success 与 approval 双支；StatusIcon/statusColorClass 源码 L340-388 核对）、jsonrepair 截断参数修复路径（highlightJson 源码核对 + 单测覆盖）、对话框外拖拽/弹层堆叠 n/a）

## 1. 截图清单

| 状态                            | light                                                                                    | dark（真 data-mode，自采）                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 弹层 running（折叠）            | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/dlg-running-light-1280.png`        | —                                                                                       |
| 弹层 args 展开（JSON）          | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/dlg-args-open-light-1280.png`      | —                                                                                       |
| 弹层 success（Mark success 后） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/dlg-success-light-1280.png`        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/dlg-success-dark-1280.png`        |
| HITL pending（双卡 + 焦点）     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-pending-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-pending-dark-1280.png`       |
| approve 后（badge 已批准）      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-approved-light-1280.png`      | —                                                                                       |
| reject 后（badge 已拒绝）       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-rejected-light-1280.png`      | —                                                                                       |
| HITL args 展开 dark             | —                                                                                        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-args-open-dark-1280.png`     |
| HITL pending ~800 宽            | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-pending-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-pending-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（toggle/审批钮 hover 走 variant 通道）A2 pass（pending 进入时 approve 自动聚焦（`hitl-pending-light-1280.png` 可见 ring）；Esc/Tab 焦点陷阱源码 L109-134）A3 **warn**（展开/收起 toggle 20×20 <24 — A3 小目标族实例，§4 引用）A4 pass（no-handler 卡双钮 `disabled: true` + `pointer-events: none` + opacity 0.5 + title 说明）A5 pass（running = Loader2 spin 动画非纯文本）A6–A8 n/a A9 pass（approve 单击 dispatch `approve|call_c8_2` count=1（防双击）、按钮被 badge 替换、host 态翻转）
- B 颜色：B1 **fail(R2-2c-B1-47)**（批准钮白字对比度）B2 pass B3 pass（badge 绿/红语义正确：approved rgb(16,183,127)、rejected rgb(239,67,67)）B4 **fail(R2-2c-B4-48)**（JSON 高亮令牌失效）B5 **warn**（dark 批准钮 PNG 采样 1.83:1 并入 B1-47；dark 弹层白底族实例 §4；dark args 前景 ≈14:1 过）B6 **warn(R2-2c-B6-49)**（状态色边框 0 宽不可见）
- C 布局：C1 pass（弹层内 args pre `scrollW 480 = clientW 480`；页面 `docOverX 0`；800 宽无溢出）C2 pass C3 pass C4 pass C5/C6 n/a
- D 间隔：D1 pass（args `mt-1`、审批条 `mt-2 pt-2` 成体系）D2–D8 pass/n/a
- E 排布：E1 pass（工具名 + 状态图标 + 展开箭头可答）E2 pass（拒绝 outline 左、批准 primary 右——G5-R2-视角6-01 DOM 序锚点复检通过）E3 pass E4 pass（卡内元素左对齐）E5/E6 n/a
- F 一致性：F1–F3 n/a F4 **warn**（批准/拒绝/已批准/已拒绝/未配置审批处理器/收起(aria)/工具调用：get_weather—执行中(aria) 全中文 — R2-2a-F4-11 族重实例，§4 引用）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（560 md 档）H3 pass H4 pass H5 n/a H9 pass（800 宽不溢出）

## 3. 发现条目

### [R2-2c-B1-47] 批准（approve）主按钮白字对比度不足：light 2.59:1 / dark 1.83:1

- **页面/路由**: `#/lab/ai-tool-call`（场景 2 HITL 审批卡；所有 pending 审批入口同险）
- **主题/视口/状态**: 双主题 / 1280 / approval pending
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/hitl-pending-light-1280.png`（右下绿底白字"批准"）；`hitl-pending-dark-1280.png`（更亮的绿底）
- **目视描述**: 批准按钮 bg-success 绿底 + 白字，白字浮在中等亮度绿上发虚；dark 下绿更亮，字几乎贴底色。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-toolcall2.mjs` contrastLight 段（computed 对比）+ `w2-suggest2` 同款 PNG 采样器对 dark PNG 取 modal bg（`node` 内联采样，见探针输出）
  - 输出: light 白字 on `rgb(16,183,127)` = **2.59:1**（`out-w2-toolcall2.json` approveLabel）；dark 白字 on `rgb(38,217,157)` = **1.83:1**（PNG 像素采样 4 点 modal bg + 最亮字形像素）。`ai-tool-call.tsx` L243 `className="bg-success hover:bg-success/90 text-white"`。
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）+ 检查提示词 B1
- **严重程度**: P2（HITL 审批为 AI 治理关键动作、卡片主操作；dark 1.83:1 接近 P1 线，但标签仍可辨认、非高频主路径，判 P2）
- **用户影响**: 审批按钮可读性差，光照不佳/低视力用户读"批准"二字费力；语义色（绿=通过）仍在，任务可完成。
- **修复方向**: `ai-tool-call.tsx` L243 文字改 `text-success-foreground`（或白字改深色 `--primary-foreground` 对应档），或在 theme-tokens 调深 `--success`（light 至 ≥4.5:1 的绿，dark 同步校）；两主题各验一次 4.5:1。
- **归族**: local → R2-4 批（与 dark 平价族相邻但根因是 light+dark 双态色对，单点可修）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-25）：PNG 采样 light 2.59:1 / dark 1.83:1 逐值复现

### [R2-2c-B4-48] JSON 参数语法高亮整体失效：tok-key / tok-str / tok-bool 全部继承前景色

- **页面/路由**: `#/lab/ai-tool-call`（场景 1 弹层 args 展开 + 场景 2 defaultOpen 卡；所有展开的 tool-call 参数同险）
- **主题/视口/状态**: 双主题 / 1280 / args 展开态
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/dlg-args-open-light-1280.png`、`hitl-args-open-dark-1280.png`（`"city": "Hangzhou"` 单色无高亮）
- **目视描述**: 展开的参数 JSON 所有 token 同色，源码承诺的 key 蓝 / string 绿 / bool 红 语义色一块都不出现。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-toolcall2.mjs` dlgArgs/darkArgsTokens 段（`.tok-key`/`.tok-str` computed color）
  - 输出: light `keyColor === strColor === rgb(33,53,71)`（继承前景色，非 fallback hsl(221 83% 53%)/绿）；dark 同样 `rgb(230,236,243)` 同色；`.tok-*` 规则在 `styles.css` L68-79 且经 alias 注入（`vite.workspace-alias.ts` L88-89 指向 src/styles.css），span 类名在 DOM 存在——规则未命中渲染树，高亮特性死通道。
- **对照基准**: 检查提示词 B4（走令牌）+ 渲染器源码承诺（highlightJson token 分类 + styles.css 消费）
- **严重程度**: P3（内容完整可读，仅失去类型辨识辅助）
- **用户影响**: 复杂参数中 key/value/布尔值无法一眼区分，长 args 审阅效率下降；渲染器声称的高亮特性形同虚设。
- **修复方向**: 排查 styles.css 注入顺序/选择器命中（`.nop-ai-tool-call .tok-key` 祖先类是否被 `props.className` 合并覆盖或 CSS 层叠被 Tailwind base 重置）；本地复现优先在 devtools 查 `.tok-key` 规则匹配失败原因，补 `index.ts` 侧样式导入保障。
- **归族**: local → R2-4 批
- **复核状态**: 已复核（保留 P3，根因改判，review-a 2026-09-25）：原"规则未命中渲染树"证伪——规则命中且赢得级联；真根因 = playground `--primary` 是 HSL 分量裸值，`var(--primary, fallback)` 替换后计算值非法回退继承，fallback 永不生效（同写法处建议全查）

### [R2-2c-B6-49] 五态状态色边框 0 宽不可见：A-12 状态颜色信号仅剩 14px 图标

- **页面/路由**: `#/lab/ai-tool-call`（全场景；running→success 翻转前后对照）
- **主题/视口/状态**: light / 1280 / 弹层内状态翻转
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-tool-call/dlg-running-light-1280.png` vs `dlg-success-light-1280.png`（翻转前后卡片轮廓零变化，仅图标换）
- **目视描述**: 源码 `statusColorClass` 为四态分配 border-success/30、border-destructive/40 等边框色，但卡片翻转到 success 后外框与 running 完全一样——状态色从未画出来。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-toolcall.mjs` dialogRunning/dialogSuccess 段（root computed border）
  - 输出: running `border: "0px solid rgb(225,231,239)"` → success `border: "0px solid oklab(…/0.3)"`——颜色变了但 `border-top-width` 恒 0；根类串（L138 `cn('nop-ai-tool-call', statusColorClass(status), …)`）只有 border-**color** 工具类、无 border 宽度类，`styles.css` 亦无 `.nop-ai-tool-call` 基础边框规则。
- **对照基准**: 渲染器源码注释承诺（A-12 status color + `data-tool-status` 宿主 CSS 钩子）+ 检查提示词 B6（状态可辨识）
- **严重程度**: P3（图标仍传达状态；但"成功/失败整卡着色"的设计意图完全没兑现，failed 红框警示同样丢失）
- **用户影响**: 状态识别只能依赖小图标扫视；失败态缺少整卡红色警示的氛围信号。
- **修复方向**: `ai-tool-call.tsx` L138 根类串补 `border`（宽度 1px）并给根加基础 `rounded-md border p-2`（或 statusColorClass 内联完整 `border border-*` 工具类），四态边框即刻可见。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **R2-2a-F4-11（i18n zh-CN 回退）本波最重视觉实例**：可视按钮文案"批准/拒绝"、"已批准/已拒绝"badge、no-handler title"未配置审批处理器"、toggle aria"收起"、root aria"工具调用：get_weather — 执行中"全部中文上英文宿主（`hitl-pending-light-1280.png`）。
- **A3 小目标族（R2-1a-A3 族 watch）**：展开/收起 toggle `20×20`（`h-5 w-5 p-0`，L154），页面上 2 实例（`out-w2-toolcall.json` smallTargetsLight）——族新实例。
- **`--popover` dark 亮底（dark 平价族 R2-4）**：tool host 弹层 dark 白底 `rgb(251,250,249)`、工具名 `rgb(103,87,76)`（`out-w2-toolcall.json` darkDlg）——族实例，内容可读。
- **计划内锚点复检通过**：HITL dead-click 主承诺全过——快速双击 dispatch 恰好 1 次（`probeCount: 1`）、按钮替换为 badge、host 态 approved/rejected 双支翻转、no-handler 卡 disabled + title、pending 进入时焦点落 approve（截图可见 ring）、拒绝支 badge 红。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-tool-call` → carded（卡列填本路径）；findings 归族后 → digested。
