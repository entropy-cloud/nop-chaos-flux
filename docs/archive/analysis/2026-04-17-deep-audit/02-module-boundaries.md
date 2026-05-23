# 02 模块职责与文件边界

- Task ID: `ses_268e2cd03ffevRLou0TmAA8N1k`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Calibration note: updated on `2026-04-17` after the mandatory runtime-boundary fixes and the follow-up renderer splits landed.

# 维度02审核结论

以下发现均属于“人工边界审计”才能稳定发现的问题；当前未见对应的 `typecheck` / `lint` / 测试守卫能自动拦截。

### [维度02] `flux-runtime` 入口文件重新吸入运行时实现

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts:64-499`
- **严重程度**: P1
- **现状**: 包入口同时承担了导出面、运行时工厂、owned scope/component registry/page/surface/form 创建、host projection scope 封装、action/source/reaction wiring、dispose 清理。
- **风险**: `flux-runtime` 的新增能力会继续默认堆进入口文件，导致真实边界被掩盖，后续任何 runtime 变更都更难定位和拆分。
- **建议**: 保留 `index.ts:46-63` 作为导出层；将 `createRendererRuntime` 内部的 page/surface/form factory、host projection scope、runtime disposal、dispatcher/source/reaction wiring 提取到独立模块（如 `runtime-factory.ts`、`runtime-owned-resources.ts`、`runtime-host-projection.ts`）。
- **为什么值得现在做**: 文档已明确把入口定义为 assembly layer，这类回归越早压住，越能避免再次出现“入口文件吸入所有实现”的高成本返工。
- **误报排除**: 这不是合理 orchestrator；`docs/architecture/flux-runtime-module-boundaries.md` 明确要求 `index.ts` 仅保留 wiring / top-level factory composition / stable exports，而当前文件已包含大量非平凡实现细节。此问题也不是自动化能发现的风格问题，而是人工边界审计问题。
- **历史模式对应**: 入口文件瘦身 / assembly-only 回归治理；对应仓库早期对 `flux-core/src/index.ts` 的成功拆分经验。
- **参考文档**: `C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md`, `C:\can\nop\nop-chaos-flux\AGENTS.md`
- **状态**: 已修复。`packages/flux-runtime/src/index.ts` 现在是薄入口，`createRendererRuntime(...)` 已迁到 `packages/flux-runtime/src/runtime-factory.ts`。

### [维度02] 数据源执行边界从 `data-source-runtime` 泄漏到 `source-registry`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\source-registry.ts:33-55,72-216,250-474`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\data-source-runtime.ts:23-141,222-508`
- **严重程度**: P1
- **现状**: `source-registry.ts` 不只做注册/失效/调试快照，还内嵌了 `createDependencyAwareFormulaController`，并复制了 `isObjectRecord` / `applyResultMapping` 一类数据源执行逻辑。
- **风险**: API source 与 formula source 的映射、状态发布、依赖更新语义会逐步分叉；维护者需要跨两个大文件才能理解“数据源到底在哪执行”。
- **建议**: 让 `source-registry.ts` 收缩到 registry / refresh routing / debug snapshot；把 formula source controller 与共用 result-mapping helper 收回 `data-source-runtime`（或提取为 `data-source-controller-shared.ts`）。
- **为什么值得现在做**: 这是文档-代码已发生偏离的边界问题，且已经出现重复逻辑，属于最典型的“现在修比以后修便宜”的信号。
- **误报排除**: 这不是低代码动态边界导致的合理耦合；动态部分在 schema/依赖集，控制器生命周期与结果映射仍然是 runtime 基础设施，应有单一归属。当前也不是单纯“大文件”，而是职责实质跨模块漂移。
- **历史模式对应**: runtime 子系统拆边界；与 `request-runtime` / `request-runtime-adaptor`、`action-runtime` / `action-runtime-core` / `action-runtime-handlers` 的既有拆分模式一致。
- **参考文档**: `C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md`, `C:\can\nop\nop-chaos-flux\AGENTS.md`
- **状态**: 已修复。formula source controller 与 result-mapping 执行逻辑已移回 `packages/flux-runtime/src/data-source-runtime.ts`，`source-registry.ts` 收缩为 registry / refresh / debug snapshot 边界。

### [维度02] `table-renderer` 在首轮拆分后再次膨胀

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer.tsx:49-508`
- **严重程度**: P2
- **现状**: 虽然已有 `table-renderer/` 子目录承接 hooks 与 data util，但主文件仍同时承载表格控制器装配、虚拟滚动窗口计算、表头排序/过滤 UI、行级渲染、操作列、展开行、分页区块与 loading overlay。
- **风险**: 表格功能继续增长时，任何一个子能力（分页、虚拟化、操作列、展开行）都会迫使开发者进入同一个 500 行组件修改，回归风险和 JSX 噪声都会持续升高。
- **建议**: 停在“首轮提取后”这一仓库经验线上，不追求继续按行数硬拆；但应把主文件再压回 orchestrator，至少抽出 `TableHeaderRow`、`TableBodyRows`、`TablePaginationBar`、`TableLoadingOverlay` 这类稳定子模块。
- **为什么值得现在做**: 该文件正好命中项目历史教训里明确提到的高频重构对象；且已经有配套子目录，增量拆分成本低。
- **误报排除**: 这不是单纯“一个组件 JSX 多一点”；文件内同时存在视图、交互、虚拟化算法和区域实例化逻辑，已超过合理 renderer orchestrator 的复杂度。当前也无自动化规则能阻止它继续回涨。
- **历史模式对应**: 渲染器 mega-file 二次膨胀；直接对应仓库曾成功拆分的 `table-renderer.tsx` 历史模式。
- **参考文档**: `C:\can\nop\nop-chaos-flux\AGENTS.md`
- **状态**: 已修复。主文件已压回 orchestrator，拆出 `TableHeaderRow`、`TableBodyRows`、`TablePaginationBar`、`TableLoadingOverlay` 到 `packages/flux-renderers-data/src/table-renderer/`。

