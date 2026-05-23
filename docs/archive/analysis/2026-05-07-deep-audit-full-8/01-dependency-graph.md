# 维度 01: 依赖图与包边界

## 深挖轮次

- 第 1 轮: 发现 test-only workspace dependencies 位于 production dependencies。
- 第 2 轮: 发现 `tsconfig.build` tests/test-support 排除不统一、跨包 `src` 私有测试导入。
- 第 3 轮: 发现 CSS import build asset 缺失、更多 test-only workspace deps。
- 第 4 轮: 发现 `tailwind-preset` 缺 `tailwindcss` manifest dependency。
- 第 5 轮: 发现 tsc/bundler ESM output 保留 extensionless imports，Node ESM 无法加载 dist。

## 维度复核结论

| 条目                                           | 结论 | 严重程度 | 证据                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dist ESM extensionless imports                 | 保留 | P0       | `packages/flux-core/dist/index.js:1` 为 `export * from './types'`; `node import('./packages/flux-core/dist/index.js')` 报 `ERR_UNSUPPORTED_DIR_IMPORT`                                                                                |
| tests/test-support build pollution             | 保留 | P1       | 多数 `packages/*/tsconfig.build.json` 未排除 tests；`packages/flux-core/tsconfig.build.json` 继承 `include: ["src"]`                                                                                                                  |
| production CSS import but not copied           | 保留 | P1       | `spreadsheet-renderers/src/index.ts:1`, `flow-designer-renderers/src/index.tsx:1`, `flux-code-editor/src/code-editor-renderer.tsx:1`, `flux-renderers-form/src/index.tsx:1`, `report-designer-renderers/src/report-field-panel.tsx:1` |
| test-only workspace dependencies               | 保留 | P1/P2    | `flux-react` production dep `flux-compiler`; several renderers have test-only `flux-runtime` / `flux-formula` / basic/form renderer deps                                                                                              |
| flow designer tests import sibling `src` paths | 保留 | P2       | `flow-designer-renderers/src/edge-label-expression.test.tsx`, `designer-command-adapter.test.ts`                                                                                                                                      |
| `tailwind-preset` missing `tailwindcss` dep    | 保留 | P1       | `tailwind-preset/src/index.ts:1` imports type `Config` from `tailwindcss`; package manifest only declares `tailwindcss-animate`                                                                                                       |

## 子项复核

- 构建/发布子项复核确认 P0 ESM import failure、P1 build excludes、P1 CSS asset copy、P1 tailwind dependency 成立。
- “production manifest 有 test-only deps”子项复核误查了 third-party testing libs；维度复核仍保留 workspace deps hygiene。

## 最终保留项

1. 修复 `dist` ESM import 产物，保证 package exports 可被 Node ESM 加载。
2. 统一 package build excludes，避免 tests/test-support 输出到 `dist`。
3. 为 production CSS imports 建立 copy/export 策略。
4. 清理 test-only workspace dependencies。
5. 禁止跨 package 测试直接导入 sibling `src` 私有路径。
6. 为 `tailwind-preset` 补齐 `tailwindcss` peer/dev dependency。
