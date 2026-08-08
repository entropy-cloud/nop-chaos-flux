# Industrial HMI Component Audit Roadmap

> 最后更新：2026-08-08（HCA-BL closure audit PASS → `planned` 改 `done`，归档 9 张 bug 卡；HCA-CR plan draft review 通过 → `todo` 改 `planned`；HCA1–HCA11 全 done 后首批收敛 plan 起草）
> 来源：用户要求"仿照 component-audit 对 industrial-hmi / industrial-hmi-editor 两个 mission 中新增的各个组件/模块进行审计并修复，同时插入 bug 和 lesson 总结工作"
> 细则：`docs/audits/component-audit-checklist.md`（18 维清单 + 审计卡模板 + 裁决规则）；内部模块追加 `docs/skills/deep-audit-prompts.md` 23 维包级深审（复杂交互层必选 21-23）
> Mission：`missions/industrial-hmi-component-audit.json`

## 文档共识审查记录（本文件）

> 依据 Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-08，独立子 agent fresh session `ses_0216a7867ffegjGC8HMS0uKbuz`）**：判定 `REVISE`——1 Blocker + 2 Major + 4 Minor + 1 Nit。B-1：文件计数错误（声称 84 纯源码 / 102 含 barrel，实际 101 纯源码；HCA0 以错误计数标 `done`）；M-1：work item 使用非法状态值 `fixed-pending-closure`（roadmap status 仅允许 `todo`/`planned`/`done`）；M-2：与 component-audit-roadmap C10/CX-9 的重叠未显式声明（dual-source-of-truth 漂移风险）；m-1：Renderer 层文件数 off-by-one（10→9）+ base-shapes "12 base" 应为 11；m-2：依赖图 HCA-CR 与表不一致；m-3：总行数 ~13k 低估（实际 ~14.2k）；m-4：HCA8 align-distribute/z-order 应纳入 dim 21；n-1：out-of-scope 文件未声明。**全部 8 项已落地**：计数修正为 101 文件/14.2k 行；HCA1/HCA7 状态改 `planned`；新增「与 component-audit-roadmap 的关系」节显式声明 HCA1/HCA7⇄C10 + HCAX-1⇄CX-9；Renderer 9 文件 / base-shapes 11；依赖图注释 CR 传递依赖；HCA8 纳入 dim 21 复杂交互层；out-of-scope 15 文件声明。component-audit-roadmap C10 同步改 `planned`。
- **Round 2（2026-08-08，独立子 agent fresh session `ses_021640b4dffep53R5RkLgZ2D1e`）**：判定 `REVISE`——0 Blocker / 0 Major / 3 Minor（Round 1 全部 8 项确认落地）。m-1 residual：HCA6 work item 行 + phase detail 仍写 `base-shapes 12`（应为 11）；m-2 residual：HCA6 行仍写 `24 内置图元`（应为 23，与 overview 已修正的 23 矛盾）；m-3 residual：HCA-CV phase detail 仍写 `97+ files`（应为 101 source files）。**全部 3 项已落地**：HCA6 两处 `12`→`11`、`24`→`23`；HCA-CV `97+ files`→`101 source files / 97+ test files`（消歧义）。
- **Round 3（2026-08-08，独立子 agent fresh session `ses_021606897ffedkeWL8M0Pyq1oW`）**：判定 `AGREE`——**0 correction items**。Round 2 全部 3 项确认落地；残留模式扫描（`12 base`/`24 内置`/`97+ files`/`84`/`102`/`~13k`/status 列 `fixed-pending-closure`）全清；文件计数和 101 校验通过；symbol shapes 23 图元 + 4 common = 27 文件内部一致；依赖图一致；共识审查记录准确。**共识达成**（连续一轮 0 新增修正项，未超 3 轮上限）。本文件作为 industrial HMI component audit mission 的权威编排依据。

## 目的

本文件是 `@nop-chaos/flux-renderers-industrial` 包的**逐模块深度审计 + 自动修复**路线图，按 `docs/backlog/00-roadmap-authoring-guide.md` 规范编排。与 `docs/backlog/component-audit-roadmap.md`（面向 9 个 renderer 包的 115 个注册组件）的关系：**本路线图把审计对象从"注册 renderer type"扩展到 industrial 包的全部内部子系统**（engine / binding / serialization / symbols / editor 子系统），因为 industrial 包的核心复杂度不在 DOM renderer 壳，而在 canvas 场景图引擎、数据绑定管线、符号库和编辑器适配层。

每个 work item = 一个 execution plan 的交付范围（审计一个模块族 + 逐文件审查 + **P0/P1 自动修复** + 回归测试 + bug/lesson 汇总）。

### 与 component-audit-roadmap 的关系

`docs/backlog/component-audit-roadmap.md` 已将 industrial 2 个注册组件编为 **C10**（industrial 族审计），error code 共性重构编为 **CX-9**。本 roadmap 的 HCA1/HCA7 与 C10 是**同一项工作的两个视角**（C10 = component-audit mission 视角的 industrial 族审计项；HCA1/HCA7 = 本 mission 视角的 renderer 层审计项），HCAX-1 与 CX-9 同理。**closure 由本 roadmap 驱动**（审计卡在此 mission 下维护），状态变更同步回写 C10/CX-9。

