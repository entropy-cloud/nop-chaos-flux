# [card] page:scada-editor-demo

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/scada-editor-demo`（根级 hash 路由） ｜ **载体**: 设计器域页面（E5 M1 MVP 编辑器：scada-editor-canvas 编辑态 + palette + inspector + toolbox + save/load；flux-renderers-industrial/editor + leafer 引擎）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；G4 裁剪——demo schema 恒含 3 图元，空态 overlay（`scada-editor-empty`）有 DOM 契约与单测但本页无法在不破坏后续探针的前提下清空取证，判 pass 依据代码锚点 + A5 空态语义；连线（connection）子探针未能构造有效终点——见 §4 存疑项，不判 pass/fail；A5 loading/error 帧未捕获——同步 ready）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                            | light                                                                                                | dark                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-23/r2-1b/scada-editor-demo/scada-editor-demo-default-wide-light.png` | `…/scada-editor-demo-default-wide-dark.png` |
| 默认 800×900                    | `…/scada-editor-demo-default-narrow-light.png`                                                       | —（探针双主题同构，溢出面相同）             |
| 图元选中（G1：选择框+8 手柄）   | `…/scada-editor-demo-symbol-selected-light.png`                                                      | —                                           |
| 拖拽中（G3，mouse 序列 mid 帧） | `…/scada-editor-demo-drag-mid-light.png`                                                             | —                                           |
| 拖拽落位后                      | `…/scada-editor-demo-drag-applied-light.png`                                                         | —                                           |
| undo 后（G6，回 200,160）       | `…/scada-editor-demo-after-undo-light.png`                                                           | —                                           |
| palette 追加后（A8/DnD）        | `…/scada-editor-demo-after-palette-add-light.png`                                                    | —                                           |
| 缩放 2 步+选中保持（G5）        | `…/scada-editor-demo-zoom-in-selected-light.png`、`…/scada-editor-demo-zoom-in-2x-light.png`         | —                                           |
| hover 帧（G2）                  | `…/scada-editor-demo-symbol-hover-light.png`                                                         | —                                           |
| inspector 键入后（G7 缺陷现场） | `…/scada-editor-demo-inspector-stepwise-light.png`、`…/scada-editor-demo-inspector-edited-light.png` | —                                           |
| 连线拖拽 mid 帧（存疑项）       | `…/scada-editor-demo-connection-drag-mid-light.png`                                                  | —                                           |
| 导入 Dialog（H）                | `…/scada-editor-demo-import-open-light.png`                                                          | —                                           |
| Save 点击后（A9）               | `…/scada-editor-demo-after-save-light.png`                                                           | —                                           |

探针：`_tmp/r2-1b-probes/scada-phase{1,2,3,4,5,6,7}.mjs` → 同名 `-out.json`（加载 6.5s，单脚本 <30s，未触 60s 上限）。会话取证：`window.__flux_scada_editor_*` 测试句柄（design-renderer.md §8.4 契约）+ leafer canvas `getImageData` 像素测量。

## 2. A–H 维度勾选表

