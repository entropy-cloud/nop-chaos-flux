# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

### P2 发现（4 个）

1. node-renderer.tsx 中 region.node/action 的不必要 as any（F3）
2. use-surface-renderer.ts 通过 dispatch.\_\_actionScope 隐式 any 属性传递上下文（F5，最具风险）
3. condition-builder types.ts 中 fields?: any[] 和 operators?: any（F8）
4. wrapped-field-action.tsx 和 toolbar-button.tsx 中 KeyboardEvent→MouseEvent 断言（F10）

### P3 发现（11 个）

1. source-compiler compileValue as unknown as 断言（根因：compileValue<T> 签名限制）
2. action-compiler when 字段 as unknown as 断言（同根因）
3. code-editor types.ts expressionConfig/sqlConfig/options 为 any
4. defaults.ts 默认 fetcher 中 api: any
5. schema-compiler/fields.ts compileValue(value as any)
6. word-editor-page.tsx actionProvider.invoke {} as any
7. use-spreadsheet-interactions.ts currentCell as any
8. designer-page-helpers.tsx args.schema as any
9. core-dispatch.ts (command as any).type
10. defineXxxPageSchema 模式中的 as unknown as（BaseSchema 索引签名限制）
11. dialog-host-surface.tsx node as unknown as RenderNodeInput

### 无 @ts-expect-error / @ts-ignore 使用
