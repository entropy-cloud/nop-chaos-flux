# 逐组件审计 Checklist 与审计卡模板（Component Audit Checklist）

> 驱动方：`docs/backlog/component-audit-roadmap.md`（mission: `missions/component-audit.json`）
> 用途：定义"单个渲染器组件"审计的 18 维检查清单、审计卡记录模板、优先级裁决与自动修复规则、记录规范。
> 上轮 `audit-remediation` 的维度矩阵（包簇 x 维度）见 `docs/audits/audit-remediation-scope-and-dimension-matrix.md`；本文件是其组件级补查 + 自动修复的执行细则。

## 1. 审计单元与记录位置

- 审计单元：**单个注册 renderer type**（如 `select`、`crud`、`combo`、`ai-chat`）。一个组件一张审计卡。
- 审计卡位置：`docs/audits/per-component/<renderer-type>.md`（按 type 命名，扁平目录）。
- 覆盖清单：以 `docs/backlog/component-audit-roadmap.md` 的组件清单为准；审计前先核对注册定义（`*-renderer-definitions.ts` / `definitions.ts` / `schemas.ts`），清单与实际注册不一致时在 C0 阶段修正。
- 每个 work item 完成后，其覆盖组件的审计卡全部存在且标注状态，才算闭环。

## 2. 18 维检查清单

每维三列输出：**结论**（pass / fail / n-a）、**证据**（`文件:行`）、**发现**（具体问题描述）。

