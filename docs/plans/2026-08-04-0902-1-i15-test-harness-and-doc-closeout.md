# 1 I15 测试补强、文档与收尾

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/components/roadmap-industrial-hmi.md`（I15、Cross-Cutting 测试纪律/i18n 复用表/组件注册）、`docs/analysis/industrial-hmi/gate-4-review.md`（§10 注意项清单 I15 归属行）、`docs/analysis/industrial-hmi/renderer-boundary-audit.md`（D-1 契约裁定、例外与未决项）、`docs/analysis/industrial-hmi/gate-3-review.md`（§7 m-6 getSymbolProps 断言指南；§10 e2e 补强归属 I15.1）、`docs/components/industrial-hmi/design-renderer.md`（§5 字段分类表/§6 区域语义）
> Related: 上游 `docs/plans/2026-08-04-0523-2-i13-playground-demo-pages.md`、`docs/plans/2026-08-04-0523-3-i14-benchmark-and-performance.md`（均 completed）；下游 `docs/plans/2026-08-04-0902-2-i16-editor-initiation-entry.md`（依赖本 plan I15.1）
> Mission: industrial-hmi
> Work Item: I15

## Purpose

收口 roadmap I15（测试补强、文档与收尾）：I15.1 e2e 程序化断言补强（场景树/点表刷新/事件联动/视口 + getSymbolProps 属性面断言 + 非矩形图元 hover 覆盖物验证 + 边界用例空画面/超大画面/非法 JSON + i18n 文案）+ I15.2 文档收尾（docs/index.md 导航、架构文档增量、quick-reference 组件表、flux-guide scada 篇与类型生成注册、manifest 复核、每日日志）。收口状态：I15.1/I15.2 全部完成、roadmap I15 回写 `done`、I16 前置依赖（I15.1）满足。

## Current Baseline

- 实现全链已落地并收口（I0–I14 全部 `done`）：`scada-canvas` renderer（config/width/height/viewport/events fields + loading/empty regions）、24 内置符号、点表三源（static/expression/flux）、组件句柄（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy + dev/test 批量注入通道 `setPointValues`）、事件全链路（click/dblclick/hover，`createNormalizedActionEvent` + helpers.dispatch）、画布浏览交互（wheel/pinch 平移缩放 + hover 反馈）、测试句柄 `window.__flux_scada_<cid>` 恒开（renderer-boundary-audit.md「例外与未决项」：e2e I15.1 依赖）。
- Playground 挂载载体就绪：`#/scada-demo`（工艺流程演示：双轨点表刷新/click→dialog/dblclick→navigate/click→ajax 三链路）、`#/scada-pressure-demo`（10k 固定种子压力页 + 多画面切换）、`#/scada-perf-scale`（perf 独立页：10 万级 + 无 stroke 对照变体 + `window.__scadaPerfScale` 投影）。
- 既有 e2e（smoke/测量级）：`tests/e2e/scada-demo.spec.ts`（4 用例：挂载+句柄/点表刷新/setPointValue 按钮/click→dialog）、`scada-pressure-demo.spec.ts`（3 用例：挂载/切屏 10k+refit/切回）、`scada-perf.spec.ts`（5 项测量）。**正式断言矩阵补强（场景树属性面/边界用例/线多边形 hover 覆盖物/双轨刷新合并帧/视口句柄）未落地，属本 plan**。
- gate-4-review.md §10 注意项清单（14 行）I15 归属行：**I15.1**——「e2e 程序化断言补强（场景树/点表刷新/事件联动/视口；含 getSymbolProps leafer 属性面断言指南 m-6）」「i18n 文案（图元名/错误文案）」「非矩形图元 hover 覆盖物验证（m-C 关联：sky 层覆盖物 rect 尺寸断言，gate-4 §6:173-174）」；**I15.2**——「D-1 events 通道契约 drift 文档同步」「架构文档同步（renderer-runtime/模块边界）、quick-reference 组件表、flux-guide scada 篇、i18n、manifest 复核」。另 I5 plan Deferred：V5 20+ 自定义图元定义体积面补强（I9 设备库落地后）属 I15.1。
- D-1 契约裁定在案（renderer-boundary-audit.md:65-70）：renderer-definitions.ts:27 `events` 整体注册为 prop（flux-compiler classifyField 无点号路径支持，probe 实测）vs design-renderer.md §5:173 仍写 `events.*: { kind: 'event' }`——已裁定漂移，I15.2 同步（以 prop 注册形态 + renderer 派发为准回写）。
- 文档现状：`docs/references/quick-reference.md` 无 industrial 段（scheduling 段 §723 为先例）；`docs/architecture/renderer-runtime.md` 与 `flux-runtime-module-boundaries.md` 无 scada/industrial 条目；`flux-guide/design-patterns/`（38 篇内容 + README，共 39 文件）无 scada 篇；`flux-guide/scripts/shared.mjs` REGISTER_PACKAGES（10 包）与 `generate-types.mjs`（PACKAGE_CATEGORY/CATEGORY_COMMENTS/catOrder）均未注册 `flux-renderers-industrial`；`flux-guide/flux-types/schema.d.ts`/`index.ts` 由该脚本生成，需注册后重新生成。
- i18n 现状：`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts` 无 industrial/scada 文案（scheduling namespace zh-CN.ts:808 为接入先例）；scada renderer 未接入 i18n（`src/renderer/scada-errors.ts` `errorMessage` 纯文本；renderer-definitions.ts `displayName: 'Scada Canvas'` 为模块级静态字段）。
- manifest 现状：`docs/components/examples.manifest.json:63` 已含 `scada-canvas`（I4.2 注册），I15.2 复核条目与 renderer-definitions/design-renderer §5 一致性。
- roadmap I15 `todo`；mission 校验命令 = typecheck/build/lint/test（e2e 不在 mission 校验命令内，作为本 plan 交付物单独运行验证——I13/I14 先例）。

