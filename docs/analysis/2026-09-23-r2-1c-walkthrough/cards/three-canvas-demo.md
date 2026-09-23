# [card] page:three-canvas-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/three-canvas-demo` ｜ **载体**: 域页面（WebGL 3D 演示，plan 469/473）
- **矩阵裁剪**: simplified（matrixReason：无拖拽落位语义（轨道控制已由 pan 截图与 hover 探针覆盖）、无弹层面（AI 生成为内联面板）、glass 皮肤按波次口径省略、loading 态本地瞬时无可复现截取；本页实际裁掉：拖拽进行中、弹层打开、glass）

## 1. 截图清单

| 状态                            | light                                                                                           | dark                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-23/r2-1c/three-canvas-demo/three-canvas-demo-default-light.png` | `…/three-canvas-demo-default-dark.png`     |
| 默认 ~800 宽                    | `…/three-canvas-demo-default-800-light.png`                                                     | `…/three-canvas-demo-default-800-dark.png` |
| focus-visible（抽样，探针取证） | —（探针值，见卡内）                                                                             | —                                          |
| error 态画布（坏 url 演示）     | `…/three-canvas-demo-error-canvas-light.png`                                                    | —（dark 对比度经探针取证 2.18:1）          |
| AI 生成 schema 后               | `…/three-canvas-demo-ai-generated-light.png`                                                    | —                                          |

## 2. A–H 维度勾选表

- A 交互：A1 ✓ A2 ✓（focus ring shadow 可见、无遮挡）A3 ✓（smallTargets=0）A4 n/a A5 ✓（error 态有文案+Retry）A6 n/a A7 n/a A8 n/a A9 ✓（object click notify 通道存在）
- B 颜色：B1 **fail(R2-1c-B1-01)** B2 ✓ B3 n/a（无图例/状态色语义）B4 ✓（DOM chrome 走令牌）B5 ✓（dark 复检无新增专有缺陷）B6 n/a
- C 布局：C1 **fail(R2-1c-C4-01)** C2 ✓ C3 ✓ C4 **fail(R2-1c-C4-01)** C5 n/a C6 **fail(R2-1c-C6-01)**
- D 间隔：D1 warn(R2-1c-D1-01) D2 ✓ D3 n/a D4 ✓ D5 n/a D6 n/a D7 ✓（blockGaps 除 D1-01 外均落栅格）D8 ✓
- E 排布：E1 ✓ E2 ✓ E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：F1 ✓ F2 ✓ F3 ✓（error 态模式与 scada 系同构）F4 ✓ F5 n/a
- G 设计器：n/a（非设计器页）
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-C6-01] 3D 画布未按 DPR 缩放，HiDPI 下半分辨率渲染

- **页面/路由**: `#/three-canvas-demo`（主场景画布 + 坏 url 错误画布 + AI 生成画布，共 3 处实例同根）
- **主题/视口/状态**: light+dark / 1280 与 800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/three-canvas-demo/three-canvas-demo-default-light.png`
- **目视描述**: 3D 场景整体偏软，边缘锯齿经 2× 放大后模糊。
- **程序化证据**: 探针 `canvas.width/height vs getBoundingClientRect×devicePixelRatio`；输出：attr `984×494` == CSS `984×494`，DPR=2 时期望 `1968×988`（三处画布全部 `c6=false`，800 视口与 dark 同值）。
- **对照基准**: 检查提示词 C6（canvas 尺寸与容器一致，DPR 换算）；scada-canvas 同仓对照组 attr=CSS×DPR 全部 `c6=true`，证明是 three-canvas 渲染器个体缺失而非平台约束。
- **严重程度**: P2
- **用户影响**: Retina/2x 屏（macOS 默认）用户看到的 3D 场景恒为半分辨率上采样，字体纹理边缘发虚；不影响功能。
- **修复方向**: `packages/flux-renderers-3d` 渲染器在 size 同步处按 `renderer.setPixelRatio(window.devicePixelRatio)`（或 size 计算乘 DPR）并纳入 resize 路径；修复后 C6 探针应反转。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-C4-01] demo 页 grid 固定壳层不弹性：默认视口即纵向破版、窄视口横向溢出（族）

- **页面/路由**: `#/three-canvas-demo`（本页默认 1280×800 即触发；`#/scada-demo` 同壳层仅在 ~800 触发——族见 scada-demo 卡）
- **主题/视口/状态**: light+dark / 1280×800 与 800×800 / 默认
- **截图**: `…/three-canvas-demo-default-light.png`（画布溢出圆角卡片边界）、`…/three-canvas-demo-default-800-light.png`（横向裁切）
- **目视描述**: 页面卡片（rounded-3xl）在内容中部结束，深色画布明显溢出卡片边界继续绘制；800 宽下画布与说明文字被视口右缘直接裁断。
- **程序化证据**: 探针 ①全页溢出扫描：`main>section` scrollHeight 1218 vs clientHeight 750（1280×800，overflow 可见导致画布绘出卡片）；800 宽时 html scrollWidth 1124 vs 800。②宽度链：canvas 内联 `width:986px` 挂载后冻结，父链 `nop-flex` 986 → page-body 1018 → section 1100；视口改 800 后整链不变（section 恒 1100），`grid place-items-center` + `w-full` 百分比与 max-content 循环使列宽钉死。
- **对照基准**: 检查提示词 C1（无意外溢出）/C4（视口弹性）；与 R2-1a 已裁「窄视口 flex/固定壳层（R2-3c 候选）」同族，本条为该族在画布域的坐实实例。
- **严重程度**: P1（默认视口即视觉破版 + 窄视口功能裁切）
- **用户影响**: 1280×800（主流笔记本）下画布冲出卡片边界、页面出现整页滚动；800 宽下内容不可完整可达。
- **修复方向**: demo 壳层改 `h-screen grid place-items-center` → 常规 flex 流并允许壳层收缩（section 去掉 `w-full`+grid 组合），或给 section 加 `overflow-auto`；根治需画布根随容器 ResizeObserver 重建（scada-canvas 已有该机制，three-canvas 缺失——与 R2-1c-C6-01 同修）。
- **归族**: systemic → R2-3 批（R2-3c 候选族并入）
- **复核状态**: 未复核

