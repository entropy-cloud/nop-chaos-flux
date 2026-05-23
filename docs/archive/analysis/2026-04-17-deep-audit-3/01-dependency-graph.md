# 维度 01：依赖图与包边界

## 完整的内部依赖图

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      FOUNDATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  flux-core (无依赖)                                                                      │
│       ↓                                                                                  │
│  flux-formula → flux-core                                                                │
│       ↓                                                                                  │
│  flux-i18n (无 @nop-chaos 依赖, 只有 react peer)                                         │
│       ↓                                                                                  │
│  flux-runtime → flux-core, flux-formula                                                  │
│       ↓                                                                                  │
│  flux-react → flux-core, flux-formula, flux-i18n, flux-runtime, ui                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      STYLING LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  tailwind-preset (无 @nop-chaos 依赖)                                                    │
│  theme-tokens (无 @nop-chaos 依赖)                                                       │
│       ↓                                                                                  │
│  ui → flux-i18n (dependencies)                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FLUX RENDERERS LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  flux-renderers-basic → flux-core, flux-formula, flux-i18n, flux-react, flux-runtime,   │
│                         ui                                                               │
│       ↓                                                                                  │
│  flux-renderers-form → flux-core, flux-formula, flux-i18n, flux-react, flux-runtime,    │
│                        flux-renderers-basic, ui                                          │
│       ↓                                                                                  │
│  flux-renderers-form-advanced → flux-core, flux-formula, flux-i18n, flux-react,         │
│                                  flux-runtime, flux-renderers-basic,                     │
│                                  flux-renderers-form, ui                                 │
│                                                                                          │
│  flux-renderers-data → flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui │
│                                                                                          │
│  flux-code-editor → flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DOMAIN CORES LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  flow-designer-core → flux-core, flux-formula                                            │
│  spreadsheet-core (无 @nop-chaos 依赖)                                                   │
│  word-editor-core (无 @nop-chaos 依赖)                                                   │
│       ↓                                                                                  │
│  report-designer-core → spreadsheet-core                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  DOMAIN RENDERERS LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  flow-designer-renderers → flow-designer-core, flux-core, flux-formula, flux-i18n,      │
│                            flux-react, flux-runtime, ui                                  │
│                                                                                          │
│  spreadsheet-renderers → spreadsheet-core, flux-core, flux-formula, flux-i18n,          │
│                          flux-react, flux-runtime, ui                                    │
│                                                                                          │
│  report-designer-renderers → spreadsheet-core, spreadsheet-renderers,                   │
│                              report-designer-core, flux-core, flux-formula,              │
│                              flux-i18n, flux-react, flux-runtime, ui                     │
│                                                                                          │
│  word-editor-renderers → word-editor-core, flux-core, flux-i18n, flux-react,            │
│                          flux-runtime, ui                                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 发现清单

### [维度01] ui 包错误地在 dependencies 中声明了 flux-i18n

- **文件**: packages/ui/package.json:30
- **严重程度**: P2
- **现状**: ui 包在 dependencies 中声明了 `"@nop-chaos/flux-i18n": "workspace:*"`，同时在源码中 6 个组件使用了 i18n
- **风险**: 违反 ui 包作为独立 UI 层的设计原则
- **建议**:
  - 方案 A：将 flux-i18n 移至 peerDependencies
  - 方案 B：为 UI 组件创建 prop-based 的 label 覆盖机制

### 复核状态: 保留

## 合规清单

以下规则全部通过检查：

- ✅ flux-core 不依赖任何其他 @nop-chaos/\* 包
- ✅ flux-formula 只依赖 flux-core
- ✅ flux-runtime 只依赖 flux-core 和 flux-formula
- ✅ flux-react 不依赖任何 renderers 包
- ✅ _-core 包不依赖 _-renderers 包
- ✅ spreadsheet-core 不依赖 report-designer-core
- ✅ tailwind-preset 和 theme-tokens 不依赖任何运行时包
- ✅ 所有包 exports 字段使用 types + default 双条件导出
- ✅ 所有包具备 tsconfig.build.json 和 build 脚本
- ✅ 无跨包内部路径导入
- ✅ 无循环依赖

## 总结

**整体依赖边界健康度: 良好 (21/22 包合规)**
