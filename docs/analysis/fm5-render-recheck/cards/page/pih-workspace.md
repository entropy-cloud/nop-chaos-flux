# [card] page:pih-workspace

- **批次**: FM-5 渲染面复检 · shard1（新增页全量） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/pih-workspace` ｜ **载体**: 域页面（外部应用复刻 · AI 工作台）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵 + live DOM 探针；会话流为空态演示，裁掉：弹层、拖拽、元素态抽样）

## 1. 截图清单

| 状态          | light                                                                        | dark                                                                        |
| ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/pih-workspace-default-1280x800-light.png` | `_tmp/visual-inspection-2026-10-18/pih-workspace-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/pih-workspace-default-800x900-light.png`  | `_tmp/visual-inspection-2026-10-18/pih-workspace-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass A3 warn(FM5-S1-C-5) A4 pass(重做灰显) A5 pass(PROJECTS 空态有图标+文案，但见 FM5-S1-C-4 裁切) A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass(内容可读) B6 n/a
- C 布局：C1 fail(FM5-S1-C-4) C2 pass C3 pass(50px 图标轨+260px 侧栏+composer 分区清晰) C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 warn(FM5-S1-C-4)
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：n/a ｜ H 弹层：n/a

## 3. 发现条目

### [FM5-S1-C-4] PROJECTS 空态文案 "No projects" 默认视口被滚动容器下缘裁切

- **页面/路由**: `#/complex-pages/pih-workspace`（左侧 260px 工作区侧栏 PROJECTS 区）
- **主题/视口/状态**: light + dark / 1280×800 / 默认（800×900 同样贴底）
- **截图**: `_tmp/visual-inspection-2026-10-18/pih-workspace-default-1280x800-light.png`；crop 取证 `_tmp/visual-inspection-2026-10-18/pih-projects-crop.png`
- **目视描述**: 空态（文件夹图标 + "No projects"）位于侧栏可视区最底部，文案下半截被容器边缘切断，呈半行残字。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-pih-probe.mjs`
  - 输出: 标签 rect `top=671, bottom=689.56`；最近滚动祖先 `clientH=313, scrollH=384, canScroll=true`；`clippedByScroller=true`（超出可视下缘 >0.5px）。
- **对照基准**: C1（无意外裁切）/ E6（空态应有完整任务引导）
- **严重程度**: P2
- **用户影响**: 默认打开即见被切半的空态文案，读作渲染故障；滚动后可看全但空态引导受损。
- **修复方向**: schema 布局侧将 PROJECTS 空态 `padding-bottom` 增至 ≥24px，或空态在剩余空间垂直居中（`justify-content: center`）而非贴底。
- **归族**: local
- **复核状态**: 未复核

### [FM5-S1-A-1] ⌘K 快捷键徽标可见但热键被禁用（受控 palette 开启通道归 `open` 表达式）

- **页面/路由**: `#/complex-pages/pih-workspace`（macOS titlebar 右侧搜索框）
- **主题/视口/状态**: light + dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/pih-workspace-default-1280x800-light.png`（搜索框内 ⌘K 徽标）
- **目视描述**: 搜索框展示 ⌘K 徽标提示快捷键，但按下 ⌘K 无任何反应。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-console-probe.mjs` / `_tmp/fm5-walk1-warn-detail.mjs`
  - 输出: `[command-palette] hotkey "mod+k" is ignored on the controlled palette "_.body_1_" — the open channel belongs to the 'open' expression.`（×2，双主题）
- **对照基准**: A 系（交互后反馈可见）；ux-design-pattern-audit（可见可供性必须有效）
- **严重程度**: P2
- **用户影响**: 页面广告了 ⌘K 快捷键且实际无效——高频键盘用户路径失效（复刻页内属演示交互，故不升 P1）。
- **修复方向**: pih schema 中为受控 command-palette 的 `open` 表达式接入 mod+k 事件绑定，或移除搜索框中的 ⌘K 徽标。
- **归族**: local
- **复核状态**: 未复核

### [FM5-S1-C-5] 侧栏折叠把手按钮宽 22px（< 24×24 目标）

- **页面/路由**: `#/complex-pages/pih-workspace`（sessions 侧栏与 composer 之间）
- **主题/视口/状态**: light + dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/pih-divider-crop.png`
- **目视描述**: 侧栏折叠把手为 22×30 圆角小 pill。
- **程序化证据**: 探针输出 `handle.rect {w:22, h:30}`，icon 12×12 完全在按钮内（`iconOverflow right=-5 bottom=-9`）。
- **对照基准**: WCAG 2.5.8 可点击目标最小 24×24 CSS px
- **严重程度**: P3（差 2px，且高度达标、无替代路径缺失——点击把手本身可折叠展开）
- **用户影响**: 触屏/高齢用户点按容错略降。
- **修复方向**: 把手 pill 宽度 22px → 24px（`w-6`），图标居中不变。
- **归族**: local
- **复核状态**: 未复核

### 误报排除记录（本页）

- 把手图标"右侧似被裁切"：live 探针证明 icon 完整落于按钮内，系 12px 图标 + pill 的视觉挤压感，不报。
- dark 下 replica 整体保持亮色 chrome：外部应用复刻皮肤语义（同 FM5-S1-B-2 口径），watch-only，不单列。
- 截图中 x≈600 处竖条实为折叠把手 pill，非渲染残影。

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page/pih-workspace.md`）。
