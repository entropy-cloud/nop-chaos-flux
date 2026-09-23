# [card] page:dingtalk-flow-demo

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/dingtalk-flow-demo`（**孤儿路由，见 F4-02**）｜ 实际走查载体 = `#/flow-designer` → "钉钉审批流" tab（DingFlow tree 模式，条件分支/合并/插入节点交互面）
- **矩阵裁剪**: simplified（理由：① 页面本体路由失效，按 briefing 意图走查钉钉流程复刻实况面（钉钉审批流 tab）；② tree 模式按 design.md §17.7 为非自由拖拽设计（节点拖拽不持久化、无自由连线），G3 以"点击插入全链路 + 可供性"为口径，拖拽中态标记 n/a；③ 无 Dialog/Sheet 弹层（add-node 菜单按 H 口径抽查宽度与定位）；④ glass 未抽查（与 flow-designer 同主题壳））

## 1. 截图清单

| 状态                          | light                                                                                                                                        | dark                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-23/r2-1b/dingtalk-flow-demo/dingtalk-flow-demo-dingtab-default-light.png`                                    | `dingtalk-flow-demo-default-dark.png`          |
| 默认 ~800 宽                  | `dingtalk-flow-demo-default-light-narrow800.png`                                                                                             | —                                              |
| hover（节点抽样）             | `dingtalk-flow-demo-node-hover-light.png`                                                                                                    | —                                              |
| focus-visible                 | —（键盘路径见 A8-01 发现，焦点环与 flow-designer 同 A2-01 watch 项）                                                                         | —                                              |
| 选中                          | `dingtalk-flow-demo-node-selected-light.png`                                                                                                 | —（dark 下选中卡同 light 无环，见 G1-01 引用） |
| add-node 菜单（= 本页主弹层） | `dingtalk-flow-demo-addnode-menu-trusted-click-light.png`（可见态）、`addnode-menu-js-light.png`（越界态证据）、`addnode-menu-low-light.png` | —                                              |
| 插入后 / 分支                 | `dingtalk-flow-demo-after-node-add-light.png`、`dingtalk-flow-demo-after-branch-add-light.png`                                               | —                                              |
| loading/empty                 | n/a（静态复刻数据，无异步）                                                                                                                  | —                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover 工具栏出现、按钮态正常）A2 pass（键盘 Tab 可达 + focus-visible 环在 palette/工具栏正常；画布节点同 R2-1b-A2-01 watch）A3 warn(C2-02 内：+ 触发器 12×12) A4 pass A5 pass A6 **n/a**（tree 模式无拖拽设计，见裁剪理由）A7 pass（菜单 Esc/外点可关）A8 **fail(R2-1b-A8-01)** A9 pass（插入后节点计数 10→11、inspector 即时反映）
- B 颜色：B1 pass（dark 画布节点文字/彩 pill 可读）B2 pass B3 pass B4 pass B5 pass（画布区本体 dark 适配良好；节点工具栏 pill 白底同 R2-1b-B5-01 systemic，已并入该族）B6 pass
- C 布局：C1 pass（overflowScan 仅 xyflow 常态裁切）C2 warn(R2-1b-C2-02) C3 pass C4 pass（800 宽正常收缩）C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 n/a D4 pass D5 pass（inspector 表单间距成栅格；本 tab 无双表单）D6 n/a D7 pass D8 pass
- E 排布：E1 pass（钉钉审批流复刻意图清晰：发起人→审批→条件路由→并行→结束）E2 pass E3 pass E4 pass E5 pass E6 pass
- F 一致性：F1 pass F2 pass（与 flow-designer 同壳布局）F3 pass F4 **fail(R2-1b-F4-02)** F5 n/a
- G 设计器：G1 fail(→ R2-1b-G1-01 systemic，本页复现同证) G2 pass（节点 hover cursor=grab、工具栏浮现）G3 **n/a**（裁剪理由见上；点击插入链路实证可用）G4 n/a（复刻模板常载）G5 pass（Zoom In/Out/Fit 在位；缩放桥接与 workflow tab 同一实现且已实证零漂移）G6 n/a（本 tab 工具栏无 撤销/重做 按钮；tree 模式历史能力未在 UI 暴露，无 UI 承诺故不报缺失）G7 pass（**面板→画布写路径在本 tab 正常**：名称改名 → 画布节点即时更新；canvas→面板读正常）G8 pass（dark 全画布可读；工具栏 pill 白底归 R2-1b-B5-01）
- H 弹层：H1 pass（add-node 菜单 356×96，内容尺寸合理）H2 n/a H3 pass H4 pass H5 n/a（无 footer）H6 pass H7 pass H8 pass H9 pass（~800 宽正常）

## 3. 发现条目

### [R2-1b-F4-02] `#/dingtalk-flow-demo` 为孤儿路由：目录有项、分发无 case、落点为主页

