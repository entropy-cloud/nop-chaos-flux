# [card] control:collapse

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/collapse` ｜ **载体**: lab 页（5 个 collapse 实例：basic multiple / single-select / host 三向 ownership（local/controlled/scope，C5.1））
- **矩阵裁剪**: simplified（matrixReason：展开/收起即全部交互态，手风琴互斥与动画已专项走查；裁掉的状态：per-item disabled 变体（fixture 未布，intro 提及契约）、glass 皮肤、valueStatePath 回写面板的 scope 断言（功能域非视觉域））

## 1. 截图清单

| 状态                            | light                                                                                                               | dark（真 data-mode，自采）                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/default-1280-light.png`                                           | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/default-1280-dark.png`       |
| 默认 800×900                    | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/default-800-light.png`                                            | —                                                                              |
| Panel A 展开（终态）            | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/panel-a-open-1280-light.png`                                      | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/panel-a-open-1280-dark.png`  |
| 展开中间态（点击后 +80ms）      | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/panel-a-mid-animation-1280-light.png`                             | —                                                                              |
| multiple 双开                   | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/both-open-1280-light.png`                                         | —                                                                              |
| single-select X 开              | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/single-x-open-1280-light.png`                                     | —                                                                              |
| single-select Y 开 X 收（互斥） | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/single-y-open-x-closed-1280-light.png`                            | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/single-y-open-1280-dark.png` |
| host 场景 800 窄视口            | `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/host-narrow-800-light.png` / `host-narrow-scrolled-800-light.png` | —                                                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（trigger `hover:bg-muted` 在类组）A2 warn(R2-2b-A2-154)（键盘 focus 环为 UA 默认 `1px auto`，非设计 ring，见条目）A3 pass（trigger 整行 918×46，`smallTargetScan` 零命中）A4 n/a（fixture 无 disabled item）A5 n/a A6/A8 n/a A7 n/a A9 pass（aria-expanded/`rotate-180` chevron/内容显隐三联动，互斥收起正确：X 开→点 Y 后 X `aria-expanded=false`）
- B 颜色：B1–B4 pass（trigger 走 border/muted 令牌，body 正文对比正常）B5 pass（dark 展开态复检无专有缺陷）B6 n/a
- C 布局：C1 warn(R2-2b-C1-153)（800 窄视口 host 场景按钮行溢出 12px，见条目；1280/dark 零命中）C2 pass C3 pass C4 pass（面板本体窄视口不破）C5 n/a C6 n/a
- D 间隔：D1 pass（item 间 flush 堆叠为列表设计形态；trigger 内 padding 16/12 成栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（展开态 trigger bg-muted 反馈、chevron 旋转）E3 n/a E4 pass（trigger 左缘 x=301 全对齐）E5–E6 n/a
- F 一致性：F1 warn（focus 环形态与 ui Button 体系不一致，并入 A2-154）F2–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A1-152] 展开无高度过渡动画：CollapsibleContent `transition: all 0s`，收起直接卸载，状态切换为硬跳变

- **页面/路由**: `#/lab/collapse`（全部 5 个实例同根因）
- **主题/视口/状态**: light / 1280 / 展开中间态（点击后 +80ms 截帧）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/panel-a-mid-animation-1280-light.png`（+80ms 已完全展开，无过渡帧）
- **目视描述**: 点击 Panel A 后内容瞬间出现，无高度展开过程；收起瞬间消失。同屏 chevron 有 150ms rotate 过渡，与内容的硬跳变形成观感割裂。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-collapse.mjs`（展开后读 `[data-slot="collapse-content"]` computed transition + +80ms 截帧）
  - 输出: `contentTransition: "all", contentTransitionDur: "0s"`；+80ms 截帧 contentH 已达终值 44px。收起时 content 从 DOM 卸载（closed 实例 `contentTransition: null`），无退出动画路径。
- **对照基准**: 检查提示词 A1（交互态可感知）/ Design QA 交互态清单；行业惯例（Radix/shadcn Collapsible 均带 `--radix-collapsible-content-height` 高度动画）
- **严重程度**: P3（功能与可达性无损；动效缺失属于体验打磨）
- **用户影响**: 大段内容展开/收起时布局硬跳，长页面场景下阅读位置易丢失。
- **修复方向**: `packages/flux-renderers-layout/src/collapse-renderer.tsx` 的 CollapsibleContent（`packages/ui/src/components/ui/collapsible.tsx` 直传 Base UI Panel）：为 Panel 增加高度 keyframes（Base UI 支持 `--collapsible-panel-height` CSS 变量驱动 `collapsible-down/up` 动画类），或在 ui 层统一补 `data-open` 高度过渡。
- **归族**: local → R2-4 批（单组件动画契约补齐）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）：collapse-renderer.tsx L238 裸透传 Base UI Panel，ui/collapsible.tsx 零动画类

