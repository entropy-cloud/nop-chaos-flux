# [维度18] 跨包模式一致性 — 初审报告

## 发现清单

### P2 级（4 项）

1. **condition-builder 独立 i18n 系统**: 硬编码中文，英文环境无法切换（影响最大）
2. **nop-debugger overview-tab 未国际化**: 混合使用 t() 和硬编码英文
3. **flux-renderers-form input.tsx 硬编码英文**: 'Failed to load options.' / 'Loading...'
4. **nop-debugger 手写状态管理**: 不使用 Zustand（有意的性能优化）

### P3 级（5 项）

5. **flux-code-editor 缺少 registerXxxRenderers**
6. **word-editor-renderers console.error 使用**
7. **flow-designer-core 未使用的 zustand 依赖**
8. **flux-code-editor 验证消息硬编码英文**
9. **flow-designer-renderers 菜单标签硬编码英文**

## 一致项

- 渲染器注册模式高度一致（7/8 包）
- Domain core/renderers 分层边界清晰
- Hook 使用模式一致
