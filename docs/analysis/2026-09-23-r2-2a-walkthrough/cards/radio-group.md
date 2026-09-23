# [card] control:radio-group

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/radio-group` ｜ **载体**: lab 页（2 场景：vertical 初始值 / horizontal 行内布局 + live summary）
- **矩阵裁剪**: simplified（matrixReason：单选组无弹层；已查：选中态切换、键盘 roving（方向键）、focus 环、error 态、水平/垂直两布局；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、options 异步源（fixture 无））

## 1. 截图清单

| 状态                                 | light                                                                       | dark（真 data-mode）        |
| ------------------------------------ | --------------------------------------------------------------------------- | --------------------------- |
| 默认 1280×800 s1/s2                  | `default-s1-light-1280.png` / `default-s2-light-1280.png`                   | —                           |
| 选中态（Pro 初始 / Enterprise 点选） | `default-s1-light-1280.png` / `selected-enterprise-fixed-s1-light-1280.png` | `selected-s1-dark-1280.png` |
| 键盘方向键移动（焦点随行）           | `kb-focus-ring-s1-light-1280.png`                                           | —                           |
| error（空 required 提交）            | `error-required-s2-light-1280.png`                                          | —                           |
| 默认 800×900 s2 水平布局             | `default-s2-light-800.png`                                                  | —                           |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/radio-group/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（radio item focus 后 box-shadow ring 呈现，`kb-focus-ring-s1-light-1280.png`）A3 **warn（已知族 A3 引用）** 可视圆钮 16×16（点击目标为整行 label，含文字，有效命中区大于 24px——按误报排除表"role=button 自定义控件"精神从宽，仅引用族）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（点击/键盘双向切换即时回显：点 Enterprise → checked 迁移；ArrowRight/ArrowDown 在组内 roving 并换选、焦点随行、ArrowDown 环回到首项；live summary "Selected priority: medium" 实时更新）
- B 颜色：B1 pass（label 12.61:1）B2 pass（选中环 border 蓝 28,110,242 对白底 ≥3:1）B3 pass B4 pass B5 pass（dark 选中 bg `rgb(77,141,245)`、未选中 bg oklab 令牌、可读）B6 pass（选中态主色非默认裸蓝一键切，走 --primary 令牌链）
- C 布局：C1 pass（overflow 扫描仅 radio 圆点 12px 内部指示器定位差——绝对定位 indicator 所致、无布局影响，判探针伪影白名单）C2 pass C3 pass C4 pass（800 宽水平布局换行正常）C5 pass C6 n/a
- D 间隔：D1 pass（垂直项 gap、水平项 gap-3/12px 落栅格）D5 pass 其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用）** 错误文案"Priority不能为空"中文 F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新发现。）

## 4. 已知族命中（引用，不另立项）

- **A3 小目标 <24px（已知族）**：可视 radio 圆点 `size-4`（16×16）新实例证据（smallTargets 扫描 7 处）；因整行 label 为命中区且键盘可达，维持族引用不升级。
- **F4-11 i18n zh-CN 回退（已知族）**：错误文案"Priority不能为空"。
- **弹层 actions 左对齐（R2-3b 已知族）**：Select Plan/Save 左对齐。
- 计划内锚点复检通过：checked 状态 `data-state`/aria-checked 同步；required 星标与 error 通道完整；dark 平价通过；radio-group-item role=radio + sr-only input 双通道键盘可达（点击后 focus 落 span[role=radio]，方向键 roving 生效）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-radio-group` → carded（卡列填本路径）；findings 归族后 → digested。
