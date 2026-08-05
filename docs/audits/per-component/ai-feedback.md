# 审计卡：ai-feedback（flux-renderers-ai）

> 状态: closed
> 审查日期: 2026-08-05
> 审查 plan: `docs/plans/2026-08-05-1314-3-c8-2-ai-tool-content-family-audit.md`
> 注册定义: `packages/flux-renderers-ai/src/ai-renderer-definitions.ts:180` | 渲染器: `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:18` | design.md: `docs/components/flux-renderers-ai/design.md:80,:587` | renderers.md: `docs/components/flux-renderers-ai/renderers.md:362-370,:622` | playground: `apps/playground/src/pages/ai-widgets-demo.tsx` | e2e: `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts`（本 plan Phase 3 新增）

> 卡状态说明：本卡 P1×1（事件派发缺 evaluationBindings ctx，CX-10 家族）+ P2×2（测试加固 + 既有测试断言放宽），均在本 plan 内修复，修复后 P0/P1 清零 → `closed`。

## 组件身份

ai-feedback / flux-renderers-ai / AiFeedbackSchema（`schemas.ts:248-255`）/ defaultSchema `{type:'ai-feedback'}` / 表单参与: 否 / Widget 渲染器（自样式 UI 控件，根 marker `nop-ai-feedback`）：消息底部操作条（copy/refresh/like/dislike/sources），`onAction` 派发 `{ action, message }`。

## 18 维审查记录

| #   | 维度                        | 结论 | 证据                                                                                                                                                                                                                                                                                                                                                                     | 发现                         |
| --- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------- |
| 1   | Schema 契约                 | pass | AiFeedbackSchema（schemas.ts:248-255：message/actions SchemaValue + onAction ActionSchema）↔ 注册 fields（definitions.ts:186-190：message/actions/onAction，defaultSchema `{type:'ai-feedback'}` :184）↔ 渲染器消费（ai-feedback.tsx:19-21,74-78 normalizeActions 未知 action 过滤 + DEFAULT_ACTIONS 降级）；actions 非数组/空数组 → 默认 `['copy','refresh']`（:74-77） | —                            |
| 2   | RendererComponentProps 合规 | pass | 仅读 props.props/meta/events（:19-21,:41）；voted/copied 为组件本地 useState（:22-23）；无 store 直访、无 ad-hoc context                                                                                                                                                                                                                                                 | —                            |
| 3   | 值所有权三态                | pass | voted/copied 纯 local 回显态（design.md 无受控承诺）：like/dislike 点击切换 `data-active` presence（:38-40,:58-64）；copy 成功后 copied 翻转 1.5s（:30-37）；受控/scope 路径 n/a（纯事件型 widget，状态不写回任何 value 字段）                                                                                                                                           | —                            |
| 4   | 表单参与                    | n-a  | 非表单字段（无 name/validation）                                                                                                                                                                                                                                                                                                                                         | —                            |
| 5   | DOM 与选择器契约            | pass | 根 `nop-ai-feedback` marker + data-slot="ai-feedback" + data-cid/data-testid 透传（:44-50）；子按钮 data-slot `ai-feedback-{action}`（:52-68）+ `data-active` presence-only（:58-64，符合 design.md:601/:668 presence-only 不变量）；`check:audit-missing-renderer-markers` 0 命中                                                                                       | —                            |
| 6   | 嵌套 schema 分类            | pass | 无内嵌 schema/action 结构字段（message/actions 均为值）→ 无 deepFields 残留（live grep 零命中）                                                                                                                                                                                                                                                                          | —                            |
| 7   | 事件与 action 契约          | fail | onAction payload `{ type:'ai:feedback-action', action, message }`（:41）与文档 `{ action, message }`（renderers.md:368,:622）一致（含 type 前缀）；**派发单参、缺 `{ event, evaluationBindings, scope }` ctx → action args `${action}`/`${message.id}` 运行时解析为空（CX-10/bug-83 家族约定，ai-conversations.tsx:29-33 同型先例）**                                    | P1-1                         |
| 8   | a11y                        | pass | 每按钮 aria-label = t() 文案（:64-92 labelFor）；copy/refresh/like/dislike/sources 五键双语 key 存在；p2-a11y-i18n.test.tsx:161+ 断言 aria-label/textContent 双语（Like/Dislike/Sources）                                                                                                                                                                                | —                            |
| 9   | i18n                        | pass | 键 flux.ai.copy/retry/like/dislike/sources/copied 在 zh-CN.ts:68-108 / en-US.ts:68-108 存在；`check:i18n-keys` 0 命中                                                                                                                                                                                                                                                    | —                            |
| 10  | 四态覆盖                    | pass | 空态（无 message → 按钮仍渲染、copy 静默 no-op :101-103 空文本直接 resolve）；错误/加载/禁用 n/a（无 schema 字段）                                                                                                                                                                                                                                                       | —                            |
| 11  | 异步生命周期                | pass | copy 异步 clipboard：`void` + `.then/.catch`（:30-37），reject 静默保持原态（clipboard-write-failed 注释 :27-29）；不产生未处理 rejection                                                                                                                                                                                                                                | —                            |
| 12  | 组合宿主场景                | pass | Phase 3 补 host-feedback（真实浏览器：like 切换 data-active 回显 + onAction payload `${action}                                                                                                                                                                                                                                                                           | ${message.id}` 经 ctx 解析） | 见 Phase 3 |
| 13  | 样式契约                    | pass | Widget 自样式（`flex items-center gap-1 text-muted-foreground` :46 属控件视觉设计）；无 BEM；cn() 合并 meta.className；`check:audit-styling-suspects` 本文件 0 命中                                                                                                                                                                                                      | —                            |
| 14  | React 19 规范               | pass | 仅 useState 本地回显；无 useCallback/useMemo 冗余、无 effect+setState 镜像；setTimeout 1.5s copied 复位无清理依赖（组件卸载后 setState 安全——React 18+ 无警告，且 copied 复位为纯视觉）                                                                                                                                                                                  | —                            |
| 15  | 性能边界                    | pass | 常量级 actions 列表（≤5），无大列表/热点                                                                                                                                                                                                                                                                                                                                 | —                            |
| 16  | 测试质量                    | fail | 既有 3 用例（p1-renderers.test.tsx:236-285）断言 `objectContaining({ action: 'copy' })` 单键（:262-265）——message 字段/ctx 双参契约未断言；like/dislike/sources 点击派发无测试；data-active 回显切换无测试                                                                                                                                                               | P2-1                         |
| 17  | 文档对照                    | pass | design.md:80/:587（marker 表）、renderers.md:362-370（schema/actions 默认值）、:622（Events 总览 `{ action, message }`）与实现一致                                                                                                                                                                                                                                       | —                            |
| 18  | 注册、包边界与 IO/安全红线  | pass | 单注册（definitions.ts:180）+ surface 导出（src/index.ts:46）+ registerAiRenderers ✓；playground ai-widgets-demo.tsx 覆盖 ✓；无网络 IO 直调（navigator.clipboard 为用户手势浏览器 API，非网络 IO，与 ai-voice-input SpeechRecognition 先例一致——schemas.ts:344-348）                                                                                                     | —                            |