| #   | 维度                        | 检查要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | definition `type`/`defaultSchema`/`fields`/`deepFields`（或新 fieldRules）与 schemas.ts 类型一致；每个 prop 有默认值/类型/语义；缺失 prop 的降级路径；`__nopPreserveLiteral` envelope 消费正确                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2   | RendererComponentProps 合规 | 只从 `props.props/meta/regions/events/helpers` 取数；不直接访问 store；用标准 hooks（`useRendererRuntime`/`useScopeSelector`/`useCurrentForm`/`useCurrentPage` 等）；无 ad-hoc context / prop-drilling 替代                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 3   | 值所有权三态                | local/controlled/scope 三态完整路径；受控 echo；重置/清空；默认值（`defaultValue`/`initValue`/`valueStatePath`）；越界 clamp；owner 归属声明与实际一致                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 4   | 表单参与（form 字段类）     | name/required/validation 挂接；disabled/visible 响应；提交路径数据形状；校验错误展示与清除；field metadata（`data-field-*`）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5   | DOM 与选择器契约            | marker class 唯一性与注册；`data-slot`/`data-field`/`data-renderer`/`data-value`/`data-testid`/`data-cid`/`data-field-*` 状态属性输出正确；与 `docs/architecture/renderer-markers-and-selectors.md`（:90-102 选择器契约、:95 `data-renderer`、:156-159 `data-field-*`）及 08-01 field-selector 契约（`docs/plans/2026-08-01-flux-field-selector-contract.md`，completed）对齐；下游 FluxAdapter 可直读；辅助脚本 `check:audit-missing-renderer-markers`                                                                                                                                                                                                                                                                                                                                                                                            |
| 6   | 嵌套 schema 分类            | props 内嵌 schema/action 结构按 08-02 机制（`docs/plans/2026-08-02-1-nested-schema-field-classification.md` / `2026-08-02-2-nested-schema-mechanism-unification.md` / `2026-08-02-3-ajax-validation-migration.md`，依据 `docs/architecture/nested-schema-field-classification.md` v8）正确分类（event/action → 模板保持、schema → region 语义、value → 表达式）；无 deepFields 残留声明；行 scope 不污染嵌套 action args                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | 事件与 action 契约          | 派发事件 payload 形状与文档一致；custom payload 字段保留（normalizeActionEvent 语义）；action args 模板保持；内建动作（refreshNearest 等）注册齐全                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 8   | a11y                        | role/aria-label 语义正确（含动态内容的 aria-live）；键盘完整操作路径（非仅 tab 序）；焦点管理/焦点陷阱；读屏文本；对比度（disabled/error 态可区分）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 9   | i18n                        | 无硬编码文案；`t()` key 在全部 locale 存在；aria-label/title 也走 i18n；复数/占位符参数正确                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 10  | 四态覆盖                    | 空态（无数据/无选项/空值）、加载态、错误态（失败/超时）、禁用态（disabled/readOnly/只读）各自渲染正确且不崩溃                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 11  | 异步生命周期                | loadAction/远程搜索/流式请求：abort/取消、竞态保护、失败写 error 状态、重试路径、超时、并发去重；Promise 不裸奔（void/await/catch 一致）；辅助脚本 `check:audit-async-failure-paths`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 12  | 组合宿主场景                | 组件在 CRUD 行 / form 内 / dialog 内 / tabs 内 / table cell / 无 scope 上下文 的行为；行 scope 求值正确性；**每族至少 1 个真实浏览器场景**（programmatic DOM 断言，不用截图；含 1 个"单测绿但真实浏览器失败"的针对性检查，参照 bug 73）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 13  | 样式契约                    | 布局 renderer 仅 marker 类（无硬编码 `gap-4`/`p-4`/`flex`/`grid`）；widget renderer 自样式；无 BEM；`cn()` 合并；`stack-*`/`hstack-*` 别名；主题独立（无 React ThemeProvider）；辅助脚本 `check:audit-styling-suspects`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 14  | React 19 规范               | 无冗余 useCallback/useMemo（Compiler 基线）；无 effect+setState 镜像；渲染期派生优先；events 用 latest-ref；无 key 不稳定/数组索引 key 风险；辅助脚本 `check:audit-react19-optimization-candidates`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 15  | 性能边界                    | 大列表/大表格渲染路径；selector 精度（避免整树重渲染）；监听器/订阅清理；无限循环风险；O(n²) 热点；辅助脚本 `check:audit-performance-suspects`、`check:audit-reactive-render-reads`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 16  | 测试质量                    | focused 单测断言**正确行为**（非仅 not-throw）；DOM 契约断言存在（data-\* / marker / data-slot）；错误路径与四态有测试；E2E 场景存在（playground 页 + spec）；变异敏感点被覆盖；辅助脚本 `check:audit-test-global-leaks`、`pnpm audit:mutants`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 17  | 文档对照                    | design.md ↔ 实现 props/行为一致；quick-reference.md 词条存在且准确；schemas/flux-guide 文档与实现同步；无 phantom 引用（`文件:行` 可验证）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 18  | 注册、包边界与 IO/安全红线  | 包内定义注册 + surface 双注册齐全；bundle/`src/index.ts` 导出；playground 演示页存在；依赖方向合规（不反向依赖）；复用 `@nop-chaos/ui` 组件（禁裸 HTML）；**env IO 边界（INV-1）**：渲染器外部 IO（fetch/XMLHttpRequest/WebSocket/EventSource/localStorage/sessionStorage/IndexedDB/RTCPeerConnection/window.open/history.pushState/import() 等）必须经 `RendererEnv`，禁直接调用浏览器 IO API（`docs/references/new-renderer-introduction-audit.md` INV-1）；复用边界（INV-3/INV-4）：不重造 FormRuntime/action/dialog 现有能力、域内部 state 不进 schema-visible scope；安全红线：dangerouslySetInnerHTML sanitize、URL 协议校验、附件名/路径；辅助脚本 `check:audit-runtime-raw-schema-reads`、`check:audit-fieldframe-bypasses`、`check:audit-hardcoded-type-dispatch`、`check:audit-non-retained-renderer-references`、`check:audit-suspects` |

## 2.1 Industrial 包专项审计维度（v2 增量）

> 来源：`docs/plans/2026-08-08-1527-2-industrial-hmi-hca-ll-lesson-sink.md`（HCA-LL lesson 沉淀，2026-08-08）。
> 适用范围：`@nop-chaos/flux-renderers-industrial` 内部子系统（engine / binding / serialization / symbols / editor），**超出 §2 18 维 renderer checklist 覆盖范围**的部分。Renderer 壳（scada-canvas / scada-editor-canvas）仍用 §2 18 维；本节是内部模块层（非注册 renderer）的补充检查点，与 `docs/skills/deep-audit-prompts.md` 23 维包级深审并用。
> 每维度含「检查什么」+「对应 bug 卡回链」（`docs/bugs/77–85`）。回链格式：`bug #NN (主题)`。

