# [card] page:cal-confirm

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/cal-confirm` ｜ **载体**: complex-page（外部应用复刻 · Cal.com 确认表单）
- **矩阵裁剪**: full（"确认弹层"专项经程序化排查：页面无 Dialog/AlertDialog——确认动作为页内表单提交 + toast；弹层维度按 combobox popover + toast 记录）

## 1. 截图清单

| 状态                          | light                                                                                        | dark                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-23/r2-1a/cal-confirm/cal-confirm-default-1280x800-light.png` | `.../cal-confirm-default-1280x800-dark.png`     |
| 整页长截图                    | `.../cal-confirm-fullpage-1280x800-light.png`                                                | —                                               |
| 校验错误态（空提交）          | `.../cal-confirm-validation-1280x800-light.png`                                              | —                                               |
| 团队规模 combobox 打开        | `.../cal-confirm-select-open-1280x800-light.png`                                             | `.../cal-confirm-select-open-1280x800-dark.png` |
| [object Object] toast（dark） | —                                                                                            | `.../cal-confirm-toast-1280x800-dark.png`       |
| 嘉宾添加点击后                | `.../cal-confirm-guest-added-1280x800-light.png`                                             | —                                               |
| 默认 800×900                  | `.../cal-confirm-default-800x900-light.png`                                                  | `.../cal-confirm-default-800x900-dark.png`      |

探针脚本：`_tmp/r2-1a-probes/cal-confirm-interact.mjs` + 内联 REPL 探针（phase2/3 记录于 probe 目录）。

## 2. A–H 勾选

- A 交互：A1 ✓ A2 ✓ A3 warn(A3-02) A4 ✓（"可选"字段无 disabled 样本，n/a 处理）A5 ✓ A6 n/a A7 ✓（combobox popover 有关闭行为、Esc 可退）A8 n/a A9 fail(A9-02)
- B 颜色：B1 fail(B1-01) B2 ✓ B3 ✓（校验红 rgb(181,59,44)、reschedule 提示条语义蓝 ✓）B4 ✓ B5 fail(B1-01 同根因) B6 ✓
- C 布局：C1 ✓ C2 ✓ C3 ✓ C4 fail(C4-01 同 cal-booking 根因) C5 ✓ C6 n/a
- D 间隔：D1 warn(D1-01) D2 ✓ D3 n/a D4 ✓ D5 ✓（label-control 8/16 栅格）D6 n/a D7 ✓（命中均为宿主侧栏）D8 ✓
- E 排布：E1 ✓ E2 ✓ E3 fail(E3-01) E4 ✓ E5 ✓ E6 ✓
- F 一致性：✓（replica 豁免；横切已查）
- G：n/a
- H 弹层：warn（combobox popover w=470 内容自适应、Esc 关闭 ✓；dark 下 popover 亮底 = 已知宿主 `--popover` 覆盖，确认受影响；无 Dialog/Sheet 可走 H1–H9 全项）

## 3. 发现条目

### [R2-1a-A9-02] 确认预约/添加嘉宾 点击后 toast 渲染 "[object Object]"

