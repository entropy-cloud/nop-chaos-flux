# [card] page:scada-edge-cases

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/scada-edge-cases` ｜ **载体**: lab 页（I15.1 边界用例：5 分屏切换 + declared-size e2e 载体）
- **矩阵裁剪**: simplified（matrixReason：lab 测试页，交互面即 5 个分屏按钮；hover 覆盖物为 [visual-only] 待复核；glass 按波次口径省略。实际裁掉：弹层、拖拽、disabled 态）
- **探针耗时**: 每分屏 ready 0.77–1.9s，全页探针 ≪120s

## 1. 截图清单

| 状态                       | light                                                                                                                                        | dark                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| minimal（最小合法 config） | `…/r2-1c/scada-edge-cases/scada-edge-cases-minimal-light.png`                                                                                | `…/scada-edge-cases-minimal-dark.png`      |
| empty-scene（symbols: []） | `…/scada-edge-cases-empty-scene-light.png`                                                                                                   | —                                          |
| invalid-json（错误态）     | `…/scada-edge-cases-invalid-json-light.png`                                                                                                  | `…/scada-edge-cases-invalid-json-dark.png` |
| line-polygon + hover       | `…/scada-edge-cases-line-polygon-light.png`、`…/scada-edge-cases-line-polygon-hover-light.png`、`…/scada-edge-cases-polygon-hover-light.png` | —                                          |
| default-geometry-fit       | `…/scada-edge-cases-default-geometry-fit-light.png`                                                                                          | —                                          |
| ~800 宽（minimal）         | `…/scada-edge-cases-minimal-800-light.png`                                                                                                   | —                                          |

## 2. A–H 维度勾选表

- A 交互：A1 ✓ A2 ✓ A3 ✓（5 个切换按钮均 ≥24px）A4 n/a A5 **fail(R2-1c-A5-01)**（错误态信息不可读不可达）A6 n/a A7 n/a A8 n/a A9 ✓（onError → notify 通道工作，顶栏可见 `notify: edge-onerror-fired`）
- B 颜色：B1 **fail(R2-1c-A5-01 内坐实 1.48:1)** B2 ✓ B3 n/a B4 ✓ B5 ✓（invalid-json dark 复检同缺陷）B6 n/a
- C 布局：C1 ✓（分屏内容无溢出；800 宽下 sw 976 溢出源为 declared-size 960px 固定 e2e 载体，有意为之→误报排除）C2 ✓（除 playground 徽标族 R2-1c-C2-01）C3 ✓ C4 ✓（主画布 1214→734 跟随收缩，c6 全过）C5 ✓ C6 ✓（6 canvas 全过 attr=CSS×DPR）
- D 间隔：D1 ✓（blockGaps [12,12,12]）D2 ✓ D3 n/a D4 ✓ D5 n/a D6 n/a D7 ✓ D8 ✓
- E 排布：E1 ✓（分屏切换语义清晰）E2 ✓（选中屏 default variant）E3 ✓ E4 ✓ E5 ✓ E6 **warn**（错误态引导缺失→R2-1c-A5-01）
- F 一致性：F1 ✓ F2 ✓ F3 ✓（五分屏空/错态模式一致）F4 ✓ F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-A5-01] 非法 config 错误态：文案 1.48:1 近不可读，且画布区暴涨 3576px 把错误信息顶到折叠线下

- **页面/路由**: `#/scada-edge-cases` → 「非法 JSON」分屏（scada-canvas error 路径；error/empty schema 消费面）
- **主题/视口/状态**: light+dark / 1280 / invalid-json 激活
- **截图**: `…/scada-edge-cases/scada-edge-cases-invalid-json-light.png`（视口内全为空黑区域，无任何可见错误信息）、`…/scada-edge-cases-invalid-json-dark.png`
- **目视描述**: 切到非法 JSON 后，主区域变成一整屏空黑画布，看不到「scada 场景构建失败（config 非法）」文案；唯一可见反馈是右上角小字 notify。
- **程序化证据**: 探针 ①错误文案对比度：16px 文案 computed 色对 `#0b1220` 容器底 = **1.48:1**（需 ≥4.5）；②布局：error 态下 `.nop-scada-canvas canvas` CSS 高度 **3576px**（正常分屏 240/216px），文案位于该区域中部、首屏折叠线下（`data-status="error"` 正确置位、errVisible 探针 false 证实可视区域无错误 UI）。
- **对照基准**: 检查提示词 A5（error 有意义提示非空白）+ B1（对比度）+ C1（区域暴涨属异常布局）；WCAG 1.4.3。
- **严重程度**: P2（onError toast/notify 通道尚有反馈，故不列 P1；画布内错误反馈事实上不可用）
- **用户影响**: config 写错的组态用户得到「一大块空白」而非错误说明；dark 同样失效。
- **修复方向**: `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx` error 分支：①error/empty region 改为覆盖层（absolute inset-0 居中）而非参与文档流的 flex 子块，并在 build 失败时销毁/复位 leafer 画布高度（3576px 增长疑似 error 后 canvas 未回收+容器反复测量）；②文案色从 muted-foreground 换 `text-destructive`（两主题 ≥4.5 验证，联动 R2-1c-B1-01/B1-02 族）。修复判据：error 态 canvas 高度回落容器高、文案对比度 ≥4.5。
- **归族**: local → R2-4 批（scada error 路径；B1 侧入「前景/底配对」系统族 R2-3）
- **复核状态**: 未复核

## 4. 分屏正确性记录（pass 项证据）

- minimal / empty-scene / line-polygon / default-geometry-fit：`data-status=ready` ✓，C6 全过，无溢出无对比度 fail；empty-scene 合法空画面 → 空白画布（ready，非 error）语义正确。
- 线/多边形渲染正确（灰线 + 绿五边形）；hover 覆盖物：截图未见明显高亮变化 → **[visual-only] 存疑**，m-C 语义有 e2e 覆盖（`tests/e2e/scada-edge-cases.spec.ts`），留待复核 agent 重验 hover 前后 diff。
- declared-size 载体（960×520）：canvas 与声明尺寸一致（958×518 + 边框），plan 474 断言载体工作正常。

## 5. 误报排除记录

- 800 宽下 html scrollWidth 976 vs 800：溢出源是 `data-testid="scada-edge-declared-size"` 固定 960px 宽的 e2e 载体（plan 474 有意声明尺寸），属白名单，不报 C1。
- default-geometry-fit 与 declared-size 区中「巨大蓝矩形」：fit-contain 对 80×60 场景 bounds 的 8.67× 缩放为既定语义（plan 2026-08-04-2243-2 已裁定 fit 行为与 MAX_SCALE 钳制），非缺陷。
- 空画面空白画布：合法空 config 的正确结果（非 A5 空态缺失——该页本体即边界载体）。
- playground 徽标压 Back 按钮：归族到 R2-1c-C2-01（pressure 卡），此处不重复立条。

## 6. 台账回写

- 本卡完成后 `ledger.md` 对应行 status → `carded`；findings 归族后 → `digested`。