### 审计对象总览

| 层                | 路径                                                                 | 文件数  | 行数        | 说明                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------- | ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderer          | `src/renderer/` + `src/renderer-definitions.ts` + `src/schemas.ts`   | 9       | ~1,700      | scada-canvas runtime renderer + 5 hooks + scada-errors + 定义/schema                                                                                              |
| Engine            | `src/engine/`                                                        | 9       | ~1,350      | canvas 场景图引擎（leafer 适配/视口/命中/覆盖物/事件桥）                                                                                                          |
| Binding           | `src/binding/`                                                       | 7       | ~1,700      | 点表/反向索引/脏收集刷新管线/值→状态/动画/绑定解析/flux 求值                                                                                                      |
| Serialization     | `src/serialization/`                                                 | 6       | ~880        | JSON parse/serialize/validate/diff/equality                                                                                                                       |
| Symbols core      | `src/symbols/` (top-level)                                           | 8       | ~750        | 注册表/工厂/类型/样式/视觉状态/复合/组合/内置注册                                                                                                                 |
| Symbol shapes     | `src/symbols/base-shapes/ device/ instrument/ sensor-control/ pipe/` | 27      | ~1,500      | 23 内置图元定义（10 base + 4 device + 4 instrument + 4 sensor-control + 1 pipe-junction，另含 4 `common.ts` 共享 helper）                                         |
| Editor renderer   | `src/editor/` (top-level) + `src/editor/renderer/`                   | 7       | ~1,630      | scada-editor-canvas renderer + editor engine + 2 hooks + 定义/schema                                                                                              |
| Editor panels     | `src/editor/palette/ inspector/ toolbox/`                            | 9       | ~1,150      | 图元库/属性面板/工具箱 React UI + 纯逻辑适配器                                                                                                                    |
| Editor connection | `src/editor/connection/`                                             | 6       | ~830        | 端点吸附连线（状态机/拖拽/锚点/联动/覆盖物）                                                                                                                      |
| Editor undo-redo  | `src/editor/undo-redo/`                                              | 4       | ~750        | diff 命令栈（事务/逆计算/合并）                                                                                                                                   |
| Editor infra      | `src/editor/` (misc)                                                 | 9       | ~1,600      | session/adapter/working-helpers/runtime-factories/mutators/toolbox-runtime/wiring/test-handle                                                                     |
| **合计**          |                                                                      | **101** | **~14,200** | 纯源码 101 文件；out-of-scope：`src/test-support/`（6 文件）、`*-fixtures.ts`（2 文件）、`index.ts` barrel（7 文件）共 15 文件为测试基础设施/聚合导出，不纳入审计 |

## Work Item Status

> **全文件唯一的动态状态区。** 状态流转：draft review 通过 → `todo` 改 `planned`；closure audit 通过 → `planned` 改 `done`（不得提前）。一个 work item = 一个 execution plan 的交付范围。

