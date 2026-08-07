# 逐组件审计 Checklist 与审计卡模板（Component Audit Checklist）v2

> 驱动方：`docs/backlog/component-audit-roadmap.md`（mission: `missions/component-audit.json`）
> 用途：定义"单个渲染器组件"审计的 18 维检查清单、审计卡记录模板、优先级裁决与自动修复规则、记录规范。
> 上轮 `audit-remediation` 的维度矩阵（包簇 x 维度）见 `docs/audits/audit-remediation-scope-and-dimension-matrix.md`；本文件是其组件级补查 + 自动修复的执行细则。
> **版本 v2（2026-08-06，CG work item「checklist v2」修订）**：v1 冻结于 C0（2026-08-02），C0–C9 + CX-1..CX-12 执行后按执行证据修订；历史审计卡不回写，仅本文件与 `docs/audits/per-component/README.md` 模板同步为 v2。

## 变更摘要（v1 → v2）

| 维度                 | 变更                                                                                                                                                                                                                                                                                                         | 依据（执行证据）                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 5 DOM 与选择器契约   | 增补：data-slot 唯一性检查（根节点重复 data-slot vs FieldFrame 包裹，裁决"被包裹 → 移除根节点重复"）                                                                                                                                                                                                         | p2p3 Phase 3：15 文件修复 + 8 卡 P3-1 回写（test-first 14 例）                                   |
| 7 事件与 action 契约 | 增补：schema 事件派发必须携带 `{ event, evaluationBindings, scope }` ctx 作为第二参（runtime args 求值仅合并 evaluationBindings+scope，模板键可解析验证）；`kind:'reaction'` 字段三件套接线（reactionsRef 捕获 + `ready()` 激活 + ComponentHandle 注册）；既有豁免裁决（原生 DOM 事件转发/空参派发）留痕规则 | bug 83 + CX-10（ai 族 23 处）+ CX-12（scheduling ~25 处）；CX-9/CX-12 reaction 接线（bug 79/85） |
| 9 i18n               | 增补：eslint 盲区记录（`words.exclude` 第 1 盲区已修 `^(?!.*[\\u4e00-\\u9fa5])[\\s\\d\\W]*$` 防 CJK JSX 文本漏检；`aria-.*` 与 `jsx-text-only` 两盲区为已知限制）+ `rg` 兜底做法（中文字面量/硬编码文案扫描，测试断言除外）                                                                                  | p2p3 Phase 1 盲区修复 + CR Phase 4 i18n 实证清零                                                 |
| 12 组合宿主场景      | 固化：bug 73 专项检查从"每族至少 1 个"升级为**每卡必检**（单测绿但真实浏览器失败模式），host 场景断言用 programmatic DOM 手段（禁截图）                                                                                                                                                                      | bug 73 家族 ×7 卡引用 + 各 C 阶段 host-\* 专项                                                   |
| 16 测试质量          | 增补：事件派发断言要求——双参契约（payload 全等 + ctx 三键），禁止单键 objectContaining 放宽；宿主场景必须断言 action args 模板 `${key}` 真机解析                                                                                                                                                             | C7/C8/C9 事件 ctx test-first 纪律 + ai-feedback P2-2 收紧先例                                    |

> 其余维度措辞按执行经验微调；**维度编号不重构**（历史卡引用不失效）；P0/P1/P2/P3 裁决表与自动修复纪律语义不变（仅措辞）。

## 1. 审计单元与记录位置

- 审计单元：**单个注册 renderer type**（如 `select`、`crud`、`combo`、`ai-chat`）。一个组件一张审计卡。
- 审计卡位置：`docs/audits/per-component/<renderer-type>.md`（按 type 命名，扁平目录）。
- 覆盖清单：以 `docs/backlog/component-audit-roadmap.md` 的组件清单为准；审计前先核对注册定义（`*-renderer-definitions.ts` / `definitions.ts` / `schemas.ts`），清单与实际注册不一致时在 C0 阶段修正。
- 每个 work item 完成后，其覆盖组件的审计卡全部存在且标注状态，才算闭环。

## 2. 18 维检查清单

每维三列输出：**结论**（pass / fail / n-a）、**证据**（`文件:行`）、**发现**（具体问题描述）。

