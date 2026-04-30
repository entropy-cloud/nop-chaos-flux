# 01 依赖图与包边界

## 复核结论

- 保留: 1
- 降级: 2
- 驳回: 0

## 保留

### `flux-renderers-form` build/export 泄露 test-only 代码

- 文件: `packages/flux-renderers-form/package.json`, `packages/flux-renderers-form/tsconfig.build.json`
- 结论: 保留，低严重度
- 依据: `./test-support` 被公开导出；`tsconfig.build.json` 没有排除 `*.test.*` 与 `__tests__`；`dist/` 中可见测试产物与 `@testing-library/react` 依赖。

## 已降级

### `flux-react` 将 `@nop-chaos/flux-compiler` 保留在 runtime `dependencies`

- 文件: `packages/flux-react/package.json`
- 结论: 已降级为清单卫生问题
- 依据: live shipped source 不使用 `flux-compiler`；仅 `src/test-support-runtime.tsx` 与测试文件引用，且 build 已排除。

### `flux-renderers-data` 将 `@nop-chaos/flux-compiler` / `@nop-chaos/flux-renderers-form` 保留在 runtime `dependencies`

- 文件: `packages/flux-renderers-data/package.json`
- 结论: 已降级为清单卫生问题
- 依据: `src/index.tsx` 不依赖这两个包；引用仅出现在 test-support 与测试文件，且 build 已排除。

## 零发现区

- 未发现跨包 `@nop-chaos/*/src/...` 内部路径导入。
- 未发现 manifest 级循环依赖。
- 未发现 `*-core -> *-renderers` 反向依赖。
- 未发现缺失 `build` 脚本或缺失 `tsconfig.build.json` 的包。
