# [card] control:dashboard

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/dashboard-demo` ｜ **载体**: 域 demo 页（dashboard 渲染器经 dashboard-editor 的 Preview 态承载；编辑态载体见同目录 dashboard-editor 卡）
- **矩阵裁剪**: full（matrixReason：六属性复杂控件，FULL 矩阵执行——编辑/预览切换、组件拖拽中（编辑态）、配置面板改动→画布更新（G7）在 dashboard-editor 卡联动取证；弹层开态不可达：本页无 Dialog/Sheet/Drawer/Popover 载体（探针 `[role=dialog]|[data-slot=dialog-content]` 全 0，json-view/panel 无 popover 通道），裁剪理由记入 H 行；glass 皮肤按波次口径省略；loading/empty/error：empty 已查（预览空态"暂无面板"），loading/error 无异步源不可达）
- 本页实际裁掉的状态：弹层打开（无载体）、loading/error（无异步）、glass 皮肤

## 1. 截图清单

| 状态                                      | light                                                                                      | dark（真 data-mode）                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 预览态（dashboard 运行面）1280×800        | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard/dashboard-preview-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard/dashboard-preview-dark-1280.png` |
| 预览态 ~800 宽                            | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard/dashboard-preview-light-800.png`        | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard/dashboard-preview-dark-800.png`  |
| 预览空态（面板全删）                      | `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard/dashboard-preview-empty-light-1280.png` | —                                                                                   |
| 编辑态参照（编辑/预览切换、选中、拖拽中） | 见 dashboard-editor 卡截图清单（同一载体）                                                 | 同左                                                                                |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（运行态面板无交互面）A2 pass（页头按钮 shadcn focus 族；编辑面板 focus ring 见 editor 卡）A3 warn（表内列宽手柄 4×39.5 = R2-1a-A3 族命中，引用不另立）A4 pass（undo/redo/delete disabled+样式正确）A5 pass（空态"暂无面板"居中非空白）A6 见 editor 卡（本控件运行态无拖拽）A7 **n/a（弹层无载体，见裁剪声明）** A8 n/a A9 fail(R2-2c-A9-122 联动：保存链路失效使运行态改动不可持久化，主条目在 editor 卡)
- B 颜色：B1 pass（panelTitle 20.01:1、stat 值 12.61:1）B2 pass（面板边框/卡片边界可见）B3 **维持 R2-1c-B3-01**（Orders delta 对象形式不渲染，见 §4）B4 pass（色走令牌）B5 pass（dark 白块 0、panel bg rgb(15,23,41) + 标题 rgb(248,250,252)，真 data-mode 实测）B6 pass
- C 布局：C1 fail(R2-2c-C1-121 新实例：stat-tile 数值溢出 4–56px)+**维持 R2-1c-C1-01**（table 382 塞 226）C2 pass（运行态无浮层压内容）C3 pass（绝对定位网格）C4 pass（800 宽 canvas 320px、docOverX 0；页面级窄视口族已在 R2-1c/R2-3c 台账）C5 pass（preview 容器 sw==cw 528 无双滚动条）C6 fail(维持 R2-1c-C6-01：chart svg 固定 533px vs 面板体 242px)
- D 间隔：D1 pass（面板 gap 8px 栅格）D2–D8 n/a/pass
- E 排布：E1 pass（面板标题+内容动线可答三问——唯 chart 内容缺失拉低首屏可答性，归 C6）E2 pass（标题/数值层级清晰）E3 pass E4 pass（面板左缘网格对齐 ≤1px）E5 pass（统一卡片语言）E6 pass（空态有引导）
- F 一致性：F1–F3 n/a/pass F4 warn（zh-CN chrome 与英文 demo 文案混排 = R2-2a-F4-11 族命中，引用不另立）F5 n/a
- G 设计器：n/a（运行态；编辑态 G1–G8 见 dashboard-editor 卡）
- H 弹层：n/a（全列——页面无弹层载体，已声明）

## 3. 发现条目

