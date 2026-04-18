# 维度 16：文档-代码一致性

## 初审概览
- 初审候选：4
- 维度复核：3 条保留，1 条降级

## 条目复核
### [保留] `frontend-baseline.md` 漏列多个当前有效包
- **关键文件**: `docs/architecture/frontend-baseline.md:44`, `packages/flux-i18n/package.json:1`, `packages/word-editor-renderers/package.json:1`
- **说明**: 活跃文档的 workspace 结构块与当前仓库清单不一致。

### [保留] `frontend-baseline.md` 仍把 `CompiledSchemaNode` 当推荐命名
- **关键文件**: `docs/architecture/frontend-baseline.md:131`, `docs/architecture/flux-core.md:151`
- **说明**: 活跃文档中的推荐术语已落后于当前编译与渲染基线。

### [保留] `schema-file-validator.md` 仍以 `CompiledSchemaNode` 为当前编译结果与扩展承载体
- **关键文件**: `docs/architecture/schema-file-validator.md:29,42,403,431,542`, `docs/architecture/flux-core.md:313-319`
- **说明**: 文档仍描述已退出当前基线的编译产物和扩展通道。

### [降级] `flux-runtime-module-boundaries.md` 仍把 `src/index.ts` 写成运行时装配层
- **关键文件**: `docs/architecture/flux-runtime-module-boundaries.md:17,26,48-56`, `packages/flux-runtime/src/index.ts:1-18`
- **说明**: 这是 owner 文件定位过时，维护规则本身并未完全失效。
