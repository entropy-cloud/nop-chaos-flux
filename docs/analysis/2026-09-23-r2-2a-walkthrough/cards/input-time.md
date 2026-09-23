# [card] control:input-time

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-time` ｜ **载体**: lab 页（2 场景：bounded clearable / custom valueFormat HHmm）
- **矩阵裁剪**: simplified（matrixReason：原生 `<input type=time>` 单控件；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、秒精度 step（fixture 未配置）。弹层开态说明：时间选择面板为浏览器原生 chrome，Playwright 无法程序化截图取证（无法程序化清单）；DOM 侧以 value/min/max/clear 探针替代）

## 1. 截图清单

| 状态                           | light                            | dark（真 data-mode）       |
| ------------------------------ | -------------------------------- | -------------------------- |
| 默认 1280×800 s1（08:30 AM）   | `default-s1-light-1280.png`      | `default-s1-dark-1280.png` |
| 默认 s2（HHmm 存储显示 08:30） | `default-s2-hhmm-light-1280.png` | —                          |
| 清空后                         | `cleared-s1-light-1280.png`      | —                          |
| 默认 800×900                   | `default-s1-light-800.png`       | —                          |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/input-time/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 pass（clear 按钮 24×24）A4 n/a A5 n/a A6/A8 n/a A7 n/a（原生面板）A9 **warn(R2-2a-A9-64)**（越界时间静默钳制，见发现）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（dark 输入框 bg/color/border 走令牌，截图复核可读）B6 n/a
- C 布局：C1 pass（overflow 0 hits，1280/800 均 0）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D5 pass 其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** clear aria"清除"（flux-i18n t('flux.common.clear')）中文；时间显示"08:30 AM"随宿主 locale 为 en-US 正常 F5 n/a
- G 设计器：n/a
- H 弹层：n/a（原生时间面板无法取证）

## 3. 发现条目

### [R2-2a-A9-64] minTime/maxTime 未映射到原生 min/max 属性：越界时间可在面板中选出，提交时静默改写为边界值

- **页面/路由**: `#/lab/input-time`（场景 1 "Bounded, clearable time field"，minTime 06:00 / maxTime 22:00）
- **主题/视口/状态**: light / 1280 / 输入 03:00 后失焦提交
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-time/default-s1-light-1280.png`（正常态；越界路径为探针时序，无独立截图，判据以探针输出为准）
- **目视描述**: 控件无任何边界视觉提示；用户键入/选出 03:00 后值瞬间变为 06:00，无提示文案。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w4-period.mjs`（contract + clamp 探针）
  - 输出: `min: "", max: ""`（原生 min/max 属性为空——schema minTime/maxTime 未透传）；`clampLow: "06:00"`（fill('03:00') 后提交值为下边界 06:00，钳制生效但为静默改写）。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；AMIS 时间边界语义
- **严重程度**: P3（钳制方向正确、有值回显可感知；缺边界提示与原生约束）
- **用户影响**: 用户选出界外时间被无解释改写，易误以为是自己的输入生效；原生面板本可禁用界外选项。
- **修复方向**: `packages/flux-renderers-form/src/renderers/input-time-renderer.tsx` 将 minTime/maxTime 透传为 `<input type=time>` 的 `min`/`max` 属性（原生面板自动禁用界外项），或钳制发生时叠加 helper 提示（"已调整至可选范围 06:00–22:00"）。
- **归族**: watch-only → 台账（行为契约已满足一半；属输入约束通道补全，可在 R2-3 表单契约批顺带）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **F4-11 i18n zh-CN 回退（已知族）**：clear 按钮 aria"清除"中文（时间显示 AM/PM 随宿主 locale 正常）。
- **弹层 actions 左对齐（R2-3b 已知族）**：Submit 左对齐。
- 计划内锚点复检通过：custom valueFormat HHmm（存储 "0830" 显示 "08:30"，`default-s2-hhmm-light-1280.png`）；clear 按钮随值显隐、清空写 undefined；改写 14:45 即时生效。

## 交互键登记

- 无注册交互键：时间面板为原生浏览器 chrome（非 DOM 元素），开态无法经 runner action 驱动/截帧（wave4 报告登记补录 2026-09-24，closure audit m-2）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-time` → carded（卡列填本路径）；findings 归族后 → digested。
