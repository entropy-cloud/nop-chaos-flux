# 维度 03：API 表面积与契约一致性（初审）

## 发现

### [维度03-F1] field-utils 大批量公开导出内部表单字段工具 (P3)

- **文件**: `packages/flux-renderers-form/src/index.tsx:20`
- **现状**: `export * from './field-utils'` 导出 SyncValueResolution 等内部状态机细节
- **建议**: 拆分到 field-utils-internal.ts

### [维度03-F2] test-support 文件缺少 package.json exports 声明 (P3)

- **文件**: `packages/flux-renderers-form-advanced/src/test-support.tsx`
- **现状**: 文件存在但 package.json exports 无 ./test-support 子路径

## 合规确认

- 无 internal/helper 前缀导出 ✓
- 跨包核心接口一致（RendererComponentProps、ScopeRef、RendererDefinition、RendererRegistry）✓
- 所有渲染器包遵循统一注册模式 ✓

## 复核状态: 未复核
