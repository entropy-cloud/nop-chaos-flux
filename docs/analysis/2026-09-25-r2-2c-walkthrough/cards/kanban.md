# [card] control:kanban

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/kanban` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：C9 host-kanban-drag——kanban 位于 openDialog surface 内，onCardClick/onCardMove dispatch probe；2 列（To Do/Done）×2 卡（Card Alpha/Beta），无 tag/search schema 配置）。注意：kanban demo **页面**已在 R2-1d 走查（`docs/analysis/2026-09-23-r2-1d-walkthrough/cards/kanban.md`，B5-01/A3-01 已裁定）；本卡为 **lab 载体控件面**首查，独立台账单元
- **矩阵裁剪**: full（任务口径 FULL 项全做：卡片指针拖拽 mid（light+dark）、键盘拖拽全链路（拾起/移动/落位 + aria-live）、卡片点击、加卡、列宽拖柄、搜索过滤、dark 全套（真 data-mode）、~800 窄视口、A6/A8 专项；裁掉并注明：①列拖拽重排 mid 帧——列拖柄 20×20 存在（A3 族引用）但 fixture 仅 2 列且横滚裁半，重排可视效果在载体上不可辨，demo 页已证；②撤销/重做工具栏三钮仅记录在位（28px 图标钮），undo 链路 demo 卡 G6 已证；③glass 皮肤（波次统一））
- **探针**: `_tmp/r2-2c-probes/w3-kanban.mjs`、`w3-kanban2.mjs`、`w3-kanban3.mjs` → `out-w3-kanban*.json`；像素采样 `_tmp/r2-2c-probes/w3-pixels.mjs`（kanban 段）→ `out-w3-pixels-kanban.json`

## 1. 截图清单

| 状态                                | light                                                                                                               | dark（真 data-mode）                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 默认 1280×800（弹层内）             | `…/kanban/default-1280-light.png`                                                                                   | `…/kanban/default-1280-dark.png`      |
| 卡片 hover（阴影浮起 + 操作钮浮现） | `…/kanban/card-hover-1280-light.png`                                                                                | —                                     |
| 卡片点击后（probe dispatch）        | `…/kanban/card-click` 现场并入 hover 图（无独立视觉态，探针取证）                                                   | —                                     |
| 指针拖拽 mid（源卡 50% 透明）       | `…/kanban/carddrag-mid-1280-light.png` / `carddrag-mid-retry-1280-light.png` / `carddrag-mid-center-1280-light.png` | `…/kanban/carddrag-mid-1280-dark.png` |
| 键盘拾起（Space，aria-live 播报）   | `…/kanban/kb-pickup-1280-light.png`                                                                                 | —                                     |
| 键盘落位后（跨列移动成功）          | `…/kanban/kb-drop-1280-light.png`                                                                                   | —                                     |
| 搜索零结果态                        | `…/kanban/search-zero-state-1280-light.png`                                                                         | —                                     |
| 默认 ~800 宽                        | `…/kanban/default-800-light.png`                                                                                    | —                                     |

（`…` = `_tmp/visual-inspection-2026-09-25/r2-2c`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（卡 hover 阴影 `rgba(0,0,0,.1) 0 4px 12px` + 操作钮浮现 + cursor pointer 探针坐实） A2 pass（卡 tabIndex=0（roving：卡 Beta -1）、UA outline 可见（demo 卡口径）） **A3 warn（家族引用：卡片操作钮 移除卡片/拖拽重新排序列/折叠列 20×20、搜索清除 16×16、列宽拖柄 4×36 <24——R2-1d kanban A3-01 族（20×20 先例）新实例，见 §4）** A4 pass（重做钮初始禁用灰（demo 卡 A4 口径维持）） **A5 fail(R2-2c-A5-89：搜索零结果态与空列态同貌)** **A6 warn(R2-2c-A6-88：指针拖拽在弹层载体源卡拾起后无目标高亮、松手不落位 [needs-confirm]；键盘拖拽链路全通)** A7 pass（弹层关闭钮/遮罩在位；行内加卡输入非弹层） A8 **pass（键盘拖拽全链路：Space 拾起 → aria-live「已拾取卡片：Card Alpha。使用方向键移动，Escape 取消。」→ ArrowRight → Space 落位，`onCardMove` probe 触发（count 1），列计数 2/0→1/1 即时更新——WCAG 2.5.7 达标的完整单指针替代）** A9 pass（卡片点击 probe `kc1|0` 正确、落位/计数即时回显；加卡钮 no-op 见 R2-2c-A9-90）
- B 颜色：B1 pass（卡片标题 light 20.01:1 / dark 19.12:1（像素采样）） B2 pass B3 pass B4 **warn（家族引用：列 footer「+ 添加卡片」`text-gray-500`、footer 边框 `border-gray-200`、空列 `border-gray-300` 字面 gray 类不随 dark 翻转（kanban-column.tsx L341/L349 字面类）——B4 令牌口径 + dark 平价族实例，见 §4）** B5 **warn（家族引用：列头标题 dark 2.09:1（`--secondary-foreground` 棕 #67574C 不翻转）+ 弹层壳 dark 亮底——R2-2a-B5-04 族 + 宿主 `--popover` 族，见 §4）** B6 pass
- C 布局：C1 pass（docOverX=0；列横滚为有意） C2 pass **C5 warn(R2-2c-C5-91：弹层内 Done 列初始裁半、无可见横滚提示)** C3 pass（搜索栏/工具钮/列区可辨） C4 pass（800 宽弹层列宽 280+280 策略同 1280，横滚结构不塌）
- D 间隔：D1 pass（卡间距/列 gap 12px 栅格一致（`flex gap-3`），GAP_SNIPPET 维持 demo 卡 0 命中） D2–D8 pass/n-a
- E 排布：E1 pass（「2 列，2 张卡片」聚合播报可答三问） E2 pass E3 pass E4 pass（列头/卡左缘对齐） E5 pass E6 **warn（家族引用：空列「拖拽卡片到此处」引导本身合格；但零结果态复用同一文案——见 R2-2c-A5-89）**
- F 一致性：F4 **warn（家族引用：列头「To Do2」标题与计数无分隔拼接（结构上同行相邻，读取粘连）；「+ 添加卡片/添加列」zh 于 EN 宿主——R2-2a-F4-11 族）** F1/F3 pass（空列态与 demo 页一致） F5 n/a
- G 设计器（看板按拖拽面套用）：G1 pass（卡片点击无持久选中态 = onCardClick 事件契约，demo 卡同裁定） G2 pass（拖柄/卡 cursor） G3 **warn（同 R2-2c-A6-88：目标列高亮在弹层载体未出现）** G4 pass（空列引导） G5 n/a（无缩放） G6 pass（undo/redo 在位，demo 卡已证） G7 n/a G8 **warn（列头 dark 可读性，见 B5 家族引用）**
- H 弹层：H1 pass（Kanban host 560px = md 档） H2 n/a H3 pass（内容 ≤ 视口） H4 pass H5 n/a H6 n/a H7 pass H8 pass（纵向滚动在 dialog-body） H9 pass（800 视口不溢出）

## 3. 发现条目

### [R2-2c-A6-88] 指针拖拽在弹层载体拾起后无法落位：源卡 50% 透明、目标列无高亮、drop 不触发（键盘路径正常）[needs-confirm]

- **页面/路由**: `#/lab/kanban`（C9 host-kanban-drag；一切「dialog 宿主 + pragmatic-dnd 看板」组合）
- **主题/视口/状态**: light + dark / 1280 / 弹层开 · 指针拖拽进行中
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/kanban/carddrag-mid-retry-1280-light.png`、`carddrag-mid-center-1280-light.png`、`carddrag-mid-1280-dark.png`
- **目视描述**: 按下卡片拖动后源卡变 50% 透明（拖拽已激活），但目标列**始终无蓝色高亮框**（demo 页 A6 有「目标列蓝框高亮」），松手后卡片回原位——三次尝试（列体中心精确落点、16 步渐进移动、dialog-body 预横滚）均不落位；同一会话中键盘拖拽（Space→方向键→Space）完整成功。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-kanban2.mjs`（dragMidState/dragRetryResult）、`w3-kanban3.mjs`（doneCenter/mid/dropResult）
  - 输出: mid 状态 `cards[0].op:"0.5"`（拖拽激活坐实）、两列 `border: rgb(225,231,239)`（**无高亮态**）、落点 `elementFromPoint` = `nop-kanban-column-empty`（正确悬于放置区上）；`dropResult: probeMoveCount 0, columns [2,0]` ×3 次；对照键盘路径 `w3-kanban.mjs kbDrop: probeMoveCount 1, columns [1,1]`。demo 页同款 Playwright mouse 流可完成落位（R2-1d A6 证据）——差异因子为弹层宿主；不排除 pragmatic-dnd 与 dialog-host 指针监听交互的模拟器边缘，故挂 [needs-confirm] 强制独立复核重放。
