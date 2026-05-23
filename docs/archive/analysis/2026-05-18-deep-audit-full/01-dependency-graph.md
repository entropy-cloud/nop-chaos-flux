# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] `flux-react` 测试源码反向依赖 renderer 包，且缺少清单声明，已直接触发 workspace-manifest hard gate

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\__tests__\schema-renderer-strictmode-form.test.tsx:4-8`; `C:\can\nop\nop-chaos-flux\packages\flux-react\package.json:22-40`
- **证据片段**:

  ```ts
  // schema-renderer-strictmode-form.test.tsx
  4: import { createSchemaRenderer } from '../schema-renderer.js';
  5: import { createDefaultRegistry } from '../defaults.js';
  6: import { env, formRenderer, probeInputRenderer, sharedFormulaCompiler, textRenderer } from '../test-support-core.js';
  7: import type { RendererComponentProps } from '@nop-chaos/flux-core';
  8: import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';

  // flux-react/package.json
  22:   "dependencies": {
  23:     "@nop-chaos/flux-core": "workspace:*",
  24:     "@nop-chaos/flux-formula": "workspace:*",
  25:     "@nop-chaos/flux-i18n": "workspace:*",
  26:     "@nop-chaos/flux-runtime": "workspace:*",
  27:     "@nop-chaos/ui": "workspace:*",
  ```

- **严重程度**: P1
- **现状**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\__tests__\schema-renderer-strictmode-form.test.tsx` 直接导入 `@nop-chaos/flux-renderers-basic`，但 `C:\can\nop\nop-chaos-flux\packages\flux-react\package.json` 未声明该包。用户提供的基线也已确认 `pnpm check:workspace-manifest-deps` 在这里失败。
- **风险**: 这不是单纯“少写一个 devDependency”。更核心的问题是 `flux-react` 层自己的测试已经依赖具体 renderer 实现，削弱了 `flux-react` 作为 renderer/runtime integration 层的独立边界。短期风险是健康门禁持续红灯；中期风险是 `flux-react` 测试越来越依赖具体 renderer 注册行为，导致边界回归更难识别。
- **建议**: 优先把该测试改为使用包内最小测试 renderer/stub，避免直接导入 `@nop-chaos/flux-renderers-basic`。如果确实必须保留该依赖，则至少把它显式加入 `devDependencies`，并把这类跨层测试收敛为少量、明确命名的 integration tests，而不是默认放在 `flux-react` 包内部。
- **为什么值得现在做**: 这是已确认的 hard gate 失败，修复后能立刻恢复 `workspace-manifest-deps` 通过，并减少 `flux-react` 边界继续向 renderers 漏出的机会。
- **误报排除**: 这不是对通过门禁区域的机械复述；相反，这是当前失败 hard gate。也不是生产包直接依赖 renderer 的误判：问题虽位于测试文件，但该测试位于包源码树内并被 manifest 审计脚本覆盖，且确实形成了跨层耦合。
- **历史模式对应**: 不属于 `docs/references/deep-audit-calibration-patterns.md` 中可降级的“允许 renderer 依赖 runtime/core”类型；这里是反向由 `flux-react` 触碰 renderer 包，且已造成真实 gate failure。
- **参考文档**: `docs/references/audit-tooling.md`; `AGENTS.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-02] `flux-runtime` 的 manifest 依赖面超出本次审计基线要求，当前已固化为 live boundary 而非过渡态

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\package.json:15-20`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\runtime-factory.ts:25-29`
- **证据片段**:

  ```ts
  // flux-runtime/package.json
  15:   "dependencies": {
  16:     "@nop-chaos/flux-action-core": "workspace:*",
  17:     "@nop-chaos/flux-compiler": "workspace:*",
  18:     "@nop-chaos/flux-formula": "workspace:*",
  19:     "@nop-chaos/flux-core": "workspace:*"

  // runtime-factory.ts
  25: import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
  29: import { createActionDispatcher } from '@nop-chaos/flux-action-core';
  ```

- **严重程度**: P2
- **现状**: 按本次 Dimension 01 审计规则，`flux-runtime` 应只依赖 `flux-core` 和 `flux-formula`。但 live manifest 明确依赖 `@nop-chaos/flux-compiler` 与 `@nop-chaos/flux-action-core`，且 `runtime-factory.ts` 直接消费这两个包的主入口。
- **风险**: 这会把 `flux-runtime` 继续做厚，形成“运行时装配层 + 编译器接入层 + action dispatcher 接入层”的复合 owner。它当前虽未形成 manifest cycle，但会提高后续做 runtime 抽离、最小宿主接入、边界测试、发布裁剪时的复杂度，也让“runtime 到底只负责运行时，还是同时拥有编译/动作框架拼装责任”变得不清晰。
- **建议**: 若本次审计基线要严格执行，应把 schema compiler / action dispatcher 的创建与注入上移到更外层 facade 或 host assembly，`flux-runtime` 仅接收已构造好的接口能力；至少先把“为什么 runtime 需要直接依赖 compiler/action-core”写成显式包边界决策，否则这条依赖预算会继续被当作默认合理路径扩散。
- **为什么值得现在做**: 这不是“以后再收敛”的抽象洁癖问题。当前代码和文档都已把该关系写成 live baseline；在 `v1 / no transitional-main-path allowance` 前提下，如果边界预算要收紧，现在就是最早、成本最低的时点。
- **误报排除**: 我保留该项，不是因为看见理想分层图就机械报错。`docs/architecture/flux-runtime-module-boundaries.md` 与 live code 一致地表明这两个依赖是当前真实设计，因此这不是“猜测性问题”；同时本次用户给出的 Dimension 01 基线比现状更严格，所以这里是明确的基线偏离。
- **历史模式对应**: 已按 `docs/references/deep-audit-calibration-patterns.md` 的 V1 override 处理；不以“演进中/过渡态”降级。也不属于 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 已裁决可忽略的重复项。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `AGENTS.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 依赖图

- `@nop-chaos/flow-designer-core` -> `@nop-chaos/flux-core`
- `@nop-chaos/flow-designer-renderers` -> `@nop-chaos/flow-designer-core`, `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux` -> `@nop-chaos/ui`
- `@nop-chaos/flux-action-core` -> `@nop-chaos/flux-compiler`, `@nop-chaos/flux-core`
- `@nop-chaos/flux-code-editor` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-compiler` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`
- `@nop-chaos/flux-core` -> 无
- `@nop-chaos/flux-formula` -> `@nop-chaos/flux-core`
- `@nop-chaos/flux-i18n` -> `@nop-chaos/flux-core`
- `@nop-chaos/flux-react` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-basic` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-data` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-form` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-form-advanced` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/flux-renderers-form`, `@nop-chaos/ui`
- `@nop-chaos/flux-runtime` -> `@nop-chaos/flux-action-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`
- `@nop-chaos/nop-debugger` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/ui`
- `@nop-chaos/report-designer-core` -> `@nop-chaos/flux-core`, `@nop-chaos/spreadsheet-core`
- `@nop-chaos/report-designer-renderers` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/report-designer-core`, `@nop-chaos/spreadsheet-core`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/ui`
- `@nop-chaos/spreadsheet-core` -> 无
- `@nop-chaos/spreadsheet-renderers` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/spreadsheet-core`, `@nop-chaos/ui`
- `@nop-chaos/tailwind-preset` -> 无
- `@nop-chaos/theme-tokens` -> 无
- `@nop-chaos/ui` -> 无
- `@nop-chaos/word-editor-core` -> 无
- `@nop-chaos/word-editor-renderers` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`, `@nop-chaos/word-editor-core`

## 违规清单

- P1: `[维度01-01]` `flux-react` 测试源码反向依赖 renderer 包，且缺少清单声明，已直接触发 workspace-manifest hard gate
- P2: `[维度01-02]` `flux-runtime` 的 manifest 依赖面超出本次审计基线要求，当前已固化为 live boundary 而非过渡态

## 合规包清单

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-compiler`
- `@nop-chaos/flux-action-core`
- `@nop-chaos/flux-i18n`
- `@nop-chaos/ui`
- `@nop-chaos/tailwind-preset`
- `@nop-chaos/theme-tokens`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-form-advanced`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/flow-designer-core`
- `@nop-chaos/flow-designer-renderers`
- `@nop-chaos/spreadsheet-core`
- `@nop-chaos/spreadsheet-renderers`
- `@nop-chaos/report-designer-core`
- `@nop-chaos/report-designer-renderers`
- `@nop-chaos/word-editor-core`
- `@nop-chaos/word-editor-renderers`
- `@nop-chaos/flux-code-editor`
- `@nop-chaos/nop-debugger`
- `@nop-chaos/flux`

## 总结评估

本轮 Dimension 01 的 manifest 依赖图整体无内部依赖环，`*-core` 到 `*-renderers` 的反向耦合、`spreadsheet-core -> report-designer-core`、`ui`/`tailwind-preset`/`theme-tokens` 的 runtime 污染、以及私有 `src` 子路径跨包导入，都没有形成保留问题。

保留的两个问题里，`[维度01-01]` 是已确认 hard gate failure，优先级最高；`[维度01-02]` 则是相对本次审计基线的 live boundary 超预算，不会立刻炸构建，但会持续放大后续边界治理成本。

## 深挖第 2 轮追加

### [维度01-03] `@nop-chaos/flux` 门面包公共类型面泄漏内部包 `@nop-chaos/flux-core`

- **文件**: `packages/flux-bundle/types/public-types.d.ts:2-15`
- **证据片段**:
  ```ts
  import type {
    ActionContext,
    ApiRequestContext,
    ApiResponse,
    BaseSchema,
    ExecutableApiRequest,
    RendererDefinition,
    RendererEnv,
    RendererRegistry,
    SchemaInput,
    SchemaObject,
    SchemaRendererProps,
    SchemaValue,
  } from '@nop-chaos/flux-core';
  ```
- **严重程度**: P1
- **现状**: `@nop-chaos/flux` 作为文档定义的 host-facing facade package，其对外类型入口并未自持稳定类型，而是直接在 `packages/flux-bundle/types/public-types.d.ts:2-15` 引用 `@nop-chaos/flux-core`。构建脚本又在 `scripts/prepare-flux-bundle-dist.mjs:9-15` 将该声明文件原样复制到发布产物 `dist/index.d.ts`，因此宿主只要从 `@nop-chaos/flux` 获取类型，就会被动解析内部包名。与此同时，`packages/flux-bundle/package.json:24-48` 并未把 `@nop-chaos/flux-core` 暴露为宿主安装依赖，`scripts/check-flux-bundle-pack.mjs:82-92` 也只检查打包清单是否泄漏内部包引用，没有检查 `.d.ts` 内部 import。
- **风险**: facade 包的运行时清单看似干净，但 TypeScript 宿主在解析 `@nop-chaos/flux` 类型时仍可能报 `Cannot find module '@nop-chaos/flux-core'`；更严重的是，这会把本应隐藏的内部边界固化进公共 API，导致后续 `flux-core` 重命名、拆分或收敛时形成兼容性包袱。
- **建议**: 将 `@nop-chaos/flux` 的公开类型改为真正的 facade-owned surface：在 bundle 阶段内联/重写这些类型，或生成不再引用 `@nop-chaos/flux-core` 的独立声明文件；同时给 `scripts/check-flux-bundle-pack.mjs` 增加对 `package/dist/index.d.ts` 的扫描，禁止出现 `@nop-chaos/flux-core`、`@nop-chaos/flux-runtime`、`@nop-chaos/flux-react` 等内部包名。
- **为什么值得现在做**: 这是发布边界问题，不修复时包内运行时代码越稳定，越容易让“类型面偷偷依赖内部包”变成既成事实；现在只需在 facade 生成与 pack 校验两处收口，改动面最小。
- **误报排除**: 这不是“源码层临时依赖”误报。文档在 `docs/architecture/flux-runtime-module-boundaries.md:439-452` 明确要求 `@nop-chaos/flux` 提供宿主可用的稳定 facade surface，且 packed manifest must not expose 内部包；当前问题发生在发布声明文件本身。`prepare-flux-bundle-dist.mjs:13-15` 证实声明文件被直接复制到 dist，`check-flux-bundle-pack.mjs:82-92` 证实现有守卫未覆盖 `.d.ts` import，因此泄漏路径真实存在。
- **历史模式对应**: 属于门面包或稳定入口的运行时清单已收敛，但类型出口仍残留内部模块路径的边界回退问题；和仓库持续强调的 root export 保持稳定、内部实现留在 focused module/internal package 是同一类架构纪律失守。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md:435-454`; `scripts/prepare-flux-bundle-dist.mjs:9-15`; `packages/flux-bundle/package.json:16-23`; `scripts/check-flux-bundle-pack.mjs:82-92`
- **复核状态**: 未复核

## 维度复核结论

- [维度01-01]: 保留 (P1)。`packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx` 仍直接导入 `@nop-chaos/flux-renderers-basic`，而 `packages/flux-react/package.json` 仍未声明；`pnpm check:workspace-manifest-deps` 当前仍失败。
- [维度01-02]: 驳回。当前 owner doc `docs/architecture/flux-runtime-module-boundaries.md` 已明确把 `runtime-factory` 定义为装配层，并把 `flux-compiler` / `flux-action-core` 作为当前支持边界的一部分；这是设计预算主张，不是当前基线 defect。
- [维度01-03]: 保留 (P1)。`packages/flux-bundle/types/public-types.d.ts` 仍从 `@nop-chaos/flux-core` 引类型，且 `scripts/prepare-flux-bundle-dist.mjs` 会原样复制到 `dist/index.d.ts`；当前 `check-flux-bundle-pack` 只查 manifest，不查声明文件，因此 facade public d.ts 泄漏仍成立。

## 子项复核结论

- 无。`[维度01-02]` 若要继续推进，应走单独的设计边界调整，而不是作为当前审计缺陷继续下沉。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                              |
| ----- | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 01-01 | P1       | `packages/flux-react/src/__tests__/schema-renderer-strictmode-form.test.tsx:4-8` | `flux-react` 测试跨层导入 renderer 且缺少 manifest 声明 |
| 01-03 | P1       | `packages/flux-bundle/types/public-types.d.ts:2-15`                              | facade 包发布类型面泄漏 `@nop-chaos/flux-core`          |