### [维度02] `code-editor-renderer` 将字段绑定、编辑器装配、SQL 工具栏与执行面板堆在单文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer.tsx:54-419`
- **严重程度**: P2
- **现状**: 同一文件同时处理 form/scope 值绑定、completion/extension 组装、fullscreen 本地状态、SQL format/execute、副结果面板和整块 toolbar/body JSX。
- **风险**: 后续若继续加语言模式、执行方式或更多面板，代码会在“字段运行时 + 编辑器 host + SQL 工具条”三种责任之间互相牵连，测试与复用都变差。
- **建议**: 保留 renderer 作为 orchestrator；把 `value binding`、`editor extension factory`、`sql toolbar actions`、`result panel host` 拆成独立模块或子组件。
- **为什么值得现在做**: 该包本来就已有 `extensions/`、`variable-panel.tsx`、`sql-result-panel.tsx` 等天然子边界，再拆一步即可把主 renderer 压回组装层。
- **误报排除**: 这不是因为“用到了几个 `useState`”就被判问题；真正的问题是运行时字段绑定、CodeMirror 宿主配置和 SQL 执行流程被塞进同一 renderer 文件。当前也不是自动格式化或 lint 能发现的结构问题。
- **历史模式对应**: 复杂 renderer 分层抽离；与仓库既有的大型 renderer / interaction 文件拆分模式同类。
- **参考文档**: `C:\can\nop\nop-chaos-flux\AGENTS.md`
- **状态**: 已修复。主文件已压回 orchestrator，拆出 `use-code-editor-binding.ts`、`use-sql-editor-state.ts`、`CodeEditorToolbar.tsx`、`CodeEditorBody.tsx` 到 `packages/flux-code-editor/src/code-editor-renderer/`。

## 1. 超大文件清单（带职责分析）

