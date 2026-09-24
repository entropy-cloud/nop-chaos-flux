# [card] control:ai-suggestions

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-suggestions` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host suggestions popover overflow + onSelect payload C8.3 — 5 条建议、overflowMode popover、maxVisible 3 → 3 pills + "+2" trigger）
- **矩阵裁剪**: simplified（matrixReason：紧凑 pills 控件，无拖拽/画布/异步面。裁掉的状态：expand/scroll 两种 overflow 模式（fixture 仅 popover；样式串源码核对 L131-136）、meta.disabled 态（fixture 未配置，源码 L116 通道核对）、chips 流式渐现动画（属于 ai-chat 会话流场景，载体为静态 items，R2-1d ai demo 页已覆盖会话面））

## 1. 截图清单

| 状态                      | light                                                                                      | dark（真 data-mode，自采）                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 默认 1280×800             | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/default-light-1280.png`            | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/default-dark-1280.png`                        |
| hover pill                | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/pill-hover-light-1280.png`         | —                                                                                                     |
| 键盘 focus 落点           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/pill-kbd-focus-light-1280.png`     | —                                                                                                     |
| popover 开（+2 展开）     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/popover-open-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/popover-open-dark-clean-1280.png`（净态重采） |
| 选择 overflow 项 600ms 后 | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/after-select-600ms-light-1280.png` | —                                                                                                     |
| 默认 ~800 宽              | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/default-narrow-800-light.png`      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/default-narrow-800-dark.png`                  |

## 2. A–H 维度勾选表

- A 交互：A1 pass（pill hover 白→muted `rgb(255,255,255)→rgb(241,245,249)`，outline variant hover 通道有效）A2 pass（同 Button 基类 focus-visible oklab ring，ai-prompts 卡 kbFocus 同证据链；本卡 Tab 落点被主题选择器截走，以 prompts 项证据按组件同基类推）A3 pass（pill 24px 达标下限、trigger 32×24；1×1 sr-only 白名单排除）A4 n/a A5 n/a A6/A8 n/a A7 **fail(R2-2c-A7-46)**（选择后弹层不关闭）A9 pass（onSelect dispatch `Refine|3` / `Expand|4` 全局 index 正确）
- B 颜色：B1 pass（pill 12.61:1、trigger 18.26:1）B2 pass B3 pass B4 pass B5 **warn**（dark popover 白底 rgb(251,250,249)、item 前景暖棕 rgb(103,87,76) — `--popover` dark 亮底已知族实例，内容尚可读，§4 引用）B6 pass
- C 布局：C1 pass（`docOverX 0`，全视口零溢出）C2 pass（popover overlay 为有意覆盖）C3 pass C4 pass C5/C6 n/a
- D 间隔：D1 pass（pill 间 gap 8px 落栅格）D2–D8 pass/n/a
- E 排布：E1 pass（pills + "+2" 溢出语义可答）E2 pass E3 pass（popover 内 ghost 项左对齐 justify-start）E4 pass E5 pass E6 n/a
- F 一致性：F1–F3 n/a F4 **warn**（root aria-label "建议" 中文 — i18n 族 aria 实例，§4 引用）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（popover `w-fit` 68px 与内容匹配）H3 pass（bottom 378 ≤ 792）H4–H8 n/a/pass H9 pass

## 3. 发现条目

### [R2-2c-A7-46] 选择 overflow 建议后 popover 不关闭：dispatch 完成仍滞留开态

- **页面/路由**: `#/lab/ai-suggestions`（场景 C8.3；所有 popover 溢出模式会话内建议选择同险）
- **主题/视口/状态**: light / 1280 / 点击 "+2" → 点击 "Expand" 后 600ms
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-suggestions/after-select-600ms-light-1280.png`（popover 仍张开，遮住 scope-debug 标题）
- **目视描述**: 点击溢出建议项完成选择后弹层原地不动，用户需再点空白处才能收起；会话流中表现为"选完建议弹层还挡着对话"。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-suggest2.mjs` selectClose 段（点击后 600ms 查 popover-content 存活性）
  - 输出: `selectClose: { open: true, probeValue: "Expand|4" }` — dispatch 已发生且值正确，但 `[data-slot="popover-content"]` 仍在 DOM；`ai-suggestions.tsx` L174-192 PopoverContent 未接选择即关闭（对比 menu 语义的 auto-close）。
- **对照基准**: 检查提示词 A7（弹层打开态基本完整性）+ 选择类弹层行业惯例（选后即收）
- **严重程度**: P3（多一次点击成本，不阻断任务）
- **用户影响**: 每次从 +N 选择建议都要手动关弹层，高频会话流里积累摩擦。
- **修复方向**: `ai-suggestions.tsx` overflow 项 onClick 内关闭 Popover（受控 open 态或在 PopoverContent 上接 `onClick={() => setOpen(false)}` / 换用 DropdownMenu 语义）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底（dark 平价/对比度族 R2-4）**：净态重测 dark popover bg `rgb(251,250,249)` 白底、item 前景 `rgb(103,87,76)`（`out-w2-suggest2.json` darkPopover）——族新实例，本例文字在白底上尚可读（≈5.2:1），damage 低于 prompts 弹层实例。
- **R2-2a-F4-11（i18n zh-CN 回退）**：root `aria-label="建议"`（`t('flux.ai.suggestionsTitle')`）中文 aria 上英文宿主；aria-only，无视觉面。
- **载体裁剪备注**：chips 流式渐现（本波重点之一）在静态 fixture 不可演示，归 ai-chat 会话流面（R2-1d 已走查 demo 页），此处声明不缺席判。
- **计划内锚点复检通过**：全局 index dispatch（`Refine|3`）✓；pill 24px 触达标线 ✓；"+N" trigger 文案与数量一致（+2）✓。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-suggestions` → carded（卡列填本路径）；findings 归族后 → digested。
