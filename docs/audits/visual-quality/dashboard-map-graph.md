# 视觉质量证据卡：Dashboard/Map/Graph（V11b）

> 状态: closed（V11b plan 482 落地，2026-09-21；closure audit 待独立执行）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.5（已经三轮独立核实）、研究报告 `docs/analysis/visual-quality/V11b-dashboard-map-graph.md`（独立核实 revised → 勘误回写后 pass）
> Owner plan: `docs/plans/482-visual-quality-v11b-dashboard-map-graph-plan.md`（四 Phase 执行完毕）
> Owner docs: `docs/components/{dashboard-filter,dashboard-editor,map,graph}/design.md`

## Findings 清单

- [V11b-F1] dashboard `canvasWidth=1200` 解硬编码 + 画布无方向键移动
  - 证据: 普查 §7.5、`docs/backlog/audit-followups-2026-08-11-1929.md` P2-16、研究报告 A1/A2
  - 裁决: **落地**——共享测量 hook `use-canvas-width.ts`（自编辑态 `useCanvasWidth` 提升，编辑/运行同一测量模式：初始 1200、`width > 0` 才覆盖、ResizeObserver 缺失跳过监听）；`dashboard-renderer.tsx` 移除字面常量改实测容器宽；`panelToPixels` 契约与 `DashboardLayoutSchema` 零变更；编辑态 `handleKeyDown` 增 Arrow 四键分支（选中单面板经 `dragPanel` 移动 1 格，`core.update` 单 undo 步，输入焦点早退，`defaultPrevented` 防双层 onKeyDown 双处理）；`dashboard-editor/design.md` §2.2 同构声明 + §3 键盘契约同步
  - 状态: done（单测先红后绿 9 用例；既有几何断言 :225-226 零弱化通过）
- [V11b-F2] map 无 heatmap/轨迹/围栏 schema 通道——裁决
  - 证据: 普查 §7.5、map design.md §2/§8 首版 defer、研究报告 A3
  - 裁决: **adjudicated（out-of-scope improvement，升格显式裁决）**——引入面 = OlApi 扩展（Heatmap）+ layer manager 新层类型 + schema 通道，属能力立项而非视觉修复；无真实消费页，BI 首版定位外，不预留半成品接口；裁决注记落 `map/design.md` §8（围栏一并记录；再触发条件 = 真实消费页或 mission 立项）
  - 状态: adjudicated（plan Deferred But Adjudicated A3）
- [V11b-F3] graph 无数据驱动着色 schema 字段（G-K）——裁决
  - 证据: 普查 §7.5、`D2-closure.md`、研究报告 A4（勘误收窄：节点通道已在——`levelField`/`levelMap` → `resolveSemanticLevel` → `data-level` 双发布 + CSS 消费）
  - 裁决: 边着色通道 **adjudicated**（`GraphEdge` 无字段、无消费页、edge region 首版已显式否决，节点通道已够用不重复建设；注记落 `graph/design.md` §4.2/§10）；「落地新节点通道」**否决**（重复建设）
  - 状态: adjudicated（plan Deferred But Adjudicated A4）
- [V11b-F4] 三域 e2e 视觉断言缺失
  - 证据: V0 研究报告 §2、研究报告 A5（graph-demo 8 test 零计算样式、dashboard/map 仅标题冒烟）
  - 裁决: **落地**——新增 `tests/e2e/dashboard-demo.spec.ts`（双视口几何自实测宽复算 + 网格比例不变 + Arrow 移动/undo + light/dark 面板 chrome，4 test）、`tests/e2e/map-dark-redraw.spec.ts`（data-mode 翻转属性态 + 画布存活，1 test）、`graph-demo.spec.ts` 扩展（data-level 三态边框 token 通道探针断言 + light/dark/glass 双态，+1 test）
  - 状态: done（92/92 绿，graph-demo 8 既有 + playground-entry-pages 冒烟零回归）

## R1-R9 残余池裁决（研究报告）