- A 交互：A1 ✔（palette item hover bg `var(--nop-hover)` 探针坐实） A2 ✔（inspector 输入框 focus 蓝环截图坐实；toolbox 按钮 shadcn focus-visible 同族） A3 ✔（targetScan(24) 零命中） A4 ✔（selection 相关 toolbox 按钮 disabled=true + opacity 0.5 + pointer-events none，选中后启用） A5 ✔（empty/loading/error 三 region DOM 契约在，本页恒 ready） A6 ✔（图元拖拽 mouse 序列跟手、落位 (200,160)→(310,92) 精确；HTML5 DnD dropEffect=copy） A7 ✔（导入 dialog：role=dialog、确认/取消齐备） A8 ✔（palette 点击即加图元（级联落点防重叠）、方向键 1px/Shift+10px 微调、Delete 删除——拖拽全有替代） A9 **fail(R2-1b-A9-01)**（Save 静默无反馈）
- B 颜色：B1 ✔（palette/toolbox 12.61:1、dark 13.99:1） B2 ✔ B3 ✔ B4 ✔（chrome 走 `--nop-*`；画布图元/交互预设硬编码色 = plan 474 R2/R13 → V12a 既往裁决，不报） B5 ✔（chrome dark 平价；画布配色 = R3 编写期主题裁定既往裁决，dark 不适配不报，见 §4） B6 ✔
- C 布局：C1 ✔（1280 下无 clip——HTML clipY 127 为页面纵向滚动常态） C2 ✔ C3 ✔（toolbox/palette/canvas/inspector/statusBar 五区可辨） C4 **warn(R2-1b-C4-02)**（800px 视口整页横向溢出 298px） C5 ✔（页面纵滚正常、无双重滚动条） C6 ✔（canvas attr 792×446 == rect 792×446；三 canvas 分层为引擎常态）
- D 间隔：D1 ✔（palette 24 项 gap 4px 均一） D2 ✔ D3 n/a（无数据行） D4 ✔（toolbox 两组按钮 gap 8px） D5 n/a D6 n/a D7 ✔（toolbox→body→statusBar 间隙 0 但各有 1px border 分隔——styles.css 明文有意 flush，白名单） D8 ✔
- E 排布：E1 ✔（eyebrow/标题/说明/编辑器主次分明） E2 ✔（Save primary、Load 次位） E3 ✔ E4 ✔ E5 ✔（面板卡片+边框分组） E6 ✔（未选中图元时 inspector 有「未选中图元」提示）
- F 一致性：F1 ✔（Save/Load variant 与全站语义一致） F2 **watch**（inspector 选中态 231px/未选中 85px、palette 83px，明显窄于其他设计器属性面板档位——无其他 scada 宿主可对照，本波记观察不立 finding） F3 ✔ F4 ✔（「图元库/属性/未选中图元」文案统一） F5 n/a
- G 设计器：G1 ✔（选择框+8 手柄可见、选中态与 hover 可区分、句柄 state 经 session.selection 探针坐实；框色为 leafer 编辑器默认——令牌化归 V12a 既往裁决） G2 **watch**（palette grab+hover ✔；画布图元 hover 无微高亮、cursor 恒 arrow——真实 hover 接线归 I11.2 既往裁决，见 §4） G3 ✔（图元拖拽 mouse 序列精确；palette DnD drop 落在指针世界坐标（350,100）——程序化 DragEvent 驱动并记录，Playwright mouse 原生不支持 HTML5 draggable） G4 ✔（依据 §裁剪说明：empty overlay DOM 契约 + 单测，本页 schema 恒非空） G5 ✔（放大×2 蓝矩形像素宽 128→152→180（×1.2 步进精确），适配 250；选中态跨缩放保持不漂移（session.selection 不变 + zoom-in-selected 截图框随符号缩放）；toolbox 状态栏回显「Fit: 视口 200,80 @2.02x」） G6 ✔（undo 即时回退拖拽 (310,92)→(200,160)；palette 两次追加两次 undo 全撤销） G7 **fail(R2-1b-G7-01)**（画布→面板 ✔；面板→画布键入路径数值错提交+显示失同步） G8 ✔（chrome 双主题平价；画布 R3 编写期裁定）
- H 弹层：H1 ✔（导入 dialog role=dialog，textarea 560×64 = base 档消费面） H2 n/a（无 Sheet/Drawer） H3 ✔ H4 ✔ H5 ✔（确认/取消次主位） H6 n/a（导入为单 textarea 面） H7 ✔ H8 n/a H9 n/a（dialog 宽 560 < 800 视口）

## 3. 发现条目

### [R2-1b-G7-01] inspector 数值字段键入编辑错提交：输入框回显旧值与会话状态失同步，图元被静默移出画布

