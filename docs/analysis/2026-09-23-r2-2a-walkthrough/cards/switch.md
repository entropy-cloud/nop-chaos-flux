# [card] control:switch

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/switch` ｜ **载体**: lab 页（2 场景：in-form live summary / 多偏好开关 + description）
- **矩阵裁剪**: simplified（matrixReason：布尔开关无弹层；已查：checked/unchecked 双态、点击切换、focus 环、label+description 排布；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未布置）、多 Switch 连动（fixture 无））

## 1. 截图清单

| 状态                             | light                                                     | dark（真 data-mode）       |
| -------------------------------- | --------------------------------------------------------- | -------------------------- |
| 默认 1280×800 s1/s2              | `default-s1-light-1280.png` / `default-s2-light-1280.png` | `default-s2-dark-1280.png` |
| checked 态（点击后，summary ON） | `checked-s1-light-1280.png`                               | `checked-s1-dark-1280.png` |
| focus（Tab 后 ring）             | `kb-focus-s1-light-1280.png` / `focus-s1-light-1280.png`  | —                          |
| 默认 800×900                     | `default-s2-light-800.png`                                | —                          |

（截图落点前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/switch/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（focus 后 box-shadow ring 呈现）A3 **warn（已知族 A3 引用）** 开关本体 32×18（短边 18 <24）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（点击切换 data-state checked、轨道变主色、in-form summary "Feature is: OFF→ON" 实时）
- B 颜色：B1 pass（label 12.61:1、description 6.43:1）B2 pass B3 pass B4 pass B5 pass（dark checked 轨道 `rgb(77,141,245)` 令牌链，截图复核可读）B6 pass
- C 布局：C1 pass（overflow 扫描仅 switch 元素 12px 内部 thumb 定位差——绝对定位 thumb 所致、无布局影响，判探针伪影白名单）C2 pass C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass（s2 三开关字段间隙全 16px）D5 pass（label→开关 8px、开关→description 间距一致）其余 n/a/pass
- E 排布：E1–E5 pass E6 n/a
- F 一致性：F1–F3 n/a/pass F4 **warn（已知族 F4-11 引用，附新实例）** 开关旁状态指示字"开/关"为中文（英文宿主显示"Feature enabled 关"）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新发现。）

## 4. 已知族命中（引用，不另立项）

- **A3 小目标 <24px（已知族）**：开关 32×18（`smallTargets` 扫描 4 处全中）——本族新实例证据；开关有 label 同行点击区，维持族引用。
- **F4-11 i18n zh-CN 回退（已知族）**：开关旁"开/关"状态字（`switch-wrapper` 文本实测"关"/"开"）——该族在开关控件上的新实例；修复 i18n 初始化后应随宿主语言。
- **调试 chip（已知族）**：scope-debug JSON 面板常驻场景块。
- 计划内锚点复检通过：checked/unchecked 双态视觉区分明确（灰轨道 vs 主色轨道+thumb 位移）、description 副文案层级（opacity 弱化）正确、dark 平价通过。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-switch` → carded（卡列填本路径）；findings 归族后 → digested。
