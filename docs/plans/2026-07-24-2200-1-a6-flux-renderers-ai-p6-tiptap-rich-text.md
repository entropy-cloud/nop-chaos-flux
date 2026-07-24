# A6 flux-renderers-ai P6 Tiptap Rich-Text Sender Extension

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/components/roadmap-ai.md` A6、`docs/components/flux-renderers-ai/implementation.md` §2 P6、`design.md` §3/§10、`improvement-analysis.md` §4.4
> Related: `docs/plans/2026-07-23-2143-2-a1-flux-renderers-ai-p0-skeleton.md`（A1 落地 ai-sender Textarea 版本）

## Purpose

为 `ai-sender` 增加可选的 Tiptap 富文本输入能力，通过 `senderExtensions` schema 字段以 host 注入方式启用（@提及 / 模板插入 / Slash 命令）。声明该字段时渲染 Tiptap 编辑器；未声明时保持现有 `<Textarea>` 降级。Tiptap 设为可选 peerDep，未引入 `./rich-text` 子路径的 host bundle 不含 Tiptap 代码。

## Current Baseline

- `AiSenderSchema`（`schemas.ts:120`）无 `senderExtensions` 字段；`AiSenderView`（`ai-sender.tsx:33`）用 `@nop-chaos/ui` 的 `Textarea` + `useState` draft，已支持 submit/cancel/word-limit/Enter 提交/a11y 焦点回输。
- `flux-renderers-ai` 的 `package.json` 无 Tiptap 依赖；`exports` 仅 `.` 和 `./styles.css` 两个子路径。
- Tiptap 已是 workspace 已知依赖：`flux-renderers-form-advanced` 有 `@tiptap/react` ^3.27.1 + `@tiptap/starter-kit` ^3.27.1（`editor-renderer.tsx` 用 `useEditor` + `EditorContent` + `StarterKit` 提供 form 富文本编辑器）。
- INV-1 守卫（`contract-honesty.test.ts`）扫描 `src/engine/`（禁 react/dynamic import/IO API）、`src/renderers/`（禁 IO API）、`src/adapters/`（禁 IO API）。`src/rich-text/` 新目录不在扫描范围内。
- design.md §18.2 #11 规定 `src/engine/` 与 `src/renderers/` 下禁止动态 `import()`。实际守卫测试仅检查 engine 目录的 dynamic import；但设计契约约束 renderers 也不得用——本计划严守该契约。
- A1–A5 全部 done；engine-unification follow-up 已落地。无未关闭的 deferred 项阻塞 A6。
- improvement-analysis.md §4.4 结论："ai-sender 当前设计已是最小可行方案，Tiptap 延后到 P6 是正确的"。

## Goals

- `ai-sender` 支持 `senderExtensions` 字段：声明时渲染 host 注入的富文本编辑器组件，未声明时保持现有 `<Textarea>` 降级且行为不变。
- 包提供 `@nop-chaos/flux-renderers-ai/rich-text` 子路径导出 `createTiptapSender()` 工厂 + 内置 @提及 / 模板 / Slash 命令扩展。
- Tiptap 为可选 peerDep；host 未 import `./rich-text` 子路径时 bundle 不含 Tiptap。
- 富文本编辑器输出序列化为纯文本喂给 `engine.sendMessage(text)`，保持 engine 契约不变。
- playground 可交互示例 + e2e 测试覆盖关键路径。

## Non-Goals

- 不改 `MessageEngine` 接口或消息数据模型（engine 只接收 `string`）。
- 不在 `src/renderers/` 或 `src/engine/` 内直接 import Tiptap（严守 design.md §18.2；避免 bundle 污染 + INV-1 风险）。
- 不内置 Tiptap 之外的编辑器框架（Lexical / Slate 等）。
- 不实现 MCP（A-18 / P7，独立工作项）。
- 不为 `ai-sender` 引入组件级 `api` 字段（保持请求下沉原则）。
- 不修改 `packages/ui/src/index.ts`。

## Scope

### In Scope

- `AiSenderSchema` 增 `senderExtensions` 字段（`SchemaValue`，解析为 `React.ComponentType<AiSenderExtensionProps>`）。
- `AiSenderView` / `AiSenderRenderer` 支持 extension 组件委托渲染 + Textarea fallback。
- `src/rich-text/` 新目录：Tiptap 编辑器组件 + `createTiptapSender()` 工厂 + 内置 mention/template/slash 扩展。
- `./rich-text` 子路径导出 + package.json exports + 可选 peerDep + vite alias + tsconfig paths。
- playground 示例页 + 路由注册 + e2e 测试。
- owner-doc 同步。

### Out Of Scope

- AI 对话引擎行为变更。
- Markdown 渲染增强（LaTeX/Streamdown 已在 A3 裁定不内置）。
- Tiptap 扩展市场的全部扩展（仅内置 mention/template/slash 三个常用项；host 可经 `createTiptapSender({ extraExtensions })` 自行追加）。
- 富文本 → Markdown 序列化（P6 输出纯文本；Markdown 序列化留 host 自定义或后续评估）。

## Failure Paths

| 场景编号                    | 触发                                               | 行为                                                | 可重试 | 用户可见表现                                   |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------- | ------ | ---------------------------------------------- |
| `sender-extension-fallback` | `senderExtensions` 字段未声明                      | 渲染 `<Textarea>` 降级，行为与 P0 完全一致          | 否     | 普通文本输入框                                 |
| `tiptap-not-installed`      | host import `./rich-text` 但未安装 `@tiptap/react` | host 侧 import 失败（模块解析错误），非渲染器内降级 | 否     | host 控制台报 import error；页面白屏或错误边界 |
| `extension-data-missing`    | mention/template/slash 扩展启用但未提供数据源      | 优雅降级：popup 为空或不弹出，不阻断输入            | 否     | 输入 `@`/`/` 无下拉，其余正常                  |
| `tiptap-submit-empty`       | 编辑器内容 trim 后为空                             | 禁用 submit 按钮（与 Textarea 版一致）              | 否     | Send 按钮灰色                                  |

## Test Strategy

档位选择：`建议有测`

本档选择：建议有测

理由：富文本输入是用户体验增强，非 auth/API 契约/核心回归路径。但涉及新公开子路径导出 + schema 字段契约，需 focused 单测验证 extension 委托渲染 + 纯文本序列化 + 降级路径，并按 Cross-Cutting 规则配 e2e。

## Execution Plan

### Phase 1 - Schema 契约 + sender 委托渲染 + 子路径脚手架

Status: completed
Targets: `packages/flux-renderers-ai/src/schemas.ts`、`packages/flux-renderers-ai/src/renderers/ai-sender.tsx`、`packages/flux-renderers-ai/src/index.ts`、`packages/flux-renderers-ai/package.json`、`vite.workspace-alias.ts`、`tsconfig.base.json`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `AiSenderSchema` 增 `senderExtensions?: SchemaValue` 字段（`schemas.ts:120` 区块）
- [x] 定义 `AiSenderExtensionProps` 接口于 `schemas.ts`（draft text / onChange / onSubmit / onCancel / loading / placeholder / maxLength / showWordLimit / submitType / disabled），从 `src/index.ts` 经 `export type` 导出（erased at compile，不拉 Tiptap 进主入口 runtime graph）
- [x] `AiSenderView` 增 `ExtensionComponent?: React.ComponentType<AiSenderExtensionProps>` 参数；存在时渲染 `<ExtensionComponent {...ctx} />`，否则保持现有 Textarea 渲染（行为不变）
- [x] `AiSenderRenderer` 从 `props.props.senderExtensions` 读取解析后的组件并传入 `AiSenderView`
- [x] `package.json` 增 `./rich-text` 子路径 export（types 指向 `./dist/rich-text/index.d.ts`、default 指向 `./dist/rich-text/index.js`）；增 `@tiptap/react`、`@tiptap/starter-kit` 为 `peerDependencies` + `peerDependenciesMeta` 标记 `"optional": true`；增两者为 devDependencies
- [x] `vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-ai/rich-text` alias
- [x] `tsconfig.base.json` paths 增 `@nop-chaos/flux-renderers-ai/rich-text` 映射
- [x] 创建 `src/rich-text/index.ts` 占位入口（仅 `export type` re-export `AiSenderExtensionProps` + `createTiptapSender` 类型签名 stub），保证子路径编译通过
- [x] **Proof（集成冒烟）**：Phase 1 结束前用一个 trivial stub 组件经 `senderExtensions` 路径渲染（确认 schema→component resolution 链路通），focused 单测验证 stub 渲染 + Textarea fallback 两条路径
- [x] 扩展 `contract-honesty.test.ts`：增测试扫描 `src/engine/`、`src/renderers/`、`src/adapters/` 下源码不得出现 `@tiptap`/`tiptap` import（保证 bundle 隔离不变量自动化守卫，非仅靠 code review）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过（含新字段 + 子路径）
- [x] 现有 Textarea 降级行为不变（现有 ai-sender 单测全绿，无回归）
- [x] `AiSenderExtensionProps` 类型已从 `src/index.ts` 经 `export type` 导出
- [x] `./rich-text` 子路径在 vite alias + tsconfig paths 中可解析
- [x] stub 组件经 `senderExtensions` 路径渲染冒烟通过（集成链路早验证）
- [x] `contract-honesty.test.ts` 新增 Tiptap-import 扫描项绿

### Phase 2 - Tiptap 编辑器 + 纯文本序列化 + submit/abort

Status: completed
Targets: `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx`、`src/rich-text/index.ts`、`src/rich-text/types.ts`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] 实现 `createTiptapSender(options: TiptapSenderOptions): React.ComponentType<AiSenderExtensionProps>` 工厂
- [x] Tiptap 编辑器用 `useEditor` + `EditorContent`（参照 `flux-renderers-form-advanced/src/editor-renderer.tsx:235` 模式）+ `StarterKit`
- [x] 纯文本提取：`editor.getText()` → `onSubmit(text)` / `onChange(text)`，保持 engine 只收 `string` 契约
- [x] Enter 提交按 `submitType`（enter/ctrlEnter/shiftEnter）处理（Tiptap keymap 或 editor `onKeyDown`）
- [x] `maxLength` 字数限制 + `showWordLimit` 计数显示（复用 Textarea 版的 `data-slot="ai-sender-count"` 视觉）
- [x] `loading`（disabled）态：禁用编辑器 + 显示停止按钮（`engine.abort()`）
- [x] `placeholder` 透传 Tiptap Placeholder 扩展
- [x] marker class `nop-ai-sender` + `data-slot="ai-sender"` 保持一致（编辑器根元素同 Textarea 版）

Exit Criteria:

- [x] `createTiptapSender` 返回的组件可渲染 Tiptap 编辑器；输入文本可提取为纯文本
- [x] submit/abort/word-limit/disabled 与 Textarea 版行为对齐
- [x] focused 单测覆盖：编辑器渲染、纯文本提取、submit 触发、空内容禁用

### Phase 3 - 内置扩展（@提及 / 模板 / Slash 命令）

Status: completed
Targets: `packages/flux-renderers-ai/src/rich-text/extensions/mention.ts`、`extensions/template.ts`、`extensions/slash-command.ts`、`src/rich-text/index.ts`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] `createTiptapSender` 的 `extensions` 选项接受 `('mention' | 'template' | 'slash')[]`；按需启用
- [x] @提及扩展：触发 `@` → 从 `mentions` 数据源（`{ id, label, avatar? }[]`）渲染 suggestion popup（用 `@nop-chaos/ui` 的 `Popover`/`Combobox`）→ 选中插入 mention 节点（纯文本序列化为 `@label`）
- [x] 模板插入扩展：从 `templates` 数据源（`{ label, content }[]`）提供插入入口（toolbar 按钮 或 `/template` slash 子命令）→ 插入预定义文本
- [x] Slash 命令扩展：触发 `/` → 从 `slashCommands` 数据源（`{ label, action, insertText? }[]`）渲染命令菜单 → 选中执行 action 或插入文本
- [x] 数据源缺失时优雅降级（`extension-data-missing` Failure Path）：popup 为空或不弹出
- [x] 全部扩展可选；`extensions` 未传或为空数组时编辑器仅含 StarterKit

Exit Criteria:

- [x] mention 扩展：输入 `@` 弹出 popup → 选中插入 mention 节点 → 纯文本含 `@label`
- [x] template 扩展：触发后插入预定义文本到编辑器
- [x] slash 扩展：输入 `/` 弹出命令菜单 → 选中插入或执行
- [x] 数据源缺失时不崩溃、不阻断输入

### Phase 4 - Playground + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/pages/ai-rich-text-demo.tsx`、`apps/playground/src/App.tsx`、`apps/playground/src/route-model.ts`、`tests/e2e/ai-rich-text-sender.spec.ts`、design docs

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] playground 示例页 `ai-rich-text-demo.tsx`：host 经 `createTiptapSender({ extensions: ['mention','template','slash'], mentions, templates, slashCommands })` 创建编辑器 → `runtime.registerImport('ai', { tiptapSender })` → schema `senderExtensions: '${$ai.tiptapSender}'`
- [x] 注册 playground 路由（`#/ai-rich-text`，App.tsx + route-model.ts）
- [x] e2e 测试 `ai-rich-text-sender.spec.ts`：输入富文本 → mention popup → slash menu → submit 发送纯文本到消息列表
- [x] design.md 同步：§3 非目标 Tiptap 段更新为"已落地"；§5.1 增 P6 Tiptap 行（✅）；§6 目录结构增 `src/rich-text/` 子树；§10 增 `senderExtensions` 字段说明 + 子路径注入模式
- [x] renderers.md 同步：§4 ai-sender 增 `senderExtensions` schema 字段 + `AiSenderExtensionProps` 接口 + `createTiptapSender` 用法示例
- [x] roadmap-ai.md A6 状态 → `done`（Phase Status 顶部 + Work Items 表）
- [x] `docs/components/index.md` 标注 P6 ✅
- [x] dev log `docs/logs/2026/07-24.md` 记录

