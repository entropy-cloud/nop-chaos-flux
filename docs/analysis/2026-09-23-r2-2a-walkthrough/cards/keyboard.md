# [card] control:keyboard

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/keyboard` ｜ **载体**: lab 页（3 场景：single combo / chord sequences / input focus gating）
- **矩阵裁剪**: simplified（matrixReason：keyboard 渲染 `null`，纯 headless 通道——视觉维度全部 n/a，按"结构类契约核对"裁剪；交互面以真实按键 + DOM diff 取证（A9）。裁掉：glass、hover/focus/disabled 元素态（无自身 DOM）、~375 档）
- **runner dark 列作废声明**：同 icon 卡——runner dark 截图为 light 渲染；本卡 dark 证据以 `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/full-*-dark.png` 为准（headless 控件 dark 下无差异面，拍页仅证载体无异常）。

## 1. 截图清单

| 状态                      | light                                                                          | dark（自采）                                                          |
| ------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 默认 1280×800             | `_tmp/visual-inspection-2026-09-23/lab-keyboard-default-1280x800-light.png`    | `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/full-1280-dark.png` |
| 默认 800×900              | `_tmp/visual-inspection-2026-09-23/lab-keyboard-default-800x900-light.png`     | `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/full-800-dark.png`  |
| Mod+Shift+S 后（hits: 1） | `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/combo-after-1280-light.png`  | —（行为无主题面）                                                     |
| 和弦 g o / g fallback 后  | `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/chord-after-1280-light.png`  | —                                                                     |
| gating 输入后             | `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/gating-after-1280-light.png` | —                                                                     |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（渲染 null）A5 n/a A6–A8 n/a **A9 fail(R2-2a-A9-23)**（onTrigger showToast 全部不可见——lab 载体未挂 Toaster，见发现）
- B 颜色：B1–B6 n/a（无自身视觉面；载体文本对比已由 page/text 卡覆盖）
- C 布局：C1 pass（1280/800 overflow 扫描零命中）C2–C6 n/a
- D 间隔：D1–D8 n/a
- E 排布：E1 pass（演示文案清晰指导按键）E2–E6 n/a
- F 一致性：F1–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 行为取证（headless 控件的"状态矩阵"替代）

- **单键组合**: Mod+Shift+S → `hits: 0 → 1`（探针 `_tmp/r2-2a-probes/w2-keyboard-result.json` combo-light/combo-dark 均 ok:true）——绑定→setValue→文本回显全链路 ✓
- **和弦**: `g o` 1s 窗口内 → `last chord: g o` ✓；裸 `g` 等窗口关闭 → `g (fallback)`（longest-match 回退）✓，双主题一致
- **输入门控**: activeElement=INPUT 已程序化确认（w2-misc-result.json gatingFocus）后连打 `gg` → `gated hits` 保持 0 ✓（早一轮探针 hits=2 为焦点未落的探针噪声，已用 focus 断言复测排除）
- **allowInInput**: Mod+Enter 在输入框内触发 setValue 通道正常，但其 showToast 反馈不可见（见下条发现）

## 4. 发现条目

### [R2-2a-A9-23] showToast 触达但零反馈：lab 载体未挂 Toaster，onTrigger/allowInInput 提示全部静默

- **页面/路由**: `#/lab/keyboard`（chord 场景 `onTrigger: showToast`、gating 场景 Mod+Enter `showToast`；同根因覆盖全部 124 条 lab 路由）
- **主题/视口/状态**: 双主题 / 1280 / 按键触发后 150–500ms 内扫描
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/keyboard/chord-after-1280-light.png`（和弦已命中 `last chord: g (fallback)` 但画面无任何 toast 痕迹）
- **目视描述**: 按 `g o`/`g` 或在输入框内 Mod+Enter，行为侧 lastChord/hits 均更新，但演示文案承诺的 "Triggered ${keys}"/"Saved (allowInInput)" 提示从未出现。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w2-keyboard-result.json` toast-sweep（按后 150ms 全 DOM 扫描）+ `w2-misc-result.json`
  - 输出: toast-sweep 六类选择器（sonner/status/alert）全 0、`bodyHasTriggered: false`；`grep Toaster apps/playground/src/component-lab` 零命中——Toaster 仅在 `complex-pages/shared/render-host.tsx` L103 与部分 demo 页挂载，lab 路由壳（`ComponentLabPage`）未挂。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；toast() 调用方契约（`@nop-chaos/ui` Toaster+toast 成对使用）
- **严重程度**: P2（载体级静默失败：所有 lab 页的 showToast 动作不可见，键盘/异步反馈类演示全部失真）
- **用户影响**: 使用者在 lab 里验证键盘绑定/异步成功提示时得到"功能没生效"的错误结论。
- **修复方向**: `apps/playground/src/component-lab/component-lab-page.tsx`（lab 路由壳）根部挂 `<Toaster />`（照抄 complex-pages/shared/render-host.tsx L103 的挂法）。
- **归族**: systemic → R2-3 批（lab 载体基建缺口，波内 9/9 lab 页共享同一壳层）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。订正（根因改判）：真吞点是 lab env createDefaultEnv() 的 notify: () => undefined（flux-react/src/defaults.ts L26 硬 no-op），showToast 到不了 toast()；修复须 notify 覆写 + Toaster 挂载两件套，原卡"仅挂 Toaster"不成立

## 5. 疑点（不计发现）

- **跨场景按键串扰**: 同页三个 keyboard 节点共享 window keydown 通道——在 gating 场景打 `g` 也会推进 chord 场景的缓冲/回退（v2 探针 chord 状态被污染的旁证）。控件按设计是多实例共存，但 lab 把三个全局通道摆在同一页演示，互相污染演示结果。建议 fixture 给每场景加 when 条件或分页演示。
- **lab scope 数据跨刷新持久**: 第二次进入页面 `hits` 起始为 1（上一轮写入残留），setValue 的写入在某处按 schemaUrl 持久化——影响 lab 演示确定性，归 R2-3 疑点池待查。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/keyboard/design.md（owner-doc-missing，review-a D-5，2026-09-24）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 台账回写

- 主 session 统一翻转 `lab-keyboard` → carded。
