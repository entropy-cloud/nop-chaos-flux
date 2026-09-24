# [card] control:scada-editor-canvas

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/scada-editor-demo` ｜ **载体**: 域 demo 页（E5 M1 MVP 编辑器：canvas 编辑态画布 + palette + inspector + toolbox + save/load；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）。注意：`#/scada-editor-demo` **页面级**走查已在 R2-1b 完成（carded）；本卡为**控件契约面**首查，独立台账单元
- **契约面**: `scada-editor-canvas` type 渲染区 = 编辑态画布（`[data-slot="scada-editor-canvas"]`：leafer 编辑器画布 + 选择框/手柄 + 空态/loading/error overlay + 状态栏；inspector/palette/toolbox 为相邻控件域，G7 联动在本卡复核）
- **矩阵裁剪**: simplified（matrixReason：编辑画布核心交互态全查（选中/拖拽/undo/缩放/inspector 联动/双主题/窄视口）；裁掉：glass 皮肤（波次统一）、connection 连线拖拽（R2-1b 存疑项留给复检轮的双接头场景，本波不重复构造）、多选/成组（toolbox 程序化面有单测基线，渲染面与单选同构））
- **探针**: `_tmp/r2-2c-probes/w5-scada-editor.mjs` → `out-w5-scada-editor.json`（`window.__flux_scada_editor_<cid>` 测试句柄契约，design-renderer.md §8.4）

## 1. 截图清单

| 状态                            | light                                                                                                                      | dark（真 data-mode）                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 画布默认 1280×800               | `_tmp/visual-inspection-2026-09-25/r2-2c/scada-editor-canvas/symbol-selected-light.png`（同框含 toolbox/inspector 上下文） | `…/scada-editor-canvas/default-1280-dark.png` |
| 图元选中（选择框+8 手柄）       | `…/scada-editor-canvas/symbol-selected-light.png`                                                                          | —                                             |
| 拖拽 mid 帧                     | `…/scada-editor-canvas/drag-mid-light.png`                                                                                 | —                                             |
| undo 后                         | `…/scada-editor-canvas/after-undo-light.png`                                                                               | —                                             |
| 缩放 1.25x 后                   | `…/scada-editor-canvas/zoom-in-light.png`                                                                                  | —                                             |
| inspector 数值键入后（G7 现场） | `…/scada-editor-canvas/inspector-typed-light.png`                                                                          | —                                             |
| 默认 ~800 宽                    | `…/scada-editor-canvas/default-800-light.png`                                                                              | —                                             |

## 2. A–H 维度勾选表

