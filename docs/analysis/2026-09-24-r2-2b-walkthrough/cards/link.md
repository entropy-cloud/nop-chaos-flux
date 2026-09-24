# [card] control:link

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/link` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic link display / Host link onClick+href 共存 + javascript: 剥离 C6.1 / Disabled link）
- **矩阵裁剪**: simplified（matrixReason：单 surface 展示控件，无弹层/无拖拽/无异步面；裁掉的状态：glass 皮肤、click 后导航落点（点击会离开 lab 页，交互键不可注册）、rel 自定义串变体、download 变体（fixture 未覆盖））

## 1. 截图清单

| 状态                  | light                                                                  | dark（真 data-mode，自采）                                           |
| --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 默认 1280×800         | `_tmp/visual-inspection-2026-09-24/r2-2b/link/default-1280-light.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/link/default-1280-dark.png` |
| 默认 800×900          | `_tmp/visual-inspection-2026-09-24/r2-2b/link/default-800-light.png`   | —                                                                    |
| hover（真实指针悬停） | `_tmp/visual-inspection-2026-09-24/r2-2b/link/hover-light-1280.png`    | —                                                                    |
| focus                 | `_tmp/visual-inspection-2026-09-24/r2-2b/link/focus-light-1280.png`    | —                                                                    |
| disabled              | `_tmp/visual-inspection-2026-09-24/r2-2b/link/disabled-light-1280.png` | —                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(R2-2b-A1-41)**（hover 零反馈）A2 pass（focus 环存在：`outline auto 1px rgb(0,95,204)`，无祖先裁切）A3 pass（无 <24px 目标）A4 pass（disabled href 剥离 + aria-disabled + opacity 0.6 + pointer-events none，五重可感知）A5 n/a A6/A8 n/a A7 n/a A9 n/a（onClick dispatch 功能面归 C6.1 功能测试）
- B 颜色：B1 pass（light 像素采样 10.11:1 / dark 13.43:1）B2 n/a B3 n/a B4 pass（色值走前景令牌）B5 pass（dark 亮度足、问题同 A1 与主题无关）B6 n/a
- C 布局：C1 pass（docOverX 0，双视口均无溢出）C2 **warn(R2-2b-C2-43)**（点击热区拉伸整行）C3 pass C4 pass（800 宽不塌）C5 n/a C6 n/a
- D 间隔：D1–D8 n/a/pass（单行文本无组距问题）
- E 排布：E1 pass E2 **warn(R2-2b-A1-41 同根因)**（链接与正文层级无差异）E3–E6 n/a/pass
- F 一致性：F1 n/a F2 n/a F3 n/a F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A1-41] link 渲染为纯正文样式：无链接色、无下划线、hover 零反馈，与普通文本不可区分

- **页面/路由**: `#/lab/link`（全部 3 场景；任意使用 link renderer 的页面同险）
- **主题/视口/状态**: 双主题 / 1280 / 默认 + 真实指针 hover
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/link/default-1280-light.png`、`hover-light-1280.png`（指针悬停中画面无任何变化）、`default-1280-dark.png`
- **目视描述**: "External docs"、"Navigate + dispatch" 等链接与正文完全同色同字重，无下划线、无链接色；hover 时外观零变化；用户无法从视觉上识别可点击。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-link.mjs`（structural + hoverStyles 真实 hover）+ 源码 grep `.nop-link`
  - 输出: 4 个 `a[data-slot=link]` 全部 `color: rgb(33,53,71)`（=正文前景）、`text-decoration: none solid`、`font-weight: 400`、`fontSize: 16px`；hover 态（`hovered: true`）`color/textDecorationLine/opacity` 与默认完全相同；grep 全仓库 CSS 无任何 `.nop-link` 规则（content 包 styles.css 仅 separator/progress）。对比 disabled 变体尚有 opacity 0.6，正常链接反而无任何链接语言。
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）+ E2（视觉层级与重要性一致）；WCAG 1.4.1（不能仅靠一种感官通道区分链接）；AMIS link 默认带主题链接色
- **严重程度**: P1（链接可供性缺失是控件核心语义失败；hover 无反馈为高频路径明显交互障碍）
- **用户影响**: 用户无法辨认链接（与说明文字混排时完全不可发现），hover 无预感导致误点/漏点；对照 disabled/正文均无差异。
- **修复方向**: 在 `packages/flux-renderers-content/src/styles.css` 增加 `.nop-link` 规则：`color: hsl(var(--primary))`（或语义 link 色）+ `text-decoration: underline`（或 hover 时 underline）+ hover 变色；dark 块同步。单点 CSS 修复收全部 link 实例。
- **归族**: systemic → R2-3 批（`.nop-link` 无样式单点根因）
- **复核状态**: 已复核（保留 P1，证据锐化，review-a 2026-09-24）：live 级联全量扫描 .nop-link 规则=0 条；对照 .nop-markdown a 有主色+下划线（form-renderers.css L157–162），同产品双链接面单侧裸奔

