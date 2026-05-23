# 维度07：生命周期与副作用归属（初审，待复核）

## 发现清单

### P1 级 (1项)

1. **设计器初始自动布局缺少取消机制** — use-designer-auto-layout.ts:70

### P2 级 (7项)

2. **表单状态订阅写入父 scope（store reaction 模式）** — form-status-publication.ts:12
3. **CRUD 运行时状态初始化在 effect 中执行 scope 读写** — crud-renderer-state.ts:290
4. **报表设计器 core.refreshFieldSources 在 effect 中调用** — page-renderer.tsx:145
5. **SchemaRenderer 导入预加载 effect 依赖了 props.env** — schema-renderer.tsx:155
6. **CRUD owner state 同步缺少卸载清理** — crud-renderer.tsx:73
7. **设计器自定义事件监听器依赖不稳定的 dispatch** — designer-page.tsx:295
8. **VariantField detectVariant 异步缺少取消机制** — variant-field.tsx:157

### P3 级 (4项)

9. **Ref 同步通过 useEffect 执行（应在 render 阶段）** — key-value/array-editor/condition-builder
10. **CRUD status publisher 手动浅比较可提取为共用工具** — crud-renderer-state.ts:144
11. **SchemaRenderer initialDataAppliedRef 模式脆弱** — schema-renderer.tsx:78
12. **设计器 treeDocument props-to-state 反模式** — designer-page.tsx:66
