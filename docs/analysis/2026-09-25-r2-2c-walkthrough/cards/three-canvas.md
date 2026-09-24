# [card] control:three-canvas

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/three-canvas-demo` ｜ **载体**: 域 demo 页（WebGL 3D 演示：主场景画布 + 坏 url error 画布 + AI 生成离线演示）
- **矩阵裁剪**: simplified（matrixReason：地板 = light+dark（真 data-mode）、1280×800 + ~800、默认态全查；中间态 = 相机轨道（pointer 拖拽 orbit，程序化执行 + PNG 像素差判据）；hover：canvas cursor 探针取证；选中态 n/a（3D 对象无 DOM 选中语义，onObjectClick 为事件通道）；loading 态本地瞬时不可复现截取（沿用 R2-1c 口径）；error 态有（坏 url 画布）已查）
- 本页实际裁掉的状态：loading 中间态、对象选中态、glass 皮肤

## 1. 截图清单

| 状态                        | light                                                                                   | dark（真 data-mode）                                                               |
| --------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 默认 1280×800               | `_tmp/visual-inspection-2026-09-25/r2-2c/three-canvas/three-default-light-1280.png`     | `_tmp/visual-inspection-2026-09-25/r2-2c/three-canvas/three-default-dark-1280.png` |
| 相机 orbit 拖拽后（中间态） | `_tmp/visual-inspection-2026-09-25/r2-2c/three-canvas/three-after-orbit-light-1280.png` | —（行为与主题无关）                                                                |
| 默认 ~800 宽                | `_tmp/visual-inspection-2026-09-25/r2-2c/three-canvas/three-default-light-800.png`      | —（窄视口风险=溢出裁切，light 已证 docOverX 324）                                  |
| error 态画布（坏 url）      | 见默认图右下（探针取色）                                                                | 探针取色（2.18:1）                                                                 |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（canvas）A2 pass（页头按钮 shadcn 族）A3 pass（页内可点钮 ≥24）A4 n/a A5 pass（error 态文案+Retry 钮在：`errorText "3D 场景加载失败。重试"`、`retryBtn true`）A6 n/a（无拖放落位）A7 n/a A8 n/a A9 pass（orbit 拖拽后画布重绘 14.8% 像素变化，交互回路在）
- B 颜色：B1 **维持 R2-1c-B1-01**（error 文案/Retry light 3.78:1、dark 2.18:1）B2 pass B3 n/a B4 pass（DOM chrome 走令牌）B5 pass（dark 无新增专有缺陷；3D 底色恒深蓝=schema 有意配置，误报表不立）B6 n/a
- C 布局：C1 **维持 R2-1c-C4-01**（1280 下 main>section 纵向溢出 468px、画布冲出卡片底缘可见）C2 pass C3 pass C4 **维持 R2-1c-C4-01**（800 宽 docOverX 324、canvas 钉死 984）C5 n/a C6 **维持 R2-1c-C6-01**（DPR2 上下文 attr 984 = css 984，matchDpr2 false——半分辨率渲染确认；engine `renderer.setSize(width,height)` 未乘 pixelRatio）
- D 间隔：D1 **维持 R2-1c-D1-01**（Back 钮 18px 离栅，页单元 P3）D2–D8 pass/n-a
- E 排布：E1–E6 pass（维持 R2-1c 页单元口径）
- F 一致性：F1–F4 pass（error 态模式与 scada 系同构）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

本波无新增独立条目：三处 R2-1c 页单元条目（C6 半分辨率、C4 壳层不弹性、B1 error 对比度）现状全部复现且根因未变（`engine/scene-manager.ts` `setSize` 无 pixelRatio、demo 壳层 grid+w-full 钉宽、error slot 字面色），按重叠口径引用原条目记"维持"，不重复立项。相机轨道中间态为本波新取证面（R2-1c 裁掉），结论为**功能正常**（积极面，见 §4），不构成 finding。

## 4. R2-1c 页单元裁定复检对照（本波现状，均"维持"，不重复立项）

| R2-1c 条目                            | 现状探针值（2026-09-25）                                                                                                                                                                      | 结论         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| R2-1c-C6-01 画布未按 DPR 缩放（P2）   | DPR2 上下文 `canvases [{attrW:984, cssW:984, matchDpr2:false}, {attrW:1016, cssW:1016, matchDpr2:false}]`——Retina 半分辨率复现；源码 `scene-manager.ts` L564 `setSize(width,height)` 单参调用 | **维持**     |
| R2-1c-C4-01 grid 固定壳层不弹性（P1） | `mainOverY 468`（1280 纵向溢出）、`three800 {docOverX:324, canvasW:984}`（800 横向裁切）                                                                                                      | **维持**     |
| R2-1c-B1-01 error 态对比度（P2）      | light `rgb(239,67,67) on 白` 3.78:1、dark `rgb(217,38,38) on 合成 rgb(55,62,71)` 2.18:1（<4.5 双主题复现）                                                                                    | **维持**     |
| R2-1c-D1-01 Back 钮 18px 离栅（P3）   | 未改（页单元 watch）                                                                                                                                                                          | **维持**     |
| 积极面：相机轨道（本波新取证）        | pointer 拖拽 orbit 后两帧 PNG 像素差 `changedPx 151773 / 1024000 = 14.8%`；画布 cursor auto（可供性弱，并入拖拽光标族观察，不另立）                                                           | **功能正常** |

## 5. 已知族命中（引用，不另立项）

- 拖拽光标族（R2-1b-G2-01）：画布 cursor auto（§4 积极面行注明；修复面与 map/graph/dashboard 同族可一并收）。
- 窄视口 flex/固定壳层族（R2-3c 候选）：C4 维持行即该族画布域实例（R2-1c 已裁 systemic）。
- WebGL 截图色偏误报红线：本卡像素判据全部使用探针原值（toDataURL 长度差 / PNG 解码像素差 / getImageData），不以 PNG 目视色差立论。

## 6. 交互键

无法注册：核心中间态 = 相机 orbit，需 pointer 拖拽（mousedown+move+up 序列），interactions.mjs 现有 action 集（click/clickText/waitFor/press/setAttribute）无拖拽原语，无法程序化表达——理由记于卡内。

## owner-doc drift 登记

- owner-doc 登记：无 docs/components/three-canvas/design.md（owner-doc-missing，review-b 2026-09-25）；按本 plan Failure Paths 不新建，新建归后续 plan。

## 7. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `three-canvas`（control）→ carded；
  四处 R2-1c 维持项不改判原裁定；orbit 积极面与光标族观察供 R2-3/R2-4 消化；归族后 → digested。
