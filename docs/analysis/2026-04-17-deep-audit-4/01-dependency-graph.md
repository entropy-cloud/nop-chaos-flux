# 维度 01：依赖图与包边界

## 初审概览
- 初审候选：1
- 维度复核：1 条保留，补充指出依赖图文档基线失真

## 条目复核
### [保留] `@nop-chaos/ui` 直接耦合 `@nop-chaos/flux-i18n`
- **初审结论**: `ui` 基础包不应直接持有 Flux 专属 i18n 运行时依赖。
- **终审**: 保留
- **关键文件**: `packages/ui/package.json:30`, `packages/ui/src/components/ui/dialog.tsx:5`, `packages/ui/src/components/ui/sheet.tsx:3`, `packages/ui/src/components/ui/sidebar-layout.tsx:4`
- **说明**: 这是源码和 manifest 双重耦合，不只是依赖声明位置问题。

## 维度结论
- 未发现跨包内部路径导入、循环依赖、`*-core -> *-renderers` 反向依赖、缺失 `build`/`exports`/`tsconfig.build.json` 等问题。