### IND-1 Canvas 场景图引擎

| 检查点                | 检查什么                                                                                                                                                                                                    | bug 卡回链                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 全量重建路径 parity   | 所有「全量重建」公共 API（`importConfig` / `reset` / `load`）必须委托到 canonical `reset` 路径，后置处理（应用 `config.background.color` 到 ground + 清 InteractionOverlay）一致，勿另起 build 路径旁路清理 | bug #82 (HCA2 P2-ENG-1)                                   |
| 覆盖物生命周期        | InteractionOverlay（hover 高亮 / 连线 drag / 选中框）在重建/销毁/取消时必须清除，无残留；全量重建路径与 reset 清覆盖物语义一致                                                                              | bug #82 + HCA-CR HCA11-P2-2                               |
| pointer 挂载层级      | 拖拽类手势的 pointerup 必须挂 `window`（非 container），容器外释放时 ref 复位 + overlay 清除；cleanup 兜底 removeEventListener                                                                              | bug #84 邻域 / HCA-CR HCA11-P2-2 (`connection-wiring.ts`) |
| destroyed 门控        | 公共命令族（reset/applyAttrs/setViewport/zoomAt/fit/center/setSize/applyDiff/setSymbolProps）在 engine.destroy 后必须 no-op，不操作已销毁 app                                                               | HCA-CR HCA2-P3-ENG-1                                      |
| error code 分类一致性 | config 校验失败用升级码 `config-invalid`（触发 empty error region）；命令执行失败用命令句柄码 `invalid-config`（不升级）；两码不可混用；`editor-errors.ts` elevated 判定与 `scada-errors.ts` 分类表一致     | bug #77 (HCAX-1)                                          |
| canvas wrapper a11y   | leafer 渲染容器 wrapper div 必须显式 `role="application"` + `aria-label`（i18n key）；以 DOM 属性级断言守护                                                                                                 | bug #78 (HCAX-2)                                          |

### IND-2 数据绑定管线

| 检查点        | 检查什么                                                                                                                                                | bug 卡回链                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 脏收集合帧    | dirty-collector 必须合帧批处理（非每绑定单独刷新）；拆分后各文件 ≤500 行（HCA3 已拆 dirty-collector 104 + expression-errors 65 + refresh-pipeline 469） | HCA3 审计记录（文件行数治理，非 bug 卡） |
| 动画时钟      | animator 时钟源须稳定；值→状态映射在动画进行/取消时正确回退                                                                                             | —（HCA3 零 P0/P1 基线）                  |
| 点表/反向索引 | point-store / reverse-index 增删一致，无悬挂引用                                                                                                        | —（HCA3 零 P0/P1 基线）                  |

### IND-3 序列化校验完整性

| 检查点              | 检查什么                                                                                                                                                                                                                                                                                                       | bug 卡回链                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 三向 wire 类型同步  | 消费侧 `ScadaSymbolProps` ↔ 序列化 `ScadaSymbolNode` ↔ diff `SYMBOL_KEYS` 三者字段集须一致；新增 `ScadaSymbolProps` 字段且被 shape create/applyProps 消费时，必须同步声明到 `ScadaSymbolNode` + `SYMBOL_KEYS`；复发类漏键须配机械 guard（`scripts/check-scada-symbol-keys.mjs` 三向断言），勿绕过 `pnpm check` | bug #79 (HCA5 P1-1，已复发 1 次)            |
| 子形状校验          | background.grid 等子形状（`{size:number;color:string}`）必须 assertShape；枚举字段（`align: 'left'\|'center'\|'right'`）必须枚举校验，非静默通过                                                                                                                                                               | HCA-CR HCA4-P3-1 (align) / HCA4-P3-2 (grid) |
| malformed/深度守卫  | validate 对 malformed / 超深嵌套 fail-closed（`MAX_VALIDATE_DEPTH=100`）；NaN 节点字段 finite 守卫                                                                                                                                                                                                             | HCA-CR HCA5-P3-1 / HCA6-P3-4                |
| 错误归因格式 parity | inspector 错误归因路径前缀须与 `validate.ts` 错误字符串逐字对齐（含嵌套 `symbols[N].children[M]` 层级）；用递归 scope path（`findSymbolScopePath`）非父级顶层索引                                                                                                                                              | bug #81 (HCA8 P2-FE-1)                      |