| #   | 维度                        | 检查要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | definition `type`/`defaultSchema`/`fields`/`deepFields`（或新 fieldRules）与 schemas.ts 类型一致；每个 prop 有默认值/类型/语义；缺失 prop 的降级路径；`__nopPreserveLiteral` envelope 消费正确                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2   | RendererComponentProps 合规 | 只从 `props.props/meta/regions/events/helpers` 取数；不直接访问 store；用标准 hooks（`useRendererRuntime`/`useScopeSelector`/`useCurrentForm`/`useCurrentPage` 等）；无 ad-hoc context / prop-drilling 替代                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 3   | 值所有权三态                | local/controlled/scope 三态完整路径；受控 echo；重置/清空；默认值（`defaultValue`/`initValue`/`valueStatePath`）；越界 clamp；owner 归属声明与实际一致                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | 表单参与（form 字段类）     | name/required/validation 挂接；disabled/visible 响应；提交路径数据形状；校验错误展示与清除；field metadata（`data-field-*`）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 5   | DOM 与选择器契约            | marker class 唯一性与注册；`data-slot`/`data-field`/`data-renderer`/`data-value`/`data-testid`/`data-cid`/`data-field-*` 状态属性输出正确；**data-slot 唯一性：被 FieldFrame 包裹（wrap:true）的组件根节点不得重复输出 `data-slot`（裁决"被包裹 → 移除根节点重复"）；独立（未包裹）根节点 data-slot 保留**；与 `docs/architecture/renderer-markers-and-selectors.md`（:90-102 选择器契约、:95 `data-renderer`、:156-159 `data-field-*`）及 08-01 field-selector 契约（`docs/plans/2026-08-01-flux-field-selector-contract.md`，completed）对齐；下游 FluxAdapter 可直读；辅助脚本 `check:audit-missing-renderer-markers`                                                                                                                                                                                                                                                                                                                              |
| 6   | 嵌套 schema 分类            | props 内嵌 schema/action 结构按 08-02 机制（`docs/plans/2026-08-02-1-nested-schema-field-classification.md` / `2026-08-02-2-nested-schema-mechanism-unification.md` / `2026-08-02-3-ajax-validation-migration.md`，依据 `docs/architecture/nested-schema-field-classification.md` v8）正确分类（event/action → 模板保持、schema → region 语义、value → 表达式）；无 deepFields 残留声明；行 scope 不污染嵌套 action args                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7   | 事件与 action 契约          | 派发事件 payload 形状与文档一致；custom payload 字段保留（normalizeActionEvent 语义）；action args 模板保持；内建动作（refreshNearest 等）注册齐全；**schema 事件派发必须携带 `{ event, evaluationBindings, scope }` ctx 作为第二参**（runtime args 求值仅合并 evaluationBindings + scope，模板键 `${key}` 需可解析验证——单参派发 = 模板键静默空值；既有豁免裁决如原生 DOM 事件转发/空参派发必须在卡内显式留痕）；**`kind:'reaction'` 字段三件套接线：reactionsRef 捕获 + `reactions[key].ready()` 激活（含结果捕获/scope 投影）+ `useCurrentComponentRegistry` 句柄注册**（三缺一即未接线，`component:*` 不可解析）；不依赖 useImperativeHandle 形态（flux-react 运行时传 ref 不成立）                                                                                                                                                                                                                                                               |
| 8   | a11y                        | role/aria-label 语义正确（含动态内容的 aria-live）；键盘完整操作路径（非仅 tab 序）；焦点管理/焦点陷阱；读屏文本；对比度（disabled/error 态可区分）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 9   | i18n                        | 无硬编码文案；`t()` key 在全部 locale 存在；aria-label/title 也走 i18n；复数/占位符参数正确；**eslint 盲区已知限制**：`words.exclude` 第 1 盲区已修复（`^(?!.*[\\u4e00-\\u9fa5])[\\s\\d\\W]*$` 防 CJK JSX 文本漏检）；`aria-.*` 与 `jsx-text-only`（JS 字面量不查）两盲区仍存在——**用 `rg` 兜底**：扫中文字面量/硬编码英文文案（测试断言除外），如 `rg "[\u4e00-\u9fa5]" packages/<pkg>/src -g '*.{ts,tsx}' --glob '!**/__tests__/**'` + 硬编码英文抽样                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 10  | 四态覆盖                    | 空态（无数据/无选项/空值）、加载态、错误态（失败/超时）、禁用态（disabled/readOnly/只读）各自渲染正确且不崩溃                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11  | 异步生命周期                | loadAction/远程搜索/流式请求：abort/取消、竞态保护、失败写 error 状态、重试路径、超时、并发去重；Promise 不裸奔（void/await/catch 一致）；辅助脚本 `check:audit-async-failure-paths`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 12  | 组合宿主场景                | 组件在 CRUD 行 / form 内 / dialog 内 / tabs 内 / table cell / 无 scope 上下文 的行为；行 scope 求值正确性；**每卡必检 1 个真实浏览器场景**（programmatic DOM 断言，不用截图）——**含"单测绿但真实浏览器失败"（bug 73 模式）专项检查：CSS 动态类名静态扫描可见性（Tailwind v4）、布局/computed style 实证、StrictMode 双挂载路径（mountedRef 复位/abort/竞态）、dialog/surface 内交互**；场景落 `tests/e2e/component-lab/*-host-surfaces.spec.ts`，卡内「组合宿主场景」节记录 结果: pass/fail                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 13  | 样式契约                    | 布局 renderer 仅 marker 类（无硬编码 `gap-4`/`p-4`/`flex`/`grid`）；widget renderer 自样式；无 BEM；`cn()` 合并；`stack-*`/`hstack-*` 别名；主题独立（无 React ThemeProvider）；辅助脚本 `check:audit-styling-suspects`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 14  | React 19 规范               | 无冗余 useCallback/useMemo（Compiler 基线）；无 effect+setState 镜像；渲染期派生优先；events 用 latest-ref；无 key 不稳定/数组索引 key 风险；辅助脚本 `check:audit-react19-optimization-candidates`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 15  | 性能边界                    | 大列表/大表格渲染路径；selector 精度（避免整树重渲染）；监听器/订阅清理；无限循环风险；O(n²) 热点；辅助脚本 `check:audit-performance-suspects`、`check:audit-reactive-render-reads`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 16  | 测试质量                    | focused 单测断言**正确行为**（非仅 not-throw）；DOM 契约断言存在（data-\* / marker / data-slot）；错误路径与四态有测试；**事件派发断言为双参契约（payload 全等 + ctx 三键），禁止单键 `objectContaining` 放宽；宿主场景必须断言 action args 模板 `${key}` 真机解析**；E2E 场景存在（playground 页 + spec）；变异敏感点被覆盖；辅助脚本 `check:audit-test-global-leaks`、`pnpm audit:mutants`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 17  | 文档对照                    | design.md ↔ 实现 props/行为一致；quick-reference.md 词条存在且准确；schemas/flux-guide 文档与实现同步；无 phantom 引用（`文件:行` 可验证）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 18  | 注册、包边界与 IO/安全红线  | 包内定义注册 + surface 双注册齐全；bundle/`src/index.ts` 导出；playground 演示页存在；依赖方向合规（不反向依赖）；复用 `@nop-chaos/ui` 组件（禁裸 HTML）；**env IO 边界（INV-1）**：渲染器外部 IO（fetch/XMLHttpRequest/WebSocket/EventSource/localStorage/sessionStorage/IndexedDB/RTCPeerConnection/window.open/history.pushState/import() 等）必须经 `RendererEnv`，禁直接调用浏览器 IO API（`docs/references/new-renderer-introduction-audit.md` INV-1）；复用边界（INV-3/INV-4）：不重造 FormRuntime/action/dialog 现有能力、域内部 state 不进 schema-visible scope；安全红线：dangerouslySetInnerHTML sanitize、URL 协议校验（isSafeNavigationUrl 白名单）、附件名/路径；辅助脚本 `check:audit-runtime-raw-schema-reads`、`check:audit-fieldframe-bypasses`、`check:audit-hardcoded-type-dispatch`、`check:audit-non-retained-renderer-references`、`check:audit-renderer-browser-io`（INV-1 直连 IO 零容忍，命中即红）、`check:audit-suspects` |

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
- 复用既有 skill：`docs/skills/deep-audit-prompts.md`（23 维深审，复杂交互渲染器必选 21-23）、`docs/skills/open-ended-adversarial-review-prompt.md`（对抗式）、`docs/skills/unit-test-logic-and-contract-coverage-audit-prompts.md`、`docs/skills/react19-best-practices-review.md`、`docs/skills/ux-design-pattern-audit-prompt.md`、`docs/skills/code-quality-audit-prompt.md`。
- 审计工具脚本基线在 C0 统一跑取并记录；各维度的脚本提示见第 2 节维度表。