Exit Criteria:

- [x] playground `#/ai-rich-text` 可交互：输入富文本、mention、slash、submit 均工作
- [x] e2e `ai-rich-text-sender.spec.ts` 绿
- [x] design.md / renderers.md / roadmap-ai.md / index.md 与 live baseline 一致

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，round 1: ses_06e5d43f7ffekVOERVGJ5goYgn / round 2: ses_06e586d93ffex0WeCzucLFZ5rC）
- Verdict: `pass`（round 2 零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - **Major-1（已解决）**：Closure Gate 原声称 `contract-honesty.test.ts` 守卫 "无 Tiptap import"，但 live 测试仅扫描 IO/react/dynamic-import，不扫 `@tiptap`。修正：Phase 1 增 item 扩展 `contract-honesty.test.ts` 扫描 `src/engine/`+`src/renderers/`+`src/adapters/` 不得出现 `@tiptap` import；Closure Gate 措辞订正为区分两类守卫。Round 2 confirmed-resolved。
  - **Minor-1（已解决）**：A6 描述含"启动前需人确认"但状态为 `todo`（非 `proposed`）。按 roadmap Rule，`proposed`→`todo` 是人审门禁，A6 已是 `todo` 意味着隐式已通过人审。此处显式记录以消除歧义。
  - **Minor-2（已解决）**：package.json export 路径订正为 `./dist/rich-text/index.js`（非 glob）。
  - **Minor-4（已解决）**：design.md §6 目录结构加入 Phase 4 doc-sync（新增 `src/rich-text/` 顶层子目录需同步）。
  - **Minor-5（已解决）**：Phase 1 明确 `peerDependenciesMeta` + `"optional": true` 机制。
  - **Minor-6（已解决）**：`AiSenderExtensionProps` 定义钉到 `schemas.ts`，`src/index.ts` 经 `export type` 导出。
  - **Minor-7（已解决）**：Phase 1 增 Proof（stub 组件冒烟），早验证 schema→component resolution 链路。
  - **Minor-8（已解决）**：Phase 1 合并重复的 `AiSenderExtensionProps` 定义/导出 bullet 为一条。

