# i18n 契约设计（owner doc）

> Owner doc for the `flux-i18n` package and the cross-cutting i18n contract.
> Scope: message-key half contract, `t()` formula exposure, locale override
> boundaries, and the no-baked-in-literal rule. Live baseline: `flux-i18n/src/i18n.ts`,
> `flux-i18n/src/hooks.ts`, `flux-formula/src/builtins.ts` (`t` builtin),
> `flux-core/src/i18n-sink.ts`, `flux-runtime/src/validation/message.ts`.

## 1. 定位

`flux-i18n` 是 Flux 的 message-key 国际化层。它**只负责 message-key 半边**：把 key 解析成当前 locale 的文案（含参数插值）。它**不负责**：locale 路由（Loader/host 层）、schema-string 字面量翻译（I1，Loader 层）、host chrome 文案（host 自有）。架构把 i18n 归 Loader/host 层（`docs/architecture/frontend-programming-model.md:116`），flux-i18n 提供共享 sink + reactive hook 供需要者 opt-in。

## 2. Message-key 半边契约（renderer `t()` + reactive hook）

- **非 reactive `t()`（renderer 默认）**：`import { t } from '@nop-chaos/flux-i18n'` 返回当前 locale 的解析字符串（`i18n.ts:122-125`，`t(key, options)`）。这是 renderer 默认消费者（100+ `.tsx`）。
- **Reactive `useFluxTranslation()` hook**：`flux-i18n/src/hooks.ts:4-7` 经 `react-i18next` `useTranslation` 提供 reactive 路径——locale 切换时使用该 hook 的组件会重渲染并重解析字符串。契约已锁定（`i18n.test.ts:77-101`：跨 locale 切换保持绑定、重渲染）。
- **共享 sink**：`flux-core/src/i18n-sink.ts` 的 `getMessageFormatter()`/`setMessageFormatter()` 是 flux-core 唯一的 module-level 状态（文档化的审慎例外）。flux-i18n 在 `initFluxI18n()` 时 OWNS 写侧（`i18n.ts:92`），`validation/message.ts:9` 是既有读侧消费者。

## 3. `t()` 表达式暴露（I3，裁定 A）

`t(key, params?)` 已注册为 formula builtin（`flux-formula/src/builtins.ts`），schema 作者可写 `${t('flux.common.noData')}` 或 `${t('greeting', {name})}`。实现经 `getMessageFormatter()` 读当前 formatter（call-time 解析），因此表达式反映评估时的活跃 locale，**不会被静态折叠成字面量**（static-eval 仅折叠 MemberExpression callee，`t()` 的 Identifier callee 保持 runtime 评估）。

**Scope 论证**：这是接通既有 sink（`flux-core/src/i18n-sink.ts`，layering 安全——flux-formula 已依赖 flux-core）到表达式层，非新建基础设施。signal `12-i18n.md` 视 `t(key,params)` 表达式为已声称的 P1 属性；对未实现属性做 doc-「确认」不诚实，故落地是诚实收口。回归锚见 `flux-formula/src/builtins.test.ts`（I3 anchors：expression/template/identity-fallback）。

## 4. Locale 覆盖边界

| 维度                          | 层            | 契约                                                                   | 裁定                    |
| ----------------------------- | ------------- | ---------------------------------------------------------------------- | ----------------------- |
| schema-string 字面量（I1）    | Loader        | schema 内字面字符串的翻译由 Loader/组装层在 schema 进入 runtime 前处理 | 归 B5.1（独立 wave）    |
| runtime renderer 字符串（I4） | host re-mount | renderer 用非 reactive `t()`；locale 切换**不自动重渲染**已挂载字符串  | **DESIGN-ACK**（见 §5） |

## 5. I4 裁定：runtime reactive locale = host re-mount（DESIGN-ACK）

**signal 重分类**：signal `12-i18n.md:28` 把 I4 triage 为 `TEST-GAP`（声称属性成立、缺测试），但 live 证据证伪该声称——`useFluxTranslation` 存在、reactive 且有测试（`hooks.ts:4-7`、`i18n.test.ts:77-101`），但**全仓 renderer 零使用**（`grep useFluxTranslation` 仅 `flux-i18n/src` 命中）。故已挂载 renderer 字符串**不随 locale 自动重解析**。I4 由 `TEST-GAP` 重分类为 **DESIGN-ACK**（非符合）。

**裁定 B**：runtime renderer 字符串的 locale 全量 reactive 重渲染属 **Loader/host re-mount 职责**，不在 flux-i18n 的 message-key 半边。全量接线涉及 100+ renderer 文件架构性改动，超出本 wave。既有 `useFluxTranslation` hook 已提供 reactive 路径供需要者 opt-in（契约锁定，见 §2）。

**Successor**：若产品判定 reactive locale 是硬需求，开 successor plan 做全量接线（roadmap B7）。Failure path `I4-locale-flip`：已挂载页面切换 locale → 文案不自动变（已知边界）；re-mount 后变。

## 6. No-baked-in-literal 硬规则（I2）

renderer 的用户可见默认字符串**必须**经 `t()` 解析，不得 baked-in 字面量。enforcement path：

- **leak-guard 回归锚**：`chart-renderer.unit.test.tsx` 的 I2 anchor——override `flux.common.noData` resource → chart 空 fallback 反映 override（证明非 baked-in）。后续可扩展到更多 high-surface renderer。
- **notify title**：notify/toast title 的渲染 defer 到 host（flux 不在 renderer 内渲染 notify chrome），该事实记录于此（非 baked-in 字面量的例外，因 flux 不持有该 chrome）。
- 完整 bundles：`flux-i18n/src/locales/zh-CN.ts`、`en-US.ts`。

## 7. 与架构文档的关系

- i18n 归层边界：`docs/architecture/frontend-programming-model.md:116`
- flux-core sink 例外：`docs/architecture/flux-core.md`（module-level state 审慎例外）
- 表达式层：`docs/references/quick-reference.md`、`flux-formula` builtins
