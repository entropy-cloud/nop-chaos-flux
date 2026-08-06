# Schema Event Dispatch Requires `{ event, evaluationBindings, scope }` Ctx（事件 ctx 家族）

## Problem Context

schema 事件派发（`props.events.onX?.(payload)`）若不携带 `{ event, evaluationBindings, scope }` ctx 作为第二参，**action args 模板读不到 payload 键**。该家族在 component-audit 轮反复出现：C7 首现（bug 83，countdown/infinite-scroll/pull-refresh/swipe-cell 4 组件 6 派发点）、CX-10 扩展至 ai 族（C8.1 13 处 + C8.2 10 处）、CX-12 扩展至 scheduling 族（gantt/kanban/calendar/barcode-input ~25 派发点）。

## Initial Judgment

"派发了事件就完成了契约"——事件名注册（definitions `kind:'event'`）+ 调用点存在即认为作者可消费；payload 形状与文档一致即可。

## Why It Looked Plausible

- `props.events.onX?.(payload)` 在 jsdom 单测里"派发成功"，回调收到 payload；
- 文档示例常写 `${event.id}`/`${message}`，看起来模板应该能解析；
- 早期 C1-C6 阶段无此约定记录，各组件按自己的习惯单参派发。

## Why It Was Wrong

runtime 对 action args 模板的求值**只合并 `evaluationBindings` + scope**（`getEvaluationScope`，flux-action-core/src/action-core.ts:206-208）——`event` 键仅用于 preventDefault 求值，payload 裸键若不在 evaluationBindings 中，`${message}`/`${id}` 等解析为空；`${event.x}` 亦不可解析（文档曾误写）。单参派发 = 模板键静默空值，作者无任何报错提示。

## Decisive Evidence

- bug 83（C7 四组件）+ `docs/bugs/86`：test-first「dispatch carries event/evaluationBindings ctx」先红后绿；
- CX-10（`docs/bugs/88`）：ai 族 23 处补齐后，宿主 spec 实证 `${id}`/`${action}`/`${text}`/`${conversationId}`/`${usage.total_tokens}` 解析；
- CX-12（C9）：scheduling 族补齐后实证 `${_taskId}`/`${cardId}`/`${eventId}`/`${barcode}` 解析；
- `renderer-runtime.md` Event Passthrough Contract 校正：evaluationBindings 裸键约定、`event` 仅 preventDefault。

## Correct Decision Rule

**schema 事件派发必须携带 `{ event, evaluationBindings, scope }` ctx 作为第二参**（payload 对象第一参）。既有例外（原生 DOM 事件转发，如 button/notice-bar/link/card 直接传 DOM event + normalizeActionEvent 归一）与空参派发（无 payload 契约声明）按卡内裁决留痕——新增事件派发一律默认带 ctx，除非卡内显式裁决豁免。

## Preventive Checklist

- 新增/修改事件派发点：第二参必须为 `{ event: payload, evaluationBindings: payload, scope: node.scope }`（或等价 dispatchCtx）；
- 单测断言收紧为**双参契约**（payload 全等 + ctx 三键），禁止单键 `objectContaining` 放宽；
- 宿主 e2e 至少 1 例断言 action args 模板 `${key}` 真机解析（不解析即红）；
- definitions `kind:'event'` 注册项与派发点逐一核对，注册了就必须有派发、有派发就必须有 ctx（或卡内豁免记录）。

## Related Files / Docs

- `docs/bugs/83-*.md`、`docs/bugs/86-*.md`、`docs/bugs/88-*.md`
- `docs/architecture/renderer-runtime.md`（Event Passthrough Contract）
- roadmap CX-10 / CX-12 行；`docs/audits/per-component/pc-index.md` CX-n 索引
- `docs/audits/component-audit-checklist.md` v2 维度 7