## 6. Host 大面审计卡模板（D0 新增，round-2 host 面专用）

> **版本注**：本节由 D0（plan `2026-08-08-0715-1`，2026-08-08）新增，供 D3.1–D3.4（flow-designer / spreadsheet / report-designer / word-editor 四个 host 大面、8 包）逐面审计使用。**既有 18 维组件级 checklist（§2）与组件审计卡模板（§4）语义不改写**——本节是其 host 面降维应用。
> 审计单元：**面（surface feature）**而非注册 renderer type（host 面组件非注册渲染器，无 per-component 卡先例）。面清单见 `docs/audits/host-surface/surface-inventory.md`；范围核对（8 包 src 结构/导出面/宿主 e2e 场景/owner docs 契约基准）见 `docs/audits/host-surface/README.md`。审计卡存放：`docs/audits/host-surface/<surface>.md`。

### 6.1 维度降维表（18 维 → host 面语义化）

| #   | 原组件级维度                | host 面语义化检查要点                                                                                                                                                                                                        |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Schema 契约                 | 面级 page/schema 定义（`define*PageSchema`/`*RendererDefinitions` 注册）与 types 一致；host 传入 schema 字段的降级路径；`__nopPreserveLiteral` envelope 消费                                                                 |
| 2   | RendererComponentProps 合规 | 面组件只从 `props.props/meta/regions/events/helpers` 取数；不直访 store；标准 hooks（`useRendererRuntime`/`useScopeSelector`/`useCurrentPage`）；无 ad-hoc context/prop-drilling                                             |
| 3   | 值所有权三态                | 文档/选区/视图状态三态路径（local/controlled/scope）；host snapshot 同步（`deriveHostSnapshot` 类）；越界 clamp；重置/清空                                                                                                   |
| 4   | 表单参与                    | host 面表单参与（如有）；校验/提交路径数据形状；field metadata                                                                                                                                                               |
| 5   | DOM 与选择器契约            | marker class 与 `data-slot` 稳定输出（如 `spreadsheet-toolbar`、`designer-*`）；canvas 自绘面样式锚定契约（`canvas-adapters.md`/`spreadsheet-canvas-css.md`）；无 BEM 死类（rd-\* 先例已清理）                               |
| 6   | 嵌套 schema 分类            | 面内嵌 schema/action 分类正确（region/event/value）；行/槽位 scope 不污染嵌套 action args                                                                                                                                    |
| 7   | 事件与 action 契约          | 面事件派发带 `{ event, evaluationBindings, scope }` ctx（`check:audit-event-dispatch-ctx` 覆盖 + 人工抽查模板 `${key}` 解析）；`kind:'reaction'` 三件套接线；`component:*` 句柄注册（`hostContract` capability publication） |
| 8   | a11y                        | 工具栏/画布/面板键盘完整操作路径；焦点管理与焦点陷阱（dialog/弹出层）；aria-label/title 语义；canvas 自绘面读屏替代                                                                                                          |
| 9   | i18n                        | 无硬编码文案（`rg "[\u4e00-\u9fa5]" packages/<pkg>/src` 兜底）；`t()` key 全 locale 存在                                                                                                                                     |
| 10  | 四态覆盖                    | 空文档/加载/错误（如 JSON.parse 失败路径）/禁用（readOnly）各态渲染正确不崩溃                                                                                                                                                |
| 11  | 异步生命周期                | loadAction/数据源/保存/恢复：abort/竞态/失败写 error 态/重试；Promise 不裸奔                                                                                                                                                 |
| 12  | 组合宿主场景                | **每面 ≥1 真实浏览器宿主场景（bug 73 模式专项，programmatic DOM 断言禁截图）**——如 dialog 内使用、CRUD 行内、无 scope 上下文；断言 action args 模板 `${key}` 真机解析                                                        |
| 13  | 样式契约                    | 面组件自样式面（widget 语义）与 marker 类（布局语义）边界；主题独立性（CSS 变量，无 React ThemeProvider）；`check:audit-styling-suspects`                                                                                    |
| 14  | React 19 规范               | 无冗余 useCallback/useMemo；无 effect+setState 镜像；渲染期派生优先                                                                                                                                                          |
| 15  | 性能边界                    | 虚拟化表格/canvas 渲染路径；selector 精度；监听器/订阅清理；无限循环风险                                                                                                                                                     |
| 16  | 测试质量                    | focused 单测断言正确行为（非 not-throw）；事件双参契约断言（payload 全等 + ctx 三键）；宿主场景 e2e 存在且断言真实交互                                                                                                       |
| 17  | 文档对照                    | 面 owner docs（README §1 契约基准清单）↔ 实现一致；无 phantom 引用（声明即契约双向核对）                                                                                                                                     |
| 18  | 注册、包边界与 IO/安全红线  | core/renderers 包边界合规（domain core 无 react 依赖）；`src/index.ts` 导出面；**INV-1 env IO 边界**（`check:audit-renderer-browser-io` 覆盖 4 个 host renderer 包）；安全红线（URL 协议校验/sanitize/附件路径）             |

