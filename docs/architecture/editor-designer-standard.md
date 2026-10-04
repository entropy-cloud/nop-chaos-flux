# Editor/Designer 实现规范（八层契约）

> 状态标注：`docs/architecture/` 只描述当前最新设计状态（最终方案、选择原因、拒绝的替代方案）。
> 本文是跨 editor/designer 家族**实现契约**的 owner doc；各家族作为产品的功能路线不在本文。
> Source roadmap：`docs/backlog/editor-designer-standardization-roadmap.md`（§6 Phases 总表是执行状态唯一权威）。

## 1. 定位与适用范围

本规范回答一个问题：**一个合格的 editor/designer 家族必须复用哪些共享契约、哪些部分保留域内自治**。

- 适用对象：一切"编辑态/运行态"设计器家族——当前八家族 flow、page、report、spreadsheet、word、scada、dashboard、print，以及未来新家族。
- 不适用：普通业务渲染器（button/table 等）——它们走 `RendererDefinition` 常规契约，不因暴露能力而升级为设计器家族（见 `capability-projection-manifest.md` "Relationship To Renderer-Level Contracts"）。
- 权威分工：会话内核细节归 `editor-core.md`；Shell 细节归 `designer-workbench-shell.md`；manifest 细节归 `capability-projection-manifest.md`；inspector 细节归 `report-designer/inspector-design.md`；INV-1~5 归 `new-renderer-introduction-audit.md`。本文只管跨家族契约收敛与豁免登记。
- 新家族入场：按 `new-renderer-introduction-audit.md` 流程，逐层对照本文 §2 八层契约核对；P5.1 符合性守卫落地后，缺契约即红（门禁棘轮只增不减）。

## 2. 八层契约

每层标注分级：**MUST** = 家族必须满足，豁免须走 §5 流程登记；**SHOULD** = 默认要求，偏离须在家族文档记录理由。

### 2.1 会话内核（MUST）

- working/committed 双态隔离 + undo/redo diff 命令栈 + 事务 + manual/auto 提交策略，一律经 `@nop-chaos/editor-core`（`createEditorCore` + `EditorDomainAdapter`）。
- 域只写 adapter：`load`/`serialize`/`validate`/`diff`/`applyDiff`（forward/inverse 对称），可选 `domainCommands`/`getDocumentIds`。
- 域 state（working/undo 栈/selection）不进 flux scope（INV-4）；React 消费走 `useSyncExternalStore(core.subscribe, core.getState)`。
- 验收观测点：包内不再存在自研快照/命令栈（豁免登记的除外）；`editor-core` 在家族 `package.json` 依赖中；adapter 的 diff 对称性有单测。

### 2.2 Shell（MUST）

- 三栏工作台一律由 `WorkbenchShell`（`packages/flux-react/src/workbench/workbench-shell.tsx`）槽位组合：header/leftPanel/canvas/rightPanel/dialogs（+ 可选 footer 底栏槽，持久状态栏 chrome；P2.2 增）。
- 面板存在性由家族 config 驱动（`designer-workbench-shell.md` family mapping）；collapsed rail、resize、View-mode 面板规则沿用该 doc，家族不得重写。
- 画布引擎（xyflow/leafer/canvas-editor/自研 grid）是家族私有实现，只经 canvas 槽进入 shell。
- 验收观测点：家族页面渲染器 import `WorkbenchShell`；`docs/architecture/` 下无手拼三栏的自研 shell。

### 2.3 Manifest（MUST）

- 每家族一份 `HostCapabilityProjectionManifest`（family 名 + semver version + projection 形状 + capabilities 方法契约）+ 挂到 publishing owner `RendererDefinition.hostContract`。
- capability publication 声明 region 归属（`capability-projection-manifest.md` Publisher/Attribution 规则）；方法清单与 §2.5 命令面一一对应。
- 验收观测点：`grep` 可见 `*_MANIFEST_V1`；`resolveHostContractManifest` 能从 owner definition 解析出具体 manifest。

### 2.4 Scope 对外 publish（MUST）

