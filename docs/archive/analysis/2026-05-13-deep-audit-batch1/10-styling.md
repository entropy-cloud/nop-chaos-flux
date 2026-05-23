# 维度 10：样式系统合规性

## 第 1 轮（初审）

### [维度10-01] `@nop-chaos/flux` 导出样式仍保留已失效的 BEM fallback selectors

- **文件**: `packages/flux-bundle/src/style.css`; `packages/flux-react/src/node-error-boundary.tsx`; `packages/flux-react/src/default-spacing.css`
- **证据片段**:

  ```css
  .nop-flux-root .nop-schema-root-fallback--status {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  .nop-flux-root .nop-schema-root-fallback__message {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  ```

- **严重程度**: P2
- **违规类别**: BEM
- **现状**: `@nop-chaos/flux` 对外导出的 bundle 样式仍使用 `.nop-schema-root-fallback--status`、`.nop-schema-root-fallback__message`、`.nop-node-error__message`、`.nop-node-error__retry` 这类 BEM selector；但 live `flux-react` 已改为 `data-mode='loading'` 与 `data-slot` selector。公开样式入口与真实 renderer DOM marker contract 已分叉。
- **建议**: 将 `packages/flux-bundle/src/style.css` 与 live `flux-react` contract 对齐，改用 `data-mode` / `data-slot` selector，并同步清理其他旧 BEM fallback 规则。
- **为什么值得现在做**: 这是 public package 导出面上的真实 contract 漂移。继续保留会让使用 `@nop-chaos/flux/style.css` 的消费者拿到与运行时 DOM 不匹配的样式协议。
- **误报排除**: 这不是局部 widget 样式例外；问题位于公开 bundle CSS，与 live `node-error-boundary` DOM 明确不一致。
- **历史模式对应**: marker contract drift；不适用 widget 局部样式降级逻辑。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/references/audit-rules/single-owner-styling-defaults-and-marker-contracts.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度10-02] `frameClassName` 不参与 `classAliases` 展开，FieldFrame 包装层无法使用文档承诺的 alias 机制

- **文件**: `packages/flux-react/src/node-renderer-resolved.tsx`; `packages/flux-react/src/node-frame-wrapper.tsx`; `docs/architecture/styling-system.md`
- **证据片段**:
  ```tsx
  const resolvedClassName = mergedClassAliases
    ? resolveClassAliases(baseMeta.className, mergedClassAliases)
    : baseMeta.className;
  ```
- **严重程度**: P2
- **违规类别**: classAlias
- **现状**: runtime 只对 `baseMeta.className` 执行 `resolveClassAliases(...)`，而 `frameClassName` 作为文档化样式入口会直接透传到 `FieldFrame`。
- **建议**: 在 `NodeRendererResolved` 中与 `className` 一并解析 `frameClassName`，或提供统一样式字段 alias 解析 helper。
- **为什么值得现在做**: `frameClassName` 是 field chrome 的正式入口；当前缺口迫使作者在 wrapper 层回退为重复 Tailwind 长字符串。
- **误报排除**: 不是要求所有字符串 prop 都支持 alias；`frameClassName` 已在 owner doc 中被定义为正式样式字段。
- **历史模式对应**: classAlias contract gap；不同样式入口对同一 alias 机制接线不完整
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度10-01]: 保留 (P2)。`@nop-chaos/flux` bundle CSS 仍保留已失效的 BEM fallback selectors，和 live DOM contract 分叉。
- [维度10-02]: 保留 (P2)。`frameClassName` 仍未参与 `classAliases` 展开，FieldFrame wrapper 无法使用别名样式契约。

## 子项复核结论

- [维度10-02]: 成立 (P2)。`frameClassName` 已是文档化正式样式入口，当前 alias 接线缺口属于 live styling contract 问题。

## 最终保留项

| 编号  | 严重程度 | 文件                                                 | 一句话摘要                                            |
| ----- | -------- | ---------------------------------------------------- | ----------------------------------------------------- |
| 10-01 | P2       | `packages/flux-bundle/src/style.css`                 | 公共 bundle CSS 仍保留已失效的 BEM fallback selectors |
| 10-02 | P2       | `packages/flux-react/src/node-renderer-resolved.tsx` | `frameClassName` 不参与 `classAliases` 展开           |