### [R2-1c-B1-01] 错误态文案与重试按钮对比度不达标（light 3.78 / dark 2.18）

- **页面/路由**: `#/three-canvas-demo` 底部坏 url 演示画布的 error 内建 UI
- **主题/视口/状态**: light 与 dark / 1280 / error 态
- **截图**: `…/three-canvas-demo-error-canvas-light.png`
- **目视描述**: 「3D 场景加载失败。」与「重试」红字在浅色卡片上偏浅，dark 卡片上更难辨认。
- **程序化证据**: 探针 computed color 与层叠背景合成算 WCAG：`#ef4444`(rgb(239,67,67)) 14px/12px 非 vs 卡片底，light 3.78:1、dark 2.18:1（均 <4.5）。
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；检查提示词 B1。
- **严重程度**: P2
- **用户影响**: 加载失败场景（弱网/坏 url）提示可读性不足，dark 下接近不可读。
- **修复方向**: error 态文案/按钮前景改用两主题下验证 ≥4.5 的 destructive 深阶（或在 error slot 加 `bg-destructive/10` 反白底）；落点 `packages/flux-renderers-3d` three-canvas error slot 类名。
- **归族**: systemic → R2-3 批（与 R2-1c-B1-02 同为「红字浅底/深底」族）
- **复核状态**: 未复核

### [R2-1c-D1-01] Back 按钮下边距 18px 离栅（P3）

- **页面/路由**: `#/three-canvas-demo`（`#/scada-demo` 同款壳层同值）
- **主题/视口/状态**: 双主题 / 1280 / 默认
- **截图**: `…/three-canvas-demo-default-light.png`
- **目视描述**: Back 按钮与 eyebrow 间距与全页 4/8 栅格节奏不合拍。
- **程序化证据**: 探针 section 子块间隙序列 `[18,12,8,16,24,12,16]`，首项 18px（`mb-[18px]` 字面类）∉ {4,8,12,16,24,32…}。
- **对照基准**: styling-system.md Spacing Conventions（4/8pt 栅格）。
- **严重程度**: P3
- **用户影响**: 细节节奏不一致，需并排对比才可感知。
- **修复方向**: `mb-[18px]` → `mb-4`（16px）或 `mb-5`（20px→改栅格值 16/24 二选一）。
- **归族**: local → R2-4 批（两页同源壳层，修一处类名）
- **复核状态**: 未复核

## 4. 误报排除记录

- WebGL `drawImage/toDataURL` 像素读回 `nonBlank=0`：无 preserveDrawingBuffer 的正常读回限制，非渲染缺陷（briefing 预案；以 `toDataURL` 长度 15354 非空 + 截图目视为准）。WebGL 上下文本身创建成功（`glType=webgl`）。
- dark 下主题下拉仍显示 light：探针 `setAttribute('data-mode')` 不同步 playground select 组件，非页面缺陷。
- 3D 画布底色两主题恒深蓝：schema `environment.background` 有意配置（场景语义），非 dark 缺陷。
- dark 对比度批量 fail（Back to Home 1.1 等）：探针背景合成缺陷伪影（已修 bgOf alpha 合成后复跑消除）。
- 相机/光照导致的物体明暗差：不作色偏误报（波特定提示）。

## 5. 台账回写

- 本卡完成后 `ledger.md` 对应行 status → `carded`（card 列 = 本卡路径）；findings 归族后 → `digested`。