| Work Item                                                                                                                                                               | 状态      | 覆盖    | 依赖       | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HCA0. 编排基线（模块清单核对、工具基线重跑、审计卡模板复用、保护区域地图）                                                                                              | `done`    | —       | —          | 101 源文件清单已核对（2026-08-08，`find` 排除 test/fixtures/index/test-support）；18 维 checklist + 23 维 deep-audit 复用 component-audit 基线                                                                                                                                                                                                                                                                                                                                                                                |
| HCA1. Renderer 层审计（scada-canvas renderer + 5 hooks + 定义/schema）                                                                                                  | `done`    | 9 文件  | HCA0       | 审计卡 `docs/audits/per-component/scada-canvas.md`（closed）；P2-1 a11y + P3-1 useCallback 已修复；closure plan `docs/plans/2026-08-08-1316-1-industrial-hmi-hca1-hca7-renderer-closure-audit.md`（completed）closure audit PASS（fresh session）→ done                                                                                                                                                                                                                                                                       |
| HCA2. Engine 层审计（scada-engine/config-adapter/event-bridge/hit/interaction-overlay/tree-registry/viewport）                                                          | `done`    | 9 文件  | HCA0       | canvas 场景图核心：视口数学/命中测试/事件桥/覆盖物生命周期/diff 构建；审计记录 `docs/audits/2026-08-08-0748-hca2-engine-layer.md`（零 P0/P1；P2-ENG-1 importConfig↔reset 全量重建一致性已修，P3×3 归 HCA-CR）                                                                                                                                                                                                                                                                                                                 |
| HCA3. Binding 层审计（point-store/reverse-index/dirty-collector/value-to-state/animator/bind-resolver/flux-eval）                                                       | `done`    | 7 文件  | HCA0       | 数据绑定管线核心：点表/脏收集合帧/动画时钟/flux 求值；审计记录 `docs/audits/2026-08-08-0748-hca3-binding-layer.md`（零 P0/P1；dirty-collector 665 行已拆分为 3 文件均 ≤ 500 行）                                                                                                                                                                                                                                                                                                                                              |
| HCA4. Serialization 层审计（config-types/validate/diff/equality/parse/serialize）                                                                                       | `done`    | 6 文件  | HCA0       | JSON 契约管线：校验/序列化/diff/判等；审计记录 `docs/audits/2026-08-08-1051-hca4-serialization-layer.md`（零 P0/P1；validate.ts 524 行拆分 Decision = 移交 HCA-CG w/ 拆分缝；P3×2 校验覆盖缺口归 HCA-CR）                                                                                                                                                                                                                                                                                                                     |
| HCA5. Symbols core 审计（symbol-types/registry/factory/style-resolver/visual-state/composite/compound/register-builtin）                                                | `done`    | 8 文件  | HCA0       | 符号框架：注册/工厂/样式/视觉状态/复合装配/组合；审计记录 `docs/audits/2026-08-08-0748-hca5-symbols-core.md`（P1-1 `fontFamily`/`fontWeight`/`align` 跨层 diff 漏键复发已 test-first 修复 + `check-scada-symbol-keys.mjs` guard 落地；P3×3 归 HCA-CR/HCA6）                                                                                                                                                                                                                                                                   |
| HCA6. Symbol shapes 审计（base-shapes 11 + device 5 + instrument 5 + sensor-control 5 + pipe-junction）                                                                 | `done`    | 27 文件 | HCA5       | 23 内置图元：create/applyProps 几何正确性/状态响应/diff-resize；审计记录 `docs/audits/2026-08-08-1121-hca6-symbol-shapes.md`（零 P0/P1；HCA5 P3-2 复核：12 composite 全有 extent/resize，pipe-junction 升级 P2-1 landed fix；P3×4 归 HCA-CR）                                                                                                                                                                                                                                                                                 |
| HCA7. Editor renderer 层审计（scada-editor-canvas renderer + editor-engine + 2 hooks + 定义/schema）                                                                    | `done`    | 7 文件  | HCA0       | 审计卡 `docs/audits/per-component/scada-editor-canvas.md`（closed）；P1-1 schema 漂移 + P2-1~P2-4 + P3-1 已修复；closure plan `docs/plans/2026-08-08-1316-1-industrial-hmi-hca1-hca7-renderer-closure-audit.md`（completed）closure audit PASS（fresh session）→ done                                                                                                                                                                                                                                                         |
| HCA8. Editor panels 审计（palette/inspector 4 files/toolbox 4 files）                                                                                                   | `done`    | 9 文件  | HCA7       | React UI 面板：@nop-chaos/ui 复用/schema 抽取/字段路由/对齐分布/z-order/clipboard；plan `docs/plans/2026-08-08-1230-1-industrial-hmi-hca8-editor-panels-audit.md`（completed）；零 P0/P1，P2-FE-1 嵌套子节点校验错误归因 test-first 修复，#5 维持 watch-only residual；审计记录 `docs/audits/2026-08-08-1230-hca8-editor-panels.md`                                                                                                                                                                                           |
| HCA9. Editor connection 审计（adapter/drag-controller/anchor-snap/link/overlay/overlay-renderer）                                                                       | `done`    | 6 文件  | HCA7       | 连线子系统：状态机/吸附/联动/覆盖物投影/sky 渲染；plan `docs/plans/2026-08-08-1230-2-industrial-hmi-hca9-editor-connection-audit.md`（completed）；审计记录 `docs/audits/2026-08-08-1230-hca9-editor-connection.md`；零 P0/P1；#1 维持 watch-only residual；#8/#3/#2 复核成立；P2-1（dim 23 测试加强）test-strengthen 落地；P3×4 归 HCA-CR                                                                                                                                                                                    |
| HCA10. Editor undo-redo 审计（undo-redo-adapter/undo-stack/compute-inverse/operation-coalesce）                                                                         | `done`    | 4 文件  | HCA7       | diff 命令栈：事务边界/逆计算/合并窗口/内存守护；plan `docs/plans/2026-08-08-1230-3-industrial-hmi-hca10-editor-undo-redo-audit.md`（completed）；审计记录 `docs/audits/2026-08-08-1230-hca10-editor-undo-redo.md`；零 P0；P1-1（undo-stack replaceUndoTop 不清空 redoStack，U6 redo-after-new-commit 违约）+ P2-1（operation-coalesce singleNodeUpdate 未拒绝 variables/reordered 致 M2 合并载荷丢失）test-first 修复；P3×1（时间戳时钟源）归 HCA-CR                                                                          |
| HCA11. Editor infra 审计（session/adapter/working-helpers/runtime-factories/runtime-mutators/toolbox-runtime/connection-wiring/test-handle-factory/editor-test-handle） | `done`    | 9 文件  | HCA7       | 编辑器基础设施：session 模型/adapter 桥/runtime 闭包/句柄工厂；plan `docs/plans/2026-08-08-1316-2-industrial-hmi-hca11-editor-infra-audit.md`（completed）；审计记录 `docs/audits/2026-08-08-1316-hca11-editor-infra.md`；零 P0；P1-1（toolbox-runtime importConfig 缺 engine.mode 同步，P1-08 parity mode desync）+ P2-1（cloneConfigSnapshot/save 浅克隆 custom，扩展 P2 #4 的 R5 Layer 2 隔离缺口）test-first 修复；P2-2（connection-wiring pointerup 容器外卡死）+ P3×2 归 HCA-CR；HCA1–HCA11 全 done，解锁 HCA-BL/HCA-CR |
| HCAX-1. 共性重构：error code `invalid-config` vs `config-invalid` 语义混淆（跨 renderer + editor + runtime-mutators + toolbox-runtime）                                 | `done`    | —       | HCA1, HCA7 | editor parseAndValidateConfig 统一为 `config-invalid`；审计卡 scada-editor-canvas.md P2-4。HCA-BL 归档 `docs/bugs/77-industrial-hmi-component-audit-cross-layer-error-code-unification.md`                                                                                                                                                                                                                                                                                                                                    |
| HCAX-2. 共性重构：canvas 交互面 a11y 缺 `role`/`aria-label`（scada-canvas + scada-editor-canvas 同型）                                                                  | `done`    | —       | HCA1, HCA7 | 两 renderer wrapper 加 `role="application"` + `aria-label` + i18n key。HCA-BL 归档 `docs/bugs/78-industrial-hmi-component-audit-canvas-wrapper-a11y-role-aria-label.md`                                                                                                                                                                                                                                                                                                                                                       |
| HCA-BL. Bug 总结（各层审计发现的 bug 归档到 `docs/bugs/`）                                                                                                              | `done`    | —       | HCA1–HCA11 | 按 `docs/bugs/00-bug-fix-note-writing-guide.md` 格式；复杂/跨层 bug 记录；plan `docs/plans/2026-08-08-1430-1-industrial-hmi-hca-bug-summary.md`（completed，closure audit PASS fresh session）。归档 9 张卡 `docs/bugs/77–85-industrial-hmi-component-audit-*.md`（HCAX-1/2、HCA5 P1-1、HCA6 pipe-junction、HCA8 P2-FE-1、HCA2 P2-ENG-1、HCA10 P1-1+P2-1 合并、HCA11 P1-1/P2-1），3 类留痕（HCA1/HCA9/HCA7）                                                                                                                  |
| HCA-LL. Lesson 总结（各层审计的架构/工程经验提炼）                                                                                                                      | `todo`    | —       | HCA-BL     | 沉淀到 checklist v2 / skills / 架构文档；防止同类问题再发                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| HCA-CR. 跨层集中修复与裁决（剩余 shared 缺陷、各审计卡 P2 backlog、机制落地后复验项）                                                                                   | `planned` | —       | HCA1–HCA11 | 汇总 `shared:` 缺陷，统一裁决 CX-n 或归 CR；plan `docs/plans/2026-08-08-1430-2-industrial-hmi-hca-cross-layer-remediation.md`（active，draft review 1 轮 pass-with-minors）                                                                                                                                                                                                                                                                                                                                                   |
| HCA-CV. 全量验证（typecheck/build/lint/test + e2e full-green + 回归 + 性能基线复测）                                                                                    | `todo`    | —       | HCA-CR     | industrial 101 files / 1302+ tests + 6 e2e specs full-green                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| HCA-CG. Guard 沉淀（审计卡汇总索引、lessons、工具脚本升级、文件行数治理）                                                                                               | `todo`    | —       | HCA-CV     | ~~dirty-collector 665 行~~（HCA3 已拆分落地）/ validate 524 行超阈值拆分评估；checklist v2 增 industrial 专项                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 已完成审计卡索引

