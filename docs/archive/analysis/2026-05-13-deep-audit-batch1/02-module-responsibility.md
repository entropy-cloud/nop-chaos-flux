# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] `node-compiler.ts` 已重新膨胀为 >700 行编译总控文件，并混入多类子职责

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- **证据片段**:

  ```ts
  function compileCustomFieldResult<T = unknown>(value: T): CompiledRuntimeValue<T> {
    // 这里同时做 array/object/static runtime value 递归编译与 state 复用策略
  }

  for (const key of Object.keys(schema)) {
    // 同时做 field 分类、region 编译、custom compile、deep normalizer、prop compile
  }

  const eventPlans: Record<string, CompiledActionProgram> = {};
  const lifecycleActions = rawLifecycleActions ? { ... } : undefined;
  ```

- **严重程度**: P1
- **现状**: 该文件 757 行，已超过仓库对大文件的硬阈值；且把 runtime-value 编译、普通字段编译、region 编译、事件/生命周期编译、plan 装配、`data-source`/`reaction` 特例注入放在一个文件里。
- **风险**: 编译器真实维护面重新集中到单文件；任何一个子能力变更都要穿过整份总控文件，容易引入交叉回归和再次膨胀。
- **建议**: 至少拆成 `runtime-value/custom-field compiler`、`node plan assembly`、`special node augmenters` 三层，让 `node-compiler.ts` 退回协调器。
- **为什么值得现在做**: 这是编译主路径，且已经超过 >700 行校准阈值；继续增长后再拆，迁移成本只会更高。
- **误报排除**: 这不是“仅因文件大就报告”。依据校准文档，>700 行且存在明确职责混杂时应保留；本案两者同时满足。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` 的 Pattern 1，但已越过“仅大小噪音”边界。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/renderer-implementation-guidelines.md`
- **复核状态**: 未复核