- **对照基准**: 检查提示词 A6（拖拽全链路视觉反馈：drop indicator 及时、落位有过渡）/G3；NN/g 拖放「落位必须有清晰 drop-target 反馈」
- **严重程度**: P2（若坐实为渲染器/宿主集成缺陷：弹层内看板拖拽功能对鼠标用户不可用且无 drop 反馈；键盘路径可替代故不判 P1；若复核判定为模拟器伪影则降级关闭）
- **用户影响**: 鼠标用户在弹层看板上拖卡「拖得动但放不下」，且无任何目标指示——高频路径直接受阻（以复核结论为准）。
- **修复方向**: 复核坐实后排查 `use-kanban-dnd.ts` monitorForElements 与 dialog-host 指针捕获（`setPointerCapture`/pointerdown preventDefault）的互斥；验收 = 弹层内拖拽落位 + 目标列高亮两条件同时成立；e2e 用例「dialog 宿主内 mouse 拖卡跨列」入 `kanban-dnd-integration`。
- **归族**: local → R2-4 批（[needs-confirm]：kanban dnd × dialog-host 集成单点；复核维持则升 R2-3 与 gantt A8-87 同批排查宿主指针/键盘抢占面）
- **复核状态**: 已复核（保留 P2，根因改判、needs-confirm 解除，review-a 2026-09-25）：弹层内拖到卡片上落位成功（同列重排 DOM 实证）→ 宿主指针冲突假说证伪；空列/列体落点在弹层与 demo 页双双失败（drop:0/dragend:1）→ 列级 drop target（use-kanban-dnd L153-178）全宿主失效，仅 card-target 参与落位（本条为强制复核项）

