# [维度09] 渲染器契约合规性 — 初审报告

## 渲染器评分

| 渲染器                                                                | 评分 | 主要关注点                                                                         |
| --------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| page-renderer                                                         | A    | 无违规                                                                             |
| container-renderer                                                    | A    | 无违规                                                                             |
| text-renderer                                                         | A    | 无违规                                                                             |
| input-renderer (含 select/checkbox/switch/radio-group/checkbox-group) | A    | 无违规                                                                             |
| form-renderer                                                         | A    | 无违规                                                                             |
| table-renderer                                                        | A-   | loadingSlot/header/footer 未在 definition 声明 (P2)                                |
| crud-renderer                                                         | B    | queryForm region 未注册 (P1); loading 永远 false (P2); 内部 nop-crud-\* class (P3) |
| array-editor                                                          | A-   | 内部硬编码行布局 (P3, 可接受)                                                      |
| array-field                                                           | A    | 无违规                                                                             |
| condition-builder                                                     | B+   | ConditionGroup 大量实现性样式 (P2, 可接受); 缺少 data-testid/data-cid (P3)         |

## 实质性违规

### [维度09] CRUD queryForm 区域未在 RendererDefinition 注册 (P1)

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:186` + `packages/flux-renderers-data/src/index.tsx:169-178`
- **现状**: `props.regions.queryForm?.render()` 渲染查询表单，但 RendererDefinition 中未声明 queryForm
- **风险**: 编译器不生成 region handle，queryForm 永远为 undefined
- **建议**: 在 fields 中添加 `{ key: 'queryForm', kind: 'region' }`

### [维度09] Table loadingSlot/header/footer 未在 definition 声明 (P2)

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:35` + index.tsx:109-126
- **建议**: 补充 fields 声明

### [维度09] CRUD loading 永远为 false (P2)

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:116`
- **建议**: 实现真实 loading 追踪或标注 TODO

## 可接受的实现性样式（P3）

共 5 项 P3 级内部样式硬编码，均属"明确拥有 UI 壳层的组件"内部实现性样式：

- ArrayEditor 行布局 grid
- ConditionGroup 多层级布局
- PickerModeContent 按钮样式
- TablePaginationBar 布局
- TableLoadingOverlay 定位