- 对外只读投影经 `useHostScope(scopeData, path, familyLabel)`，label = family 名；域内 state 不进 scope（INV-4），投影只读。
- 运行状态经 `useStatusPathPublication`（kind = family 名），统一含 `dirty`/`busy`/`error`/`canUndo`/`canRedo`/selection 摘要。
- 验收观测点：家族页面渲染器调用这两个 hooks；statusPath 形状覆盖上述六个键。

### 2.5 命令面（MUST）

- `actionScope.registerNamespace(family, provider)`；方法清单与 manifest capabilities 一一对应（validator 用 manifest shapes 校验）。
- 验收观测点：provider 注册的 method 集合 == manifest `capabilities.methods` 键集合。

### 2.6 事件面（MUST）

- 宿主事件经 `helpers.dispatch` + `RendererDefinition.eventContracts` 声明；命名 `<family>:<event>`。
- **save 事件 payload 统一 `{ serialized: string }`**（family 序列化文档的 JSON 字符串）。
- 最小事件集 = `ready` / `error` / `sessionChange` / `save`；`selectionChange`/`modeChange`/`load` 按需补充，一旦补充须入 eventContracts。
- **禁用裸 DOM `CustomEvent` 作宿主契约**；测试专用通道（如 `nop-designer:test-*` window 事件）须在本家族文档或 eventContracts 处显式豁免声明，不得无声存在。
- **最小事件集适用性（P3.2 裁决③适用性澄清，非豁免）**：最小事件集治理**推送型**事件面。pull 型家族（flow/spreadsheet/report——save 走 §2.5 命令面）经 capability（save）+ §2.4 statusPath（ready=busy/idle、error）满足，不强制新增推送事件；word 为混合型判例（save 经 `word-editor:save` 命令面触发后经 onSave 推送回执）。`sessionChange` payload 词汇：至少含 `{canUndo, canRedo, selection, mode}`（scada 现状），可含家族会话摘要附加键（dashboard 另含 `dirty`——EditorSessionState 直出，additive 方向）。
- **save payload 键迁移纪律（裁决③落地注）**：键迁移须留一个版本兼容读（旧键保留/双键同值，description 注记 deprecated）+ dev log 声明；旧键删除归后续治理轮。
- 验收观测点：eventContracts 声明的事件名/ payload 形状与实际 dispatch 一致；全仓 `new CustomEvent(` 在 renderer 包内无未豁免命中。

### 2.7 注册与元数据（MUST / SHOULD 分档）

- （MUST）`RendererDefinition`（propContracts + eventContracts + actionScopePolicy）经 `registerRendererDefinitions` 注册；家族不维护绕开全局 registry 的私有实例注册表，除非 §5 豁免登记。
- （MUST）palette 目录声明式：来自注册表/家族 config 元数据，禁止代码内硬编码清单或代码内白名单。
- **palette catalog 共享契约（P4.1）**：`packages/flux-react/src/workbench/palette-catalog.ts`（`buildDesignerPaletteCatalog` 声明 entries × registry 在场过滤；`resolvePaletteLabel` labelKey→label→type 回退）。家族声明单一源常量（如 `DEFAULT_DASHBOARD_PALETTE_CATALOG`）经 builder 生效；未注册 type 自动隐藏。**家族裁定**：dashboard=声明常量 + builder（原组件内硬编码清单消灭）；scada=符号注册表（`listScadaSymbols`）既存合规；flow=家族 config（`DesignerConfig.palette.groups`）既存合规；spreadsheet 无 palette；**page-designer 合规裁定**——`buildPaletteItems(registry, stage, {allowlist})` 全量 registry 驱动 + `MVP_PALETTE_TYPES` 导出声明清单（= 布局类型 + DESIGNER_SCAFFOLDS 键集），roadmap §3 "代码内白名单" 表述过时（白名单即 stage 类别声明常量 + host allowlist 出口，声明式合规）。
- （SHOULD）inspector 优先 propContracts→SchemaInput 声明式生成（参照 `page-designer-core/src/inspector-schema.ts`）；域内特殊控件走扩展点，不整体手拼。
- 验收观测点：palette items 有单一声明源；inspector 面板由 schema 生成器产出或登记豁免。

### 2.8 消费侧（SHOULD）

