# 14 测试覆盖与质量

## 复核结论

- 保留: 6
- 降级: 2
- 驳回: 0

## 保留

### `ui` 公开面宽，但直接契约测试偏薄

- 文件: `packages/ui/src/index.ts`
- 结论: 保留，P1

### `validation-lowering.ts` 缺少 focused test

- 文件: `packages/flux-compiler/src/validation-lowering.ts`
- 结论: 保留，P2

### `flux-react` 多个导出 hook 缺少明确契约测试

- 文件: `packages/flux-react/src/index.tsx`
- 结论: 保留，P2

### `schema-compiler-registry.test.ts` mega test

- 文件: `packages/flux-compiler/src/schema-compiler-registry.test.ts`
- 结论: 保留，P2

### `owner-based-validation-contracts.test.ts` mega test

- 文件: `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts`
- 结论: 保留，P2

### `schema-renderer-runtime-core.test.tsx` mega test

- 文件: `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx`
- 结论: 保留，P2

## 已降级

### spreadsheet orchestration 缺少测试

- 文件: `packages/spreadsheet-renderers/src/*`
- 结论: 已降级
- 依据: 该包已有多份 focused integration test；真正缺的是 standalone spreadsheet-page E2E，而非“几乎没测”。

### `form-submit-actions.test.tsx` setup 膨胀

- 文件: `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`
- 结论: 已降级
- 依据: setup 重复真实存在，但相比更严重的 mega test 问题优先级较低。
