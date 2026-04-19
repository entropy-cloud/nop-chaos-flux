# 维度16：文档-代码一致性 — 初审报告

**审核日期**: 2026-04-18

## P1 发现

### [维度16-1] AGENTS.md RendererComponentProps 导入来源错误
- **文档路径**: AGENTS.md:289
- **代码路径**: flux-core/src/types/renderer-core.ts:84
- **漂移类型**: 行为不一致
- 文档写 `from '@nop-chaos/flux-react'`，实际应从 `@nop-chaos/flux-core` 导入

### [维度16-2] renderer-runtime.md useCurrentFormState 签名严重漂移
- **文档路径**: docs/architecture/renderer-runtime.md:407
- **代码路径**: packages/flux-react/src/hooks.ts:181-198
- **漂移类型**: 行为不一致
- 文档: `(): FormStoreState | undefined`；实际: `(selector, equalityFn?, options?) => T`

## P2 发现

### [维度16-3] flux-runtime-module-boundaries.md 大量源文件未记录
- 大量form-runtime-*、schema-compiler/子目录文件未在文档中

### [维度16-4] renderer-runtime.md useScopeSelector/useOwnScopeSelector 签名漂移
- 缺少S泛型参数和options参数

### [维度16-5] renderer-runtime.md RenderRegionHandle.render() 缺失3个选项字段
- 缺少actionScope、componentRegistry、ownerNodeInstance

### [维度16-6] renderer-runtime.md RenderFragmentOptions 接口漂移
- 缺少bindings、instancePath、ownerNodeInstance字段，data未标deprecated

### [维度16-7] renderer-runtime.md "Pass by hooks" 章节不完整
- 仅列13个hook，实际有26个

### [维度16-8] flux-runtime-module-boundaries.md runtime组装职责描述过时
- index.ts仅18行re-export，真正工厂在runtime-factory.ts

### [维度16-9] flux-runtime-module-boundaries.md 未记录schema-compiler子目录
- 9个子模块未在文档中

## P3 发现

### [维度16-10] AGENTS.md flux-playground 路径不明确
- 列在packages中但实际在apps/

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: AGENTS.md RendererComponentProps 导入来源错误 | **保留** | **成立**（28+渲染器从 flux-core 导入，按文档写会编译报错） | P1 |
| F2: useCurrentFormState 签名严重漂移 | **保留** | **成立**（整个调用约定不同） | P1 |
| F3: 8个 form-runtime-* 文件未记录 | **保留** | **成立**（14个中8个缺失） | P2 |
| F4: useScopeSelector 签名漂移 | **保留** | **成立**（缺 S 泛型和 options） | P2 |
| F5: RenderRegionHandle.render() 缺3字段 | **保留** | **成立**（actionScope/componentRegistry/ownerNodeInstance） | P2 |
| F6: RenderFragmentOptions 漂移 | **保留** | **成立**（缺3字段 + data 未标 deprecated） | P2 |
| F7: "Pass by hooks" 不完整 | **降级** | — | P3 |
| F8: runtime 组装描述过时 | **保留** | **成立**（runtime-factory.ts 483行零文档） | P2 |
| F9: schema-compiler/ 9文件未记录 | **保留** | **成立**（文档仅提单文件） | P2 |
| F10: flux-playground 路径不明确 | **降级** | — | P3 |
