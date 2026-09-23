# [card] page:m2-touch

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/m2-touch` ｜ **载体**: 域页面（M2 表单控件触摸适配 demo：input inputmode/16px/scrollIntoView、checkbox/radio/switch ≥44px hit area、button min-height）
- **矩阵裁剪**: simplified+移动专项（裁掉 glass（本波统一）、弹层（无）、异步态（同步表单）。375 主分析 + 800 断点对照 + 1280 一轮；A3 触控目标为第一重点维度）

## 1. 截图清单（状态矩阵）

| 状态                                      | light                                                                       | dark                         |
| ----------------------------------------- | --------------------------------------------------------------------------- | ---------------------------- |
| 默认 375×812                              | `_tmp/visual-inspection-2026-09-23/r2-1d/m2-touch/m2-default-375-light.png` | `…/m2-default-375-dark.png`  |
| focus scrollIntoView（textarea 聚焦 375） | `…/m2-focus-textarea-375-light.png`                                         | —（行为与主题无关）          |
| 默认 800×900                              | `…/m2-default-800-light.png`                                                | `…/m2-default-800-dark.png`  |
| 默认 1280×800                             | `…/m2-default-1280-light.png`                                               | `…/m2-default-1280-dark.png` |
| hover/disabled/弹层                       | n/a（页面无 disabled 样本与弹层面）                                         | —                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 **fail(R2-1d-A3-01)**（input-number stepper 24×16） A4 n/a A5 ✔ A6 n/a A7 n/a A8 ✔（无拖拽面） A9 ✔（聚焦滚动/开关即点即变）
- B 颜色：B1 ✔ B2 ✔ B3 n/a B4 ✔ B5 ✔（dark 全样本目视平价） B6 n/a
- C 布局：C1 ✔（375 无横滚） C2 ✔ C3 ✔ C4 ✔（<768 / ≥768 分支正确） C5 ✔ C6 n/a
- D 间隔：D1 ✔（字段间隙均匀 16px 节奏） D2 ✔ D3 ✔ D5 ✔ D6/D7/D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1–F5 n/a（单页无跨面对照；分组纵横与 m1 表单一致）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A3-01] input-number 步进按钮 24×16，高度低于 24px 触控下限

- **页面/路由**: `#/m2-touch`（Count 字段 input-number 右侧上下步进钮；input-number 渲染器全站同构）
- **主题/视口/状态**: light+dark / 375（1280 同样命中）/ 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m2-touch/m2-default-375-light.png`（Count 字段右缘上下双箭头）
- **目视描述**: 步进按钮是 24px 宽、16px 高的上下箭头，触摸命中面极窄。
- **程序化证据**:
  - 探针: 可交互元素 min(w,h) 扫描（`_tmp/r2-1d-probes/m2-out.json` n375.smallTargets / n1280.smallTargets）
  - 输出: `[data-slot="stepper-increase"] w=24 h=16`、`[data-slot="stepper-decrease"] w=24 h=16`（aria=增加/减少）——宽度踩线 24、高度仅 16。
- **对照基准**: WCAG 2.5.8（≥24×24）；本页自身 demo 文案「M2 触摸适配：button min-height 44px」——同页 schema button 44px 达标而 input-number 内嵌 stepper 未改造。
- **严重程度**: P2
- **用户影响**: 触屏上加减数量是最小命中面（16px 高），高频误触；出现在以「触摸适配」为题的旗舰 demo 页，说明 M2 改造未覆盖 input-number 内嵌控件。
- **修复方向**: `flux-renderers-form` input-number stepper：mobile 分支（<768）将 stepper 按钮最小命中域抬到 ≥24×24（建议 44×32 纵排热区，视觉箭头不变、透明 padding 扩热区）。
- **归族**: systemic → R2-3 批（R2-1a-A3 族扩面 + M2 改造缺口）
- **复核状态**: 未复核

### [R2-1d-E-01] 分节说明文案字面输出 markdown「###」标记

- **页面/路由**: `#/m2-touch`（M2a/M2b/M2c 三段 schema text 节点）
- **主题/视口/状态**: light / 375、800、1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m2-touch/m2-default-800-light.png`（「### M2a input 族…」与正文连排）
- **目视描述**: 三段说明文字以字面 `###` 开头，标题层级与正文同字号连排，无 heading 视觉。
- **程序化证据**:
  - 探针: 页面源码 `apps/playground/src/pages/m2-touch-demo.tsx` L41/L75/L119 `type: 'text', text: '### M2a …'`；渲染 DOM 无 h3 元素（text 渲染器不解析 markdown）。
  - 输出: 字面 `###` 可见于全部三个视口截图。
- **对照基准**: 检查提示词 E2（视觉层级与重要性一致）；flux-guide text vs markdown 组件分工。
- **严重程度**: P3
- **用户影响**: demo 页说明区排版层级塌平、`###` 噪声字符；不影响控件功能。
- **修复方向**: 改用 `type: 'markdown'` 或去掉 `###` 前缀、拆分 title/text 两节点。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### 正向取证（M2 承诺逐条验证 pass）

- **inputmode**: email→`email`、schema `inputMode: 'tel'` 覆盖生效→`tel`、number→`decimal`（探针 m2-out.json n375.inputs）。
- **font-size ≥16px**: 4 个输入件全部 `16px`（375）；800/1280 桌面分支回落 14px（符合分支设计）。
- **hit area ≥44px**: checkbox/switch/radio 视觉盒 16–32px，但均可点击 label 命中域 295×44（hitW/hitH）。
- **小屏纵列**: radio-group/checkbox-group（4 项）375 下 `flex-direction: column`，项高 44×4。
- **button**: Default/lg=44px、block 全宽 44px；sm=28px（M2 承诺仅覆盖 default/lg，sm 档 28≥24 合规，watch 不立项）。
- **focus scrollIntoView**: 聚焦 Notes 后 scrollY 0→396，textarea 完全落视口（top 349 / bottom 463 / vp 812）。

## 4. 误报排除记录

| 疑点                                                       | 排除理由                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| checkbox/switch/radio 视觉盒 16px（span slot=checkbox 等） | 命中域由外层 label 提供（52–295×44），视觉 16px 为指示符尺寸；C1 扫描 26>14 微溢出为既有登记误报模式 |
| `input type=checkbox 1×1`                                  | opacity-0 native input（登记误报模式）                                                               |
| Back to Home 按钮 32px 高                                  | playground 壳层按钮，非 schema 渲染件，不经 M2 改造范围                                              |
| pill「0」悬浮件                                            | 归 R2-1d-C2-01（mobile-infrastructure 卡）                                                           |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：A3-01 → R2-3 系统性批；E-01 → R2-4 local；
- 批内复检通过后 → `verified`。