## Goals

- I15.1：e2e 程序化断言矩阵补强全部落地——场景树（图元类型集合/关键图元 getSymbolProps 属性面）、点表刷新（static+flux 双轨、值变化与合并帧）、事件联动（dblclick→navigate、hover 命中反馈）、视口（fit/center 经句柄、平移缩放后视口断言）、边界用例（空画面/非法 JSON 新载体；超大画面复用既有载体）、非矩形图元（线/多边形）hover 覆盖物验证；i18n 文案（图元名/错误文案）接入 flux-i18n。
- I15.2：全部文档收尾项落地——docs/index.md 导航核对、架构文档（renderer-runtime/模块边界）增量、quick-reference 组件表 industrial 段、flux-guide design-patterns scada 篇、shared.mjs/generate-types.mjs 注册 + schema.d.ts 重新生成、manifest 复核、每日日志收口摘要。
- roadmap I15 `planned → done` 回写（closure audit 通过后由独立 audit 核验）；I15.1 完成后 I16 前置依赖满足。

## Non-Goals

- 不实现组态编辑器（I16 域，plan 2）。
- 不以补测/文档名义重写引擎、图元或 renderer 的既有实现语义；运行中发现 live defect 时按 Bug Fix Rule 修复并带 focused 回归测试（I13 先例：真实浏览器缺陷修复）。
- 不做新的性能优化轮（I14 已收口，基准固化于 benchmark-report.md）。
- 不新增 renderer 能力或变更 `scada-canvas` 公共契约（fields/events 重大变更触发人工确认阈值，本 plan 不预期触发；D-1 只做文档同步，不改注册形态）。

## Scope

### In Scope