- **页面/路由**: `#/complex-pages/cal-confirm`
- **主题/视口/状态**: light、dark / 1280×800 / 空表单点击"确认预约"、或点击"添加嘉宾"
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-confirm/cal-confirm-validation-1280x800-light.png`（右下 toast）、`.../cal-confirm-toast-1280x800-dark.png`
- **目视描述**: 页面右下弹出 toast，正文是四段 `[object Object],` 拼接的乱码。
- **程序化证据**:
  - 探针: click `确认预约` 后读 `[data-sonner-toast], .cn-toast` 的 innerText；再 click `添加嘉宾` 复测
  - 输出: `LI.cn-toast` text = `"[object Object],[object Object],[object Object],[object Object]"`（添加嘉宾同样触发）
- **对照基准**: A9 交互后反馈可见非静默；反馈内容必须可读（P0/P1 判级"关键信息不可读"）
- **严重程度**: P1（主路径"确认预约"的高频反馈通道输出乱码）
- **用户影响**: 用户无法知道提交失败原因/嘉宾操作结果；感知为页面故障。
- **修复方向**: schema/触发代码把对象数组直接传给 toast——改为字符串消息（如"请完善必填项"/"嘉宾已添加"）；排查 `notify`/`toast()` 调用点的 payload 序列化。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-B1-01] dark 下表单输入框成"灰板"，placeholder 不可读

- **页面/路由**: `#/complex-pages/cal-confirm`
- **主题/视口/状态**: dark / 1280×800 / 默认表单
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-confirm/cal-confirm-default-1280x800-dark.png`
- **目视描述**: 卡面钉白，但姓名/邮箱/电话/备注输入框变成中灰色实心块，placeholder 与输入文字几乎看不见。
- **程序化证据**:
  - 探针: dark 下读 `.cal-root input` 的 `backgroundColor/color/borderColor`、`::placeholder` color、`.cal-root` bg
  - 输出: input bg = `oklab(0.284899 -0.0068 -0.0375 / 0.3)`（dark 输入底，30% 透明度合成在白卡上→中灰）；placeholder = `rgb(175,189,207)`（亮灰）→ 合成底上对比度 ≈1.05:1；input 文字 `rgb(55,65,81)` 亦贴近灰板；`--background` token 已是 dark（`222 84% 5%`），证明确为令牌泄漏而非主题未切
- **对照基准**: WCAG 1.4.3（≥4.5:1）；B5 dark 平价（"dark 专有缺陷：纯白底块、不可读灰字"）
- **严重程度**: P1（表单是本页唯一任务，dark 下主要输入全部不可读）
- **用户影响**: dark 模式用户无法辨认输入框内容与占位提示，预约确认任务受阻。
- **修复方向**: 与 cal-booking B5-01 同一根因修复：`.cal-root` 钉白时内部控件令牌一并锁 light（移除输入框 `dark:` 底色变体），或补全卡面 dark 适配；input 文字/placeholder 走 `--foreground`/`--muted-foreground` 的亮底档。
- **归族**: systemic → R2-3 批（cal-booking B5-01、notion peek 编辑输入同根因）
- **复核状态**: 未复核

### [R2-1a-E3-01] 确认主按钮在次位（左），且与次按钮高度失配

- **页面/路由**: `#/complex-pages/cal-confirm`
- **主题/视口/状态**: light / 1280×800 / 表单底部动作行
- **截图**: `.../cal-confirm-fullpage-1280x800-light.png`
- **目视描述**: 动作行左起"确认预约"（黑底主按钮）→"返回上一步"（文字钮），主次位与惯例相反；两钮高度悬殊。
- **程序化证据**:
  - 探针: 读两按钮 `getBoundingClientRect` 与动作行 computed `gap`
  - 输出: 确认预约 `{x:699, h:36, bg rgb(17,24,39)}`；返回上一步 `{x:801, h:22}`；行 gap 12px → 主按钮在左、次按钮在右；36 vs 22 高度失配
- **对照基准**: styling-system.md「Dialog / Form Action Button Convention」：actions MUST be `[secondary, primary]`、primary 在右；E3"确认在主位"；E2 主次层级
- **严重程度**: P2（项目自身成文规约违反；replica 对标 Cal.com 的 Confirm 也在右侧，非复刻目标惯例）
- **用户影响**: 快速操作时误点"返回上一步"丢失已填内容。
- **修复方向**: schema actions 顺序改为 `[返回上一步(outline), 确认预约(primary)]`；返回按钮改与主按钮同高（h=36，`size` 档对齐）。
- **归族**: systemic → R2-3 批（notion 新建记录"创建"、stripe 导出/Apply 同为左置主按钮，≥3 页同根因，整体升一级按 P1 报汇总）
- **复核状态**: 未复核

### [R2-1a-A3-02 / D1-01] 次按钮 22px；checkbox 组 10px 非栅格间距

- **页面/路由**: `#/complex-pages/cal-confirm`
- **主题/视口/状态**: light / 1280×800
- **截图**: `.../cal-confirm-fullpage-1280x800-light.png`
- **目视描述**: "返回上一步"按钮矮小；自定义问题 checkbox 组行距略挤。
- **程序化证据**:
  - 探针: A3 遍历短边 <24；D1 兄弟块间隙序列
  - 输出: 返回上一步 `72×22`；radio/checkbox 视觉块 `16×16`（外层 label 行为命中区，误报排除）；checkbox 组间隙 `10`（×2，`nop-checkbox-group-wrapper`）；摘要卡内 `28` gap ×1
- **对照基准**: WCAG 2.5.8；D1 4/8 栅格
- **严重程度**: P3
- **用户影响**: 细节可感知但不阻碍任务。
- **修复方向**: 次按钮 `size` 升档至 h≥24（与主按钮 36 对齐最佳）；checkbox 组 gap 改 `gap-3`(12px) 或 `gap-2`(8px)。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 误报排除记录

- radio/checkbox `16×16` span 与其 `sw26/cw14` 溢出：shadcn 指示器内部 scale 变换 + label 整行命中区，误报（ ux-skill 误报表既定模式）。
- "确认弹层"预期：程序化验证提交后无 Dialog/AlertDialog（`[role=dialog]` 仅 combobox-content），确认动作走表单提交 + toast——按实际形态记录，不算缺陷。
- C1 命中 `sr-only`：误报。
- dark 下 combobox popover 亮底：已知宿主 `--popover` 覆盖（简报已知事实），确认受影响，不重复立项。

## 5. 台账回写提示

ledger.md 本行 status → `carded`；A9-02/B1-01/E3-01 归族对应批后 `digested`。