| 审计卡                                             | 组件                | 状态   | 日期       |
| -------------------------------------------------- | ------------------- | ------ | ---------- |
| `docs/audits/per-component/scada-canvas.md`        | scada-canvas        | closed | 2026-08-08 |
| `docs/audits/per-component/scada-editor-canvas.md` | scada-editor-canvas | closed | 2026-08-08 |

## 框架/平台复用

| 类型                | 清单                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 18 维组件 checklist | `docs/audits/component-audit-checklist.md`（renderer 层用——scada-canvas / scada-editor-canvas）                                                                                                                                                                                                              |
| 23 维包级深审       | `docs/skills/deep-audit-prompts.md`（内部模块层用——engine/binding/serialization/symbols/editor-subsystem；复杂交互层必选 21-23）                                                                                                                                                                             |
| 对抗式审查          | `docs/skills/open-ended-adversarial-review-prompt.md`                                                                                                                                                                                                                                                        |
| 测试覆盖审计        | `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`                                                                                                                                                                                                                                          |
| React 19 审查       | `docs/skills/react19-best-practices-review.md`                                                                                                                                                                                                                                                               |
| 代码质量审查        | `docs/skills/code-quality-audit-prompt.md`                                                                                                                                                                                                                                                                   |
| 审计工具脚本        | `check:audit-suspects`、`check:audit-missing-renderer-markers`、`check:audit-styling-suspects`、`check:audit-react19-optimization-candidates`、`check:audit-performance-suspects`、`check:audit-runtime-raw-schema-reads`、`check:audit-async-failure-paths`、`check:audit-non-retained-renderer-references` |
| 变异/静态           | `pnpm audit:mutants`、`pnpm audit:knip`                                                                                                                                                                                                                                                                      |
| E2E                 | `tests/e2e/scada-*.spec.ts`（6 specs：demo/edge-cases/perf/pressure/editor-interaction-correctness/editor-perf）                                                                                                                                                                                             |
| 契约基线            | `docs/architecture/renderer-markers-and-selectors.md`、`docs/architecture/renderer-runtime.md`、`docs/references/quick-reference.md`                                                                                                                                                                         |
| 前序审计            | `docs/audits/2026-08-03-1506-*.md`～`docs/audits/2026-08-07-1835-*.md`（10 份 multi/open-audit，覆盖 industrial-hmi + editor 各轮 review gate）                                                                                                                                                              |

