# 167 Diff-View Lowlight Zero-Grammar Registration（语法高亮从未生效）

> Status: open（登记不修复——预存在缺陷，归属 content 包 owner；发现于 ai-widgets-product D6 执行期 cross-package 复核）
> Successor: content 包 owner（候选 = `ai-invariant-loop` 轮次或独立修复 plan；不属 ai-widgets-product mission scope，该 mission 授权目录为 flux-renderers-ai + apps/playground + tests/e2e + docs/components/flux-renderers-ai）

## Problem

- `flux-renderers-content` 的三个 diff 视图（split / unified / three-column）宣称有代码语法高亮，实际**从未生效**过：任何非 plaintext 语言的 diff 行都只渲染 HTML 转义纯文本（无任何 token 配色）。
- 影响面：`packages/flux-renderers-content/src/diff-view/components/diff-split-view.tsx`（import `:6`）、`diff-unified-view.tsx`（`:5`）、`diff-three-column-view.tsx`（`:7`）三视图消费的 `highlight()` 全部走静默回退路径。
- 无报错、无日志——缺陷被 catch 静默掩盖，用户与开发者均无感知。

## Diagnostic Method

- 诊断难度：低（一旦读到初始化代码即明）；难在**发现**——静默回退使表面行为"看起来正常"（纯文本渲染无异常），多年未暴露。
- 发现路径：ai-widgets-product D6 plan 执行期，为 `flux-renderers-ai` 的 `markdown.tsx` 接入 lowlight 做 cross-package 复核（content 包是仓库内唯一既有 lowlight 消费者，作为参照读取）。
- 直接证据（代码走读，2026-08-25 live 核实）：
  - `packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts:7` — `lowlightInstance = createLowlight()` **裸构造**；
  - lowlight@3 的 `createLowlight()` 不传参数时注册 **0 个 grammar**（可选参数缺省即空注册表）；`highlight(language, code)` 对未注册语言抛 `Unknown language`；
  - `syntax-highlight.ts:44-76` 的 `highlight()` 把该异常 catch 后静默回退 `escapeHtml(code)`（`:73-74`）——每个非 plaintext 调用必然抛、必然回退。

## Root Cause

- `syntax-highlight.ts:7` 裸 `createLowlight()` 零 grammar 注册（lowlight@3 API 语义：无参数 = 空语言集，注册与使用分离）。
- 放大器：`highlight()` 的 catch-all 静默回退（`:73-74`）把"必然抛错"转成"永远纯文本"，无任何可观测信号。

## Fix（修复方向——本 note 只登记，未实施）

- 首选：`createLowlight(common)`（`import { common } from 'lowlight'`），与 D6 在 `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:112` 的接法同款（~37 语言；live 核实 highlight.js common bundle 为 `typescript` 注册 `ts`/`tsx` 别名，tsx fence 免额外 `register()`）。
- 备选：按需 `lowlight.register(lang, grammar)`（体积敏感场景只注册 demo 实际语言）。
- 修复时同步评估：catch 回退保留（防御性降级合理），但注册修复后应有一条聚焦测试证明非 plaintext 语言产生 token span（防回归）。
- **范围澄清（防虚假范围）**：本缺陷在 content 包 `diff-view/`，与本 mission（ai-widgets-product）已修代码**零交叠**——mission 侧的 `flux-renderers-ai/markdown.tsx` lowlight 接线（D6）是独立正确的实现，不是本缺陷的修复。

## Tests

- 未新增（登记不修复；successor 修复时应补：`diff-split-view` / `diff-unified-view` 至少各 1 例——非 plaintext 语言行内出现 token span 而非纯转义文本）。

## Affected Files

- `packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts`（缺陷本体，`:7` / `:44-76`）
- `packages/flux-renderers-content/src/diff-view/components/diff-split-view.tsx`（消费面 `:6`）
- `packages/flux-renderers-content/src/diff-view/components/diff-unified-view.tsx`（消费面 `:5`）
- `packages/flux-renderers-content/src/diff-view/components/diff-three-column-view.tsx`（消费面 `:7`）
- 参照实现：`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:112`（`createLowlight(common)`，D6）

## Notes For Future Refactors

- lowlight@3 的 `createLowlight()` 是**可选参数**构造——裸调用不报错但注册表为空，`highlight()` 全量抛 `Unknown language`；任何新接入点必须显式传 `common` 或 `register()`。
- 静默 catch 回退会掩盖"从未成功"类缺陷；降级路径应保留最小可观测性（至少一处 console.warn 或计数），供 cross-package 复核发现。
- 同缺陷模式排查提示：仓库内 grep `createLowlight()` 裸调用即可定位同类问题（2026-08-25 核实仅本文件一处）。
