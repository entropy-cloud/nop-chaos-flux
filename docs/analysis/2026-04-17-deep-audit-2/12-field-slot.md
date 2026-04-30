# [维度12] 表单字段与 Slot 建模 — 初审报告

## 发现清单

### P2 级（2 项）

1. **table loadingSlot** 未声明为 value-or-region — `packages/flux-renderers-data/src/index.tsx:117-125`
2. **crud queryForm** 无 deep normalizer，props.regions.queryForm 始终 undefined — `packages/flux-renderers-data/src/crud-renderer.tsx:153,186-188`

### P3 级（4 项）

3. **table header/footer** 依赖隐式 DEFAULT_FIELD_RULES 未显式声明
4. **table expandable** 行 region 提取未实现，expandedRowRegionKey 为死代码
5. **form** initAction/submitAction 不符合 onXX 命名惯例
6. **variant-field** action 字段声明为 ignored 而非 event（有意设计）

## 正面发现

- formLabelFieldRule 复用一致 ✓
- allowSource + sourceStateKey 模式完整 ✓
- Deep Region Extraction 规范 ✓
- FieldFrame 集成正确 ✓
- 参数化 region 使用正确 ✓
