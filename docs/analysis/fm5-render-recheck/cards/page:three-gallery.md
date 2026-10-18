# [card] page:three-gallery

- **批次**: FM-5 渲染面复检 · shard1（新增页全量，重点审：3D canvas） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/three-gallery`（domain 路由） ｜ **载体**: 域页面（3D 渲染画廊）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵 + live canvas 探针 + console 取证；其余 6 个 tab 场景（灯光阴影/GLB/关键帧/数字孪生等）与交互标注归复检轮。裁掉：元素态、弹层、拖拽、相机操作态）

## 1. 截图清单

| 状态          | light                                                                                                                                                                                                    | dark                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/three-gallery-default-1280x800-light.png`（矩阵，canvas 初始化中）；settled 取证 `_tmp/visual-inspection-2026-10-18/three-gallery-default-1280x800-light-settled.png` | `_tmp/visual-inspection-2026-10-18/three-gallery-default-1280x800-dark.png` |
| 默认 800×900  | `_tmp/visual-inspection-2026-10-18/three-gallery-default-800x900-light.png`                                                                                                                              | `_tmp/visual-inspection-2026-10-18/three-gallery-default-800x900-dark.png`  |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass(tab 可聚焦) A3 pass A4 n/a A5 pass(canvas 初始化有 Spinner) A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass(label pill 白底深字清晰) B2 pass B3 pass B4 n/a B5 pass(两态场景一致，3D 视口恒深色属表面语义) B6 n/a
- C 布局：C1 pass C2 pass C3 pass C4 pass(800 双态完整) C5 pass C6 pass(canvas.width/height 与容器一致、DPR 无失配)
- D 间隔：D1 pass D2 pass D3 n/a D4 pass D5 n/a D6 n/a D7 pass D8 pass
- E 排布：E1 pass(tab + 描述 + 场景三秒可答) E2 pass E3 pass E4 pass E5 pass E6 pass
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：n/a ｜ H 弹层：n/a

## 3. 发现条目

### [FM5-S1-A-2] canvas 首帧挂载期容器塌缩为 ~47px 细条（有 Spinner，归性能域，登记观察）

- **页面/路由**: `#/three-gallery`
- **主题/视口/状态**: light / 1280×800 / 首次挂载 ~1-2s 内
- **截图**: `_tmp/visual-inspection-2026-10-18/three-gallery-default-1280x800-light.png`（塌缩态）；settled 对照 `_tmp/visual-inspection-2026-10-18/three-gallery-default-1280x800-light-settled.png`
- **目视描述**: 矩阵截图捕获时 canvas 容器仅为一条 ~47px 高的深色细条（内含 spinner），settled 后恢复 1246×460。场景加载完成即正常。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-three-probe.mjs`（settle 7s 后测）
  - 输出: light/dark 均 `canvas 1246×460, parent 1246×460, dprMismatch=false, spinners=0`。塌缩仅存在于挂载初期。
- **对照基准**: 检查提示词误报表"性能导致的长任务首帧空白归性能域，非视觉缺陷；仅当无 loading 态指示时按 A5 报"——本页有 Spinner，故不立案为视觉缺陷。
- **严重程度**: P3（watch-only：初始化容器无 min-height，首屏存在 CLS 跳变）
- **用户影响**: 首访看到画布从细条"长开"的跳变，约 1-2s。
- **修复方向**: canvas 容器挂载期给 min-height（如 460px 或 aspect-ratio 占位），消除布局跳变。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

### [FM5-S1-H-1] light 模式 console 出现 4 条 WebGL 驱动告警（GPU stall due to ReadPixels）

- **页面/路由**: `#/three-gallery`
- **主题/视口/状态**: light / 1280×800 / 默认（dark 无）
- **截图**: 无（console 证据）
- **目视描述**: 页面无异常；console 有 4 条 `[.WebGL-...] GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)`。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-console-probe2.mjs` / `_tmp/fm5-walk1-three-gallery-warn.mjs`
  - 输出: `three-gallery:light: consoleWarn=4`；dark：clean。为浏览器驱动层性能提示（渲染循环中 readPixels 逐帧调用导致 GPU stall）。
- **对照基准**: H 维控制台噪音口径；渲染循环 readPixels 属性能域
- **严重程度**: P3
- **用户影响**: 无直接可见影响；可能伴随帧率损耗（macOS OpenGL 路径）。
- **修复方向**: 排查 three 渲染循环内每帧 `readPixels`/`toDataURL` 调用（截图导出/拾取），改为按需触发。
- **归族**: watch-only → 台账（性能域）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page:three-gallery.md`）。