## Closure Gates

- [x] `senderExtensions` 字段声明时渲染 host 注入的 Tiptap 编辑器；未声明时 Textarea 降级行为不变
- [x] `./rich-text` 子路径导出 `createTiptapSender` + 内置 mention/template/slash 扩展
- [x] Tiptap 为可选 peerDep；host 未 import 子路径时 bundle 不含 Tiptap
- [x] 编辑器输出纯文本喂给 `engine.sendMessage`，engine 契约不变
- [x] INV-1 不变量保持（`contract-honesty.test.ts` 全绿：IO/react/dynamic-import 守卫 + 新增 Tiptap-import 扫描守卫；`src/renderers/` + `src/engine/` + `src/adapters/` 无 `@tiptap` import）
- [x] playground 示例 + e2e 覆盖关键路径
- [x] owner docs（design.md §3/§5.1/§10、renderers.md §4、roadmap-ai.md A6、index.md）同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划为 A6 的完整实现计划，无预置 deferred 项。执行中经裁定移出的优化项记于此。

## Non-Blocking Follow-ups

- 富文本 → Markdown 序列化（当前输出纯文本 `editor.getText()`；若 host 需要 Markdown 输出可自定义 `serialize` 选项或后续评估）
- Tiptap 协同编辑（Yjs 集成）属业务级需求，包内不提供
- 更多 Tiptap 扩展（表格 / 任务列表 / 代码块低亮）由 host 经 `createTiptapSender({ extraExtensions })` 自行追加