### [维度02-02] `renderers/input.tsx` 把多种字段家族、校验组装和控件局部控制逻辑捆在一个文件中

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx`
- **证据片段**:

  ```ts
  export function createFieldValidation(...) { ... }

  function SelectRenderer(...) { ... }
  function TextareaRenderer(...) { ... }
  function CheckboxRenderer(...) { ... }
  function SwitchRenderer(...) { ... }
  function RadioGroupRenderer(...) { ... }
  function CheckboxGroupRenderer(...) { ... }
  function InputNumberRenderer(...) { ... }

  export const inputRendererDefinitions: RendererDefinition[] = [
  ```

- **严重程度**: P2
- **现状**: 文件 653 行，既放 validation factory / adapters / source-error helper，又同时承载 text、textarea、select、checkbox、switch、radio-group、checkbox-group、input-number 多个 renderer。
- **风险**: “改一个基础输入控件”会放大为“改整个输入家族文件”；局部行为和普通标量输入耦合，降低边界清晰度。
- **建议**: 按控件族拆分：`text-like.tsx`、`choice-controls.tsx`、`input-number.tsx`、`input-validation.ts`，保留一个 definitions 汇总文件。
- **为什么值得现在做**: 这是基础表单入口，改动频率高；先按家族拆掉，比继续膨胀更便宜。
- **误报排除**: 不是在要求“每个小 renderer 都必须拆文件”。问题在于多个行为差异明显的控件族和配套 helper 共居一处。
- **历史模式对应**: 对应 Pattern 1，但本案不是单纯尺寸问题，而是明确的多家族职责混放。
- **参考文档**: `AGENTS.md`, `docs/references/renderer-implementation-guidelines.md`
- **复核状态**: 未复核

### [维度02-03] 多个包的 `src/` 目录混入生成的 `.d.ts.map` 产物，破坏 source/dist 边界

- **文件**: `packages/flux-react/src/unstable.d.ts.map`; `packages/flux-core/src/index.d.ts.map`; `packages/flux-formula/src/index.d.ts.map`; `packages/ui/src/index.d.ts.map`
- **证据片段**:
  ```ts
  packages / flux - react / src / unstable.d.ts.map;
  packages / flux - core / src / index.d.ts.map;
  packages / flux - formula / src / index.d.ts.map;
  packages / ui / src / index.d.ts.map;
  ```
- **严重程度**: P2
- **现状**: `packages/*/src/` 中存在大量声明映射产物；这与仓库“src 只放源文件、构建产物进 dist”的明确规则直接冲突。
- **风险**: 源目录角色被污染，影响搜索、审计、IDE 导航、变更评审与后续自动化校验。
- **建议**: 立即清理 `src/` 下构建产物，并补强生成配置/验证脚本，确保 `.d.ts(.map)` 不再落入源目录。
- **为什么值得现在做**: 这是仓库级目录边界漂移；越晚清理，越容易把错误产物当成真实源码上下文。
- **误报排除**: 不是风格建议，而是文档明令禁止的 source artifact 违例。
- **历史模式对应**: 无适用豁免；属于 `frontend-baseline` / `AGENTS` 明文禁止的目录结构漂移。
- **参考文档**: `AGENTS.md`, `docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

## 超大文件清单

- `757` — `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- `653` — `packages/flux-renderers-form/src/renderers/input.tsx`
- `620` — `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `602` — `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `593` — `packages/flux-runtime/src/async-data/reaction-runtime.ts`
- `592` — `packages/flux-runtime/src/runtime-factory.ts`
- `584` — `packages/flux-runtime/src/form-runtime-owner.ts`
- `580` — `packages/flux-formula/src/parser.ts`
- `573` — `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `569` — `packages/flux-runtime/src/form-runtime-validation.ts`
- `560` — `packages/flow-designer-core/src/core.ts`
- `519` — `packages/flux-runtime/src/form-runtime.ts`
- `510` — `packages/flux-runtime/src/import-stack.ts`
- `509` — `packages/report-designer-renderers/src/page-renderer.tsx`
- `508` — `packages/flux-runtime/src/form-store.ts`

## 已检查但未保留的候选

- `packages/flux-runtime/src/runtime-factory.ts`
  虽 592 行偏大，但与 owner doc 仍基本符合 assembly/orchestration 定位。
- `packages/flux-runtime/src/async-data/reaction-runtime.ts`
  文件较大，但仍围绕 reaction registry / scheduling / debug snapshot 单一边界。
- `packages/flux-runtime/src/form-runtime-owner.ts`
  虽 584 行，但与文档中 owner-local validation orchestration 基本一致。

## 深挖第 2 轮追加

### [维度02-04] `src` 构建产物清理/校验脚本遗漏 `.d.ts.map`，导致仓库级防污染守卫失效

- **文件**: `scripts/verify-no-src-artifacts.mjs`; `scripts/clean-src-artifacts.mjs`; `package.json`; `packages/flux-runtime/src/index.d.ts.map`; `packages/flux-react/src/index.d.ts.map`; `packages/flux-renderers-basic/src/index.d.ts.map`; `packages/flux-renderers-data/src/index.d.ts.map`
- **证据片段**:
  ```js
  const ARTIFACT_EXTENSIONS = ['.d.ts', '.js', '.js.map'];
  ```
- **严重程度**: P1
- **现状**: root `check:src-artifacts` / `lint` 声称保护 `src/` 目录不落入构建产物，但脚本只处理 `.d.ts`、`.js`、`.js.map`，遗漏当前大量存在的 `.d.ts.map`。
- **风险**: 团队会被 CI / lint 的绿灯误导，以为 source/dist 边界已被强制执行；后续更多 `.d.ts.map` 泄漏会继续静默进入源码目录。
- **建议**: 将两份脚本的 artifact 扩展集补齐到至少 `['.d.ts', '.d.ts.map', '.js', '.js.map']`，并补一个最小回归测试或 fixture。
- **为什么值得现在做**: 这不是单点脏文件，而是 enforcement hole；不修守卫本身，污染会持续回流。
- **误报排除**: 不是对 `[维度02-03]` 的重复表述；02-03 是“已有污染”，本条是“官方守卫本身漏检该类型产物”。
- **历史模式对应**: source artifact policy 与 live verification path 失配。
- **参考文档**: `AGENTS.md`, `docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度02-01]: 保留 (P1)。`node-compiler.ts` 仍超过 700 行，且职责混杂，命中“大文件 + 明确职责混杂”的保留条件。
- [维度02-02]: 降级为 P3。`input.tsx` 边界仍偏宽，但更像应评估拆分的维护性问题，而非当前主缺陷。
- [维度02-03]: 降级为 P3。`src/**/*.d.ts.map` 污染真实存在，但更适合作为 `[维度02-04]` enforcement hole 的症状项。
- [维度02-04]: 保留 (P1)。`verify-no-src-artifacts` / `clean-src-artifacts` 实际漏检 `.d.ts.map`，会制造仓库级假绿灯。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                     |
| ----- | -------- | ------------------------------------------------------------- | ---------------------------------------------- |
| 02-01 | P1       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts` | `node-compiler.ts` 超 700 行且混入多类编译职责 |
| 02-02 | P3       | `packages/flux-renderers-form/src/renderers/input.tsx`        | 基础输入家族与配套 helper 仍集中在单文件       |
| 02-03 | P3       | `packages/*/src/**/*.d.ts.map`                                | 源目录混入声明映射产物，污染 source/dist 边界  |
| 02-04 | P1       | `scripts/verify-no-src-artifacts.mjs`                         | src 产物守卫脚本漏检 `.d.ts.map`               |