### [R2-2b-A1-42] target=\_blank 外链无任何外链标识（图标/aria 说明均缺）

- **页面/路由**: `#/lab/link`（场景 1 Basic link display）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/link/default-1280-light.png`
- **目视描述**: "External docs" 在新标签页打开，但无外链图标、无「(在新标签页打开)」辅助文本，锚点内无任何子元素。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-link.mjs` structural（childTags 字段）
  - 输出: `testid: demo-link-lab, target: "_blank", rel: "noopener noreferrer", childTags: []`（无 svg/icon 子节点）；renderer 源码（link.tsx）仅渲染 label 文本。
- **对照基准**: 检查提示词 A1（可供性）；通用外链标识惯例（icon + aria/or sr-only 说明）
- **严重程度**: P3
- **用户影响**: 用户不知道点击会离开当前上下文；中低危（浏览器标签行为可预期恢复）。
- **修复方向**: link renderer 在 `target === '_blank'` 时追加 ExternalLink 图标（`@nop-chaos/ui` resolveLucideIconStrict('external-link')）+ `<span class="sr-only">`（i18n key 新增 `flux.link.opensNewTab`）。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

### [R2-2b-C2-43] 锚点被拉伸为整行块级热区（918×24），点击行内空白即触发导航

- **页面/路由**: `#/lab/link`（全部场景；flex 列容器内的 link 同险）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/link/hover-light-1280.png`（指针在文本右侧远处仍处于链接 hover）
- **目视描述**: 链接文本只有约 90px 宽，但可点击区域横跨整个场景卡片宽度（918px），行内空白处 hover 即出现 pointer 光标。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w2-link.mjs` structural（rect 字段）
  - 输出: 4 个锚点 rect 全部 `w: 918`（场景卡片满宽），而文本实际宽度约 60–140px；`cursor: pointer` 随 `a[href]` 浏览器默认在整个 rect 生效。
- **对照基准**: 检查提示词 C2（无意外重叠/热区与视觉标签几何不一致）
- **严重程度**: P3
- **用户影响**: 误触风险：想点击旁边空白/后续控件时误触发导航；误判可点范围。
- **修复方向**: `.nop-link` 增加 `align-self: flex-start` 或 renderer 根加 `w-fit`（`w-auto`），使热区收缩到文本；或在 lab/文档层说明 flex 拉伸行为。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- 图标别名回环（R2-3 候选）：本控件未配 icon schema，无实例。
- i18n zh-CN 回退族：本控件无可 i18n 文案，无实例。
- 调试 chip / scope-debug 面板中文（“调试/折叠”）：载体环境基建族，引用不立项（各 lab 页共见）。

## 5. 交互键

- 无法注册：唯一可复现交互是 click（会触发真实导航离开 lab 页）与 hover/focus（无对应 action），故不上报交互键。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-link` → carded（卡列填本路径）；findings 归族后 → digested。