按行数降序；`判断` 仅表示当前边界审计建议，不等同于功能缺陷。

| 行数 | 文件                                                                                                             | 职责分析                                                                         | 判断                                    |
| ---: | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------- |
|  644 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\runtime-factory.ts`                                         | runtime factory + host projection + dispatcher/source/reaction wiring + disposal | 可接受，assembly factory 已从入口迁出   |
|  624 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\data-source-runtime.ts`                                     | helpers + API 依赖跟踪 + API/formula controller + source executor                | 关注，当前归属已正确但文件仍偏大        |
|  510 | `C:\can\nop\nop-chaos-flux\packages\flux-formula\src\parser.ts`                                                  | `Parser` 类集中实现语法解析                                                      | 可接受，算法型大文件                    |
|  499 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts`                                                   | 入口导出 + runtime factory + wiring + disposal                                   | 已修复，现为薄入口                      |
|  497 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx`                               | config 规范化 + page/body/inner renderer                                         | 观察                                    |
|  496 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner.ts`                                      | owner-local validation orchestration                                             | 可接受，聚焦单一子系统                  |
|  491 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\panel\styles-css.ts`                                        | 内联 debugger CSS 字符串                                                         | 观察，可考虑移到独立样式文件            |
|  491 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime.ts`                                            | FormRuntime 装配 + 委托到 field/submit/array/validation 子模块                   | 可接受，orchestrator                    |
|  484 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core.ts`                                              | Designer core 主状态/命令逻辑                                                    | 观察                                    |
|  480 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler\shape-validation.ts`                        | schema 形状诊断、action/source 校验、递归分析                                    | 可接受，规则中心文件                    |
|  474 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\source-registry.ts`                                         | registry/debug + formula controller + 结果映射                                   | 已修复，已收缩为 registry/refresh/debug |
|  439 | `C:\can\nop\nop-chaos-flux\packages\flux-formula\src\compile.ts`                                                 | import/filter 语法改写 + compiler 组装                                           | 可接受                                  |
|  428 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-runtime-core.ts`                                     | action helper、bindings、payload、monitor、control 解析                          | 可接受                                  |
|  428 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-manifest.ts`                            | host projection/capability manifest                                              | 可接受                                  |
|  427 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx`                              | row UI + 本地同步 + runtime registration + definition                            | 观察                                    |
|  425 | `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\canvas-styles.css`                                 | 大型 canvas 样式表                                                               | 可接受                                  |
|  419 | `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer.tsx`                               | 字段绑定 + editor 装配 + SQL toolbar/执行 + result panel                         | 已修复，现为 orchestrator               |
|  418 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\types.ts`                                                   | debugger 合同类型集合                                                            | 可接受，合同文件                        |
|  412 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\DesignerXyflowCanvas.tsx` | canvas host + overlay + 交互                                                     | 观察                                    |
|  402 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\reaction-runtime.ts`                                        | reaction 注册执行 + registry                                                     | 可接受                                  |
|  399 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-command-adapter.ts`                     | command adapter + 校验/失败推断                                                  | 观察                                    |
|  390 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\request-runtime.ts`                                         | request shaping + execution + dedup/cancel                                       | 可接受                                  |
|  390 | `C:\can\nop\nop-chaos-flux\packages\flux-react\src\test-support-runtime.tsx`                                     | test renderers + runtime harness                                                 | 可接受，测试支持集中区                  |
|  384 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\ConditionGroup.tsx`       | 条件组 UI + sortable item                                                        | 观察                                    |
|  383 | `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\types.ts`                                           | report 合同类型 + metadata helper                                                | 可接受                                  |
|  382 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx`            | array item key/row + renderer                                                    | 观察                                    |
|  379 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\imports.ts`                                                 | import manager 生命周期与加载去重                                                | 可接受                                  |
|  377 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\panel.tsx`                                                  | 搜索过滤 helper + panel UI                                                       | 观察                                    |
|  376 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\scope.ts`                                                   | scope store + composite scope + ref wrapper                                      | 可接受                                  |
|  375 | `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks.ts`                                                     | hooks 集中出口                                                                   | 可接受，继续观察增长                    |
|  374 | `C:\can\nop\nop-chaos-flux\packages\ui\src\components\ui\chart.tsx`                                              | chart container/tooltip/legend 组件集                                            | 可接受                                  |
|  366 | `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer.tsx`                                            | import setup + resolved render path + providers                                  | 可接受，核心 orchestrator               |
|  364 | `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\core\cell-operations.ts`                                | cell operation 纯函数集合                                                        | 可接受                                  |
|  360 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\controller-helpers.ts`                                      | debugger helper 集合                                                             | 可接受                                  |
|  357 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx`                                 | input 家族 renderer 定义                                                         | 可接受，按控件族聚合                    |
|  355 | `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\types.ts`                                               | spreadsheet 合同类型 + helper                                                    | 可接受                                  |
|  354 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form.tsx`                                  | schema validator + lifecycle scope + form renderer                               | 观察                                    |
|  352 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-runtime.ts`                                          | action dispatch pipeline                                                         | 可接受                                  |
|  348 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-validation.ts`                                 | path/subtree validation 流程                                                     | 可接受                                  |
|  346 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\diagnostics.ts`                                             | diagnostics query/report builder                                                 | 可接受                                  |
|  341 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\controller.ts`                                              | debugger controller 主装配                                                       | 观察                                    |
|  340 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\types.ts`                                             | flow designer 合同类型                                                           | 可接受                                  |
|  332 | `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\runtime.ts`                                              | runtime 合同类型                                                                 | 可接受                                  |
|  323 | `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-inspector.tsx`                          | inspector UI                                                                     | 观察                                    |
|  321 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils.tsx`                                     | field hooks + presentation helper                                                | 可接受，继续观察增长                    |
|  319 | `C:\can\nop\nop-chaos-flux\packages\ui\src\components\ui\sidebar-layout.tsx`                                     | sidebar 系列 UI 组件                                                             | 可接受                                  |
|  319 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-runtime-handlers.ts`                                 | built-in/component action handlers                                               | 可接受                                  |
|  318 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx`                           | row UI + local sync + renderer                                                   | 观察                                    |
|  317 | `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\core.ts`                                            | report designer core                                                             | 可接受                                  |
|  314 | `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx`                                             | fragment/render helper + RenderNodes                                             | 可接受                                  |
|  311 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler\host-action-validation.ts`                  | host action 校验                                                                 | 可接受                                  |
|  308 | `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx`                              | grid 虚拟化/滚动渲染                                                             | 观察                                    |
|  306 | `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler.ts`                                         | schema compiler 总装配                                                           | 可接受                                  |
|  305 | `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\core-dispatch.ts`                                   | core dispatch                                                                    | 可接受                                  |
|  305 | `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\panel\hooks.ts`                                             | panel drag/resize hooks                                                          | 观察                                    |
|  304 | `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx`            | variant detect/transform + renderer                                              | 观察                                    |

### 备注

- 明确可接受的 orchestrator：`C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime.ts`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer.tsx`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\runtime-factory.ts`
- 本次已落地的“二次膨胀”治理：`C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\source-registry.ts`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer.tsx`, `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer.tsx`

