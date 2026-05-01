# 维度 10：样式系统合规性（初审）

## 发现

### [维度10-F1] default-spacing.css marker class 携带视觉样式 (P2)
- **文件**: `packages/flux-react/src/default-spacing.css`
- **现状**: nop-fieldset 有 border/border-radius/padding，nop-field 有 gap，nop-form 有 flex+gap。与 AGENTS.md "marker class 零样式" 原则矛盾
- **建议**: 更新 AGENTS.md 反映默认间距层存在，或将装饰性样式移至 schema 驱动

### [维度10-F2] nop-field 和 nop-form marker 包含结构性 gap (P3)
- **文件**: `packages/flux-react/src/default-spacing.css:73-77,19-30`
- **现状**: gap 值非 schema 驱动

## 合规确认

- 无 BEM 残留 ✓
- 无 ThemeProvider ✓
- Tailwind @source 正确覆盖 ✓
- stack/hstack 工具类正确定义 ✓
- classAliases 链路完整 ✓

## 复核状态: 未复核