### [R2-2c-C1-121] stat-tile 数值行在窄面板内溢出 4–56px 被 clip（R2-1a-C1-06 stripe KPI 溢出同族新实例）

- **页面/路由**: `#/dashboard-demo`（Preview 态，kpi-revenue/kpi-orders 面板；编辑态同险）
- **主题/视口/状态**: light+dark / 1280 与 800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/dashboard/dashboard-preview-light-1280.png`（"1284300" 末位顶死面板右缘）、`dashboard-preview-light-800.png`
- **目视描述**: 预览面板 118px 宽、body 100px，`text-3xl` 数值 1284300 无收容纳，末位数字贴/出右缘；800 视口下面板缩至 56px 时数值 clip 过半。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w4-dashboard-editor.mjs` previewOverflow 段（面板 body overflow 扫描）
  - 输出: 1280 preview `dashboard-panel-body overX 4`、`stat-tile-root overX 12`（rectW 100）；800 preview `stat-tile-root overX 48/56`（rectW 56）；编辑态 1280 `overX 4`。面板 `overflow-hidden` → 溢出部分不可达。
- **对照基准**: 检查提示词 C1（文本溢出容器）；watch-pool `R2-1a-C1-06`（stripe KPI 大数溢出容器 16px，同根因：数值字号不随容器收缩）
- **严重程度**: P3（1280 下 12px clip 轻微；800 下不可读，但 800 非主路径）
- **用户影响**: 宽面板数值完整；面板被压缩/窄视口时关键 KPI 数字静默截断，用户读到错误数值（如 128430→"12843"）。
- **修复方向**: `flux-renderers-dashboard/src/dashboard-renderer.tsx` 面板 body 对 stat-tile 传容器宽度查询（container query / ResizeObserver 切字号档），或 stat-tile 数值行 `min-w-0 + truncate` + `text-[clamp()]` 档位；demo schema 可给 KPI 面板设 minW。
- **归族**: watch-only → 台账（并入 R2-1a-C1-06 数值溢出族）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-25）：overX 12/56 全复现

## 4. R2-1c 页单元裁定复检对照（本波现状，均"维持"）

| R2-1c 条目                                          | 现状探针值（2026-09-25）                                                                                                               | 结论                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| R2-1c-C6-01 chart 面板空图+SVG 溢出（P1，systemic） | `chartSvgWidth "533"` vs `chartBody 242`（溢出 291px）、`seriesEls 0`、legend 仅 "Sales"；编辑态画布 body overX 89（svg 撑出横向滚动） | **维持**，源码未变（`chart-renderer.tsx` 测量节点与 ResponsiveContainer 失配） |
| R2-1c-C1-01 table 面板裁切（P2）                    | `tableScroll {sw:382, cw:226}`，Status 列不可达，分页条同裁                                                                            | **维持**                                                                       |
| R2-1c-B3-01 delta 对象形式不渲染（P2）              | `statTiles ["1284300+12.5%","8642"]`——Orders 无 delta 输出                                                                             | **维持**                                                                       |
| R2-1c-C2-01 选中删除钮压数值                        | 属编辑态，见 dashboard-editor 卡（现状：hover 才显 ⊗，压字仍在，editor 卡 §4）                                                         | 移 editor 卡                                                                   |

## 5. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）：编辑器 chrome（预览/编辑/保存）与 aria 全中文，demo 文案中英混排。
- A3 小目标族（R2-1a-A3-01/02 族）：表内列宽手柄 4×39.5（本页预览态探针命中）。
- 调试 chip 遮挡族：`选 0` chip（z9998）压 demo 页 hero 左上角（截图可见，非控件面）。
- 宿主级 dark 残留：页脚 classic/light 宿主下拉 dark 下仍亮底（宿主 chrome 已知族，非本控件）。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/dashboard/design.md（owner-doc-missing，review-b 2026-09-25）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `dashboard`（control）→ carded（卡列填本路径）；
  R2-2c-C1-121 归 watch 族、C6/C1/B3 维持项不改判 R2-1c 原裁定；findings 归族后 → digested。
