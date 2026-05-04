# 维度 13：类型安全与动态边界

## 复核状态：1×P2(中等) + 4×Low 保留

### 发现

### [维度13] KeyboardEvent 伪装为 MouseEvent

- **文件**: `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:87`
- **严重程度**: P2（中等危险）
- **证据**: `onClick?.(e as unknown as React.MouseEvent<HTMLSpanElement>)`
- **真实风险**: 下游 handler 访问 clientX/button 等 MouseEvent 属性得到 undefined
- **建议**: 使用 `onActivate?: (source: 'click' | 'keyboard') => void` 替代
- **误报排除**: 不是 schema 透传或 Host 边界，是具体 UI 交互代码中的类型欺骗
- **复核状态**: 子项复核通过

### [维度13] meta 动态 key 访问

- **文件**: `packages/flux-react/src/render-nodes.tsx:186`, `packages/flux-renderers-data/src/crud-renderer.tsx:225`
- **严重程度**: Low
- **复核状态**: 保留

### 合规确认

- ✅ 无 @ts-ignore / @ts-expect-error
- ✅ 无多重链式断言（as X as Y as Z）
- ✅ 7 处 as unknown as 确认为合理桥接