- **页面/路由**: `#/dingtalk-flow-demo`
- **主题/视口/状态**: light / 1280×800 / 直接访问 hash
- **截图**: （路由级证据，DOM 断言为主；访问态即主页截图，无独立视觉形态）
- **目视描述**: 访问 `#/dingtalk-flow-demo` 渲染的是主页（页面卡目录），并非钉钉流程 demo。
- **程序化证据**:
  - 探针: `domain-route-entries.ts` 注册了 id `dingtalk-flow-demo`（eyebrow "Style Prototype"），`App.tsx` domain switch 无该 case → `default: HomePage`；`home-page.tsx` 卡片清单亦无此项；导航后 `location.hash` 变为 `#/`（主页默认路由）
  - 实况钉钉复刻内容位于 `#/flow-designer` 的"钉钉审批流"tab（dingtalk-workflow-tree-schema，tree 模式），本卡按该实体走查
- **对照基准**: 检查提示词 F4（页面描述与实况矛盾要报）；误报红线"未接线功能不报缺失，但描述与实况矛盾要报"
- **严重程度**: P2
- **用户影响**: 直接访问/hash 分享该路由的用户落空；路由清单与路由矩阵测试基线存在死项。
- **修复方向**: 二选一：App.tsx domain switch 增加 `case 'dingtalk-flow-demo'`（渲染 DingFlow demo 实体或直接复用 flow-designer 页钉钉 tab 初态）；或从 `domain-route-entries.ts` 移除该条目。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1b-A8-01] add-node 菜单无键盘激活路径（与 design.md a11y 契约矛盾）

- **页面/路由**: `#/flow-designer` 钉钉审批流 tab（DingFlow add-node overlay）
- **主题/视口/状态**: light / 1280×800 / 焦点置于 `aria-label="添加节点"` 触发器
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/dingtalk-flow-demo/dingtalk-flow-demo-addnode-menu-kb-light.png`（无菜单出现）
- **目视描述**: 触发器获得焦点后按 Enter / Space / ArrowDown 均无菜单出现；鼠标点击则正常弹出（水平节点类型菜单：审批人/抄送人/条件分支/并行分支/子流程）。
- **程序化证据**:
  - 探针: `btn.focus()` 后逐键 Enter/Space/ArrowDown，每键后查 `[role="menu"][data-open]` → 三键均 `null`（菜单从未打开）；对照组 `btn.click()`（JS）→ 菜单打开（`role=menu` "Add node"，356×96，items 5）；Playwright 信任点击 → 菜单可见 (341,308) 且选项激活后节点 10→11
  - 对照 design.md：add-node overlay 声明"共享 dropdown/menu primitive 契约 + roving focus + Arrow/Home/End"以及"确定性的非拖拽路径：click/keyboard activation"——键盘路径实况为死
  - 附带证据：无坐标激活路径（JS click）下菜单定位到视口外 `(-78,-206)`（9/9 触发器复现），提示菜单定位对 anchor 测量失败无兜底；信任点击定位正常
- **对照基准**: WCAG 2.1.1（键盘可操作）；检查提示词 A8（拖拽/指针功能需单指针替代——此处插入功能有点击路径但键盘路径断）；design.md DingFlow a11y 契约
- **严重程度**: P2
- **用户影响**: 键盘用户完全无法添加节点（插入是本页核心交互）；与文档声明的无障碍契约直接矛盾。
- **修复方向**: add-node 触发器改用 Base UI Menu.Trigger 的键盘激活语义（click/Enter 触发 open 而非仅 pointerdown），或为触发器补 `onKeyDown` 分支调用同一 open 动作；同时给 menu 弹出定位加 anchor 测量失败的视口内兜底。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1b-C2-02] 节点悬浮工具栏完全覆盖其下方 12×12"添加节点"触发器

- **页面/路由**: `#/flow-designer` 钉钉审批流 tab
- **主题/视口/状态**: light / 1280×800 / hover 节点 k002
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/dingtalk-flow-demo/dingtalk-flow-demo-node-hover-light.png`
- **目视描述**: 鼠标悬停节点时出现的编辑/复制/删除工具栏，正好盖住节点下方的"+"插入触发器。
- **程序化证据**:
  - 探针: 工具栏 rect(407,152,102,38)，`添加节点` 触发器 rect(414,165,12,12)，交集面积 154px²（触发器被完全覆盖）；Playwright 无 force 点击该触发器被工具栏 subtree 拦截（无限重试），force 点击可过
  - 佐证: 触发器本身 12×12px（fit-view 缩放后屏幕尺寸），低于 WCAG 2.5.8 的 24×24 口径
- **对照基准**: 检查提示词 C2（浮层压操作）/ A3（可点击目标 ≥24×24）
- **严重程度**: P3
- **用户影响**: 指针经由节点移向"+"时会被工具栏挡住，需要绕开节点直接悬停"+"才可点击；缩放较小时目标过小难以命中。
- **修复方向**: 工具栏与 + 触发器错位布局（工具栏上移/触发器下移 ≥8px），或工具栏出现时暂时隐藏相邻 + 触发器；触发器热区扩到 ≥24px。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` `page:dingtalk-flow-demo` 行 status → `carded`（card 列填本路径；备注"实体=flow-designer 钉钉 tab，路由孤儿"）；
  findings 归族：F4-02/A8-01/C2-02 → local（R2-4 批）；G1/B5 引用 flow-designer 卡 systemic 族；
  批内复检通过后 → `verified`。
