# 开放式对抗性审查 — 2026-05-08 — 第四轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前三轮已覆盖 dynamic schema、projection scope、named action payload、component/action targeting 等问题；本轮只验证 schema validator 与 host-contract authoring 入口。
> 本轮切入点：检查 validation traversal 是否在 object/array authoring 等价写法之间保留同一上下文。

---

## 发现 1：host-contract capable region 写成数组时会丢失自动 host action 校验

**在哪里**

- 自动 host context 从 renderer `hostContract` 建立：`packages/flux-compiler/src/schema-compiler/shape-validation.ts:44-115`
- region traversal 给子节点传入 `currentRegion`：`packages/flux-compiler/src/schema-compiler/shape-validation.ts:117-132,409-420`
- 但 array traversal 没有继续传入 `traversalState`：`packages/flux-compiler/src/schema-compiler/shape-validation.ts:331-335`
- host action 只在 capable region 内校验：`packages/flux-compiler/src/schema-compiler/host-action-validation.ts:32-59,79-92`
- 现有测试只覆盖 capable region 为单个 object：`packages/flux-compiler/src/schema-compiler-host-contract.test.ts:63-82`
- 真实 host renderers 都使用 region-scoped publication：`packages/flow-designer-renderers/src/designer-manifest.ts:480-484`、`packages/word-editor-renderers/src/word-editor-manifest.ts:184-188`、`packages/report-designer-renderers/src/report-designer-manifest.ts:319-323`、`packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:298-302`

**是什么**

自动 host-contract validation 的 object region happy path 是通的。比如测试里的：

```json
{
  "type": "designer-page",
  "toolbar": {
    "type": "toolbar-button",
    "onClick": { "action": "designer:unknownMethod" }
  }
}
```

会进入 `toolbar` region，`createChildTraversalState()` 设置 `currentRegion: 'toolbar'`，随后 `validateHostAction()` 能识别这是 capable region 并报 `unknown-host-capability-method`。

但低代码 schema 中 region 通常既允许单对象，也允许数组。若作者写成：

```json
{
  "type": "designer-page",
  "toolbar": [
    {
      "type": "toolbar-button",
      "onClick": { "action": "designer:unknownMethod" }
    }
  ]
}
```

第一次调用 `analyzeSchemaInput(value, '$.toolbar', ..., traversalStateWithToolbar)` 后，函数立即走 array branch：

```ts
if (Array.isArray(inputValue)) {
  inputValue.forEach((entry, index) => {
    analyzeSchemaInput(entry, `${path}[${index}]`, registry, plugins, diagnostics);
  });
  return;
}
```

这里没有把 `traversalStateWithToolbar` 传给子元素。子元素重新使用默认 traversal state，没有 `hostContext.currentRegion = 'toolbar'`。因此 `validateHostAction()` 看到 `hostContext` 为空或不在 capable region，直接跳过 host method/args 校验。

**为什么值得关心**

这会让 object 与 array 两种合法 region authoring 形式在 validator 里语义不等价。所有真实 host owner 都声明了 `region-scoped` capable regions，例如 `toolbar`、`inspector`、`dialogs`、`body`。这些区域恰恰最常被写成数组来放多个按钮/面板/动作入口。

结果是：单按钮 toolbar 能发现错误 host action；多按钮 toolbar 反而不校验 host capability。对 Flow Designer、Word Editor、Report Designer、Spreadsheet 这类依赖 host manifest 的 renderer，数组写法会让 manifest 方法名和 args shape 漂移重新变成运行时问题。

**信心水平**：确定

---

## 本轮小结

本轮只有一个发现，但它的根因很集中：validation traversal 的上下文不是显式不可丢的参数，array 分支漏传后就破坏了 object/array schema 等价性。

建议优先补一个回归测试：在 `schema-compiler-host-contract.test.ts` 中把 `toolbar` 改成数组，断言仍能报 `unknown-host-capability-method` 和 invalid args。修复应当让 array branch 调用 `analyzeSchemaInput(entry, ..., traversalState)`。

## 本轮盲区自评

- 本轮只验证了 automatic renderer hostContract path，没有重新审计 explicit `validation.hostContractContext` 工具入口。
- 没有展开 host manifest 本身与 runtime provider 的方法漂移，这类问题已有历史报告覆盖。
- 下一轮如果继续，应从 validation traversal 的其它上下文参数或 compile/validate 双路径差异切入；本轮不再扩展 host manifest 内容一致性。