- **页面/路由**: `#/scada-editor-demo`（scada-editor-canvas inspector 几何字段；任意图元选中态复现）
- **主题/视口/状态**: light / 1280×800 / 选中 demo-text 后在 x 字段全选键入 355
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/scada-editor-demo/scada-editor-demo-inspector-stepwise-light.png`（x 显示 240、画布内 demo-text 已消失——被移到 x=2405 画布外）、`…/scada-editor-demo-inspector-edited-light.png`
- **目视描述**: 在属性面板 x 输入框全选后键入 355，输入框立即弹回显示 240；实际会话值被写成 2405（垃圾值），demo-text 图元被静默移到画布外不可见，输入框与会话状态自此不一致。
- **程序化证据**:
  - 探针: 逐步键入探针（phase5，Playwright 可信键盘事件逐键采样 session.workingConfig + input.value）＋真键盘复测（phase4）
  - 输出: 全选后键「3」→ session x=3 但 input.value 显示 240；再键「5」→ session x=2405、显示仍 240；Tab 后 session x=2405 / 显示 240——**显示与状态双向脱节，终值≠键入值**；换选中其他图元后输入框正常刷新（读路径在选区切换时才重挂）
- **对照基准**: 检查提示词 G7（属性面板↔画布双向同步：改面板画布变须为**正确**变更）；NN/g 直接操作「操作必须增量且可逆、结果可见」
- **严重程度**: P1（属性编辑是编辑器高频主路径；数值错提交 = 静默数据损坏且图元不可见丢失，用户无法从界面察觉错在哪）
- **用户影响**: 用户改坐标 → 输入框「打不进字」、符号凭空消失、保存后配置带垃圾坐标——直接破坏对编辑器的基本信任。
- **修复方向**: `packages/flux-renderers-industrial/src/editor/inspector/inspector-panel.tsx` 数值字段的 value 绑定源与 onChange 写入源不一致（写 working copy、读选区时快照/committed 基线）：显示值应绑定同一 working 值（本地 state 于选区变化时 seed、订阅 working 变化回写），并在 onChange 对 NaN/超界做 clamp 反馈；复现用例进 `inspector-field.test.tsx`。
- **归族**: local → R2-4 批（scada inspector 字段绑定缺陷；dashboard-editor 若复用同款 inspector-field 需一并核对）
- **复核状态**: 未复核

### [R2-1b-A9-01] Save 点击后零反馈：无 toast、无状态回显、无脏态变化

- **页面/路由**: `#/scada-editor-demo`（页头 Save 按钮，`component:save` 动作）
- **主题/视口/状态**: light / 1280×800 / 点击 Save 后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/scada-editor-demo/scada-editor-demo-after-save-light.png`
- **目视描述**: 点击 Save 按钮后界面无任何可见变化——无 toast、toolbox 状态栏无文字、按钮无 loading/success 态。
- **程序化证据**:
  - 探针: 点击前后 `[data-slot="scada-editor-toolbox-status"]` 文本 + toast DOM + console（phase7）
  - 输出: `statusText: null, toast: null`；demo env.notify 仅 console.log 且未输出——提交完全静默
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）
- **严重程度**: P3（demo 页 MVP save/load 语义；用户无法确认保存是否发生，但无数据损失路径）
- **用户影响**: 用户点 Save 后不确定是否成功，可能重复点击或直接离开丢失工作副本。
- **修复方向**: `component:save` 提交后经 toolbox status span（`scada-editor-toolbox-status`，V12e 已有样式消费面）回显「已保存 HH:mm」或触发 env.notify 走 Toaster；一行状态回显即可。
- **归族**: local → R2-4 批（scada-editor toolbox/save 反馈；与 dashboard-editor save 反馈面一并核对）
- **复核状态**: 未复核

### [R2-1b-C4-02] 800px 视口整页横向溢出 298px：编辑器最小宽 > 窄视口，仅靠 body 横向滚动兜底

- **页面/路由**: `#/scada-editor-demo`（max-w-[1100px] 演示节 + 固定五区编辑器布局）
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/scada-editor-demo/scada-editor-demo-default-narrow-light.png`
- **目视描述**: 800px 视口下页面整体超宽，需横向滚动才能看到 inspector；编辑器各面板不折叠。
- **程序化证据**:
  - 探针: `__P.overflowScan()`（phase1 narrow）
  - 输出: HTML/BODY/MAIN clipX sx=298（cw=800）——`min-h-screen grid place-items-center p-6` 容器内 1100px 节 + 编辑器最小宽导致
- **对照基准**: 检查提示词 C4（~800 视口不塌不挤）
- **严重程度**: P3（桌面组态编辑器、无移动端声明；窄窗口分屏用户需横滚，主功能可达）
- **用户影响**: 分屏/窄窗口用户看到截断的页面与来回横滚，观感粗糙；功能不受阻。
- **修复方向**: 演示页容器改 `min-w-min` 并允许编辑器布局在 <1100px 时收窄 canvas（`minmax(0,1fr)`）或降级为纵向堆叠；与 word-editor C1-01 一并在 R2-4 批核对各设计器宿主壳的窄视口策略。
- **归族**: local → R2-4 批（设计器宿主壳窄视口策略家族）
- **复核状态**: 未复核

## 4. 已知项确认（不重复立项）与误报排除

| 项                                                              | 处理                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 画布图元/交互预设硬编码色（selected #ff7f2a、hover #2f6fed 等） | plan 474 Non-Goals 明文「硬编码色令牌化与豁免收紧 → V12a」既往裁决，不报                                                                                                                                                                                                                                             |
| dark 下画布配色不自适应                                         | plan 474 Non-Goals「运行时 dark 切换（R3 编写期主题裁定）」既往裁决；chrome 面已 dark 平价——不报                                                                                                                                                                                                                     |
| 画布图元 hover 无微高亮、cursor 恒 arrow（G2 watch）            | interaction-overlay.ts 注释明文「真实 hover 接线（事件桥→覆盖层）归 I11.2」——未接线功能既往裁决，按误报红线不报缺失；本卡仅记 watch 确认影响面                                                                                                                                                                       |
| 图层面板缺失                                                    | 路由描述（domain-route-entries）只声明 palette/canvas/inspector/save-load，未声明图层面板——描述无矛盾，不报                                                                                                                                                                                                          |
| 连线（connection）探针未能构造有效终点                          | connection-drag-controller 语义为 pipe-junction 主体 pointerdown 进入端点拖拽、终点需命中有效锚点；本波 mouse 序列（junction→矩形中心）无 rubber-band mid 帧、无 connection 落库——该子能力有单测/e2e 基线（plan 474 scada 37 test 基线），判定为探针终点无效而非产品缺陷，记**存疑项**留给复检轮以「双接头」场景复测 |
| Playwright mouse 无法原生驱动 HTML5 draggable                   | palette 拖入以程序化 DragEvent（DataTransfer + dragenter/dragover/drop）驱动并记录；drop 落点世界坐标换算（400,150→world 350,100）与 F11 落点语义一致——取证方式限制，非缺陷                                                                                                                                          |
| HTML clipY 127（1280 视口）                                     | 演示页纵向滚动常态（说明区+编辑器超一屏），非画布裁切                                                                                                                                                                                                                                                                |
| toolbox→palette/canvas/inspector 间隙 0                         | styles.css 明文各面板 1px border 分隔（有意 flush 白名单）                                                                                                                                                                                                                                                           |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；G7-01/A9-01/C4-02 已归族 local → R2-4 批；批内复检通过后 → `verified`。
