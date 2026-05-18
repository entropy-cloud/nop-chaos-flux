# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

未发现需报告问题。

简短结论：

- 本轮聚焦的 3 类问题里，当前仓库未见需要上报的 live defect：
  - 真正的公共 API 泄漏
  - 跨包公开契约不一致
  - `package.json` exports 与工作区解析面不一致
- 抽查到的可疑点如 `@nop-chaos/flux-react/unstable`、`@nop-chaos/flow-designer-renderers/unstable`、`@nop-chaos/flux-renderers-form/definitions`、`@nop-chaos/ui/chart` 都属于已声明导出面，且有 owner doc、package exports、workspace alias 对应。
- 按校准模式 6，没有把未从 root barrel 暴露的文件机械判成死代码或 API 泄漏。

## Package API-surface Summary

- 多数包维持单一稳定 root export：如 `@nop-chaos/flux-core`、`@nop-chaos/flux-runtime`、`@nop-chaos/flux-compiler`、`@nop-chaos/flux-action-core`、`@nop-chaos/flux-formula`、`@nop-chaos/word-editor-core`、`@nop-chaos/report-designer-core`、`@nop-chaos/spreadsheet-core`。
- 已核对的公开子路径均有一致声明与落点，包括：
  - `@nop-chaos/flux-react/unstable`
  - `@nop-chaos/flux-react/default-spacing.css`
  - `@nop-chaos/flow-designer-renderers/unstable`
  - `@nop-chaos/flow-designer-renderers/designer-theme.css`
  - `@nop-chaos/flux-renderers-form/definitions`
  - `@nop-chaos/flux-renderers-form/form-renderers.css`
  - `@nop-chaos/ui/chart`
  - `@nop-chaos/ui/base.css`
  - `@nop-chaos/ui/styles.css`
  - `@nop-chaos/spreadsheet-renderers/canvas-styles.css`
  - `@nop-chaos/report-designer-renderers/report-field-panel.css`
  - `@nop-chaos/word-editor-renderers/styles.css`
  - `@nop-chaos/theme-tokens/styles.css`
  - `@nop-chaos/flux-code-editor/code-editor-styles.css`
  - `@nop-chaos/flux-i18n/locales/zh-CN`
  - `@nop-chaos/flux-i18n/locales/en-US`
- 工作区开发解析面也已对齐：`vite.workspace-alias.ts` 与 `tsconfig.base.json` 对上述子路径均有同步映射。
- 未发现活动源码通过 `@nop-chaos/*/src/...` 之类私有路径跨包导入公开面之外实现。

## 检查范围

- `docs/index.md`
- `AGENTS.md`
- `docs/references/audit-tooling.md`
- `docs/references/deep-audit-calibration-patterns.md`
- `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- `docs/references/renderer-interfaces.md`
- `docs/references/terminology.md`
- `tsconfig.base.json`
- `vite.workspace-alias.ts`
- `packages/*/package.json` 的公开子路径导出与代表性 `src/index.ts[x]`

结论：本轮未确认真实的 API surface 泄漏、跨包公开契约失配、或 exports/解析面不一致问题。

## 深挖第 2 轮追加

### [维度03-01] `tsconfig` 未为 `@nop-chaos/flux-renderers-form-advanced` 配置根路径映射，导致工作区解析链路不一致

- **文件**: `C:\can\nop\nop-chaos-flux\tsconfig.base.json:37-45`
- **证据片段**:
  ```ts
  37:       "@nop-chaos/flux-renderers-basic": ["./packages/flux-renderers-basic/src/index.tsx"],
  38:       "@nop-chaos/flux-renderers-form": ["./packages/flux-renderers-form/src/index.tsx"],
  39:       "@nop-chaos/flux-renderers-form/definitions": [
  40:         "./packages/flux-renderers-form/src/definitions.ts"
  41:       ],
  42:       "@nop-chaos/flux-renderers-form/form-renderers.css": [
  43:         "./packages/flux-renderers-form/src/form-renderers.css"
  44:       ],
  45:       "@nop-chaos/flux-renderers-data": ["./packages/flux-renderers-data/src/index.tsx"],
  ```
- **严重程度**: P2
- **现状**: `vite.workspace-alias.ts` 已为 `@nop-chaos/flux-renderers-form-advanced` 配置工作区别名，`packages/flux-renderers-form-advanced/package.json` 也导出了根入口，但 `tsconfig.base.json` 的 `compilerOptions.paths` 中缺少同名根映射；与此同时，`apps/playground/src/App.tsx` 等多处源码已直接从该根包导入。
- **风险**: 当前 Vite 开发态可依赖别名正常运行，但 TypeScript、IDE、独立类型检查无法按同一规则解析该包，容易出现运行正常、类型检查或编辑器跳转失败的链路分裂；一旦 `dist` 未构建、类型产物过期或被清理，根包导入会变成不稳定依赖。
- **建议**: 在 `tsconfig.base.json` 的 `paths` 中补齐 `@nop-chaos/flux-renderers-form-advanced` -> `./packages/flux-renderers-form-advanced/src/index.tsx`，并与 `vite.workspace-alias.ts` 保持一一对应，避免新增 workspace 包时只更新单侧配置。
- **为什么值得现在做**: 这是单点低成本修复，但能立即消除开发器、类型系统、构建工具三者之间的解析漂移；该包已被 playground 真实入口使用，越晚补齐，越容易在增量开发或 CI 环境中放大为间歇性故障。
- **误报排除**: 这不是包未导出或仅测试代码引用的误报：一是 `package.json` 已显式导出根入口，二是 `vite.workspace-alias.ts` 已说明项目预期支持源码态根包解析，三是 `apps/playground/src/App.tsx` 等真实运行代码已直接使用该导入路径，因此 `tsconfig` 缺失映射属于确实存在的配置不一致。
- **历史模式对应**: 新增 workspace 包后只补 Vite alias、漏补 TypeScript `paths`，形成运行时可解析、类型系统不可解析的别名漂移问题。
- **参考文档**: `vite.workspace-alias.ts:55-60`; `packages/flux-renderers-form-advanced/package.json:9-13`; `apps/playground/src/App.tsx:3-7`
- **复核状态**: 未复核

## 维度复核结论

- 结论: 新增发现。
- 理由: 复核后不能维持零发现。`tsconfig.base.json` 仍缺少 `@nop-chaos/flux-renderers-form-advanced` 根路径映射，但 `vite.workspace-alias.ts` 已声明该别名，且 `apps/playground/src/App.tsx` 等多处 live 代码直接从该包根入口导入；同时 `packages/flux-renderers-form-advanced/package.json` 公开了根 `exports`。这说明该包的工作区 TS 解析面与 Vite/exports 公开面并未完全对齐。

## 子项复核结论

- 建议后续补复核项：`@nop-chaos/flux-renderers-form-advanced` 的 workspace 解析面对齐，重点检查 `tsconfig.base.json` 与 `vite.workspace-alias.ts` 是否应同步声明根入口。

## 最终保留项

| 编号  | 严重程度 | 文件                       | 一句话摘要                                                           |
| ----- | -------- | -------------------------- | -------------------------------------------------------------------- |
| 03-01 | P2       | `tsconfig.base.json:37-45` | `tsconfig` 缺少 `@nop-chaos/flux-renderers-form-advanced` 根路径映射 |