## 审计维度对照

### Renderer 层（HCA1 / HCA7）：18 维组件 checklist

scada-canvas / scada-editor-canvas 是注册 renderer type，适用 `component-audit-checklist.md` 全 18 维（schema 契约 / RendererComponentProps / 值所有权 / 表单参与 / DOM 选择器 / 嵌套 schema / 事件 action / a11y / i18n / 四态 / 异步生命周期 / 组合宿主 / 样式 / React19 / 性能 / 测试 / 文档 / 注册边界 IO 安全）。

### 内部模块层（HCA2–HCA6, HCA8–HCA11）：23 维包级深审 + 裁剪

内部模块不是注册 renderer，18 维中的 DOM 选择器 / 表单参与 / 嵌套 schema / 组合宿主等维度不适用。改用 `deep-audit-prompts.md` 23 维包级深审，重点维度：

| 维度族     | 重点                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 正确性     | 算法正确性（视口数学/命中测试/脏收集/diff/逆计算/吸附）、边界值（空/null/NaN/Infinity/超大嵌套）、类型安全 |
| 生命周期   | 引擎创建/销毁、订阅/监听清理、事务边界、内存守护、竞态/重入                                                |
| 错误处理   | 失败路径覆盖、错误码语义、降级策略、cause 链保留                                                           |
| 性能       | 热路径 O(n) 分析、selector 精度、批处理/合帧、大列表/大场景                                                |
| React 集成 | hook deps 正确性、ref 生命周期、effect cleanup、render 无副作用                                            |
| 测试质量   | 断言正确行为（非 not-throw）、DOM 契约断言、错误路径、变异敏感点                                           |
| 架构边界   | 层依赖方向、公共面最小化、模块图隔离（editor subpath）、INV-1 IO 边界                                      |

### 复杂交互层追加维度（HCA2 engine / HCA3 binding / HCA8 toolbox algorithms / HCA9 connection / HCA10 undo-redo）

以上 5 层含复杂交互/定位逻辑，必须追加 deep-audit 维度 21（显示与定位正确性）/ 22（集成接线与可操作性）/ 23（测试有效性与假绿）。HCA8 的 align-distribute（定位算法）和 z-order（数组索引操作）涉及维度 21 定位正确性，故纳入。

## 自动修复机制（Auto-Remediation Contract）

与 `component-audit-roadmap.md` 「自动修复机制」节一致：