- 句柄注册用共享 helper（统一形状：save/undo/redo/serialize…），不逐家族复制 use-editor-handles。
- playground 宿主胶水走统一 designer host factory（registry recipe 声明式），不逐页手抄 register 清单。
- i18n 键 `flux.<family>.*`；testid 沿用 `meta.testid` + `data-slot` / `nop-<family>-*` marker 约定（`renderer-markers-and-selectors.md`）。
- 验收观测点：`apps/playground/src/pages/*-demo.tsx` 无逐页 `createDefaultRegistry()` 手拼；句柄文件来源唯一。

## 3. 正面清单（应标准化，全部已裁定）

| 维度                     | 裁定                             | 依据                                                                                                            |
| ------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 会话/undo/提交内核       | 标准化（editor-core 单一事实源） | 四套自研语义同构；editor-core 已被多家族验证；唯一缺口 `replaceUndoTop`/coalesce 已立 work item（roadmap P1.0） |
| WorkbenchShell           | 标准化                           | 四家族先例 + shell owner doc 定版                                                                               |
| Manifest/hostContract    | 标准化                           | 类型已进 flux-core 并被编译器校验消费                                                                           |
| scope 投影/statusPath    | 标准化                           | hooks 现成                                                                                                      |
| 事件/save payload        | 标准化（§2.6 定版词汇）          | 三套 payload 键并存，宿主无法写通用保存接线                                                                     |
| 渲染器注册               | 标准化（既有事实标准）           | 例外仅限 §5 登记的豁免                                                                                          |
| palette/inspector 元数据 | 标准化为声明式，分两档推进       | palette registry 驱动全量可行；inspector 生成器先共享、采纳按家族节奏                                           |
| 句柄/action provider     | 标准化（共享 helper）            | 复制体已出现（dashboard←industrial），漂移实证                                                                  |
| playground 宿主胶水      | 标准化（factory）                | 逐页手抄 register 清单是 registry 漂移温床                                                                      |

## 4. 负面清单（明确不标准化，域内自治）

以下各域保留自治，**禁止**为它们引入统一抽象层：

- 画布引擎：xyflow / leafer / canvas-editor / 自研 grid。
- 域 diff 模型：ScadaConfigDiff / TreePatch / DashboardLayoutDiff / 报表模板 codec。
- flow tree-mode 的 epoch/ack 回写协议。
- ELK 布局。
- 公式引擎。
- 报表↔电子表格双核同步内部机制（report 会话迁 editor-core 后自然消解对外漂移）。
- 选择模型的**域语义**：node-id / caret / cell-range / element-id 各域自有——只统一"selection 存于 EditorSessionState 并可修剪"这一容器形状。
- 实时协作（当前无此需求；未来需要时另立 owner doc）。

## 5. 豁免流程与豁免登记表

### 5.1 豁免流程

1. 提出豁免的家族必须成文：豁免哪几层、替代契约是什么（如 props 契约文档档）、恢复路径或"永久豁免"结论。
2. 豁免登记进 §5.2 表（或 P0.1 裁决记录，见 §6）；结构变更（负面清单新增/裁决改判）需人确认后修订 roadmap §5。
3. P5.1 符合性守卫按豁免档检查豁免家族（守卫只做契约存在性与一致性断言，不做视觉断言）。
4. 新家族默认无豁免；申请豁免走第 1~3 步。

### 5.2 豁免登记表