### [R2-2b-C1-153] 800 窄视口下 host 场景 "Set controlled" 按钮行溢出容器 12px

- **页面/路由**: `#/lab/collapse`（场景 3 host 三向 ownership，受控段按钮行）
- **主题/视口/状态**: light / 800×900 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/collapse/host-narrow-scrolled-800-light.png`（蓝色按钮行右缘超出面板右缘）
- **目视描述**: "Set controlled = a / = b / = none" 三个 host 按钮组成的单行在窄视口下不折行，右端超出 collapse 面板右缘约 12px。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-collapse-narrow.mjs`（800 视口 `overflowScan` 定位）
  - 输出: `nop-flex flex-row` overX=12（rectW 438，scrollWidth 450），父容器 `nop-flex flex-col` 同步 overX=12；docOverX=0（外层未撑破文档，按钮伸出父盒叠在留白上）。
- **对照基准**: 检查提示词 C1/C4（窄视口不溢出）；已知族"窄视口 flex/固定壳层"（R2-3c 候选）
- **严重程度**: P3（demo host fixture 布局问题，非渲染器本体；溢出量小）
- **用户影响**: lab 载体观感破损；同型生产页面（固定三按钮行 + 窄容器）有同险。
- **修复方向**: fixture 侧给该按钮行加 `flex-wrap`（`apps/playground/src/component-lab/renderers/data-c5c1-host.ts` 受控段宿主行）；渲染器无责。
- **归族**: watch-only → 台账（lab 载体与环境基建族 + 窄视口 flex 族实例，R2-3c 候选收编）
- **复核状态**: 未复核

### [R2-2b-A2-154] collapse trigger 键盘焦点环为 UA 默认 outline，未接设计 ring 令牌（与按钮体系不一致）

- **页面/路由**: `#/lab/collapse`（全部 trigger 同根因）
- **主题/视口/状态**: light / 1280 / 键盘 Tab 聚焦 trigger
- **截图**: 探针计算值为主（`_tmp/r2-2b-probes/out-w5-collapse.json` kbFocus 段）；目视可见于任意 trigger Tab 聚焦
- **目视描述**: Tab 到 trigger 时出现浏览器默认细线 outline（1px auto），与 ui Button 体系的 3px `ring-ring/50` 圆角环形态差异明显。
- **程序化证据**:
  - 探针: `w5-collapse.mjs`（click Panel A → Tab → 读 activeElement computed）
  - 输出: `slot: "collapse-trigger", matchesFV: true, boxShadow: "none", outline: "1px auto"`；对照 button-group 按钮同法实测 `boxShadow: oklab(...) 0px 0px 0px 3px`。
- **对照基准**: WCAG 2.4.11/1.4.11（焦点可见性本身达标——UA outline 可见故不算 fail）；检查提示词 F1（同语义交互跨控件一致）
- **严重程度**: P3（可达性保底存在；一致性问题）
- **用户影响**: 键盘用户在不同控件间 Tab 时焦点指示形态跳变，弱化"同一设计系统"感知。
- **修复方向**: `packages/flux-renderers-layout/src/collapse-renderer.tsx` L212 trigger 类组追加 `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring outline-none`（与 ui Button 同款三件套）。
- **归族**: local → R2-4 批（焦点环契约统一；建议与 fieldset A2-44 焦点形态条目合并同一"焦点环契约"修复面）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- lab 载体族：C1-153 即该族实例（host fixture 布局）。调试 chip/Scope 面板照常出现，按族约定不立项。
- 手风琴互斥（single-select）：程序化坐实正常（X 开→Y 开→X 关，`aria-expanded` 正确翻转），非缺陷，作正向基线记录。
- 展开中间态截图同时捕获 chevron rotate-180 过渡帧（icon 对角越出 trigger 顶缘 1–2px，150ms 瞬态，不立项）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-collapse` → carded（卡列填本路径）；findings 归族后 → digested。