## 发现清单

- [P1-1] onAction 派发缺 evaluationBindings ctx（ai-feedback.tsx:41）——CX-10 家族约定（C7 bug-83）在工具内容族漏接；action args `${action}`/`${message.id}` 解析为空 → 状态: fixed（Phase 2 test-first：`dispatchCtx` 第二参 `ai-feedback.tsx:13-20` + `ai-feedback.test.tsx` 双参断言先红后绿）
- [P2-1] 测试加固：like/dislike/sources 点击派发、data-active 本地回显切换、message 字段/ctx 双参契约均未断言（p1-renderers.test.tsx:236-285）→ 状态: fixed（Phase 2 新增 `ai-feedback.test.tsx` 6 用例：回显切换/互斥/全 payload + ctx 断言）
- [P2-2] 既有 onAction 断言为单键 `objectContaining`——放宽契约容忍 payload 丢字段 → 状态: fixed（Phase 2 p1-renderers.test.tsx:262-276 收紧为全 payload + ctx 断言）

## 组合宿主场景（真实浏览器验证）

- 场景: Phase 3 —— host-feedback（真实浏览器：like/dislike 点击 data-active 回显切换 + onAction 双参派发、`${action}|${message.id}` 经 action args 解析；copy 触发 onAction 不依赖 clipboard 结果）| 断言: `tests/e2e/component-lab/c8-2-host-surfaces.spec.ts`（programmatic DOM 断言，禁截图） | 结果: pass（Phase 3）

## 修复记录

- Phase 2：P1-1 按 CX-10 家族模式（ai-chat.tsx:63-69 eventCtx / ai-conversations.tsx:29-33 dispatchCtx）在 ai-feedback.tsx:13-20 新增 dispatchCtx 并接第二参（:56）；P2-1/P2-2 新增 `ai-feedback.test.tsx`（6 用例）+ 收紧 p1-renderers 断言。
- 验证: `pnpm --filter @nop-chaos/flux-renderers-ai typecheck && build && lint && test` 绿（495，含新增 6 用例）+ c8-2-host-surfaces.spec.ts 宿主场景绿（Phase 3）。

## Closure

- 18 维核对完成（dim 7/16 发现已修复回填）；P0×0/P1×1 fixed/P2×2 fixed；卡状态 `closed`（Phase 4 全量回归绿后流转，checklist §3：P0/P1 清零）
- 独立 closure audit: pass（mission-driver CLOSURE_VERIFY fresh session，2026-08-05——见 plan `2026-08-05-1314-3` Closure Audit Evidence）
