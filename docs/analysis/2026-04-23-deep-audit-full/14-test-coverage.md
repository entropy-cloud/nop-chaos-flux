# 维度 14：测试覆盖与质量

- 初审发现：18
- 维度复核：完成
- 子项复核：建议拆成 `flux-action-core`、E2E component-lab、test harness 标准化三组继续推进

## 保留

1. [维度复核通过] `flux-action-core` 为零测试包，且其核心调度链路缺少包级直测。
2. [维度复核通过] 多份超大测试文件已形成真实维护负担：`owner-based-validation-contracts.test.ts`、`runtime-actions-monitor.test.ts`、`runtime-actions-chained.test.ts`、`flow-designer-renderers/src/index.test.tsx`。
3. [维度复核通过] component-lab 下多份 E2E 已退化为 smoke，尤其 `simple-form.spec.ts`、`data-renderers.spec.ts`、`complex-form.spec.ts`、`action-logic.spec.ts`。

## 降级

1. [已降级] “重点覆盖缺口”需要拆成文件级判断；其中 `flux-action-core`、`action-compiler.ts`、`action-adapter.ts`、`validation/message.ts`、`compile-symbol-table.ts` 更明确，而 `scope.ts`、`validation-lowering.ts`、`flux-formula/compile.ts` 更接近白盒覆盖偏弱。
2. [已降级] 测试隔离/一致性问题存在，但应拆开看：`nop-debugger` 的 global stub 清理是真问题，node/jsdom 混搭与 setup 不统一更像规范债务。

## 复核摘要

- 保留：3
- 降级：2
- 驳回：0