### 6.2 Designer 特有维度（host 大面必检，组件级模板无对应）

| #   | 维度                   | 检查要点                                                                                                                                                                                                                      |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | host 契约              | `RendererEnv` 注入面（IO/会话/事件宿主）；`hostContract`（`*_MANIFEST_V1`/`resolve*Manifest`/`*HostContract`/`*_CAPABILITY_PUBLICATION`）与宿主消费方双向核对；action-provider（`create*ActionProvider`）注册与 host 方法映射 |
| H2  | 事务与 undo 语义       | 命令/事务链（Begin/Commit/Rollback、Undo/RedoSpreadsheetCommand、designer command adapter）——撤销/重做行为、事务边界、失败回滚                                                                                                |
| H3  | 拖拽完整性             | 拖拽全生命周期：pointerdown/move/up/**pointercancel 守卫**（2-14 家族先例）；drop 落点索引（closestEdge 调整先例）；拖拽中状态清理（ghost/indicator 残留）                                                                    |
| H4  | 键盘交互完整性         | 面级 keydown 排除输入目标（isEditable 守卫，22-02 家族先例）；快捷键映射与冲突；roving tabindex（如 toolbar）；键盘可达性等价于鼠标路径                                                                                       |
| H5  | 剪贴板                 | 复制/粘贴路径（clipboard data 契约、`ClipboardData`/`ClipboardCell` 类）；剪贴板权限/降级（INV-1 清单外 best-effort 须 capability-checked）                                                                                   |
| H6  | e2e 可操作性           | 面在真实浏览器可交互断言（每面 ≥1 宿主场景，programmatic DOM）；e2e 定位基准用 data-slot/marker（禁截图、禁脆弱 class）；新场景落 `tests/e2e/`                                                                                |
| H7  | MA4.3 测试覆盖缺口回归 | M 轮 MA4.3（`arm-MA4-designer-office-test-coverage.md`）对 4 host 面的覆盖缺口逐面回归——补测或显式登记剩余缺口                                                                                                                |

### 6.3 审计卡模板（host 面）

```md
# 审计卡：<surface>（<package>，D3.x 面）

> 状态: open | fixing | fixed-pending-closure | closed
> 审查日期: YYYY-MM-DD
> 审查 plan: <plan 文件>
> 面定义: <surface-inventory.md 行> | 注册定义: <path:line> | 渲染器: <path:line>
> 契约基准: <host-surface/README.md §1 对应包行>（owner docs 清单）

## 面身份

<surface / 包 / host 契约（hostContract/manifest）摘要 / 表单参与? / 布局 or widget?>

## 维度审查记录（18 维降维 + Designer 特有维度）

| # | 维度 | 结论 | 证据 | 发现 |

## 发现清单

- [P0-1] <描述>（`文件:行`）→ 状态: fixed（自动修复，test-first）
- [P1-1] <描述>（`文件:行`）→ 状态: ...
- [P2-1] <描述>（`文件:行`）→ 状态: ...（低成本当场修复，否则入审计卡 backlog 归 DR）
- [P3-1] <描述>（`文件:行`）→ 状态: ...（卡内记录）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: <在 X 内使用 Y> | 断言: <programmatic DOM 断言（禁截图）> | 结果: pass/fail + 证据
- 每面 ≥1 个场景；场景落 `tests/e2e/`；断言含 action args 模板 `${key}` 真机解析

## 修复记录

- plan / commit / 验证命令输出（typecheck/build/lint/test 相关项）
- test-first 证据: <复现测试文件:行 先于实现 commit> / <实现 commit>

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
```

### 6.4 保护区域地图（host 面授权核对，D0 记录）

- 4 host 大面 8 包**不在** Protected Areas 表（`docs/context/ai-autonomy-policy.md` 全表 6 行）→ 默认 **`implement`**。
- `packages/ui/src/index.ts` 公共导出：**`ask-first`**（host 面审计如需新增 ui 组件必须停下问人工）。
- 结构性重构（公共 API、包边界）：执行前需**人工确认**。
- Renderer 定义 fields（`check-renderer-definition-fields-only`）与样式契约（`docs/architecture/styling-system.md`）：**`plan-first`**。
- Auth/security 边界：**`ask-first`**（host 面如涉及 file/IO/import() 远程加载按 INV-1 与 security-design-requirements.md 执行）。
