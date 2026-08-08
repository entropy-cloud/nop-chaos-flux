# 声明即契约（ghost contract）检测法：注册项/事件派发点/component:\* 句柄/schema 字段 ↔ design.md 双向核对

## Problem Context

第一轮逐组件审计（113 卡）中**最高产的缺陷类别**是「声明即死」：schema 里声明了事件、字段、reaction、`component:*` 句柄，但渲染器从不派发、从不注册、从不消费——契约在纸面成立、在运行时不存在。典型：声明事件从不派发（stopWhen 零消费者）、`component:*` 句柄零注册（kanban 死句柄 22-12）、schema 字段声明零消费（finishAction / importsReady 死管道）、@reserved 标注与 live 消费脱节。

## Initial Judgment

"definition 里声明了事件/字段/句柄 = 作者能用"；或"design.md 写了这个能力 = 能力存在"；或"单测没报错 = 接线成立"。

## Why It Looked Plausible

- 声明项在注册层（definition/defaultSchema/fields/events/reactions）全部通过校验，编辑器里可见可配，看起来契约完整；
- `component:*` 解析在 jsdom 单测面经常"没被调用过"，零调用零报错，不会暴露零注册；
- @reserved 标注本身看起来是「刻意为之」的契约语义，容易跳过消费核对；
- design.md 是文档契约，文档与实现分属不同文件，双向核对需要人工跨文件追踪，容易漏。

## Why It Was Wrong

声明是**承诺**不是**事实**。契约成立的最低判据是「运行时存在消费路径」：事件必须有派发点（且携带全量 ctx）、reaction 必须三件套接线（reactionsRef + ready() + ComponentHandle）、`component:*` 必须注册进 componentRegistry、schema 字段必须有消费端（或被显式裁决为 @reserved/移除）。声明项零消费 = 静默死契约——使用者按文档调用时行为静默错误（`component:*` 不可解析、事件永不触发、字段配置无效），且单测面不报错，最难排查。

## Decisive Evidence

- **stopWhen 零消费者**：`CrudPollingConfig.stopWhen` 从 schema 移除并标注 @reserved（live 核对 data-source 侧由 `source-compiler.ts` 编译消费，CRUD 侧透传需重造请求层 → 裁决移除字段，2228-1 2-1，`docs/logs/2026/08-07.md`）。
- **finishAction 死管道**：`finishAction` 恒等函数 + runner 签名瘦身（live 核对 14 调用点全部不需要），移除后全仓零消费者（2228-3 2-3，`docs/logs/2026/08-07.md`）。
- **importsReady 死守卫**：`form.tsx:50` 常量 `importsReady=true` + 两 hook 的 `!importsReady` 门控全删（渲染期 imports 恒已 prepared，preload 失败阻断编译，2228-3 2-5）。
- **kanban 死句柄 22-12 / pasteClipboard 声明 3 处执行 0 处**：handle 未注册 → `component:*` 不可解析；D3.1 e2e 现场发现 `designer-command-adapter.ts` switch 缺 `case 'pasteClipboard'`（bug note 91，`docs/logs/2026/08-08.md` D3.1 节）。
- **D2 @reserved 专项核对先例**：`docs/audits/round2-p3-adjudication.md` §5——`rg "@reserved" packages/*/src` 全量登记 7 处 / 3 文件，逐处 live 消费核对（事件派发点、reaction ready、ComponentHandle method、schema 消费）+ design.md 标注对照 → 1 激活（crud-schema.ts:37 注释更正）+ 6 维持（calendar 家族零派发零消费仅 ready）。ghost contract 专项结论：全部 7 处核对完成，无新增消费者。
- **D1 模式族回扫**：`kind:'reaction'` 全量 13 处声明 vs 消费矩阵 13/13 接线闭环（crud/gantt/calendar/diff-view，`docs/logs/2026/08-08.md` D1 节）。

## Correct Decision Rule

**「声明即契约」检测 = 对注册项的每一条，做双向核对**：① 注册项（definition defaultSchema/fields/events/reactions）→ 渲染器消费端（逐项找派发点/接线/读取点，要求 `文件:行` 证据）；② design.md 契约 → live 代码（每条能力找实现路径）；③ `component:*` 句柄 → componentRegistry 注册（invoke/hasMethod/listMethods 可解析）。核对结果三态：**消费在案（live）/ 显式裁决 @reserved（零消费者 + 标注）/ 移除**。任何一条落不进这三态 = ghost contract，必须修复或裁决，不得静默保留。

## Preventive Checklist

- 新注册事件/reaction/字段：实现时同时列出派发点或消费点 `文件:行`，零消费者即不允许落地（除非当场裁决 @reserved）；
- `component:*` 能力：必须有 ComponentHandle 注册 + 至少 1 条宿主 e2e 真机 `component:*` 解析用例；
- @reserved 标注：标注时记录裁决先例（schema 字段 @reserved = 从 schema 移除留痕；reaction/event @reserved = 零派发零消费 + future design 出处）；
- schema 字段：用 `check:audit-runtime-raw-schema-reads` 类门禁 + 人工双向核对（声明 ↔ `props.props` 消费）兜底；
- design.md 能力声明：每次审计将文档契约 ↔ live 实现双向核对列为维度（round-2 checklist 维度 7）；
- 审计卡维度 7 强制：事件 ctx / reaction 三件套 / 句柄注册三件套逐项取证。

## Related Files / Docs

- `docs/audits/round2-p3-adjudication.md` §5（@reserved 7 处逐处核对 + ghost contract 专项结论）
- `docs/logs/2026/08-07.md`（2228-1 2-1 stopWhen、2228-3 2-3/2-5）、`docs/logs/2026/08-08.md`（D1 reaction 13/13 接线矩阵、D3.1 P1-2 pasteClipboard、bug note 90/91/106）
- `docs/bugs/106-*.md`（22-12 kanban 死句柄）、`docs/lessons/05-*.md`（reaction 三件套：捕获/ready/注册）
- 第一轮 `docs/audits/per-component/pc-index.md`（CX-n 索引）、`docs/audits/component-audit-checklist.md` v2 维度 7