## 2. 入口文件问题清单

### 已修复

- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts`
  - 现已回到薄入口，仅承担导出边界。
  - `createRendererRuntime` 已迁到 `packages\flux-runtime\src\runtime-factory.ts`。

### 含实现逻辑，但当前可接受

- `C:\can\nop\nop-chaos-flux\packages\flux-formula\src\index.ts`
  - 含 `createExpressionCompiler` 实现。
  - 这是包级主工厂，体量可控，暂不构成边界问题。
- `C:\can\nop\nop-chaos-flux\packages\tailwind-preset\src\index.ts`
  - 含 `nopTailwindPreset` 具体实现。
  - 单文件单职责，符合 preset 包定位。

### 纯 barrel / re-export 为主

- `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-core\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\ui\src\index.ts`
- `C:\can\nop\nop-chaos-flux\packages\word-editor-core\src\index.ts`

### 导出项数量阈值检查

- 超过 50 个导出语句的仅有：
  - `C:\can\nop\nop-chaos-flux\packages\ui\src\index.ts` — 59 个
- 判断：
  - 对 `@nop-chaos/ui` 这是合理的组件库 barrel，不单独判为职责过大问题。
  - 其余包未出现“入口导出面异常膨胀”信号。

## 3. 目录结构建议

### 顶层文件数超过 20 的包

- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src` — 47 个顶层文件
  - **建议分组**:
    - `action/`：`action-runtime*.ts`, `action-scope.ts`, `imports.ts`
    - `form-runtime/`：`form-runtime*.ts`, `form-store.ts`, `form-component-handle.ts`
    - `source/`：`data-source-runtime.ts`, `source-registry.ts`, `reaction-runtime.ts`, `status-owner.ts`
    - `scope/`：`scope.ts`, `scope-change.ts`, `projected-scope-store.ts`
    - `runtime-factory/`：`index.ts` 相关装配 helper
