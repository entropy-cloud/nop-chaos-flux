# 3 AI 面契约与文档 truthfulness 治理（disabled 契约消费 / autofocus·死导出·clone fallback / dompurify 依赖 / engine.md 接口清单 / 不变式登记处行号校准）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Follow-up Backlog P2（契约/文档族）：multi P2-5 / P2-10 / P2-11 / P2-12 / P2-13 / P2-15 / P2-16 + open P2-3 / P2-4 / P2-5
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（2026-08-09-1826 双审计 P2 填充节）、`docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`（P2-5/P2-10/P2-11/P2-12/P2-13/P2-15/P2-16）、`docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`（P2-3/P2-4/P2-5）；live repo 核对 2026-08-10（行号以审计时点为准，执行时 live 复核）
> Related: `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`（engine/adapter 族 P2）、`docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`（renderer/UI 族 P2）；三者共享 Follow-up Backlog 路由面，closure surface 各自独立

## Purpose

治理 2026-08-09 双审计遗留的 **契约/文档 truthfulness 族 10 条 P2**（0 P0/P1）：① 全部 14 个 AI 渲染器未消费 schema `disabled` 节点控制 + `AiSenderExtensionProps.disabled` 死契约字段（multi P2-5，跨包契约不一致）；② `autofocus` 死契约字段（open P2-3，schema + registry 零消费）；③ `buildImageContentParts` 死模块级导出 + 真实 send 路径重复内联逻辑（open P2-4）；④ `cloneMessages`/`cloneMessage` 无 `structuredClone` 抛错 fallback（open P2-5，host 输入 DataCloneError 崩溃面）；⑤ dompurify 非可选 peerDependency + devDependency、包内零引用（multi P2-15）；⑥ engine.md §8.1/§8.5/§8.6/§9.3/§9.5 接口清单与示例路径腐化（multi P2-10/11/12/13，host 面权威文档漂移）；⑦ invariant-catalog / gates.md 记录 live 行号在 Cycle 2 / I4 后系统性漂移（multi P2-16，不变式登记处治理）。

每条带 test-first 回归断言（RED→GREEN，契约变化处）或 focused 验证（文档 truthfulness）；死契约裁定（implement vs drop）为 Decision 项，默认倾向 drop（对齐 open-audit cross-cutting 建议）。

## Current Baseline

（live repo 核对 2026-08-10；行号 = 审计时点 2026-08-09，P1 修复后可能漂移）

