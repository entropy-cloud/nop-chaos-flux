# 审计卡：ai-message-list（flux-renderers-ai）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1314-2-c8-1-ai-conversation-main-chain-audit.md`
> 注册定义: `packages/flux-renderers-ai/src/ai-renderer-definitions.ts:81` | 渲染器: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:132` | design.md: `docs/components/flux-renderers-ai/design.md` | renderers.md: `docs/components/flux-renderers-ai/renderers.md` | playground: `apps/playground/src/pages/ai-chat-demo.tsx`（内嵌）+ `ai-virtual-scroll-demo.tsx` | e2e: `tests/e2e/ai-chat.spec.ts`（内嵌）+ `tests/e2e/ai-virtual-scroll.spec.ts`（1）

> 卡状态说明：本卡无 P0/P1 发现（18 维核对全 pass/n-a）；唯一发现 P2-1 lab 页缺口，P2 低成本 Phase 3 补建后回填证据——按 checklist §3 可直接 closed。

## 组件身份

ai-message-list / flux-renderers-ai / AiMessageListSchema（`schemas.ts:100-106`）/ defaultSchema `{type:'ai-message-list'}` / 表单参与: 否 / 会话消息列表视图（读 ai-chat context engine + 消息渲染 AiBubbleView + 自动滚动 + 200 阈值虚拟滚动 + 空态 region）。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                      | 发现  |
| --- | --------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Schema 契约                 | pass | AiMessageListSchema（schemas.ts:100-106：autoScroll/showTimestamp/emptyRegion）↔ 注册 fields（definitions.ts:87-91：3 字段，布尔 valueType 标注，emptyRegion value-or-region）↔ 渲染器消费（ai-message-list.tsx:133-144：autoScroll 布尔、showTimestamp===true、emptyRegion.render）三方一致；defaultSchema ✓；缺失 prop 降级（autoScroll 默认 true :37） | —     |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/regions（:133-144）；无 store 直访——engine/messages 经 useAiChatContext（:35-36）                                                                                                                                                                                                                                                   | —     |
| 3   | 值所有权三态                | n-a  | 纯展示列表（消息数组来自 context/engine 快照，无 local value 面）；autoScroll 为行为开关非值所有权                                                                                                                                                                                                                                                        | —     |
| 4   | 表单参与                    | n-a  | 非表单字段                                                                                                                                                                                                                                                                                                                                                | —     |
| 5   | DOM 与选择器契约            | pass | 根 `nop-ai-message-list` marker（:58/:75）+ data-slot="ai-message-list"（:59/:76）+ data-empty（空态 :60）+ data-virtual（虚拟态 :77）+ data-cid/data-testid（:61-62/:78-79）；空态与正常态同一 data-slot；`check:audit-missing-renderer-markers` 0 命中；data-cid 透传测试（data-cid-contract.test.tsx:169）                                             | —     |
| 6   | 嵌套 schema 分类            | pass | 仅 1 个 emptyRegion（value-or-region，definitions.ts:90）；无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                                                                         | —     |
| 7   | 事件与 action 契约          | n-a  | 无 schema 事件字段（消息交互事件在 ai-bubble/ai-sender 层）                                                                                                                                                                                                                                                                                               | —     |
| 8   | a11y                        | pass | role="log" + aria-live="polite" + aria-busy=isProcessing（:63-65/:80-82）——流式播报契约（a11y.test.tsx:37/:45 实证）；虚拟窗口行 data-index 标记                                                                                                                                                                                                          | —     |
| 9   | i18n                        | pass | 无硬编码文案（空态文案由 emptyNode/父级提供）                                                                                                                                                                                                                                                                                                             | —     |
| 10  | 四态覆盖                    | pass | 空态（messages 0 → data-empty + emptyNode :55-70，renderers.test.tsx:131 实证）、加载中（aria-busy + 流式增量渲染）、错误（requestState==='error' → 最后一条 assistant 气泡 isError :104/:119）、禁用 n/a                                                                                                                                                 | —     |
| 11  | 异步生命周期                | pass | 流式增量渲染（engine 订阅快照驱动，react-adapter snapshot-cache 防渲染环）；auto-scroll trigger 派生（:42-43 messages.length:contentSignature，use-auto-scroll.ts:30-66 pinned 跟踪 + effect `[trigger]` 静态依赖）；虚拟化 enabled 开关（:45-53）；无裸 Promise（全部 void 化事件）                                                                      | —     |
| 12  | 组合宿主场景                | pass | 真实浏览器既有：ai-chat.spec.ts 10 场景（内嵌列表）+ ai-virtual-scroll.spec.ts（1000 消息窗口化，1 场景）+ ai-branches-linkage.spec.ts；**Phase 3 补流式 DOM 契约专项（host-ai-stream：data-role/data-slot 稳定断言）**                                                                                                                                   | 见 P3 |
| 13  | 样式契约                    | pass | 根 marker 类 + className 透传（cn('nop-ai-message-list', props.className) :75）；无 BEM；无 ThemeProvider；气泡布局在 ai-bubble 自样式                                                                                                                                                                                                                    | —     |
| 14  | React 19 规范               | pass | 无冗余 memo/useCallback；useVirtualizer 为 TanStack 必需（eslint-disable 注释记录 :46）；useAutoScroll effect `[trigger]` 静态依赖 Compiler 友好；无 effect+setState 镜像                                                                                                                                                                                 | —     |
| 15  | 性能边界                    | pass | VIRTUAL_SCROLL_THRESHOLD=200 窗口化虚拟渲染（:21,:45-53,+ ai-virtual-scroll.spec.ts DOM 窗口实证）；虚拟行 key=message.id 稳定（:91/:117）；overscan 6；estimateSize 120（流式行高自适应 measureElement :93）；auto-scroll pinned 防打断（use-auto-scroll.ts:35-40）                                                                                      | —     |
| 16  | 测试质量                    | pass | 既有测试断言正确行为：renderers.test.tsx（marker/data-role/空态/showTimestamp 转发）、a11y.test.tsx（role/aria-busy/焦点）、data-cid-contract.test.tsx:169、ai-virtual-scroll 窗口化 e2e；无 not-throw-only 假绿                                                                                                                                          | —     |
| 17  | 文档对照                    | pass | renderers.md §3 ai-message-list schema（autoScroll/showTimestamp/emptyRegion）↔ 实现一致；DOM 结构（data-slot ai-message-list :747 附近）↔ 实现一致                                                                                                                                                                                                       | —     |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（definitions.ts:81）+ src/index.ts:40（Renderer）+ :55（View）导出 ✓；无浏览器 IO 直调 ✓；playground 演示页（ai-chat-demo 内嵌 + ai-virtual-scroll-demo）✓；**component-lab lab 页缺失（维度 18 覆盖缺口）→ P2-1（Phase 3 补页 + registry/route/manifest）**                                                                                       | P2-1  |

## 发现清单

- [P2-1] component-lab lab 页缺失（维度 18 覆盖缺口）→ 状态: fixed（Phase 3——`ai-message-list-lab-page.tsx` + registry/route/manifest 条目）

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-ai-stream（流式渲染 DOM 契约专项：流式增量下 ai-message-list/data-role="assistant" 的 data-slot 稳定 + 消息数递增）| 断言: `tests/e2e/component-lab/c8-1-host-surfaces.spec.ts` | 结果: **pass 1/1**

## 修复记录

- 本卡无 P0/P1 发现；P2-1 lab 页补建于 Phase 3（lab 页 + registry + route + manifest + host-ai-stream 场景）。
- 验证: c8-1 host spec 全绿 + ai-chat/ai-virtual-scroll e2e 回归绿。

## Closure

- 18 维核对全 pass/n-a；P0×0/P1×0；P2-1 已修复；卡状态 `closed`（checklist §3：无 P0/P1 可 closed）
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session，2026-08-05——见 plan `2026-08-05-1314-2` Closure Audit Evidence）
