# 维度 10：样式系统合规性

## 审核范围

检查 marker class、classAliases、间距约定、BEM 残留、主题独立性、Tailwind 集成。

## 发现清单

### [维度10] field-frame.tsx 使用 BEM `--` 修饰符

- **文件**: `packages/flux-react/src/field-frame.tsx:116`
- **证据片段**:
  ```tsx
  className={cn(
    'nop-field',
    labelAlign === 'top' && 'nop-field--label-top',
  )}
  ```
- **严重程度**: P2
- **违规类别**: BEM
- **现状**: FieldFrame 使用 `nop-field--label-top` 这种 BEM `--` 修饰符模式，而 `docs/architecture/styling-system.md` 明确禁止 BEM `--modifier` 类。
- **建议**: 改用 data 属性（如 `data-label-align="top"`）或 Tailwind 条件类。
- **为什么值得现在做**: styling-system.md 是项目当前生效的 baseline 文档，明确禁止 `--modifier` 模式。
- **误报排除**: FieldFrame 是 UI 壳层组件，但其 BEM 使用仍违反了当前 styling 契约。
- **历史模式对应**: 项目已从 BEM 迁移到 data-slot + Tailwind 模式。
- **参考文档**: `docs/architecture/styling-system.md`
- **复核状态**: 维度复核通过

### [维度10] tabs.tsx 使用 BEM `--` 修饰符

- **文件**: `packages/flux-renderers-basic/src/tabs.tsx:131-132`
- **证据片段**:
  ```tsx
  `nop-tabs--${tabsMode}`;
  ```
- **严重程度**: P2
- **违规类别**: BEM
- **现状**: Tabs 渲染器使用 `nop-tabs--${tabsMode}` BEM 修饰符模式。
- **建议**: 改用 data 属性（如 `data-tabs-mode="${tabsMode}"`）或独立的语义类名。
- **为什么值得现在做**: 同上。
- **误报排除**: 同上。
- **历史模式对应**: 同上。
- **参考文档**: `docs/architecture/styling-system.md`
- **复核状态**: 维度复核通过

### [维度10] crud-renderer nop-crud-\* 类名模式（降级为 P3）

- **文件**: `packages/flux-renderers-data/src/`
- **严重程度**: P3
- **违规类别**: 命名
- **现状**: crud 渲染器使用 `nop-crud-*` 前缀的多个类名。虽然不符合 `nop-*` 纯 marker 的理想模式，但 crud 是复杂 widget 渲染器，拥有完整的 UI 壳层，内部子元素样式属于实现细节。
- **建议**: 可在样式系统统一重构时一并处理。
- **复核状态**: 维度复核通过，从 P2 降级为 P3

### 已确认的正确实现

- BEM `__` 分隔符已清理 ✓
- marker class 为零样式纯标识 ✓（layout 渲染器）
- classAliases 机制正确实现 ✓
- 间距使用 stack-_/hstack-_ 别名 ✓
- 无 React ThemeProvider 依赖 ✓
- Tailwind @source 覆盖所有包 ✓

## 总结评估

2 个 P2（BEM `--` 修饰符残留），1 个 P3（crud 类名模式）。BEM `__` 已完全清理。样式系统整体合规。