- **multi P2-5（disabled 死契约）**：`disabled` 是编译器分类 meta 字段（`fields.ts:11` BOOLEAN_META_FIELDS），`node-runtime.ts:283-292` 解析进 `props.meta.disabled`；消费面（live 核对 2026-08-10）：layout（timeline/steps）、content（link）、scheduling（barcode-input）、industrial（scada）读 `meta.disabled`，basic 读 `props.props.disabled`（button.tsx:69）并注册 `disabled` 为 meta-kind（basic-renderer-definitions.ts:296）；AI 包零 `meta.disabled` 读取，`AiSenderExtensionProps.disabled`（`schemas.ts:167-199` 区域，审计行号）声明但从不传递。live 核对：`src/schemas.ts`（AI 包根）与 `src/ai-renderer-definitions.ts` 存在（`disabled`/`autofocus` 字段 live grep 确认在册）。
- **open P2-3（autofocus 死字段）**：`AiChatSchema`（`schemas.ts:23`）与 `AiSenderSchema`（`:132`）声明 + registry（`ai-renderer-definitions.ts:55,122`）注册，渲染器零读取（grep 零命中，live 复核确认）。与 P2-5 同族（declared-but-dead）。**live 核对（2026-08-10）确认移除动作波及 6 处已入库声明/文档面**：`flux-guide/flux-types/schema.d.ts:1608,1656`（手维护类型声明，无生成脚本）、`docs/components/flux-renderers-ai/renderers.md:21,239`、`flux-guide/design-patterns/ai.md:84,165` —— 仅改 schemas.ts/definitions 会让"grep autofocus"残留非注释命中，Exit Criteria 必须覆盖全仓。
- **open P2-4（死导出 + 重复内联）**：`ai-attachments.tsx:373-377` 导出 `buildImageContentParts`，仅测试消费（`ai-attachments.test.tsx:191-198`）；`handleUpload`（`:190-196`）内联重复 filter+map 逻辑 → 双份多模态组装逻辑漂移风险。
- **open P2-5（clone 无抛错 fallback）**：`ai-chat.tsx:46-54` `cloneMessages`/`cloneMessage` 只在"无 `structuredClone`"时走浅拷贝 fallback，`structuredClone` 抛 `DataCloneError`（host 写入 function/symbol/DOM node 到 `metadata`/`data-*` parts）时无降级 → 每轮边界整树崩溃。
- **multi P2-15（dompurify 依赖漂移）**：`package.json:36,57` 非可选 peerDependency + devDependency，包内零 import（live grep 确认）；净化委托 `@nop-chaos/flux-renderers-content`。
- **multi P2-10/11/12/13（engine.md 腐化）**：live `MessageEngine` 12 方法（`setMessageEditing` 于 `engine/types.ts:320-323`），engine.md §8.1（`:106-151`）缺该方法且 AI-06 注记仍写"11 个"；§8.5（`:206-211`）/§9.5（`:421-427`）`UseMessageOptions` 只列 3 字段（live `use-message.ts:14-41` 9 字段），且与同节正文（`:240-246` 已提及新字段）自相矛盾；§8.6（`:251-257`）`UseConversationOptions` 列 4 字段缺 `initialConversations`/`onStorageError`（live `use-conversation.ts:16-31` 6 字段）；§9.3（`:354-357,404-405`）示例路径 `apps/playground/src/ai-connectors.ts`/`createOpenAIConnector` 不存在（实际 `apps/playground/src/ai/openai-connector.ts` + `createOpenAICompatibleConnector`）。live 复核：engine.md 节号 §8.1/§8.5/§8.6/§9.3/§9.5 均在（`rg` 证实），实际代码 `use-message.ts` 9 字段签名与 playground connector 命名一致。
- **multi P2-16（登记处行号漂移）**：`invariant-catalog.md`（304 行）方法行号漂移 +108~+185（例：createConversation :263 → live :371；clearAll :390 → :575）；`gates.md`（61 行）`:52-53` 亦漂；语义与检测方法仍正确，仅证据锚点过期 + catalog §2.6 "2026-08-09 live 核对全部一致" 声明误导。live 复核：catalog/gates 行数确认；锚点行号需执行时逐条 live 复核。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中（P1 收口后）；workspace-manifest-deps 门禁显式豁免 peer/dev（P2-15 不在门禁 red 区）；AI 包基线 **70 files / 612 tests 全绿**。
- 既有测试锚点：`ai-attachments.test.tsx`、`ai-chat-projection.test.tsx`（cloneMessages 面）、`phase5-deepening.test.tsx`、a11y 测试、`check:ai-engine-invariants` 相关 `scripts/__tests__/`。
- Bug note 编号：live 最高 **136**，新增编号 **137+**（与 plan 1/2 共享编号区，按提交顺序分配）。
- 授权：本族全为 P2 契约/文档治理；`disabled` 消费为跨包契约行为补全（对齐其他包先例），`autofocus` drop 为死字段移除（schema surface 变化，按"行为修正"落地，同 1301-1 白名单化先例）；不动公共 API 签名。

## Goals

