# 维度03：API 表面积与契约一致性（初审，待复核）

## 发现清单

### P2 级 (2项)

1. **flux-core 巨型桶导出暴露过多内部类型** — 100+ 导出项含调试类型
2. **RendererComponentProps.props 使用 Record 而非泛型** — renderer-core.ts:149

### P3 级 (2项)

3. **flux-react 转导出 flux-runtime API 形成双入口** — index.tsx:90-94
4. **test-support 编译产物未纳入 exports map** — 三个包的 dist/ 含未声明产物

## 确认合规

- exports map 格式统一
- 跨包核心契约类型一致（RendererComponentProps, ScopeRef 等）