## Closure

Status Note: A6 (P6 Tiptap Rich-Text Sender Extension) 关闭。4 个 Phase 全部 `completed`，Closure Gates 全勾。独立 fresh-session closure-audit 已回看 live repo 确认实现语义满足全部 Exit Criteria（非仅契约表面存在）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，未复用执行者上下文）
- Audit scope: 逐条核对 Phase 1–4 Exit Criteria、Closure Gates、deferred/follow-up 诚实性、五点文本一致性、owner-doc 同步。
- Live repo verification (not from completion notes):
  - `packages/flux-renderers-ai/src/schemas.ts:148` `AiSenderSchema.senderExtensions?: SchemaValue` 存在；`schemas.ts:167` 导出 `AiSenderExtensionProps`；经 `src/index.ts:35` `export type` 导出（编译擦除，不拉 Tiptap 进主入口 runtime graph）。
  - `src/renderers/ai-sender.tsx:105-142` extension 委托渲染分支 + `:144-176` Textarea fallback 分支并存（零回归）；`ai-renderer-definitions.ts:56,125` 注册 `senderExtensions` prop；`ai-chat.tsx:265` 透传至内部 sender。
  - `src/rich-text/tiptap-sender.tsx` 实现真实 Tiptap 编辑器：`useEditor`+`EditorContent`+`StarterKit`（line 120-164）、`editor.getText()` 纯文本序列化喂 `onChange`/`onSubmit`（line 204-208，保持 engine `sendMessage(string)` 契约）、`aiSenderSubmitKeymap` 按 `submitType` 处理 Enter/Mod-Enter/Shift-Enter（line 127-162）、loading/disabled → `editor.setEditable(false)`（line 250-253）。非空壳。
  - `src/rich-text/extensions/{mention,template,slash-command}.ts` 三个扩展均为真实实现并在 `tiptap-sender.tsx` `onSelectionUpdate`/`TemplateBar`/`SuggestionPopup` 被运行时调用（非注册后不可达）。
  - `src/rich-text/index.ts` 提供 runtime `createTiptapSender(options)` 工厂（line 53），非 Phase 1 的 type-only stub。
  - `package.json:16-19` `./rich-text` 子路径 export（types→`./dist/rich-text/index.d.ts`、default→`./dist/rich-text/index.js`）；`@tiptap/react`+`@tiptap/starter-kit` 为可选 peerDep（`peerDependenciesMeta.optional=true`，line 43-46）。
  - `src/__tests__/contract-honesty.test.ts:18,90-104` 守卫扫描 `src/engine/`+`src/renderers/`+`src/adapters/` 不得出现 `@tiptap/` import（INV-1 bundle 隔离不变量自动化）。
  - `apps/playground/src/pages/ai-rich-text-demo.tsx` + `ai/ai-rich-text-example.json` 经 `createTiptapSender` + `createExpressionHelpers` 注入 `tiptapSender`，schema `senderExtensions: '${$ai.tiptapSender}'`；路由 `#/ai-rich-text` 注册于 `App.tsx:93,307` + `route-model.ts:604`（懒加载，主 bundle 不含 Tiptap）。
  - `tests/e2e/ai-rich-text-sender.spec.ts` 5 个用例覆盖 Tiptap surface 渲染、template 插入、@mention popup+select→`@label`、/slash popup、submit→纯文本进消息列表。
  - owner-docs 与 live baseline 一致：`docs/components/flux-renderers-ai/design.md` §3/§5.1/§6/§10.6、`renderers.md` §4.1/§4.2、`roadmap-ai.md` A6→`done`（line 27,142）、`docs/components/index.md` P6 ✅（line 337）、`docs/logs/2026/07-24.md` A6 收口条目。
- Verification re-run (fresh session): `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` green；`pnpm --filter @nop-chaos/flux-renderers-ai test` 274 tests/30 files green；`pnpm typecheck` 58/58 green；`pnpm build` 31/31 green；`pnpm lint` 31/31 green；`pnpm test` 58/58 green。
- Anti-hollow: 未发现空函数体 / `return null` 占位 / 静默吞异常 / 注册后不可达组件。`tiptap-sender.tsx:273-275` 的 `catch {}` 是有界的外部 setContent 重试兜底（编辑器 view 未就绪时下次外部变更重试），非静默降级。
- Deferred honesty: `Non-Blocking Follow-ups` 三项（Markdown 序列化、Yjs 协同、更多 Tiptap 扩展）均为 out-of-scope 优化项，无 in-scope live defect / contract drift 被静默降级。`Deferred But Adjudicated` 为空。
- Five-point consistency: `Plan Status: completed` / 4× Phase `Status: completed` / 4× Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含本独立 audit 项）/ `docs/logs/2026/07-24.md` A6 条目，五处一致。

Follow-up:

- no remaining plan-owned work（Non-Blocking Follow-ups 为可选 host 扩展项，已裁定 non-blocking，不阻塞 closure）