- A 交互：A1 pass（真实点击 `demo-rect` 选中 `selection: ["demo-rect"]` 坐实） A2 pass（inspector 输入框蓝色 focus 环，dark 截图可见） A3 pass（画布交互件达标；命中项 = 模式 switch 32×18（A3 族实例，见 §4）+ 1×1 隐藏 input（引擎隐藏输入层，误报排除）） **A4 pass**（未选中时 删除/复制/对齐/分布 全部 `disabled=true + opacity 0.5`，选中后 删除/复制启用——`toolboxDisabled`/`toolboxEnabledAfterSel` 双份探针坐实） A5 pass（`scada-editor-empty/loading/error` region DOM 契约在，本页恒 ready） A6 pass（拖拽 (200,160)→(260,110) 精确落位） A7 pass（导入 dialog R2-1b 口径维持） A8 pass（方向键微调/Delete/palette 点击添加等替代路径，R2-1b 口径维持） A9 warn（Save 静默 = R2-1b-A9-01 local 既有条目，本波未复测）
- B 颜色：B1 pass（toolbox/palette/inspector 12.61:1，R2-1b 口径维持） B2 pass（选择框紫色 leafer 默认，令牌化归 V12a 既往裁决） B3 pass B4 pass（chrome `--nop-*`；画布图元预设色 V12a） B5 pass（chrome dark 平价：toolbox bg `rgba(22,30,40,0.96)`；**画布区 dark 保持白底** = R3 编写期主题裁定既往裁决，不报） B6 pass
- C 布局：C1 pass（1280 docOverX=0；仅 switch span 微溢出 12px 噪声） C2 pass C3 pass（toolbox/palette/canvas/inspector/statusBar 五区维持） **C4 warn（家族引用：R2-1b-C4-02 维持——800 视口 docOverX=298，见 §4）** C5 pass C6 pass（canvas attr/rect 一致）
- D 间隔：D1–D8 pass/n-a（面板 flush 分隔 = styles.css 明文有意，白名单维持）
- E 排布：E1–E6 pass（未选中 inspector「未选中图元」提示维持）
- F 一致性：F2 维持 R2-1b watch 观察（inspector 231px 窄档，无对照宿主，不立项）
- G 设计器：**G1 pass**（选择框+8 圆形手柄清晰可见（symbol-selected-light.png），选中态与 hover/默认可区分，`session.selection` 程序化双证） **G2 pass/warn**（画布图元 hover 无微高亮、cursor 恒 arrow = interaction-overlay I11.2 未接线既往裁决，维持 watch 不立项） **G3 pass**（mouse 序列拖拽跟手、落位精确 (200,160)→(260,110)） **G4 pass**（empty overlay 契约 + 单测基线，R2-1b 口径） **G5 pass**（`toolbox.zoomAt(1.25)` → viewport scale 1.25、offset (64.6,44.6) 精确；resetView 复位） **G6 pass**（Meta+Z 撤销拖拽 (260,110)→(200,160) 即时；`canUndo:false/canRedo:true` 投影正确） **G7 fail（家族引用：R2-1b-G7-01 维持——数值字段键入错提交复现，见 §4）** G8 pass（chrome 双主题平价；画布配色 = V12a/R3 既往裁决豁免）
- H 弹层：n/a（导入 dialog 归页面级，R2-1b H1 已过）

## 3. 发现条目

（本卡无新立项发现。G7-01 维持与 C4-02 维持为既有条目的新实例证据，见 §4——本波按「命中同根因引用原条目」口径不重复编号。）

## 4. 已知族命中（引用，不另立项）

- **R2-1b-G7-01（scada inspector 数值字段键入错提交：显示/状态双向脱节，local → R2-4；G7 双向同步族 R2-3 候选主实例）— 复检：维持，逐值复现**。新实例证据：`w5-scada-editor.mjs g7/g7After`：对 demo-text 的 x 字段三击全选后 `pressSequentially('355')` → 400ms 后 `sessionX: 2405, inputValue: "240"`——与 R2-1b 记录的「键 3 → 会话 3、显示 240；键 5 → 会话 2405、显示 240」同机制同终值；图元被静默移出画布、输入框与会话状态脱节。dark 截图（inspector x=240 输入框 focus 环在）为该现场留档。inspector-panel.tsx 数值字段 value 绑定/onChange 写入源不一致的修复方向维持原条目。
- **R2-1b-C4-02（800 视口整页横向溢出 298px，local → R2-3c 候选族）— 复检：维持**。`narrow.docOverX = 298` 逐值一致。
- **A3 小目标族（R2-1a-A3 族）— 新实例证据**：模式切换 `span[data-slot=switch]` 32×18（min 边 18 < 24）；并入 A3 族台账，不另立项。
- **画布图元 hover 无微高亮/cursor 恒 arrow（G2 watch，interaction-overlay I11.2 既往裁决）— 维持**。
- 误报排除：① 1×1 隐藏 input = leafer/canvas-editor 隐藏输入层；② dark 画布白底 = R3 编写期主题裁定（plan 474 Non-Goals）；③ 选择框/手柄紫色为 leafer 编辑器默认，令牌化归 V12a。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/scada-editor-canvas/design.md（owner-doc-missing，review-b 2026-09-25）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `scada-editor-canvas` → carded（card 列填本路径）；G7-01/C4-02 维持记录回写原条目链路（G7-01 为 R2-3 G7 族最强实例，建议批内优先修复）。