| #   | 主题                                     | 裁决与状态                                                                                                                                                                                                        |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | map dark 触发器失配（class → data-mode） | done——`attributeFilter: ['class']` → `['data-theme','data-mode']`，失实注释订正；单测 data-mode/data-theme 翻转先红后绿 + class 触发器退役负向护栏；map/design.md §2/§5 触发器表述勘误；实例生命周期零变更（DD2） |
| R2  | graph warning/success 字面 HSL           | done——`styles.css:47/:51` → `hsl(var(--warning)/0.55)`、`hsl(var(--success)/0.55)`（对齐 danger token 先例，不加包内 fallback）；门禁豁免条目同 PR 摘除                                                           |
| R3  | graph 死类 `nop-graph-level-*`           | done——发射摘除（graph-node.tsx），`data-level` 为唯一语义级 marker 通道；graph-node 单测先红后绿；design.md §10 契约表登记处置                                                                                    |
| R4  | dashboard 裸 `<button>` ×2               | adjudicated（out-of-scope improvement）——followups P2-19 在册，归 V12b 池，不跨池摘樱桃                                                                                                                           |
| R5  | map loading 注释反转                     | done——`schemas.ts` 注释订正（`true` 时渲染 loading 态）；design.md §2 契约行同步                                                                                                                                  |
| R6  | dashboard 8 个零消费导出                 | adjudicated（out-of-scope improvement）——followups P2-17 在册，归 V12 池                                                                                                                                          |
| R7  | map 缺省色阶/无值色字面 hex              | adjudicated（watch-only）——canvas 内色值，`visualMap.colors`/`defaultColor` 已可覆盖；map 域豁免在册，归 V12b。执行新发现（见下「执行新发现」）                                                                   |
| R8  | 运行态 dashboard 无键盘交互              | adjudicated（out-of-scope improvement）——只读展示无编辑语义；若未来运行态引入交互语义再议                                                                                                                         |
| R9  | graph `info` 语义级无视觉表达            | adjudicated（watch-only）——设计内（design.md §4.2「info 默认」），非缺陷                                                                                                                                          |

## 执行新发现（2026-09-21，随收口登记）

- [V11b-X1] `resolveMapTheme` 探针机制对裸 HSL 三元组 token 恒退化：`resolveThemeColor` 以
  `border: 1px solid var(--token)` 取色，而本仓主题 token 为裸三元组（消费约定 `hsl(var(--token))`），
  探针计算值恒为 `rgb(0, 0, 0)`——OL 调色板与模式无关地恒黑（e2e 实测：pin 画布像素均值
  light/dark 均为 `0,0,0`，fillStyle 日志见 `rgb(0, 0, 0)`）。属 R7 族 watch-only（主题探针机制
  修复 = map 域能力面，V11b 不扩 scope）；因此 e2e 以属性态为判据主体，像素颜色判据不可用
  （plan Non-Blocking Follow-ups 预案的实测结论，记 daily log 2026-09-21）。
- [V11b-X2] 门禁 `hardcoded-literal-color` 检测模式过宽：`\b(?:hsl|hsla|rgb|rgba)\s*\(` 把
  `hsl(var(--token))` token 引用计入字面色（V0 快照 graph styles.css 8 实例中 6 例为 token 引用）。
  已随 R2 豁免摘除收窄为 `\(\s*(?!var\()`；附带消除 form-advanced styles.css:11 既有红。
  豁免基数 413 → 295 实例 / 121 → 108 文件 / 32 → 31 条目（diff 归因记 daily log 2026-09-21）。

## 视觉证据

- dashboard 双视口几何 + Arrow 键 + light/dark chrome：`tests/e2e/dashboard-demo.spec.ts`（4 test，程序化判据零截图）。
- graph data-level 三态边框 token 通道（探针等值 + light/dark/glass 值变化）：`graph-demo.spec.ts` 扩展 test（既有 8 test 零回归）。
- map data-mode 翻转属性态 + 画布存活：`tests/e2e/map-dark-redraw.spec.ts`。
- 单测锁定：dashboard 测量/回退 5 用例 + 键盘 5 用例（含 clamp/单 undo 步/输入早退）；map 触发器 3 用例；graph 死类摘除 1 用例。

## Closure

V11b closure audit **approved**（2026-09-21，独立 fresh session）：Phase 1–4 exit criteria 逐条 live 核对确认；三 focused 套件复跑 67/67、54/54、49/49；X1/X2 执行偏差以三处登记核对为诚实；4 Minor 由收口会话处理（日志段落归属、P2-16 主勾选、行锚订正、链复绿记录）；roadmap V11b 行 → `done`，owner plan 482 → `completed`。