| 家族           | 豁免层                                                                                                       | 替代契约                                                                                                                                                                                                                                              | 结论                          | 恢复路径                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| flow-designer  | §2.1 会话内核（自研 history：`flow-designer-core/src/core/history.ts`，上限 50，含 viewport 不入栈等域语义） | 自研栈保持域内语义；杂项清理（死 peerDep、杂散事件、测试事件声明化）由 roadmap P4.5 执行                                                                                                                                                              | 正式豁免（裁决①，2026-10-04） | 若未来 editor-core 覆盖 viewport 语义且回归面（1400+ 测试）可控，可重议迁移；此前按豁免档接受 P5.1 守卫检查 |
| page-designer  | §2.2 Shell（手拼 aside/Tabs）、§2.3 Manifest、§2.4 scope 投影、§2.7 全局注册（私有 registry）                | "与宿主应用零共享"隔离架构（L6 S1 已过 gate 裁定）；登记契约 = `PageDesignerProps` 四 prop + `exportedJson` 导出产物，已成文：`docs/components/page-designer/design-architecture.md`「对外 props 契约（豁免档）」（P2.3，plan 551）                   | 正式豁免（裁决②，2026-10-04） | page-designer 若需要对外 scope publish/manifest（平台化诉求出现时）重议迁入八层契约                         |
| print-designer | §2.2 Shell、§2.3 Manifest、§2.4 scope 投影、§2.7 全局注册（裸组件导出）                                      | 登记契约 = `PrintDesignerProps` 三 prop（`onTemplateChange` = commit/受控回写通道），已成文：`docs/components/print/design.md`「对外 props 契约（豁免档）」（P2.3，plan 551）；editor-core 内核消费保持（StrictMode dispose 裁定见 `editor-core.md`） | 正式豁免（裁决②，2026-10-04） | print-designer 平台化（需要 manifest/scope 出口）时重议                                                     |

> 登记纪律：后续新增豁免必须加行进本表；豁免不是暗债，P5.1 守卫按本表生成豁免白名单。

## 6. 三项前置裁决记录（P0.1，2026-10-04）

### 裁决①：flow-designer 自研 history

- **结论：豁免，保持自研 + P4.5 清理杂项。**
- 理由：flow history 先于 editor-core 存在，含 viewport 不入栈等域语义；迁移收益与 1400+ 测试回归面不成比例；editor-core 当前无合并 API 之外的额外诉求。
- 拒绝的替代方案：立即迁 editor-core——需先补 viewport 语义 + 全量回归，风险/收益不成立；保持但不清杂项——死 peerDep 与未声明测试事件属确认漂移，必须修（P4.5）。

### 裁决②：page-designer / print-designer "独立组件"形态

- **结论：成文为正式豁免档（§5.2），不迁 WorkbenchShell/manifest/scope 投影。**
- 理由：page-designer 隔离架构是 L6 S1 已过 gate 的人工裁定（"与宿主应用零共享"）；print-designer 为嵌入式打印设计组件。两者当前无对外 scope/manifest 平台诉求；强行迁入会破坏已过 gate 的边界且无消费者受益。
- 拒绝的替代方案：迁入八层契约——无平台化诉求支撑，属为标准化而标准化；默认放任不登记——违反"豁免必须成文"纪律，会产生暗债。
- 附带义务：两者的 props 契约（对外出口面）须在各自文档中成文（P2.3 执行）；P3.1 中 print 若维持裸组件则走 props 契约文档档而非 manifest。

### 裁决③：事件词汇与 save payload

- **结论：save payload 统一 `{ serialized: string }`；最小事件集 `ready`/`error`/`sessionChange`/`save`；命名 `<family>:<event>`；禁用裸 DOM CustomEvent 作宿主契约（测试通道须显式豁免声明）。**
- 理由：`serializedConfig`（scada）/`serialized`（dashboard）/`SavedDocumentData`（word）三套并存，宿主无法写通用保存接线；`serialized` 已有 dashboard 先例且语义直白。
- 拒绝的替代方案：保留 `serializedConfig`（键名冗长且 scada 专属）；每家族自定义 payload 类型（正是当前漂移态）。
- 落地约束：payload 键迁移留一个版本兼容读 + dev log 声明（roadmap §7 P3.x；执行归 roadmap P3.2）。

## 7. 引用关系

- 会话内核 API/迁移矩阵：`docs/architecture/editor-core.md`（§6 迁移矩阵是 P1.x 迁移的验收输入）。
- Shell 槽位/family mapping/collapsed rail：`docs/architecture/designer-workbench-shell.md`。
- Manifest 形状/解析/编译校验：`docs/architecture/capability-projection-manifest.md`。
- Inspector 声明式生成参照：`docs/architecture/report-designer/inspector-design.md`、`packages/page-designer-core/src/inspector-schema.ts`。
- 不变式与入场审计：`docs/references/new-renderer-introduction-audit.md`（INV-1~5）。
- 执行编排与状态：`docs/backlog/editor-designer-standardization-roadmap.md`（§6 Phases 总表）、`missions/editor-designer-standardization.json`。
