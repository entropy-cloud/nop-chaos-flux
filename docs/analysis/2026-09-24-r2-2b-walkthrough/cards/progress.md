# [card] control:progress

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/progress` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic progress with label + value / Host progress clamp on scope update C6.2）
- **矩阵裁剪**: simplified（matrixReason：单 surface 展示控件，无弹层/无拖拽；裁掉的状态：**variant 变体色**（success/warning/danger 的 CSS 规则存在于 content styles.css 且有 dark 双轨，但 lab 两个场景均未配置 variant schema，渲染面无法取证——记 fixture gap）；**环形（circle）变体**：renderer schema 仅支持条形（linear），`ProgressVariant = default/success/warning/danger` 无环形形态，任务矩阵中「环形」一项对本控件为不适用（设计缺口登记见已知族节）；error/disabled 态（控件无此态））

## 1. 截图清单

| 状态                              | light                                                                         | dark（真 data-mode，自采）                                               |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-24/r2-2b/progress/default-1280-light.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/progress/default-1280-dark.png` |
| 默认 800×900                      | `_tmp/visual-inspection-2026-09-24/r2-2b/progress/default-800-light.png`      | —                                                                        |
| clamp：value=250（钳到 100 满格） | `_tmp/visual-inspection-2026-09-24/r2-2b/progress/clamp-250-light-1280.png`   | —                                                                        |
| clamp：value=-10（钳到 0 空条）   | `_tmp/visual-inspection-2026-09-24/r2-2b/progress/clamp-neg10-light-1280.png` | —                                                                        |
| clamp：value=42（直通）           | `_tmp/visual-inspection-2026-09-24/r2-2b/progress/clamp-42-light-1280.png`    | —                                                                        |

## 2. A–H 维度勾选表

- A 交互：A1–A4 n/a（展示控件；Set 按钮归 button 卡）A5 n/a A6–A9 n/a
- B 颜色：B1 pass（label 12.61:1 / value 7.46:1；dark label/value 走令牌，按 dark 表面像素基线 ~8–13:1）B2 pass（dark 指示条 rgb(75,140,245) 对轨道 rgb(31,42,61) ≈3.8:1 ≥3:1）B3 n/a B4 pass（variant 色走 `--success/--warning/--destructive` 语义令牌，styles.css 静态核对）B5 pass（dark 指示条/轨道色均换挡）B6 pass（default 指示条 bg-primary 非裸奔蓝字面）
- C 布局：C1 pass（docOverX 0；overflow 扫描仅 2 个 1px 宽 sr span 白名单排除）C2 pass C3 pass C4 pass（800 宽条形自适应）C5/C6 n/a
- D 间隔：D1 pass（label/value 行 gap-3、轨道换行 w-full，节奏成体系）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（label 左 value 右 ml-auto，tabular-nums）E3–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 **warn(R2-2b-E2-48)**（数值标签无单位，见下）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-E2-48] showValue 数值标签渲染裸值无单位（"65" 而非 "65%"），语义依赖读者自行补全

- **页面/路由**: `#/lab/progress`（场景 1/2 全部 showValue 实例）
- **主题/视口/状态**: 双主题 / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/progress/default-1280-light.png`（右上角裸 "65"）
- **目视描述**: 数值标签只显示 "65"/"100"/"0"/"42"，无 % 或 "/100" 后缀，单看数字不知是百分比还是绝对值。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-progress.mjs` structural + clamp 序列
  - 输出: `valueText: "65"`（value=65/max=100）；clamp 序列 `250→"100"`、`-10→"0"`、`42→"42"` 全部为裸数字；renderer 源码 `displayValue = normalized.value`（非 percent，无单位拼接）。对照 AMIS progress showValue 渲染 "65%"。
- **对照基准**: 检查提示词 E2/F4（关键数字语义自明、同类控件文案一致）；AMIS 同名属性基线
- **严重程度**: P3（max=100 时与百分比同义，误读风险低；max≠100 的绝对值场景才开始歧义）
- **用户影响**: 弱歧义；「100」在满格旁读作百分比无碍，「42」需对照条长理解。
- **修复方向**: renderer 侧 `displayValue` 拼接 `%`（max=100 时）或 `value/max` 分式（max≠100 时）；或在 schema 增加 `valueUnit` 透传。
- **归族**: watch-only → 台账（设计语义取舍，需 design.md 裁定后转正/关闭）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **环形变体设计缺口（任务矩阵对齐说明）**：任务矩阵要求「环形/条形」，本 renderer 仅条形——如需环形应立 schema 扩展计划，本卡不作为渲染缺陷立案。
- clamp 功能面（C6.2 锚点）程序化复检全部通过：250→aria-valuenow 100/指示条 918 满宽、-10→0/0 宽、42→42/386px（42.05%）——normalizeProgressValue 钳制正确，非缺陷。
- fixture gap 登记：variant 变体色（success/warning/danger）无任何 lab 场景覆盖，CSS 双轨已静态核对，建议补 fixture。
- 数值列左对齐族：value 标签 `ml-auto` 右置、tabular-nums，未命中该族。
- i18n zh-CN 回退族 / 调试 chip / scope-debug 中文：载体环境族，引用不立项（本控件无 i18n 文案）。

## 5. 交互键

- `{"lab-progress": [{"action":"clickText","text":"Set 250"},{"action":"waitFor","ms":300}]}`（clamped progress 满格态；同法可注册 "Set -10"/"Set 42"；按钮为 lab 页真实元素）

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-progress` → carded（卡列填本路径）；findings 归族后 → digested。