### [R2-2c-A5-89] 搜索零结果态与空列态共用「拖拽卡片到此处」：过滤无匹配被呈现为「列是空的」

- **页面/路由**: `#/lab/kanban`（任意启用搜索的看板载体；`kanban-toolbar-search-clear` 通道）
- **主题/视口/状态**: light / 1280 / 搜索框输入 `zzz` 后
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/kanban/search-zero-state-1280-light.png`
- **目视描述**: 搜索无匹配后，所有列显示与真空列完全相同的虚线「拖拽卡片到此处」占位——用户会误以为卡片被拖走了，而非搜索词没有命中。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-kanban2.mjs`（searchZero）
  - 输出: `visibleCards: 0`、boardText `"To Do0拖拽卡片到此处+ 添加卡片Done0拖拽卡片到此处…"`（与 `w3-kanban.mjs` default 空列 Done 文案逐字一致）；搜索过滤本身工作正常（输入即时过滤、清除钮 16×16 在位）。
- **对照基准**: 检查提示词 A5（empty 有意义提示）/E6（空态任务引导）；NN/g 空态「告知原因 + 下一步」
- **严重程度**: P3（信息误导但可自行发现（清空搜索即恢复），无任务阻塞）
- **用户影响**: 用户在零结果态被引导去「拖卡片」，产生错误心智模型；列多时逐一排查成本高。
- **修复方向**: `kanban-column.tsx` 空列占位按 `filterText` 分支：有过滤词且该列原有卡被滤掉时显示「无匹配「{filterText}」的卡片」（附清除搜索动作），仅真空列保留「拖拽卡片到此处」。
- **归族**: local → R2-4 批（空态文案分支单点，与「空态引导族」观察合流）
- **复核状态**: 未复核

### [R2-2c-A9-90] 「+ 添加卡片」按钮在宿主未接 onAddCard 时静默 no-op：可见可点但永无响应

- **页面/路由**: `#/lab/kanban`（C9 host fixture schema 仅接 onCardClick/onCardMove；一切未接线 onAddCard 的宿主同险）
- **主题/视口/状态**: light / 1280 / 点击列 footer「+ 添加卡片」后
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/kanban/default-1280-light.png`（按钮在位；点击后无任何变化的现场由探针坐实）
- **目视描述**: 点击「+ 添加卡片」后无行内输入框、无 toast、无任何反馈——按钮看起来坏了（demo 页同按钮会展开行内输入）。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-kanban2.mjs`（addCardOpen）
  - 输出: 点击后 footer 内 `inputs: []`（无行内输入出现）；源码 `kanban-column.tsx` L349 `onClick={() => onAddCard?.(column.id)}`——回调可选链，宿主未接则整条路径静默；按钮渲染不带任何「宿主未启用」条件（对照 demo 页 `kanban-demo.tsx` 接线后行内输入可用）。「+ 添加列」（`kanban-column-adder.tsx`）同型依赖宿主。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；WCAG 3.2.1（可预期行为）
- **严重程度**: P3（fixture 未接线属载体配置，但渲染器在无能力时仍渲染可用样态的可点目标，属可供性虚设；demo 接线场景不受影响）
- **用户影响**: 集成方按 schema 默认形态部署时，用户会反复点击一个永远没有反应的按钮。
- **修复方向**: `kanban-column.tsx` 以 `onAddCard` 存在性门控按钮渲染（`{onAddCard ? <Button…/> : null}`），或点击时给出「宿主未启用添加卡片」debug 提示；`kanban-column-adder` 同步处理。
- **归族**: watch-only → 台账（与「schema 动态响应性缺口 / 表单 AMIS 契约缺口族」同根因面：契约未接线时 UI 无诊断地虚设；R2-3 候选收编）
- **复核状态**: 未复核

