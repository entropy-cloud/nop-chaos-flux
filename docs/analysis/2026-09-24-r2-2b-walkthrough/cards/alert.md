# [card] control:alert

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/alert` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Basic alert with title and body / Host alert close + embedded actions (C6.3)）
- **矩阵裁剪**: simplified（matrixReason：非异步、无弹层的静态反馈块；弹层/拖拽/异步 loading 态不适用。实际裁掉：glass 皮肤抽查、error level 变体（lab fixture 仅含 info/warning/success 三档，error 无 fixture —— 归 lab 载体与环境基建族，见 §4）、custom icon override（fixture 未配置））

## 1. 截图清单

| 状态                                  | light                                                                           | dark（真 data-mode，自采）                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800（全场景）               | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/default-full-light.png`          | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/default-full-dark.png`          |
| 默认 800×900                          | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/default-narrow-800-light.png`    | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/default-narrow-800-dark.png`    |
| success+actions 变体（含 actions 区） | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/success-alert-actions-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/success-alert-actions-dark.png` |
| close 按钮 hover                      | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/close-hover-light.png`           | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/close-hover-dark.png`           |
| close 按钮 focus                      | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/close-focus-light.png`           | —                                                                              |
| 点击 close 关闭后                     | `_tmp/visual-inspection-2026-09-24/r2-2b/alert/after-close-light.png`           | —                                                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（close ghost 按钮 hover bg `rgb(241,245,249)` 可感知）A2 pass（close focus outline 1px `rgb(0,95,204)`）A3 pass（close 24×24 恰达 WCAG 2.5.8 下限）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（close 后 alert 节点移除 2→1，`window.__c6c3AlertClose === "warning|closed"`，onClose payload `${level}` 经 evaluationBindings 解析正确）
- B 颜色：B1 pass（light title 20.01 / desc 7.46；dark 像素采样 title 15.34 / desc 8.41 —— DOM 合成器被 `bg-muted/40` 的 oklab 值骗过（报 1.05/1.91），以 PNG 像素采样为准）B2 pass（边框 light `rgb(225,231,239)` / dark `rgb(31,42,61)`）B3 pass（warning 深色 amber 6.0、success 深色绿底，语义色一致）B4 pass（全部走 `--nop-*`/语义类）B5 pass（dark 像素采样全过；`bg-muted/40` oklab dark 换算正确）B6 pass（level 色非默认蓝一键切）
- C 布局：C1 pass（docOverX=0，全页 overflow 扫描零命中，双视口）C2 pass C3 pass C4 pass（800 宽无溢出）C5 n/a C6 n/a
- D 间隔：D1 pass（icon-title gap 8px 落栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4 **fail(R2-2b-E4-1)**（带 actions 的 alert：icon 与 title 水平错位 124px）E5 pass E6 n/a
- F 一致性：F1–F3 n/a F4 warn（见 §4 i18n 族实例：close 按钮 aria-label "关闭"）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-E4-1] 带 actions 区的 alert 把 actions 行排进图标网格列，撑宽 col-1 使 title/description 右移 124px

- **页面/路由**: `#/lab/alert`（场景 2 "Host alert close + embedded actions (C6.3)"，level=success 带 `actions` 的 alert；任意配置 actions 区的 alert 同险）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/alert/success-alert-actions-light.png`、`_tmp/visual-inspection-2026-09-24/r2-2b/alert/success-alert-actions-dark.png`
- **目视描述**: 带 actions 的 alert 中，info/warning 变体的 icon 与 title 紧邻（gap 8px），而该变体 icon 单独悬在左上，title/description 整体右移约一个按钮宽度，Primary action 按钮与 icon 同列左对齐——同一页面两种排布形态。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w1-alert2.mjs`（gridRects 段）
  - 输出: `alertCols: "115.641px 772.359px"`（icon 列被撑到 115.6px，正常 alert 为 16px+8px gap）；`icon.x 312 / title.x 436 / desc.x 436 / actions.x 312 / actionBtn.x 312`——actions 行（`data-slot="alert-actions"`，alert-renderer.tsx L101）作为直接 grid 子元素被 auto-placement 进 col-1，把 col-1 撑到 actions 按钮宽度，title/description（`col-start-2`）被推右 124px。
- **对照基准**: 检查提示词 E4（同列元素左缘对齐，偏差 >1px 即坐实）；ui alertVariants `has-[>svg]:grid-cols-[auto_1fr]`（`packages/ui/src/components/ui/alert.tsx` L7）
- **严重程度**: P2（同控件两种排布形态，icon-title 错位肉眼明显；所有 alert+actions 用法复现）
- **用户影响**: 带操作按钮的告警（最常见的高优先提示形态）标题起点与普通告警不一致，视觉动线断裂，actions 按钮看起来"掉"在 icon 列。
- **修复方向**: `packages/flux-renderers-content/src/alert-renderer.tsx` L101 给 `data-slot="alert-actions"` 容器加 `col-start-2`（或在 ui alertVariants 追加 `*:data-[slot=alert-actions]:col-start-2`），使 actions 行落入 description 同列。
- **归族**: systemic → R2-3 批（alert 组件单点根因，全部 alert+actions 用法收一修复）
- **复核状态**: 已复核（保留 P2，根因锐化，review-a 2026-09-24）：actions colStart=auto 无任何列约束（description 落 col-2 仅靠 auto-placement 尾随 title）；修复收口点 alert-renderer.tsx L101

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退族**：close 按钮 aria-label 为"关闭"（`t('flux.common.close')`，全英文 lab 页内出现中文辅助文案）——`_tmp/r2-2b-probes/out-w1-alert.json` structuralLight.host.close.ariaLabel。引用既有族，不另立项。
- **lab 载体与环境基建族**：①fixture 未覆盖 error level 变体（resolveLevel 支持四档，lab 仅三档），error/destructive 路径无渲染面证据；②`c6c3-alert-close-report` 元素永远显示 `close-report:pending`——fixture 文案绑定作用域变量 `closeReported`，但无任何 action 更新它（onClose 实际已触发，`window.__c6c3AlertClose === "warning|closed"` 证实），演示误导。
- **方法学沉淀（沿用 R2-2a）**：`bg-muted/40` 渲染为 `oklab(.../0.4)`，DOM 合成对比度探针无法解析 oklab 导致基线失真（dark 报 1.05/1.91 假阴性）——本卡全部以 PNG 解码像素采样复核（`w1-alert2.mjs` 内置采样器）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-alert` → carded（卡列填本路径）；findings 归族后 → digested。