- `C:\can\nop\nop-chaos-flux\packages\flux-react\src` — 29 个顶层文件
  - **建议分组**:
    - `node-renderer/`：`node-renderer*.tsx`, `node-instance.ts`, `node-frame-wrapper.tsx`, `useNode*`
    - `render/`：`render-nodes.tsx`, `helpers.tsx`, `fragment-scope.ts`
    - `providers/contexts/`：`contexts.ts`, `dialog-host*.tsx`
    - `test-support/`：`test-support*.tsx`
- `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src` — 24 个顶层文件
  - **建议分组**:
    - `layout/`：`page.tsx`, `container.tsx`, `flex.tsx`, `fragment.tsx`, `loop.tsx`, `recurse.tsx`, `tabs.tsx`
    - `content/`：`text.tsx`, `icon.tsx`, `badge.tsx`
    - `overlay/`：`dialog.tsx`, `drawer.tsx`
    - `logic/`：`reaction.tsx`, `interaction-owner.ts`, `structural-loop*.tsx`

### 只有 1-2 个文件的子目录（过度拆分信号）

- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\utils\` — 1 个文件
- `C:\can\nop\nop-chaos-flux\packages\ui\src\hooks\` — 1 个文件
- `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\hooks\` — 1 个文件
- `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\preview\` — 1 个文件
- `C:\can\nop\nop-chaos-flux\packages\flux-core\src\schema-diagnostics\` — 2 个文件
- `C:\can\nop\nop-chaos-flux\packages\flux-core\src\workbench\` — 2 个文件
- **建议**:
  - 若这些目录没有明确 owner boundary 或扩展计划，优先并回父层；
  - 若是预留边界，至少在包内保持命名一致，避免“一文件一目录”的虚假模块化。

## 4. 文档-代码偏离清单

### 已修复偏离

1. `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts`
   - **文档定义**: assembly layer，仅负责 wiring / top-level factory composition / stable exports。
   - **当前代码**: 已恢复为薄入口，runtime factory 已迁出。
   - **偏离程度**: 已对齐。

2. `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\source-registry.ts`
   - **文档定义**: source registration / replacement / invalidation / debug snapshot ownership。
   - **当前代码**: formula controller 与 result-mapping 执行逻辑已迁回 `data-source-runtime.ts`。
   - **偏离程度**: 已对齐。

### 基本对齐

- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-runtime.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-runtime-core.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-runtime-handlers.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\request-runtime.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler.ts`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\schema-compiler\shape-validation.ts`

这些文件虽然偏大，但当前职责归属总体仍与 `C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md` 一致，未单独判为边界偏离。