### IND-4 符号库（symbol shapes）

| 检查点                          | 检查什么                                                                                                                                                                                                                                                 | bug 卡回链                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| applyProps 路由 / extent-resize | 自定义 `applyProps` 借用 `applyCompositeProps` 且 parts 无 `extent` 字段也无 `parts.resize` hook 时，composite 框架 `EXTENT_FIELDS` 静默丢弃 `width`/`height`——必须自行重算 body/stub 几何；create↔applyProps 几何公式必须一致（failing-first 测试锁定） | bug #80 (HCA6 P2-1)                      |
| composite 族图元完整性          | 逐图元核查 extent(3) 或 resize hook(9) 注册，无静默丢弃尺寸的缺口                                                                                                                                                                                        | bug #80 复核（12 composite 全覆盖）      |
| 视觉状态 revert                 | visual-state binding-vs-revert 边缘 case 须有 fallback（已记录非新缺陷）                                                                                                                                                                                 | HCA-CR HCA5-P3-3 (out-of-scope)          |
| custom 深克隆隔离               | 所有 config/node clone 路径必须深克隆 `custom`（`structuredClone(node.custom)` 或 `cloneConfigSnapshot` 整体）；`children` 已递归，`custom` 同样必须深克隆，浅克隆致 working copy 串改多份快照                                                           | bug #85 (HCA11 P2-1) + HCA-CR HCA11-P3-1 |

### IND-5 编辑器子系统

| 检查点                              | 检查什么                                                                                                                                                                                                                                    | bug 卡回链                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| undo-redo 事务边界 / 合并窗口不变量 | ① coalesce-merge（`replaceUndoTop`）= 新提交，必须截断 redo（`this.redoStack = []`，U6，与 push 同语义）；② coalesce 必须拒绝它无法完整搬运载荷的 diff（`singleNodeUpdate` 拒绝带 `variables`/`reordered` 的 diff，因合并只构造 `updated`） | bug #83 (HCA10 P1-1 + P2-1)             |
| import/load 跨点 parity             | 所有 import/load 入口（`runtime-mutators.load` / `toolbox-runtime.importConfig` / …）在 `engine.build` 后必须同步 `engine.mode → session.mode`（P1-08 parity）；新增入口复制此 setMode 同步                                                 | bug #84 (HCA11 P1-1)                    |
| 快照 custom 隔离                    | 见 IND-4 custom 深克隆隔离（跨站点：session / working-helpers / mutators / undo-redo-adapter）                                                                                                                                              | bug #85 (HCA11 P2-1)                    |
| 错误归因格式 parity                 | 见 IND-3 错误归因格式 parity（inspector↔validate 跨边界）                                                                                                                                                                                   | bug #81 (HCA8 P2-FE-1)                  |
| pointer 挂载层级                    | 见 IND-1 pointer 挂载层级（connection-wiring 容器外释放）                                                                                                                                                                                   | HCA-CR HCA11-P2-2                       |
| 状态机正确性                        | connection pick/drag/release 状态机、吸附阈值、联动重算、覆盖物 sky 渲染清理须闭环                                                                                                                                                          | HCA9 审计记录（#1 watch-only residual） |

### IND-6 跨切关注（cross-cutting）

| 检查点           | 检查什么                                                                                                                                                     | bug 卡回链                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 跨点 parity 识别 | 同语义多入口（import/load/rebuild/setMode/clean-overlay）须交叉比对所有站点；单点修复不闭合，须全站点对齐                                                    | bug #82 + bug #84 + HCA-CR |
| 复发配机械 guard | 标记为「复发」的 bug（bug #79 第 2 次复发 / bug #82 复发 P2-10 / bug #84 复发 P1-08 / bug #85 R5 多站点残留）必须配机械 guard 脚本或显式跨点审计，非仅点修复 | bug #79 / #82 / #84 / #85  |
| 全量重建语义统一 | 见 IND-1 全量重建路径 parity                                                                                                                                 | bug #82                    |