### [R2-2c-C5-91] 弹层内 Done 列初始裁半、无可见横滚提示：「+ 添加列」整体离屏

- **页面/路由**: `#/lab/kanban`（C9 host-kanban-drag；一切列宽和 > 弹层宽的多列看板）
- **主题/视口/状态**: light + dark / 1280 / 弹层开 · 默认初始视口
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/kanban/default-1280-light.png`（Done 列右缘被弹层裁切、「+ 添加卡…」截断）
- **目视描述**: 弹层内两列各 280px（560px + gap > 480px 可用），Done 列右半被弹层边缘裁掉且无滚动条——视觉上像布局破版而非「可以横向滚动」；「+ 添加列」按钮完全在视口外（adder rect x1000）。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-kanban.mjs`（default/narrow/overflowLight）
  - 输出: 列 rect `Done {x:708, w:280}`（弹层右缘 920，可见宽仅 172px）；`overflowLight.hits` 含列容器行 `overX:416`（自身非滚动容器）；`narrow: kanbanScrollX 0`——滚动职责在 dialog-body（可滚但**无横滚条/渐隐遮罩等任何可见提示**）；demo 页整页宿主有页级横滚条，弹层宿主无。
- **对照基准**: 检查提示词 C5（固定元素不遮内容、不产生双滚动条）/C1（有意滚动需可发现）；R2-1d「列横滚为有意」白名单口径（本条不否定横滚设计，报的是**可发现性**）
- **严重程度**: P3（列仍可通过滚轮/触控板横移到达，数据不丢；但初始观感为破版裁切）
- **用户影响**: 用户误以为 Done 列就只有一半宽；发现「+ 添加列」的成本高。
- **修复方向**: 看板容器在 `scrollWidth > clientWidth` 时渲染右缘渐隐遮罩或滚动条样式（`scrollbar-gutter`/细滚动条常显）；或弹层宿主给看板场景默认放宽至 lg 档。
- **归族**: watch-only → 台账（横滚可发现性；与「默认栈宽基线/弹层宽度档」两个 watch 族交叉，随 H1/H2 复检轮顺带）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **R2-2a-B5-04（`--secondary-foreground` 不随 dark 翻转，P1 族，R2-4 首批）— 新实例**：dark 列头标题「To Do/Done」`rgb(103,87,76)` 于列头底 `rgb(31,42,61)` = **2.09:1**（`w3-pixels.mjs kanbanDarkColTitle` 像素坐实；卡片标题 19.12:1 达标——仅列头中招）。根因 = playground `:root` 令牌 dark 块不翻转（`apps/playground/src/styles.css` L80/L190+），宿主令牌包修复后需回查本卡 B5/G8。
- **宿主 `--popover` dark 亮底族**：Kanban host 弹层壳 dark 保持亮底、看板面板自身翻暗（`default-1280-dark.png` 白框包黑面混合态）——同根因，随宿主令牌包收口。
- **R2-1d-A3-01（卡片操作钮 20×20 族，watch）— 新实例组**：移除卡片/拖拽重新排序列/折叠列均 20×20、搜索清除 16×16、列宽拖柄 4×36（`smallTargetsLight/Dark`），维持族裁决（icon-xs 误报豁免不适用于**拖拽/折叠**类唯一入口钮，维持 R2-1d 口径）。
- **R2-2a-F4-11 zh-CN 回退族**：「+ 添加卡片」「拖拽卡片到此处」「搜索卡片…」zh chrome 于 EN 宿主。
- **B4 字面色（dark 平价族外围）**：列 footer `text-gray-500`/`border-gray-200`、空列 `border-gray-300` 字面 gray 类（`kanban-column.tsx` L341/L349）dark 下不翻转——随 R2-4 令牌包或组件令牌化收口。
- 误报排除：①卡片点击无选中高亮 = onCardClick 事件契约（demo 卡 G1 同裁定）；②「加卡输入不出现」首测曾误将搜索框当作加卡输入（`.nop-kanban input` 选择器过宽命中搜索框并污染过滤态）——已按 footer 作用域重测坐实 no-op（R2-2c-A9-90）；③键盘拖拽 liveRegion 文案「2 列，2 张卡片」为落位后聚合计数播报，非状态未更新。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `kanban`（control/R2-2c）→ carded（card 列填本路径）；A6-88 强制复核、A5-89 归族 R2-4、A9-90 watch、C5-91 watch → 按裁决流转。
