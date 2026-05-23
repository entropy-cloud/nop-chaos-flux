# 开放式对抗性审查 — 2026-05-11 — 第一轮

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：已快速浏览 `docs/analysis/2026-05-08-open-ended-adversarial-review-01/` 与 `docs/references/reopened-design-decisions-and-audit-adjudications.md`；本轮避开近期已记录的 dynamic schema、projected scope、named action payload、component-id 覆盖、host-contract traversal 等问题。
> 本轮切入点：追查 built-in write action 的权威文档是否把 lexical scope write 和 component/form targeting 混写，导致作者被错误合同误导。

---

## 发现 1：文档把 `formId` 扩写成 `setValue` / `setValues` 的正式 targeting carrier，但 live baseline 其实仍是 current-scope write

**在哪里**

- action payload 矩阵把 `formId` 定义为 `setValue` / `setValues` 的正式 targeting carrier：`docs/references/action-payload-matrix.md`（本轮审查前基线）
- action 架构文档也把 `formId` 记为 built-in form-targeting path 的真实 carrier：`docs/architecture/action-scope-and-imports.md`（本轮审查前基线）
- 项目日志与计划都声称该能力已经落地：`docs/logs/2026/05-01.md:68-70`、`docs/plans/168-validation-and-built-in-form-targeting-semantics-convergence-plan.md:88,121,182`
- runtime adapter 的 `resolveFormTarget()` 仅检查 `ctx.form.id === formId`，否则直接返回 not-found：`packages/flux-runtime/src/action-adapter.ts:55-71`
- `setValue` / `setValues` 都只复用这条本地匹配逻辑：`packages/flux-runtime/src/action-adapter.ts:76-140`
- 同文件里 `submitForm(formId)` 才是单独走 component registry 解析远程 form handle 的语义入口：`packages/flux-runtime/src/action-adapter.ts:158-208`
- form handle 事实上已经暴露 `setValue` / `setValues` 能力：`packages/flux-runtime/src/form-component-handle.ts:13-21,48-53`
- 现有测试也只覆盖 “当前上下文 form 恰好就是目标 form” 和 mismatch 报错，没有覆盖远程 form resolution：`packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts:409-480`

**是什么**

live runtime 并没有把 `setValue` / `setValues` 实现成可靠的 cross-form targeting builtin。它们的实际稳定语义仍然更接近：

1. 默认写当前 dispatch scope。
2. 只有当前 `ctx.form` 恰好等于 `formId` 时，才会落到当前 form runtime。
3. 真正的跨实例 targeting 入口反而是 `component:setValue` / `component:setValues` / `component:submit` 这类 component capability。

核心逻辑是：

```ts
function resolveFormTarget(formId, ctx) {
  if (!formId) return { kind: 'current' };
  if (ctx.form && ctx.form.id === formId) {
    return { kind: 'resolved', form: ctx.form };
  }
  return { kind: 'not-found', formId };
}
```

这说明文档把两类不同动作混写了：

- `submitForm(formId)` 是兼容性的 form targeting 入口。
- `setValue` / `setValues` 则没有同等级、同稳定度的远程 targeting 实现。

当作者根据文档把三者都理解成 “同一套 built-in form targeting family” 时，就会得到错误心智模型。

所以如果页面外部 toolbar、dialog footer、或 sibling component 按照旧文档这样写：

```json
{
  "action": "setValue",
  "formId": "profile-form",
  "args": {
    "path": "name",
    "value": "Alice"
  }
}
```

只要当前 `ctx.form` 不是 `profile-form`，runtime 就会直接返回 `Form not found: profile-form`。这证明问题不在于“runtime 少了一步远程 resolution”本身，而在于文档把 built-in scope write 错写成了实例 targeting contract。

**为什么值得关心**

这不是单纯的注释不准，而是作者-facing contract 被写错了：

1. 文档、日志、计划曾把 `setValue` / `setValues` 与 `submitForm` 一起描述成 built-in form-targeting family。
2. 但 live runtime 里，真正稳定的跨实例 targeting family 是 `component:<method>`。
3. 把 built-in lexical write 误写成 remote form targeting，会让作者在 schema 层选择错误的 action family。

结果是：平台公开面把 scope write 和 instance capability 混成了一组能力。作者一旦据此把外部 toolbar、wizard step controls、dialog footer action 统一写成 `setValue + formId`，就会选错 action family。

这会破坏 action contract 的可预测性，也让“什么时候该用 built-in，什么时候该用 `component:*`”这条边界长期模糊。

**信心水平**：确定

---

## 本轮小结

本轮确认的是一条合同层残留：文档把 `setValue` / `setValues` 描述成了带 `formId` 的 built-in form-targeting action，但 live baseline 更合理也更接近现状的理解应当是 current-scope write。问题本质不是单点漏写，而是 built-in scope write 与 component/form targeting 两套模型被错误混写到同一份作者合同里。

建议下一步优先做两件事：

1. 收口权威文档：把 `setValue` / `setValues` 明确改回 current-scope write，把跨实例写入统一路由到 `component:setValue` / `component:setValues`。
2. 再决定 `submitForm(formId)` 是继续保留兼容 targeting，还是也完全收口到 `component:submit`。

## 本轮盲区自评

- 本轮主要聚焦作者合同漂移，没有继续扩展到所有 component capability 方法的一致性。
- 还没验证 `component:setValue` / `component:setValues` 对 form handle 的 payload 语义是否也存在分叉，这仍然是自然延伸点。
- 没有做运行时复现；当前结论来自 live code、文档与测试合同的交叉核对。