- `tests/e2e/` 下 scada 断言补强（新增 spec 或扩展既有 spec；含边界用例挂载载体裁定——对齐 scada-perf-scale 独立测试页先例，新增测试页经 route-model/App/pages index 注册）。
- `packages/flux-renderers-industrial/src/`：仅 live defect 修复 + 体积面单测补强（I5 deferred V5 20+ 图元覆盖断言）。
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`：新增 industrial namespace 文案（zh-CN + en-US）。
- 文档：`docs/architecture/renderer-runtime.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/quick-reference.md`、`docs/index.md`、`docs/components/industrial-hmi/design-renderer.md`（D-1 同步）、`flux-guide/design-patterns/scada.md` + `README.md`、`flux-guide/scripts/shared.mjs` + `generate-types.mjs`、`flux-guide/flux-types/`（重新生成）、`docs/components/examples.manifest.json`（复核）、`docs/logs/2026/08-04.md`。

### Out Of Scope

- 编辑器任何实现/调研/立项（I16）。
- 报警/趋势等新能力（讨论文件 §八 范围外）。
- flux-compiler classifyField 点号字段支持（D-1 回切替代路径——平台级变更，非本 plan 范围；同步以文档修正为准）。

## Failure Paths

| 可测场景编号          | 触发                                                                        | 行为                                                                                              | 可重试 | 用户可见表现                   |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ | ------------------------------ |
| e2e-flake             | 新增断言在 headless 下不稳定（时序/合帧）                                   | 先程序化收敛断言（poll/句柄等待模式，I13/I14 先例）；确认稳定后再疑引擎缺陷并按 Bug Fix Rule 修复 | 是     | 断言收敛后 e2e 全绿            |
| live-defect           | 断言矩阵暴露真实浏览器缺陷（mock↔真实漂移类，gate-3 M-1/M-2/M-3 先例）      | 修复 + focused 回归测试 + 记录入 plan/daily log                                                   | 是     | 缺陷修复后断言通过             |
| i18n-key-miss         | 文案 key 缺失或双语不一致                                                   | 补 locale 资源 + i18n 单测断言                                                                    | 是     | 双语均无缺词                   |
| manifest-drift        | scada-canvas manifest 条目与 renderer-definitions/design-renderer §5 不一致 | 复核修正 manifest 或记录裁定                                                                      | 是     | manifest 与注册一致            |
| doc-drift             | 文档与 live 行为不一致（D-1 类）                                            | 以 live 实现为准回写文档，不重开已裁定口径                                                        | 是     | 文档与实现一致                 |
| flux-guide-regen-fail | 重新生成 schema.d.ts 失败（build 前置缺失等）                               | 先 `pnpm build` 再跑 generate-types.mjs（脚本前置声明），按脚本报错修复                           | 是     | flux-guide 类型含 scada-canvas |

## Test Strategy

本档选择：`必须自动化`——I15.1 的核心交付物即 e2e 程序化断言 + 包级单测（roadmap 测试纪律：canvas 渲染一律 Playwright 程序化断言、禁用截图、不引 node-canvas），Proof 项先于 Fix 项（先补失败断言再修复）；i18n 资源以单测断言存在性与双语一致性。e2e 不在 mission 校验命令内，但作为本 plan 交付物单独运行验证（I13/I14 先例）。

## Execution Plan

### Phase 1 - I15.1 测试补强

Status: completed
Targets: `tests/e2e/scada-*.spec.ts`、`apps/playground/src/pages/`（边界用例测试页，若裁定新增）、`packages/flux-renderers-industrial/src/**`（仅缺陷修复/单测补强）、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`、`docs/components/roadmap-industrial-hmi.md`（状态回写）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `Follow-up`：roadmap I15 `todo → planned` 回写（激活期同步执行，I3 先例）
- [x] `Proof`：梳理 gate-4-review.md §10 I15 归属行 + 既有 smoke 断言面 + gate-3 m-6 getSymbolProps 断言指南 + design-renderer.md §5 字段表，产出 I15.1 断言矩阵清单（覆盖项/缺口/挂载载体/断言方式/归属 spec），记录于本 plan 或 daily log
- [x] `Decision`：边界用例挂载载体裁定——空画面/非法 JSON 新增独立测试页（对齐 scada-perf-scale 独立页先例：route-model DOMAIN_RENDERER_ROUTES + App switch + pages/index + `home-page.tsx` NAV_CARDS，dev/test 投影）vs 扩展既有页面；超大画面复用既有载体（10k pressure / 100k perf-scale）不新增重复载体；裁定记录
- [x] `Fix`：e2e 补强——场景树断言（图元类型集合/关键图元经 `getSymbolProps` 属性面断言，m-6 指南）、点表刷新（static+flux 双轨值变化、合并帧/渲染一致性）、事件联动（dblclick→navigate、hover 命中反馈）、视口（fit/center 经句柄断言、平移缩放后视口状态断言）
- [x] `Fix`：e2e 边界用例——**按路径分断言**：最小合法 config → 正常挂载（无 empty region）；非法/空 config → onError/empty region 可见（design-renderer §6 区域语义，断言矩阵清单先钉死两种 config 形态）；超大画面复用既有载体
- [x] `Fix`：非矩形图元 hover 覆盖物验证——线/多边形 hover 断言（sky 层覆盖物 rect 尺寸 > 0，m-C points 包围盒兜底语义，gate-4 §6:173-174）
- [x] `Fix`：i18n 文案接入——flux-i18n 新增 industrial namespace（对齐 scheduling namespace 先例）；**接入面核对先行**（displayName 为模块级静态字段不可用 `t()`、图元名文案无运行时消费面——以实际有运行时消费者的文案为准，如 empty region 默认文本/错误文案，裁定后只 i18n-ize 有消费面的文案）；i18n 单测（资源存在/双语一致）
- [x] `Fix`：V5 体积面补强——20+ 图元定义覆盖断言（I5 plan Deferred；包级单测，不弱化既有用例）
- [x] `Fix`：运行中发现 live defect 时修复 + focused 回归测试（Bug Fix Rule；gate-3 M-1/M-2/M-3 修复复核不回退为硬约束）

Exit Criteria:

- [x] 断言矩阵清单落盘（覆盖项/缺口/载体/归属 spec 可核对）
- [x] 新增/扩展 e2e spec 全绿：场景树属性面、双轨点表刷新、dblclick/hover 链路、视口句柄、边界用例（空画面/非法 JSON）、线/多边形 hover 覆盖物——`pnpm test:e2e` 的 scada-\* specs（demo/pressure/perf + 新增）单独运行全过，`assertTrackedPageErrors` 无 console error
- [x] i18n industrial namespace 落地（zh-CN + en-US）且 i18n 单测通过；包级单测全绿不回归（含 20+ 图元体积面断言）

### Phase 2 - I15.2 文档收尾

Status: completed
Targets: `docs/architecture/renderer-runtime.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/quick-reference.md`、`docs/index.md`、`docs/components/industrial-hmi/design-renderer.md`、`flux-guide/design-patterns/{scada.md,README.md}`、`flux-guide/scripts/{shared.mjs,generate-types.mjs}`、`flux-guide/flux-types/{schema.d.ts,index.ts}`、`docs/components/examples.manifest.json`、`docs/logs/2026/08-04.md`

- Item Types: `Fix | Proof`

- [x] `Fix`：D-1 events 通道 drift 同步——design-renderer.md §5 字段分类表回写为 prop 注册形态（对齐 renderer-boundary-audit.md:65-70 裁定与 renderer-definitions.ts:27 实现），例外与未决项表闭环标注
- [x] `Fix`：架构文档增量——`renderer-runtime.md` / `flux-runtime-module-boundaries.md` 增补 `flux-renderers-industrial` 包条目 + scada-canvas 契约要点（对齐 scheduling 先例 quick-reference §723 结构：注册面/字段分类/测试句柄/性能红线）
- [x] `Fix`：quick-reference.md 增补「Industrial Package — @nop-chaos/flux-renderers-industrial」段（组件注册/scada-canvas 类型/hooks/组件句柄/测试句柄）
- [x] `Fix`：flux-guide design-patterns 新增 `scada.md`（组态 JSON 完整示例 + 点表三源 + 事件联动 + 性能注意/测试句柄）+ README.md 表项
- [x] `Fix`：flux-guide 类型生成注册——`shared.mjs` REGISTER_PACKAGES 增 `{ pkg: 'flux-renderers-industrial', fn: 'registerScadaRenderers' }`；`generate-types.mjs` PACKAGE_CATEGORY/CATEGORY_COMMENTS/catOrder 增 industrial；`pnpm build` 后重新生成 `schema.d.ts`/`index.ts`
- [x] `Fix`：docs/index.md 导航核对补全（industrial-hmi 文档路由条目与既有行一致性）
- [x] `Fix`：manifest 复核——`docs/components/examples.manifest.json:63` scada-canvas 条目与 renderer-definitions/design-renderer §5 一致性，不一致则修正或记录裁定
- [x] `Fix`：daily log 收口摘要（本 plan 全链记录，reverse-chronological）
- [x] `Proof`：flux-guide 生成结果验证——schema.d.ts 含 scada-canvas 接口、index.ts FluxSchema/FluxSchemaByType 含 ScadaCanvasSchema；flux-guide 局部验证通过（按 flux-guide package.json 脚本）

Exit Criteria:

- [x] 全部文档 diff 落地可核对：D-1 回写、架构文档两文件增量、quick-reference industrial 段、scada.md + README 表项、index.md 核对、manifest 复核记录
- [x] schema.d.ts/index.ts 重新生成且含 scada-canvas 类型；flux-guide 局部验证（typecheck 或 validate 脚本）通过

## I15.1 断言矩阵清单与裁定记录（Phase 1 落盘，Proof/Decision/Fix 证据）

### 断言矩阵清单（覆盖项/缺口/载体/断言方式/归属 spec）

| 覆盖项                                               | 载体                                           | 断言方式                                                                                        | 归属 spec                  |
| ---------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------- |
| 场景树图元类型集合                                   | scada-demo                                     | 测试句柄 getSymbols → definition.type 集合含 12 类                                              | scada-demo.spec.ts         |
| getSymbolProps leafer 属性面（m-6）                  | scada-demo                                     | text-title `fontSize` number / pump-1 x/y number / 未命中 undefined                             | scada-demo.spec.ts         |
| 点表刷新 static 轨（值变化→视觉状态渲染一致性）      | scada-demo                                     | 按钮 component:setPointValue → motor body fill `#e53935`/`#00cc66`                              | scada-demo.spec.ts         |
| 点表刷新 flux 轨（渲染一致性）                       | scada-demo                                     | 定时器模拟 → level-1 liquid height 变化                                                         | scada-demo.spec.ts         |
| 点表刷新合并帧（1 万点 renderDelta=1）               | scada-perf-scale                               | 既有 I14 用例（本 plan 复用，不重复）                                                           | scada-perf.spec.ts（既有） |
| 事件联动 click→dialog                                | scada-demo                                     | 既有 I13 用例（复用）                                                                           | scada-demo.spec.ts（既有） |
| 事件联动 dblclick→navigate                           | scada-demo                                     | motor-1 双击 → hash 含 flux-basic                                                               | scada-demo.spec.ts         |
| hover 命中反馈（矩形语义图元）                       | scada-demo                                     | pump-1 hover → sky 覆盖物 rect 出现/移出清除                                                    | scada-demo.spec.ts         |
| 非矩形图元 hover 覆盖物（线/多边形，m-C）            | scada-edge-cases                               | line 240×8 / polygon 160×120 精确断言 + A→B 切换 + 空白区清除                                   | scada-edge-cases.spec.ts   |
| 视口句柄 fit/center                                  | scada-demo                                     | 句柄 setViewport 4x → fit 回落 <2；打散 5000 → center 收敛 <1000                                | scada-demo.spec.ts         |
| 边界：最小合法 config（无 empty region）             | scada-edge-cases                               | ready + 无 error region + 1 图元                                                                | scada-edge-cases.spec.ts   |
| 边界：空画面（symbols: []）                          | scada-edge-cases                               | ready + getSymbols() 长度 0                                                                     | scada-edge-cases.spec.ts   |
| 边界：非法 JSON（parse 失败 → onError/empty region） | scada-edge-cases                               | data-status=error + empty region 可见 + onError→notify 观测面                                   | scada-edge-cases.spec.ts   |
| 边界：超大画面                                       | 既有载体复用（10k pressure / 100k perf-scale） | 既有 spec 复用，不新增重复载体                                                                  | pressure/perf spec（既有） |
| V5 体积面 20+ 图元定义                               | 包级单测                                       | 24 内置符号（8 基础形状 + image/video 占位 + group + 4 族 12 + pipe-junction）engine 全路径加载 | symbols.test.ts            |
| i18n 双语一致无缺词                                  | flux-i18n 单测                                 | industrial.scada.canvasError 双语解析 + key 集合一致性                                          | i18n.test.ts               |

缺口核对（既有覆盖不重复）：click→dialog（I13.1）、1 万点合并帧（I14.1）、超大画面（I13.2/I14.1）、`assertTrackedPageErrors` 无 console error（全 spec）。

### Decision 裁定：边界用例挂载载体（`edge-case-carrier`）

- **空画面/非法 JSON 新增独立测试页** `#/scada-edge-cases`（`apps/playground/src/pages/scada-edge-demo.tsx`，对齐 scada-perf-scale 独立页先例：route-model DOMAIN_RENDERER_ROUTES + App switch + pages/index export + home-page NAV_CARDS/NavigationTarget）；页面级 tab：minimal/empty-scene/invalid-json/line-polygon，`key={screen}` 重挂载 + `window.__scadaEdge` 观测面（onError → showToast → env.notify 落页面文本 `data-testid="scada-edge-notify"`）。
- **超大画面复用既有载体**（10k pressure / 100k perf-scale），不新增重复载体。
- **线/多边形 hover 覆盖物验证同页承载**（m-C 兜底语义，gate-4 §6:173-174）。

### i18n 接入面裁定

displayName 为模块级静态字段（renderer-definitions.ts `displayName: 'Scada Canvas'`）不可用 `t()`；图元名文案（symbol definition `name`）无运行时消费面（引擎只渲染 config 内文本）；**仅 i18n-ize 有运行时消费面的文案**：empty region 缺省错误文本（scada-canvas.tsx 缺省 fallback `'Scada canvas error'`）→ `industrial.scada.canvasError`（zh-CN「画布场景错误」/ en-US「Scada canvas error」），经 `useFluxTranslation` 解析；flux-i18n 资源（zh-CN/en-US）落地 + 双语 key 一致性单测。

### Live defect 修复记录（Bug Fix Rule，2 项，见 docs/bugs/76）

- **hover-miss 永不发射（mock↔真实漂移）**：真实 leafer 空白画布命中路径为空/defaultPath，`pointer.move` 不派发到 tree 层（`emitAppChildren` 仅放行 move/zoom/rotate/key 前缀）→ 覆盖物移出图元不消失。修复：`EventBridge` 的 `pointer.move`/`pointer.leave` 改挂 App 视图面（`moveTarget`，实测 app 面对画布内任意位置恒发射）。
- **多边形覆盖物几何 100×100 默认框（mock↔真实漂移）**：真实 leafer Path 形状节点 width/height 为默认占位值（Polygon 100×100、Line 100×0），points 才是真实几何 → `resolveOverlayGeometry` 改 points 优先。
- 均带 focused 回归测试（event-bridge pointer.leave 2 用例 + 既有 hover 用例发射面迁移 + e2e 断言矩阵先红后绿）；包级 462 tests / 34 files + scada-\* e2e 23/23 全绿。

## Draft Review Record

- Reviewer / Agent: independent sub-agent (general, fresh session), task `ses_035b18048ffemkuhHy5tvYT5Mk`（R1）；`ses_035abeb03ffedzZNVMG5RXpUMw`（R2 确认轮）
- Verdict: `pass-with-minors`（R1）→ 修正全部落地 → `pass-with-minors`（R2 确认，零 Blocker/零 Major）
- Rounds: 2
- Findings addressed: R1 Minor M-1（design-patterns 篇数 34→38+README）/M-2（m-6 归属 gate-3 §7 非 §10）/M-3（i18n 接入面核对先行钉死——displayName 静态字段不可用 t()、仅 i18n-ize 有消费面文案）/M-4（空画面按 config 形态分路径断言）+ Nit N-1（scada-errors.ts 路径补 renderer/）/N-2（NAV_CARDS 归 home-page.tsx）；R2 新 Minor（gate-4 §9:173-174 → §6:173-174 节号修正）已落地

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处；Phase 内只做保证后续 Phase 能继续的局部验证。

- [x] 所有 in-scope 断言矩阵与文档收尾项已落地（Phase 1/Phase 2 Exit Criteria 全勾）
- [x] 运行中发现的 live defect 已修复并带 focused 回归测试（若有）；gate-3 M-1/M-2/M-3 修复未回退（spot check）
- [x] i18n 资源双语一致无缺词（单测断言）
- [x] D-1 events 通道契约 drift 已同步、manifest 与注册一致
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（design-renderer/架构文档/quick-reference/flux-guide/index.md/manifest）；roadmap I15 `planned → done` 回写由独立 closure-audit 核验后执行
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] e2e：scada-\* specs（含新增断言）单独运行全绿（交付物验证，I13/I14 先例；不声明 mission 校验命令外状态）

## Deferred But Adjudicated

### 组态编辑器后继 mission 立项（I16）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编辑器明确后置（讨论文件 Q8 + roadmap I16 预留）；本 plan 只收口测试与文档，I16 由 plan 2 承接（依赖本 plan I15.1）。
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-04-0902-2-i16-editor-initiation-entry.md`

### flux-compiler 点号字段支持（D-1 回切替代路径）

- Classification: `watch-only residual`
- Why Not Blocking Closure: `events.*` event 规则的实现依赖 flux-compiler classifyField 点号路径支持，属平台级变更；D-1 裁定以 prop 通道 + renderer 派发达成行为语义，本 plan 只同步文档口径，不触发平台改造。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 演示页/测试页继续作为后续断言载体（测试句柄恒开）。
- benchmark-report.md 测量口径继续作后续性能回归基准。

## Closure

Status Note: I15.1/I15.2 全部落地——断言矩阵（场景树属性面/双轨刷新/dblclick/hover 覆盖物/视口句柄/边界用例/i18n/V5 体积面）与文档收尾（D-1 同步/架构文档/quick-reference/flux-guide scada 篇 + 类型生成/index.md/manifest/daily log）完成；2 个真实浏览器缺陷（hover-miss 空白区不发射、多边形覆盖物默认框）按 Bug Fix Rule 修复并带回归测试；workspace 全量验证全绿 + scada-\* e2e 23/23 全绿；独立 closure-audit approved。roadmap I15 `planned → done` 回写见 roadmap Phase Status。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (general, fresh session), task `ses_03574fdfdffegr81d1j5hX7veJ`
- Evidence: verdict `approved`；A 组 Phase 1 四核验逐项 live 复现（e2e 15/15 复跑、i18n 28/28、包级 462/34、断言矩阵/载体/裁定落盘核对）；B 组 Phase 2 四核验（D-1 零残留 `events.*`、架构/quick-reference/scada.md/index.md/manifest 逐文件核对、generate-types 115 定义 + 再生幂等 + validate 基线一致零新增、manifest 一致）；C 组收口质量（deferred 诚实、bug note 完整、gate-3 M-1/M-2/M-3 未回退 spot check、tick 一致性 + Plan Status active 待审计后置 completed 流程正确）
- Follow-up（non-blocking）：演示页/测试页继续作后续断言载体（测试句柄恒开）；benchmark-report.md 测量口径继续作性能回归基准（Non-Blocking Follow-ups 节原样）

## Risks And Rollback

- **断言补强滑向重写风险**：断言矩阵清单先裁定（Proof 先行），只补断言不重写实现；发现缺陷按 Bug Fix Rule 修复并带回归测试。
- **e2e 稳定性风险**：headless 时序类断言失败先收敛断言再疑实现（I13/I14 先例：poll/句柄等待模式；scada-perf 180s 超时档位）。
- **文档面广漂移风险**：Phase 2 以 live 实现为准回写；D-1 已裁定口径不重开；架构文档只写最终设计状态（guide Minimum Rule 14）。