### 与 §3.1 优先级裁决的 industrial 补充（裁定方法论）

> 来源：HCA-CR 24 residual + 2 watch-only 裁定表（`docs/plans/2026-08-08-1430-2` §裁定结果 / §Deferred But Adjudicated）。这是「同类问题如何裁定」的现成教材。

- **防御纵深 vs 真实缺陷边界**：当主路径已有前置守卫（validator 拒绝重复 id / validate `MAX_DEPTH` fail-closed / validate finite 守 NaN / compositePropSchema 验证），冗余 guard 缺口在「无可复现路径」时裁定 **watch-only residual**（附 Why-Not-Blocking + Successor=no），不自动升级 Fix。回链：HCA-CR HCA2-P3-ENG-3 / HCA5-P3-1 / HCA6-P3-4 / HCA8-P3×11。
- **公共 API 可选参数 footgun**：可选参数省略时返旧值/降级是 footgun，但当主路径恒传该参数（renderer 恒传 nextConfig）则主路径无影响，裁定 **watch-only residual**（Successor=no）。回链：HCA-CR HCA2-P3-ENG-2。
- **cosmetic / latent / 低概率时序**：extent 族内边距丢失（cosmetic）/ onError prop 声明但无错误上浮路径（latent）/ 合并窗口 `Date.now()` 非单调（单 tab 短窗口低概率）——不构成 supported baseline 行为缺口，裁定 residual，Successor=no。回链：HCA-CR HCA6-P3-2 / HCA8-P3-PAL-1 / HCA10-P3-1。

## 3. 优先级裁决