1. **审计产出**：逐文件审查记录（renderer 层用 18 维审计卡，内部模块层用 23 维深审记录），所有发现带 `文件:行` 证据。
2. **P0/P1 自动修复**：审计当轮立即修复（test-first），不等批量。P2 低成本当场修复，否则入审计卡 backlog。P3 仅记录。
3. **共性缺陷 CX-n**：发现 ≥2 文件/跨层同根因缺陷时，插入 HCAX-n work item。
4. **验证门禁**：每次修复后运行受影响包 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/build/lint/test`；DOM 契约变更追加 e2e。
5. **Bug/Lesson 汇总**：每轮审计的 bug 经 HCA-BL 归档到 `docs/bugs/`；lesson 经 HCA-LL 沉淀到 checklist/skills/架构文档。

## Phase Details

### HCA0 编排基线

核对 101 源文件清单与 live 代码一致（`find` 排除 test/fixtures/index/test-support）；out-of-scope 声明：`src/test-support/`（6 文件）、`*-fixtures.ts`（2 文件）、`index.ts` barrel（7 文件）共 15 文件为测试基础设施/聚合导出不纳入审计。复用 component-audit 的工具基线（`check:audit-*` 脚本）、审计卡模板（18 维）、deep-audit 23 维 checklist；确认保护区域（industrial 包全量已获 mission 授权）。

### HCA1 Renderer 层审计

scada-canvas renderer + 5 hooks（use-scada-engine/config-sync/points-bridge/events/handles）+ scada-errors + renderer-definitions + schemas（共 9 文件）。18 维组件 checklist 审计。**已完成**（审计卡 `scada-canvas.md` closed；closure plan 2026-08-08-1316-1 closure audit PASS fresh session）：P2-1 a11y（role/aria-label）+ P3-1 useCallback 冗余已修复；closure remediation 补 owner doc §10 a11y 说明 + a11y 回归守护测试。

### HCA2 Engine 层审计

scada-engine（499 行）/ config-adapter（180）/ event-bridge（190）/ hit（29）/ interaction-overlay（176）/ tree-registry（108）/ viewport（96）/ batch-add-probe（44）/ test-handle（29）。23 维包级深审 + 维度 21-23（复杂交互）。重点：视口数学正确性、命中测试边界、覆盖物生命周期、diff 构建路径、引擎 reset/destroy 清理。**已完成**（审计记录 `docs/audits/2026-08-08-0748-hca2-engine-layer.md`，closure audit PASS）：零 P0/P1（先验 P1-9/P2-7/P2-8/P2-10/P1-7 已收口基线）；P2-ENG-1（importConfig 全量重建旁路 background 应用 + 覆盖物清理，与 reset 不一致）test-first 修复；P3×3（engine 公共命令 destroyed 门控 / applyDiff nextConfig footgun / registry 重复 id）归 HCA-CR。

### HCA3 Binding 层审计

point-store（330）/ reverse-index（126）/ dirty-collector（665→拆分 104+65+469）/ value-to-state（59）/ animator（269）/ bind-resolver（139）/ flux-eval（111）。23 维包级深审 + 维度 21-23。**已完成**（审计记录 `docs/audits/2026-08-08-0748-hca3-binding-layer.md`）：零 P0/P1；dirty-collector 665 行拆分为 dirty-collector.ts(104) + expression-errors.ts(65) + refresh-pipeline.ts(469)，各 ≤ 500 行 WARN 桶清零。

### HCA4 Serialization 层审计

config-types（131）/ validate（524）/ diff（138）/ equality（56）/ parse（25）/ serialize（27）。23 维包级深审。重点：校验完整性（子形状/malformed）、deepEqual 数组守卫、diff 正确性、序列化往返保真、**validate 524 行超 500 阈值**。**已完成**（审计记录 `docs/audits/2026-08-08-1051-hca4-serialization-layer.md`）：零 P0/P1；validate.ts 524 行拆分 Decision = 移交 HCA-CG（WARN 桶低位 + 单一职责内聚 + 拆分致过度碎片化，拆分缝已记录供 HCA-CG 采用）；P3-1（align 校验遗漏）/ P3-2（background.grid 校验遗漏）归 HCA-CR backlog。

### HCA5 Symbols core 审计

symbol-types（157）/ symbol-registry（44）/ symbol-factory（106）/ style-resolver（14）/ visual-state（118）/ composite（135）/ compound（98）/ register-builtin（75）。23 维包级深审。重点：注册并发安全、工厂 deep-merge 正确性、视觉状态 revert、复合装配 applyProps 路由。

### HCA6 Symbol shapes 审计

base-shapes 11 文件（10 图元 + common.ts helper）+ device 5 + instrument 5 + sensor-control 5 + pipe-junction。23 维包级深审。重点：create/applyProps 几何正确性、diff-resize 响应、状态驱动视觉、动画绑定、width/height binding 响应。**已完成**（审计记录 `docs/audits/2026-08-08-1121-hca6-symbol-shapes.md`，closure audit PASS）：零 P0/P1；HCA5 P3-2 转交项逐图元复核——12 composite 全部有 extent(3 level/thermometer/progress) 或 resize hook(9)，无静默丢弃；pipe-junction（自定义 applyProps 借用 applyCompositeProps 但 parts 无 extent/resize）升级 P2-1 landed fix（width/height resize test-first，重算 body + stubs points）；10 base-shapes 全响应 width/height；P3×4（switch on/off 推断边缘 / extent 族内边距 cosmetic / polygon 空点 / NaN 防御纵深）归 HCA-CR。

### HCA7 Editor renderer 层审计

scada-editor-canvas renderer + editor-engine（428）+ editor-errors（65）+ 2 hooks（use-editor-engine 265 / use-editor-handles 229）+ renderer-definitions + schemas。18 维组件 checklist 审计。**已完成**（审计卡 `scada-editor-canvas.md` closed；closure plan 2026-08-08-1316-1 closure audit PASS fresh session）：P1-1 schema 类型漂移 + P2-1 propContracts/eventContracts 缺失 + P2-2 a11y + P2-3 disabled + P2-4 error code + P3-1 palette title 全部已修复；closure remediation 补 owner doc §4.1/§4.3/§10 schema region + a11y/disabled 说明 + disabled 回归守护测试。

### HCA8 Editor panels 审计

palette（58）/ inspector：inspector-panel（85）+ inspector-field（148）+ schema-extractor（142）+ field-errors（51）/ toolbox：toolbox-panel（222）+ align-distribute（150）+ z-order（144）+ clipboard（112）。23 维包级深审。重点：@nop-chaos/ui 复用（无裸 HTML）、schema 抽取正确性、对齐分布算法、z-order 数组操作、clipboard 新 ID 分配。**已完成**（审计记录 `docs/audits/2026-08-08-1230-hca8-editor-panels.md`，closure audit PASS）：零 P0/P1；P2-FE-1（`field-errors.ts` 嵌套子节点校验错误归因——findSymbolIndex 返回父索引致 `children[M]` fieldKey 错提）test-first 修复（findSymbolScopePath 返回完整 scope path + failing-first 2 测）；#5 align-distribute group-relative 维持 watch-only residual；owner doc §4.2/§4.3/§5/§10 + design-property-panel 无 drift；P3×13 归 HCA-CR。

### HCA9 Editor connection 审计

connection-adapter（291）/ connection-drag-controller（151）/ anchor-snap（162）/ connection-link（97）/ connection-overlay（70）/ connection-overlay-renderer（58）。23 维包级深审 + 维度 21-23。重点：状态机正确性（pick/drag/release）、吸附阈值、联动重算、覆盖物 sky 渲染清理、与 Editor transform 互斥。**已完成**（审计记录 `docs/audits/2026-08-08-1230-hca9-editor-connection.md`，closure audit PASS）：零 P0/P1；#1（connection drag pointermove vs viewport-pan）维持 watch-only residual（手势仲裁 preventDefault + connectionDragActiveRef 接线完整 + e2e #1 覆盖通过）；#8（dangling 递归 collectIds）/ #3（tooltip 死字段）/ #2（safeDiv 零除守卫）先验修复复核成立；P2-1（dim 23 connection-overlay-renderer.test sky-missing 测试 not.toThrow 唯一断言加强）test-strengthen 落地；P3×4（moveDrag O(n) bounds 重建 / 等距候选 tie-break / 源码注释措辞 / sky overlay 颜色硬编码）归 HCA-CR。

### HCA10 Editor undo-redo 审计

undo-redo-adapter（257）/ undo-stack（161）/ compute-inverse（218）/ operation-coalesce（114）。23 维包级深审 + 维度 21-23。重点：逆计算正确性（added→removed/updated→reverse）、事务边界、合并窗口（500ms）、内存上限守护、canUndo/canRedo 边界。**已完成**（审计记录 `docs/audits/2026-08-08-1230-hca10-editor-undo-redo.md`，closure audit PASS）：零 P0；P1-1（`undo-stack.ts` replaceUndoTop 不清空 redoStack——coalesce-merge 是新提交，按 U6 须截断 redo 分支，与 push 同语义；undo 后同 nodeId+同字段+≤500ms 的可合并编辑会使 redo 错误可用）test-first 修复（replaceUndoTop 末尾 `this.redoStack = []`）；P2-1（`operation-coalesce.ts` singleNodeUpdate 未拒绝 variables/reordered，M2 合并只搬运 updated 会静默丢弃 variables/reordered 载荷）test-first 修复（增 `variables === undefined && reordered === undefined` 守卫）；4 条 failing-first 回归测试断言结果值；P3×1（合并窗口时间戳源 Date.now 非单调，单 tab 短窗口低概率）归 HCA-CR。owner doc（design-undo-redo.md U6/§4.5 + editor-initiation.md R4 + design-renderer.md §12.3）与 live 一致（P1-1 修复后 live 匹配 doc，doc 无需改）。

### HCA11 Editor infra 审计

editor-session（130）/ editor-adapter（205）/ editor-working-helpers（162）/ runtime-factories（261）/ runtime-mutators（248）/ toolbox-runtime（264）/ connection-wiring（69）/ test-handle-factory（130）/ editor-test-handle（138）。23 维包级深审。重点：session 模型不可变性、adapter 事件桥节流、runtime 闭包共享、mutator 幂等性、test handle window 挂载/卸载。**已完成**（审计记录 `docs/audits/2026-08-08-1316-hca11-editor-infra.md`，closure audit PASS）：零 P0；P1-1（`toolbox-runtime.ts` importConfigFn 缺 `engine.setMode(session.mode)` 同步——resetSession 强制 session.mode='edit' 但 engine.build 不改 engine.mode，preview 态 importConfig 致 session/engine mode desync；与 `runtime-mutators.ts` load() 的 P1-08 同型，parity 缺口）test-first 修复；P2-1（`editor-working-helpers.ts` cloneNodeDeep + `runtime-mutators.ts` save 浅克隆 custom——扩展 plan 2026-08-08-0900-1 P2 #4 至 cloneConfigSnapshot/committedBaseline，闭合 R5 Layer 2 custom 隔离纪律）test-first 修复（cloneNodeDeep 增 `structuredClone(node.custom)` + save 改用 cloneConfigSnapshot）；4 条 failing-first 回归测试断言结果值；P2-2（`connection-wiring.ts` pointerup 挂 container 非释放于容器外时 connectionDragActiveRef 卡 true + overlay 残留，对照 editor-adapter.ts pointerup 挂 window；test-cost 非平凡归 HCA-CR）+ P3×2（undo-redo-adapter.cloneNodeDeep custom 一致性防御 / handleGeometryChange microtask teardown 竞态 try/catch 已含住）归 HCA-CR。owner doc（design-architecture.md session/adapter/runtime + design-toolbox.md importConfig + editor-initiation.md R5）与 live 一致（P1-1/P2-1 修复后 live 匹配 doc，doc 无需改）。**HCA1–HCA11 全 done，解锁 HCA-BL/HCA-CR 收敛。**

### HCA-BL Bug 总结

各层审计发现的 bug 按 `docs/bugs/00-bug-fix-note-writing-guide.md` 格式归档。复杂/跨层 bug（非平凡根因/可被重构再引入/跨包边界）必须记录；简单 bug 在审计卡内留痕即可。输出：`docs/bugs/NN-industrial-hmi-component-audit-*.md` 系列。

### HCA-LL Lesson 总结

各层审计的架构/工程经验提炼，按主题归档：

- **a11y**：canvas 交互面无原生 a11y 语义，wrapper 需 `role="application"` + `aria-label`（HCA1/HCA7）
- **schema 契约**：schema interface 声明必须与 renderer-definitions fields 同步（HCA7 P1-1）
- **error code 设计**：升级码 vs 不升级码不可混用（HCAX-1）
- **四态契约**：`props.meta.disabled` 是四态一部分，instance-renderer 必须消费（HCA7 P2-3）
- **React 19**：useCallback 在 canvas 生命周期 renderer 中的必要性应逐个审查（HCA1 P3-1）
- **文件行数**：~~dirty-collector 665 行~~（HCA3 已拆分为 3 文件 ≤ 500 行）/ ~~validate 524 行超阈值~~（HCA4 已审，拆分 Decision = 移交 HCA-CG w/ 拆分缝）
- 输出：更新 `docs/skills/deep-audit-prompts.md` / `docs/audits/component-audit-checklist.md` v2 / 架构文档

### HCA-CR 跨层集中修复

汇总各审计卡 `shared:` 缺陷、deferred P1、P2 backlog；已由 HCAX-n 处理的除外；统一裁决走 HCAX-n 还是归 CR 一次性修复。

### HCA-CV 全量验证

`pnpm typecheck` + `pnpm build` + `pnpm lint` + `pnpm test`（industrial 101 source files / 97+ test files / 1302+ tests）+ `pnpm test:e2e`（6 scada specs full-green）+ 性能基线复测（对照 I14 / E9.2 包络）。

### HCA-CG Guard 沉淀

审计卡汇总索引、lessons 沉淀、checklist v2（增 industrial 专项维度）、工具脚本升级（canvas renderer 专项检查）、文件行数治理（~~dirty-collector 665 行 HCA3 已拆分落地~~ / validate 524 行拆分落地）。

## Dependency Graph

```mermaid
graph TD
    HCA0[HCA0 编排基线] --> HCA1[HCA1 Renderer 层 ✅]
    HCA0 --> HCA2[HCA2 Engine 层]
    HCA0 --> HCA3[HCA3 Binding 层]
    HCA0 --> HCA4[HCA4 Serialization 层]
    HCA0 --> HCA5[HCA5 Symbols core]
    HCA0 --> HCA7[HCA7 Editor renderer 层 ✅]
    HCA5 --> HCA6[HCA6 Symbol shapes ✅]
    HCA7 --> HCA8[HCA8 Editor panels ✅]
    HCA7 --> HCA9[HCA9 Editor connection]
    HCA7 --> HCA10[HCA10 Editor undo-redo ✅]
    HCA7 --> HCA11[HCA11 Editor infra ✅]
    HCA1 --> HCAX1[HCAX-1 error code ✅]
    HCA7 --> HCAX1
    HCA1 --> HCAX2[HCAX-2 canvas a11y ✅]
    HCA7 --> HCAX2
    HCA1 --> BL[HCA-BL Bug 总结 ✅]
    HCA2 --> BL
    HCA3 --> BL
    HCA4 --> BL
    HCA5 --> BL
    HCA6 --> BL
    HCA7 --> BL
    HCA8 --> BL
    HCA9 --> BL
    HCA10 --> BL
    HCA11 --> BL
    BL --> LL[HCA-LL Lesson 总结]
    LL --> CR[HCA-CR 跨层修复\n(传递依赖 HCA1–11) ]
    CR --> CV[HCA-CV 全量验证]
    CV --> CG[HCA-CG Guard 沉淀]
```

## Rule

1. 本文件状态仅由 plan 生命周期驱动（`docs/backlog/00-roadmap-authoring-guide.md`）：draft review 通过 → `planned`；closure audit 通过 → `done`。
2. work item 粒度 = 一个 execution plan 的交付范围（审计一个模块族 + 逐文件审查 + P0/P1 自动修复 + 回归测试）；若单个 work item 无法被一个 plan 收口，在 HCA0 后经人工确认拆分。
3. AI 不得重新仲裁优先级、跳序或新增 work item；结构性调整（新增/删除/重排）标记人工确认。
4. Renderer 层（HCA1/HCA7）用 18 维组件 checklist（审计卡在 `docs/audits/per-component/`）；内部模块层（HCA2–HCA6, HCA8–HCA11）用 23 维包级深审（记录在 plan 内 + `docs/audits/` 日期文件）。
5. 每轮审计的 bug 汇总到 HCA-BL，lesson 汇总到 HCA-LL——两者是独立 work item，不跳过。
6. 审计与修复之间无人工握手门禁（保护区域已获 mission 授权）。
