# [card] control:fieldset

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/fieldset` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic field grouping / Collapsible fieldset / Collapsible fieldset inside submitting form）
- **矩阵裁剪**: simplified（matrixReason：纯容器控件无值态/弹层；裁掉的状态：glass 皮肤、嵌套 fieldset 深层矩阵、Enter 不误提交键盘链路（e2e 已覆盖，非渲染面））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）。

## 1. 截图清单

| 状态                                   | light                                                                          | dark（真 data-mode）                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 基础分组（1280 场景截图）              | `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-basic-light.png`    | `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-basic-dark.png`    |
| 折叠态展开后（chevron + body 可见）    | `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-expanded-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-expanded-dark.png` |
| legend focus-visible（整页，全宽蓝环） | `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-legend-focus.png`   | —                                                                             |
| 窄视口 800×900 默认                    | `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-800-light.png`      | —                                                                             |

## 2. A–H 维度勾选表

- A 交互：A1 pass（legend hover cursor pointer）A2 **warn(R2-2a-A2-44)**（focus 环可见不遮挡，但形状为全宽横条）A3 pass（legend 命中区 884×29，远超 24）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（legend 点击后 `data-collapsed` true→null、body 输入可见、chevron 呈现；展开后焦点落 body 首个 input）
- B 颜色：B1 pass（legend/label 文字对比达标）B2 pass（容器 1px 边框弱但容器语义不依赖边框识别）B3 n/a B4 pass（marker-only 无字面色）B5 pass（dark 下容器/输入/legend 全部平价，fieldset-basic-dark 无白块灰字）B6 n/a
- C 布局：C1 pass（1280/800 `docOverX: 0`）C2–C5 pass/n-a C6 n/a
- D 间隔：D1 pass（fieldset 内字段间隙 16px 落栅格，`fieldGaps: {fieldCount: 2, gaps: [16]}` 双主题一致）D2 pass（legend 与 body 间距小于组间 lab gap 24）D3–D8 n/a/pass
- E 排布：E1 pass（分组视觉语言 = 容器卡 + legend，无混用）E2 pass E3–E6 n/a/pass
- F 一致性：F1–F3 n/a/pass F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A2-44] 可折叠 fieldset 的 legend focus 环横贯整个容器宽（884px 蓝条），读感像整行被选中

- **页面/路由**: `#/lab/fieldset`（场景 2/3 可折叠 fieldset，Tab 至 legend）
- **主题/视口/状态**: light（dark 同构）/ 1280 / legend focus-visible
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/fieldset/fieldset-legend-focus.png`（"Advanced Settings" 一行出现整宽蓝色圆角环）
- **目视描述**: 键盘聚焦 legend 时，焦点环从容器最左画到最右（legend 元素本身占满一行宽 884px），视觉上是"整行选中"而非"折叠标题获焦"，与站内控件 focus 环（贴文字/控件的紧凑环）形状语言不一致。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3c-main-results.json` fieldset.legendHit / legendFocusBehavior 段
  - 输出: `legendHit: { w: 884, h: 29 }`（legend 宽=容器内容宽）；Tab 后 `activeElement: INPUT`（焦点越到 body 首输入框，`:focus-visible` true）——环本体宽即 legend 宽
- **对照基准**: 检查提示词 A2（focus-visible 可见且形态可辨识）；styling-system.md 组件 focus 形态一致性
- **严重程度**: P3（键盘用户可辨但误导性强；不影响任务）
- **用户影响**: 键盘用户可能误以为整块区域可交互/已被选中。
- **修复方向**: `packages/flux-renderers-form/src/renderers/fieldset.tsx` 将 focus 环收敛到 legend 文本+chevron 的 inline 包裹（如 legend 内层 span `rounded ring`，外层 legend 去视觉），或用 `w-fit` 限环宽。
- **归族**: local → R2-4 批（单控件焦点形态）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）

## 4. 已知族命中（引用，不另立项）

- marker-only 契约复检通过（plan 锚点）：`fieldset.nop-fieldset` rootClass 仅含 marker，`[data-slot="fieldset-body"]`/`legend[data-slot="fieldset-title"]` 就位，`collapsible` 走 `data-collapsed` 属性——无违规。
- i18n zh-CN 回退（R2-2a-F4-11 族）：本页 scope-debug 面板“调试/折叠/展开以查看作用域。”中文 chrome（fieldset-basic-light.png 等），引用不立项。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-fieldset` → carded（卡列填本路径）；findings 归族后 → digested。