| 级别 | 定义                                                                                                         | 处理                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| P0   | 数据丢失/错误提交/崩溃/安全漏洞（XSS、任意 URL）/存储损坏/**违反 CI 或硬性架构红线（含 INV-1 env IO 边界）** | **自动修复**：审计当轮立即修复（test-first），不等批量              |
| P1   | 契约漂移（DOM/marker/schema/事件 shape）、交互缺陷、a11y 阻断、错误行为                                      | **自动修复**：同一 work item 内修复并补测试                         |
| P2   | 体验/文档/测试加固、非阻断 a11y/i18n、性能优化                                                               | 低成本（约 15 分钟内）当场修复，否则入审计卡 backlog 由 CR 自动处理 |
| P3   | 风格 nit、注释、可选优化（**不得以中间态/迁移未完成作为降级理由**）                                          | 审计卡记录即可                                                      |

- 裁决必须在审计卡中留痕；P0/P1 未清零的组件审计卡状态不得为 `closed`。
- 跨组件共享缺陷（如公共 helper、field-frame、编译期）在审计卡中标记 `shared:`；**共性缺陷模式（同一根因影响 ≥2 组件/跨包/公共层）不得默认推给 CR**——执行 agent 必须按 roadmap「自动修复机制」§7 主动插入「共性重构」`CX-n` work item（或合并进现有项/当前 plan 内多阶段优先修复），并在卡内与 plan 中注明决策。**共享依赖但缺陷仅单点落地（根因不在公共层）的 `shared:` 标记可归 CR 汇总；根因在公共层的必须走 CX-n。**
- **自动修复纪律**（roadmap「自动修复机制」节，此处为卡级执行细则）：
  1. 每个缺陷先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；契约/公共层修复必须 "Must automate"。
  2. 每次修复后运行受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`；DOM 契约变更追加 focused 契约测试与 e2e。
  3. 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure → closed`。
  4. 依赖未落地跨 plan 机制的发现（如 08-02 机制）可标「机制落地后复验」延期，但必须显式登记、不得静默跳过，且**由 CR work item 集中执行复验**（见 roadmap CR Phase Details），卡内不得悬挂。
  5. 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

### 与 deep-audit-prompts 23 维的关系

- 本 18 维是**组件级**核对表（每组件每维须有结论），`docs/skills/deep-audit-prompts.md` 的 23 维是**包级/跨组件**深审手册；两者编号不互通。对应关系（本表 → deep-audit 维度，执行时调用其方法）：2→09、3→04+05、4→08、8→20、11→06、13→10、14→07、15→15、16→14、17→16、18→01+02+03+15；本表 **7（事件与 action 契约）在 23 维中无直接对应**，按卡内要点独立执行；其余维度（1/5/6/9/10/12）为本表独有的组件级检查，不映射。
- **复杂交互渲染器**（gantt/kanban/calendar/diff-view/condition-builder/combo 等）必须追加 deep-audit 维度 21（显示与定位正确性）/22（集成接线与可操作性）/23（测试有效性与假绿）——`deep-audit-prompts.md` 标注"含复杂交互渲染器时必选"。
- 包级维度（01 依赖图/02 模块职责/03 API 表面积/17 命名/18 跨包模式）不在组件卡内逐项判，但在 CR 阶段对 `shared:` 缺陷统一裁决时调用。
- **§2.1 industrial 专项维度（v2 增量）**与 23 维的关系：§2.1 是 industrial 包内部子系统（engine/binding/serialization/symbols/editor）的检查点，超出 18 维 renderer checklist 覆盖范围；与 23 维包级深审并用而非互斥——23 维提供方法论（每个维度的深挖+复核流程），§2.1 提供 industrial 特有的检查点清单与 bug 卡回链。§2.1 IND-1~IND-5 与 23 维对应：IND-1↔19(错误传播)+20(a11y)+21/22(复杂交互)；IND-3↔08(验证系统)；IND-4/IND-5↔04(状态所有权)+21/22；§2.1 裁定方法论↔§3.1 优先级裁决。

## 4. 审计卡模板

```md
# 审计卡：<renderer-type>（<package>）

> 状态: open | fixing | fixed-pending-closure | closed
> 审查日期: YYYY-MM-DD
> 审查 plan: <plan 文件>
> 注册定义: <path:line> | 渲染器: <path:line> | design.md: <path> | playground: <路径> | e2e: <路径>

## 组件身份

<type / 包 / schema 类型 / 默认值摘要 / 表单参与? / 布局 or widget?>

## 18 维审查记录

| # | 维度 | 结论 | 证据 | 发现 |

## 发现清单

- [P0-1] <描述>（`文件:行`）→ 状态: fixed
- [P1-1] <描述>（`文件:行`）→ 状态: ...

## 组合宿主场景（真实浏览器验证）

- 场景: <在 X 内使用 Y> | 断言: <DOM programmatic 断言> | 结果: pass/fail + 证据

## 修复记录

- plan / commit / 验证命令输出（typecheck/build/lint/test 相关项）
- test-first 证据: <复现测试文件:行 先于实现 commit> / <实现 commit>

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
```

## 5. 记录规范

- 审计卡文件名 = renderer type；一个文件一次审计（更新同文件，不生成日期副本）。
- **命名偏差声明**：审计卡是"持久台账"（非 `docs/audits/00-audit-execution-guide.md` 定义的一次性审计记录 `YYYY-MM-DD-HHmm-<kind>-<topic>.md`），由 roadmap 明确定位为 mission 生命周期内的累积台账，故文件名不采用时间戳；但**每次 closure audit 记录本身**仍按执行指南命名（`YYYY-MM-DD-HHmm-closure-audit-<component>.md`），审计卡 Closure 节记录其位置。
- 发现编号 `P<n>-<seq>` 在卡内递增；`shared:` 前缀标记跨组件问题。
- 每族 work item 的 plan 内必须包含：覆盖组件列表、18 维核对表、真实浏览器场景清单、Exit Criteria（审计卡全部 closed + 相关命令绿）。
- 复用既有 skill：`docs/skills/deep-audit-prompts.md`（23 维深审，复杂交互渲染器必选 21-23）、`docs/skills/open-ended-adversarial-review-prompt.md`（对抗式）、`docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`、`docs/skills/react19-best-practices-review.md`、`docs/skills/ux-design-pattern-audit-prompt.md`、`docs/skills/code-quality-audit-prompt.md`。
- 审计工具脚本基线在 C0 统一跑取并记录；各维度的脚本提示见第 2 节维度表。