- 10 条 P2 全部治理落地（代码项 test-first RED→GREEN；文档项 live 复核一致 + 文本更新）。
- multi P2-5：AI 渲染器消费 `props.meta.disabled`（widget 交互面语义：输入/按钮禁用，渲染器语义按类型裁定）+ `AiSenderExtensionProps.disabled` 死字段移除（或接线）；跨包契约与 basic/layout/content/scheduling/industrial 一致。
- open P2-3：`autofocus` 裁定（默认 drop：schema 字段 + registry 条目移除；或实现——按裁定记录理由）。
- open P2-5：`cloneMessages`/`cloneMessage` 补 try/catch → 浅拷贝降级（engine 内容可 clone 时行为不变）。
- multi P2-10/11/12/13：engine.md 接口清单与示例路径与 live 类型完全一致（host 面权威文档）。
- multi P2-16：invariant-catalog / gates.md 全部锚点行号 live 复核修正 + 登记时点注记（替换"2026-08-09 live 核对"过期声明）。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants` exit 0、`pnpm check` 零新增命中、daily log 收口记录。

## Non-Goals

- 不处理 engine/adapter 族 P2（`docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`）与 renderer/UI 族 P2（`docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`）。
- 不引入新 check 门禁（P2-5 的 consumer-presence gate 为 open-audit 建议项，本 plan 不落静态门禁，记入 Non-Blocking Follow-ups 评估）。
- 不做布局/样式体系改动；不改公共 API 签名。
- 不处理 P2-14（已顺带覆盖，维持 watch-only）；不裁决 P3/观察项。

## Scope

### In Scope

- `src/renderers/*`（disabled 消费面：ai-sender / ai-voice-input / ai-suggestions / ai-prompts / ai-feedback / ai-tool-call 等交互型渲染器，按 14 个渲染器逐一核对）、`src/schemas.ts` + `src/ai-renderer-definitions.ts`（autofocus 移除 / disabled 接线）、`src/renderers/ai-attachments.tsx`（死导出收敛）、`src/renderers/ai-chat.tsx`（clone fallback）。
- `packages/flux-renderers-ai/package.json`（dompurify 依赖面）。
- 文档：`docs/components/flux-renderers-ai/engine.md`（§8.1/§8.5/§8.6/§9.3/§9.5）、`docs/audits/ai-invariants/invariant-catalog.md` + `gates.md`（行号校准）、bug notes 137+、daily log。

### Out Of Scope

- engine/adapter 族 P2、renderer/UI 族 P2、P2-14、新静态门禁引入、公共 API 重构、样式体系改动。

## Failure Paths

| 场景           | 触发                                     | 行为                                                                   | 可重试 | 用户可见表现                |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------- | ------ | --------------------------- |
| disabled-dead  | 页面级 `disabled: true` 作用于 AI 渲染器 | 回归测试 RED；修复后交互型渲染器禁用（输入/按钮不可用，aria-disabled） | 是     | 页面级禁用生效（跨包一致）  |
| autofocus-dead | 设计器暴露 autofocus 控件                | 字段移除后 registry/schema 不再声明（无静默 no-op 控件）               | 否     | 契约面：无死控件            |
| clone-crash    | host 往 metadata/data-\* 写不可 clone 值 | 回归测试 RED；修复后浅拷贝降级不崩溃                                   | 是     | 无 DataCloneError 整树崩溃  |
| doc-drift      | host 按 engine.md §8.x 复制接口/示例     | 文档与 live 类型/路径一致（核对在案）                                  | 是     | 无编译错误示例 / 无缺失字段 |
| anchor-drift   | 审计/维护者按 catalog 行号定位           | 锚点 live 复核修正 + 时点注记                                          | 是     | 登记处证据锚点可导航        |

## Test Strategy

本档选择：必须自动化

契约变化（disabled 消费 / clone fallback / 死字段移除）用 focused 测试断言（test-first RED→GREEN）；文档与行号校准项为 live repo 核对 + 文本更新（focused 验证，非行为测试）。dompurify 移除用 `pnpm check`（workspace-manifest-deps）验证零新增命中。

## Execution Plan

### Phase 1 — 死契约字段清理（multi P2-5 disabled + open P2-3 autofocus）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/*`、`src/schemas.ts`、`src/ai-renderer-definitions.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Decision: disabled 消费语义裁定——交互型渲染器（ai-sender 输入区 / ai-voice-input 麦克风 / ai-suggestions / ai-prompts / ai-feedback 操作按钮 / ai-tool-call 审批按钮等）读 `props.meta.disabled` 禁用交互（disabled + `aria-disabled` 按控件语义）；纯展示渲染器（ai-citations / ai-conversations 等）裁定不消费或仅降级样式——逐渲染器裁定表入档（见下方「Phase 1 裁定与清扫记录」）
- [x] Proof: RED 回归测试（P2-5）——`meta.disabled=true` 注入 ai-sender → 断言输入/发送按钮禁用（DOM disabled / aria-disabled 断言）；修复前 RED（`p2-5-disabled-contract.test.tsx` 新建，9 用例 pre-fix 全红）
- [x] Proof: RED 回归测试（P2-5 扩展臂）——voice-input / feedback / tool-call 审批面各一用例（按裁定表交互型渲染器全列）；修复前 RED
- [x] Fix: P2-5——按裁定表在各交互型渲染器消费 `props.meta.disabled`；`AiSenderExtensionProps.disabled` 死字段接线（传递 `loading || disabled`——参考实现 `tiptap-sender.tsx` 已消费该字段，补全传递链，非移除）；类别清扫：AI 包全部渲染器 × `meta.disabled` 消费面核对（14 个渲染器逐一遍历，非交互型记录裁定理由，见下方记录）
- [x] Decision: autofocus 裁定——**drop**（schema 字段 + registry 条目移除；理由：零消费 + 实现引入新行为面（焦点管理）超出 P2 治理 scope；与 P2-5 死字段同族一致性；"实现更廉"不成立——sender 已有 refocusAfterSubmit 既有焦点管理面，autofocus 与之正交且无消费者）
- [x] Fix: open P2-3——按裁定移除 `autofocus` schema 字段（`schemas.ts` AiChatSchema / AiSenderSchema）+ registry 条目（`ai-renderer-definitions.ts` ai-chat / ai-sender 两处）；**同步 6 处已入库声明/文档面**：`flux-guide/flux-types/schema.d.ts`（AiChatSchema / AiSenderSchema 两处）、`docs/components/flux-renderers-ai/renderers.md`（§1.2 / §4.1 两处）、`flux-guide/design-patterns/ai.md`（字段参考表 + 速查表两处）；`renderers.md` §4.1 的 `disabled?: boolean` AiSenderSchema 字段与 live schemas.ts 不一致——随 P2-5 修正（移除 + §4.2 注明 disabled 为节点级 meta 字段非 schema prop）；grep 复核：**全仓 `rg autofocus` 无 live schema/类型声明残留**（剩余命中 = 历史审计/分析记录 `docs/audits/`、`docs/analysis/`、本 plan/roadmap 自身记录 + eslint `jsx-a11y/no-autofocus` 配置 + `ai-conversations.tsx` 既有 `eslint-disable` 注释与硬编码 rename-input `autoFocus`（非 schema 驱动），均豁免记录在案）
- [x] Proof: P2-5 相关既有测试零回归（含 meta 解析路径；AI 包全量 656 tests 全绿）

Exit Criteria:

- [x] multi P2-5 RED 测试全部转 GREEN（交互型渲染器 disabled 生效；裁定表入档）
- [x] open P2-3 移除落地（**全仓 `rg autofocus` 无 schema 与类型声明**，含 flux-guide 与 renderers.md 六处同步；typecheck 通过）
- [x] 类别清扫记录入档（14 渲染器 × disabled 消费面核对结论）

#### Phase 1 裁定与清扫记录

**disabled 消费裁定表（14 渲染器 × `props.meta.disabled === true`）：**

| 渲染器           | 裁定               | 落地                                                                                                                                                     |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ai-chat          | 消费（聚合交互面） | 转发至内嵌 AiSenderView（textarea + 提交/停止禁用）                                                                                                      |
| ai-sender        | 消费               | Textarea / 提交 / 停止按钮禁用 + commit/onCancel/onKeyDown 守卫；扩展组件传 `disabled={loading \|\| disabled}`（接线 `AiSenderExtensionProps.disabled`） |
| ai-voice-input   | 消费               | 麦克风按钮禁用 + handleStart/handleClick 守卫                                                                                                            |
| ai-suggestions   | 消费               | 全部 pill + 溢出按钮禁用                                                                                                                                 |
| ai-prompts       | 消费               | 提示卡片按钮禁用                                                                                                                                         |
| ai-feedback      | 消费               | 全部操作按钮禁用                                                                                                                                         |
| ai-tool-call     | 消费               | 展开 toggle + pending 审批 approve/reject 禁用（保留 noHandler 独立守卫）                                                                                |
| ai-attachments   | 消费               | pick/upload/remove 禁用 + drop/paste/input/upload 守卫                                                                                                   |
| ai-conversations | 消费               | create/item/rename/delete 禁用 + commitRename 守卫                                                                                                       |
| ai-message-list  | 不消费             | 无自有交互控件（容器面）；子气泡消息级操作不受页面级禁用                                                                                                 |
| ai-bubble        | 不消费             | 消息级展示面；编辑/分支导航为消息级操作，由 sender/attachments 等输入面禁用覆盖主交互路径                                                                |
| ai-welcome       | 不消费             | 纯展示（无交互控件）                                                                                                                                     |
| ai-citations     | 不消费             | 展示为主；来源链接为可选附属交互，禁用会抑制展示导航                                                                                                     |
| ai-token-usage   | 不消费             | 纯展示统计；onClick 为可选附属交互                                                                                                                       |

**autofocus 豁免记录**：全仓 `rg autofocus`（小写）剩余命中全部为豁免面——① 历史审计/分析记录（`docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`、`docs/audits/per-component/ai-chat.md`、`ai-sender.md`、`docs/analysis/2026-08-09-1826-open-audit-ai-invariant-loop/round-03.md`、`docs/analysis/2026-07-24-scheduling-§4-audit/02-ai-interaction-quality.md`：审计发现的历史记载，非 live 声明）；② `eslint.config.js` `jsx-a11y/no-autofocus` 规则（lint 配置）；③ `ai-conversations.tsx` `eslint-disable-next-line jsx-a11y/no-autofocus` 注释 + rename-input 硬编码 `autoFocus`（既有行为，非 schema 驱动字段）；④ 本 plan 与 roadmap 自身的记录文本。**跨包核对注记**：`flux-renderers-form` 的 `autoFocus`（驼峰拼写，`schemas.ts:131`/`form.tsx:314` 消费/`form-definition.ts:262,438` 注册/`schema.d.ts:363`）是**另一包的 live 已消费字段**（form shell mount 聚焦行为），非死声明，不在本 plan AI 面 scope——小写 `rg autofocus` 不命中它，audit 复核确认无需处理。

### Phase 2 — 死导出收敛 + clone fallback（open P2-4 + open P2-5）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx`、`src/renderers/ai-chat.tsx`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（P2-5 clone fallback）——host 注入含不可 clone 值（function 占位）的 metadata 消息 → 渲染/投影 clone 不抛 DataCloneError（降级为浅拷贝）；修复前 RED（`ai-chat-clone-fallback.test.tsx` 新建 2 用例 pre-fix 全红：① 投影 render 路径 DataCloneError 崩溃（runtime error-retry 兜底树）② onResponseComplete cloneMessage 路径无事件到达）
- [x] Fix: open P2-5——`cloneMessages`/`cloneMessage` 包 try/catch：`structuredClone` 抛错时回退浅拷贝（与"无 structuredClone"分支同降级）；engine 自产内容（可 clone）路径行为零变化（try 成功仍走 deep clone）
- [x] Fix: open P2-4——`handleUpload`（`ai-attachments.tsx`）改调 `buildImageContentParts`（消除双份内联逻辑：原 `:187-196` filter+map 内联删除，仅剩 helper 单份组装）；测试（`ai-attachments.test.tsx` 既有 multimodal send 用例 + 新 P2-4 混合 image+pdf 只发 image parts 用例）保持绿；类别清扫：附件组装面全部调用点核对（handleUpload / 测试 / bubble image renderer——`image.tsx` 为展示侧渲染 `image_url` parts，非组装逻辑，无第三份）
- [x] Proof: 类别清扫确认测试——既有 attachments 测试零回归 + 新用例覆盖 handleUpload 路径（AI 包全量 659 tests 全绿）

Exit Criteria:

- [x] open P2-5 RED 测试转 GREEN（不可 clone 值不崩溃，降级浅拷贝）
- [x] open P2-4 收敛落地（handleUpload 调 helper；`rg` 复核附件组装逻辑单份）
- [x] 类别清扫记录入档（附件组装面核对结论）

#### Phase 2 类别清扫记录

- **克隆面**：`cloneMessages`/`cloneMessage` 两调用面（投影 snap + onResponseComplete handoff）同降级策略；engine 自产内容可 clone（deep 路径零变化）；`structuredClone` 缺失与抛错两条降级路径合并为同一 try/catch 结构。
- **附件组装面**：`buildImageContentParts` 为唯一组装逻辑（`ai-attachments.tsx`）；`handleUpload` 消费它；`ai-bubble/renderers/image.tsx` 是展示侧渲染器（读消息中既有 `image_url` parts），非组装逻辑——`rg "image_url"` 复核无第三份 filter+map 复制。

### Phase 3 — 依赖卫生（multi P2-15 dompurify）

Status: completed
Targets: `packages/flux-renderers-ai/package.json`

- Item Types: `Fix | Proof`

- [x] Proof: 现状核对——live grep 确认包内零 `dompurify` import（仅注释提及 `sanitizeHtml`/DOMPurify；净化委托 `@nop-chaos/flux-renderers-content` 的 `sanitizeHtml`——`markdown.tsx:5` 导入源实证）
- [x] Fix: 移除非可选 `dompurify` peerDependency（`package.json:36`）；devDependency（`:57`）零引用一并移除（无测试引用，已 grep 复核）
- [x] Proof: `pnpm install --lockfile-only` 通过（lockfile `flux-renderers-ai` importer 块零 dompurify 残留，其余条目属 content 等持有者）+ `pnpm check:workspace-manifest-deps` exit 0（零新增命中）

Exit Criteria:

- [x] package.json 不再声明非可选 dompurify peer；dev 面按零引用裁定
- [x] `pnpm check` 零新增命中（workspace-manifest-deps 面）

### Phase 4 — engine.md 接口清单腐化（multi P2-10/11/12/13）

Status: completed
Targets: `docs/components/flux-renderers-ai/engine.md`、`packages/flux-renderers-ai/src/engine/types.ts`、`src/adapters/use-message.ts`、`src/adapters/use-conversation.ts`、`apps/playground/src/ai/openai-connector.ts`

- Item Types: `Fix | Proof`

- [x] Fix: P2-10——§8.1 `MessageEngine` 接口清单补 `setMessageEditing`（live `types.ts:346-349`，§4.7 消息编辑），"共 11 个方法"计数更新为 **12**；AI-06 注记同步（补方法 + 校准日期注记）
- [x] Fix: P2-11——§8.5/§9.5 `UseMessageOptions` 接口列表更新为 live 9 字段（`use-message.ts:14-41`：engine/connector/initialMessages/plugins/extraRequestParams/systemPrompt/tools/toolExecutor/maxToolRounds），消除与同节正文（热替换 scope 注记已提及新字段）自相矛盾
- [x] Fix: P2-12——§8.6 `UseConversationOptions` 补 `initialConversations`/`onStorageError`（live `use-conversation.ts:16-37` 6 字段）
- [x] Fix: P2-13——§9.3 示例路径与函数名改为实际（`apps/playground/src/ai/openai-connector.ts` + `createOpenAICompatibleConnector`）；`body:` 改 live 的 `data:` 载荷形状（`openai-connector.ts:46`），示例复制即可编译；**全仓活动文档 `createOpenAIConnector`/`ai-connectors.ts` grep 清零**——§9.4 死名同步（`engine.md` 内清零）+ 活动文档连带修正两处：`design.md` 不变式 14 示例名改 `createOpenAICompatibleConnector`、`implementation.md:165` 注释示例改实名（剩余命中仅为历史审计记录/历史计划文本，豁免）
- [x] Proof: 文档-代码一致性核对——更新后逐节对照 live 类型（§8.1 12 方法集 / §8.5+§9.5 9 字段集 / §8.6 6 字段集 / §9.3+§9.4 路径与函数名，对照记录见下方）；`pnpm check:docs-garbled` / `check:active-doc-code-anchors` 门禁零新增命中（16 既有 garbled 均非本 plan 文件；anchors 329 文档通过）

Exit Criteria:

- [x] engine.md 四处腐化全部修正（live 核对一致，无残留过期清单/计数/路径）
- [x] 一致性核对记录入档

#### Phase 4 一致性核对记录

| 节                          | live 证据                                                                                                           | 修正后文档                           | 一致 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---- |
| §8.1 MessageEngine 方法集   | `engine/types.ts:313-361`（12 方法，`setMessageEditing` :346-349）                                                  | 接口块 + AI-06 计数 12               | ✓    |
| §8.5/§9.5 UseMessageOptions | `use-message.ts:14-41`（9 字段）                                                                                    | 9 字段双处一致                       | ✓    |
| §8.6 UseConversationOptions | `use-conversation.ts:16-37`（6 字段，含 `initialConversations`/`onStorageError` + `ConversationStorageErrorEvent`） | 6 字段                               | ✓    |
| §9.3/§9.4 示例              | `apps/playground/src/ai/openai-connector.ts`（`createOpenAICompatibleConnector`，`data:` 载荷）                     | 路径/函数名/载荷形状对齐             | ✓    |
| 全仓 grep                   | `rg createOpenAIConnector\|ai-connectors.ts` 活动文档零命中                                                         | design.md/implementation.md 连带修正 | ✓    |

### Phase 5 — 不变式登记处行号校准（multi P2-16）+ 收口

Status: completed
Targets: `docs/audits/ai-invariants/invariant-catalog.md`、`docs/audits/ai-invariants/gates.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] Fix: P2-16——catalog 全部方法锚点行号 live 复核修正（createConversation / clearAll / switchConversation / deleteConversation / sendMessage / abort / setConnector 等全部列示方法）；`gates.md` 注册红表 + ⑧ 扫描器注记同步；catalog §2.6 过期"2026-08-09 live 核对全部一致"声明更新为本次校准时点（2026-08-10）+ 增加"锚点随代码演化漂移、以 live 复核为准"注记（§2 头部 + §4 头部 + gates.md 注册红节同步）
- [x] Proof: 锚点复核记录——逐条 `文件:行` live 对照，漂移修正前后对照表入档（见下方「P2-16 锚点校准对照表」；closure audit 可复检）
- [x] Fix: bug notes 144-146 落档（144 P2-5 + open P2-3 合并族 / 145 open P2-4 + open P2-5 合并族 / 146 P2-15 + P2-16 合并族，按 guide 全 8 节 + Notes For Future Refactors）
- [x] Proof: AI 包全量测试（76 files / 659 tests 全绿）+ `check:ai-engine-invariants` exit 0 + `pnpm typecheck`（AI 包）+ `pnpm lint`（AI 包）零回归
- [x] Follow-up: daily log `docs/logs/2026/08-10.md` 收口记录落档（见 Phase 5 收口节）

Exit Criteria:

- [x] catalog / gates 锚点全部 live 复核修正（对照表入档）
- [x] engine.md / catalog / gates / bug notes 同步到位
- [x] AI 包测试全绿零回归；`check:ai-engine-invariants` exit 0
- [x] daily log 收口记录落档

#### P2-16 锚点校准对照表（2026-08-10 live 反查）

| 位置                   | 修正前（2026-08-09 记录）                                                                                    | 修正后（live）                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| §2.1 ① 守卫            | `create-engine.ts:199-201`/`:543-545`/`:525-527`/`:142-144`                                                  | `:206-208`/`:672-674`/`:654-656`/`:149-151`                                                                        |
| §2.2 ② ref 面          | `use-conversation.ts:126-129`/`:133-136`/`:121`/`:313`/`:324`/`:339`/`:360-366`                              | `:147-151`/`:154-157`/`:136`/`:464`/`:477`/`:492`/`:522-540`                                                       |
| §2.3 ③ 身份守卫        | `create-engine.ts:334`/`:346-348`/`:451`/`:470`                                                              | `:369-371`/`:381-385`/`:569-571`/`:593-595`                                                                        |
| §2.4 ④ storage         | `use-conversation.ts:97-105`/`:287-289`/`:384-386`/`:370`/`:412-422`/`:234`/`:318`                           | `:112-120`/`:421-431`/`:573-585`/`:546-551`/`:589-665`/`:344`/`:280,471`                                           |
| §2.5 ⑤ abort/unmount   | `use-conversation.ts:249-261`/`:353-355`/`:394-398`；`create-engine.ts:509-519`/`:342-353`                   | `:359-385`/`:515-519`/`:611-615`；`:627-648`/`:381-385`                                                            |
| §2.6 核对表            | `create-engine.ts:330-346`/`:448-472`；`use-conversation.ts:122-128`/`:339`/`:360`                           | `:348-386`/`:566-608`；`:147-151`/`:492`/`:522`                                                                    |
| §4.1 方法表            | engine `types.ts:288-334` 系 + `create-engine.ts:172-542` 系；adapter `use-conversation.ts:52-56`/`:263-390` | `types.ts:314-360` 系 + `create-engine.ts:146-671` 系；adapter `:57-61`/`:385-589`（UseConversationReturn :53-65） |
| §4.2 runTurn           | `create-engine.ts:193`/`:182`/`:190`/`:565`                                                                  | `:200`/`:179`/`:192`/`:671`                                                                                        |
| §4.3 setMessageEditing | `types.ts:320`/`create-engine.ts:153-170`                                                                    | `types.ts:346`/`:160-177`                                                                                          |
| §5 提取源              | `create-engine.ts:78-93`/`use-conversation.ts:47-59`                                                         | `:79-95`/`:53-65`                                                                                                  |
| §7.4 首语句豁免        | `switchConversation:294`                                                                                     | `:442`（读 `conversationsRef.current`）                                                                            |
| §9.1 ⑥                 | `use-conversation.ts:280-313`/`:315-368`/`:370-404`/`:427-475`                                               | `:385-434`/`:436-499`/`:501-552`/`:589-665`                                                                        |
| §9.2 ⑦                 | `use-conversation.ts:234-257`（:243）                                                                        | `:299-350`（merge :313-326）                                                                                       |
| §9.3 ⑧                 | `create-engine.ts:210-229`/`:383-397`/`:578-602`                                                             | `:219-237`/`:439-457`/`:671-698`（消费 :457）                                                                      |
| §9.3 注记（P2-1 扩面） | 重置面 `:225`/`:272`/`:371`，消费面 `:468`                                                                   | `:219`/`:264`/`:360`，消费面 `:457`                                                                                |
| §9.4 ⑨                 | `create-engine.ts:247-249`/`:336-340`/`:362-364`                                                             | `:248-252`/`:363-365`/`:395-405`                                                                                   |
| §9.5 ⑩                 | `create-engine.ts:484-504`/`:507-528`                                                                        | `:585-608`/`:606-619`                                                                                              |
| gates.md 注册红        | `use-conversation.ts:280`/`:370`/`:427`；`create-engine.ts:228`                                              | `:401`/`:510`/`:629`（bump 点）；`:219`                                                                            |
| gates.md ⑧ 扫描器注记  | `create-engine.ts:210-229`                                                                                   | `:219-237`                                                                                                         |

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（round 1 `ses_015467ad9ffenW0I78W7rnsgX1`，round 2 `ses_0153ad804ffe6v81nYob6KVQW6`，均 fresh session）
- Verdict: `pass-with-minors`（达成共识：零 Blocker / 零 Major；2 个 Minor 观察为引用精度，已由 plan 自身 live 复核mandate吸收）
- Rounds: 2
- Findings addressed:
  - Round 1 Major-1（autofocus 移除漏 6 处已入库声明/文档面，Exit Criteria 不可满足）→ 已修（Phase 1 Fix 逐处同步 schema.d.ts / renderers.md / ai.md + 全仓 grep 口径 + Closure Gates owner-docs 补 renderers.md / flux-guide）
  - Round 1 Minor-1（P2-13 范围窄于审计引用：§9.4 死名 + body:/data: 形状）→ 已修（全文档 grep 清零 + 示例与 live connector 形状对齐）
  - Round 1 Minor-2（check:docs-\* 不存在）→ 已修（实名 check:docs-garbled / check:active-doc-code-anchors）
  - Round 1 Minor-3（baseline 高估 basic 的 meta.disabled 消费）→ 已修（basic 读 props.props.disabled + 注册 meta-kind；layout/content/scheduling/industrial 读 meta.disabled）
  - Round 1 Minor-4（handleUpload 行号）→ 已修（:181-197）
  - Round 1 Minor-5（Deferred Successor Required: no）→ 已修（yes + sibling 路径）

## Closure Gates

- [x] 10 条 P2（multi P2-5/P2-10/P2-11/P2-12/P2-13/P2-15/P2-16 + open P2-3/P2-4/P2-5）全部治理落地（代码项 RED→GREEN 证据；文档项 live 核对记录）
- [x] disabled 契约跨包一致（交互型渲染器消费 `meta.disabled`，裁定表入档）
- [x] 死字段/死导出/死依赖清理到位（autofocus 移除 / buildImageContentParts 收敛 / dompurify 移除）
- [x] clone fallback 达成（不可 clone host 输入不崩溃）
- [x] engine.md 与 live 类型/路径一致；catalog/gates 锚点校准（对照表在案）
- [x] 类别清扫记录入档（14 渲染器消费面 / 附件组装面）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（engine.md / invariant-catalog.md / gates.md / renderers.md / flux-guide（autofocus 类型声明与 ai.md）/ bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（task `ses_0147aa5fcffeFiB8ymsZcgkbbN`，verdict **approved**，2 Minor 已就地修复——minor-1 门禁勾选待本审计后执行（即本节）、minor-2 autofocus 豁免记录补 flux-renderers-form 跨包注记；执行 session 不自审）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37）
- [x] `pnpm test`（66/66 tasks 零失败）

## Deferred But Adjudicated

### engine/adapter 族 + renderer/UI 族 P2 全量（15 条）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分属不同结果面（engine/adapter 行为 / renderer 交互），已分别路由 `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md` 与 `docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`，不阻塞本 plan 的 10 条契约/文档 P2 收口
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`、`docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`（同一起草轮三 plan 并行路由）

### multi P2-14（投影克隆 abort 窗口幽灵）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 已由 plan `2026-08-10-1301-2` Phase 3 顺带覆盖，维持 watch-only 登记
- Successor Required: `no`

## Non-Blocking Follow-ups

- **consumer-presence 静态门禁评估**（open-audit cross-cutting 建议：registry 声明字段必须有 renderer 消费者）：本 plan 不落新门禁（避免与 P2-5 移除动作耦合评估）；P2 收口后评估是否需要（对齐 round-1 门禁纪律，若落需 committed 回归测试）。
- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-1606 起草轮路由注记，本 plan 收口时同步回写）。
- P3/观察项（tiptap 聚焦丢弃、ChatToolCallUIState.result 孤儿字段等）保持在源审计记录中，不派生工作项。

## Closure

Status Note: 10 条契约/文档 truthfulness 族 P2 全部治理落地——代码项（disabled 消费 + autofocus drop + clone fallback + 死导出收敛）test-first RED→GREEN 实证在案（p2-5-disabled-contract 9 RED 臂 / ai-chat-clone-fallback 2 RED 臂），文档项（engine.md 四处腐化 + catalog/gates 锚点校准 + dompurify 移除）live 复核一致；5 Phase 全 completed、全 checklist [x]、Exit Criteria 全勾；AI 包 76 files/659 tests 全绿 + `check:ai-engine-invariants` exit 0 + typecheck/build/lint 37/37 + test 66/66 + `pnpm check` 仅既有登记红零新增；独立 fresh sub-agent closure-audit **approved**（2 Minor 就地修复）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent，task `ses_0147aa5fcffeFiB8ymsZcgkbbN`
- Evidence: verdict **approved**——G1-G8 全 PASS（plan 文本一致性 / Phase 1-3 代码落地点逐条 live 核对（文件:行在案）/ Phase 4 engine.md 与 live 类型一致 + 死名 grep 清零 / Phase 5 锚点抽查 5+ 处 live 复检 / 验证 claims 独立复跑（AI 包 76/659 + check:ai-engine-invariants + workspace-manifest-deps + build --force 37/37 + test --force 66/66 + docs-garbled + active-doc-code-anchors + 全量 pnpm check）/ deferred 诚实）；2 Minor 均非阻塞——minor-1（Closure Gates 1-8/10-13 待审计后勾选，即本节动作）已就地执行；minor-2（autofocus 豁免记录缺 flux-renderers-form 跨包注记）已就地修复（豁免记录节补 `autoFocus` 驼峰 live 字段跨包说明）。

Follow-up:

- consumer-presence 静态门禁评估（registry 声明字段必须有 renderer 消费者）维持非阻塞登记，待 P2 收口后评估（见 Non-Blocking Follow-ups）。
- no remaining plan-owned work。
