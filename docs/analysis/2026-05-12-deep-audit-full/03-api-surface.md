# 维度 03：API 表面积与契约一致性

## 范围与状态

- **维度范围**: public API 表面积、文档契约、workspace dev alias/path 与 package exports 一致性。
- **最终状态**: 最终保留 7 项，无驳回项。
- **来源限制**: 本文件仅根据同目录 `stage-1-full-findings-01-05.md`、`round-2-to-5-raw-findings.md`、`raw-findings-03-06.md`、`final-review-results-01-05.md`、`summary.md` 重写。
- **代码检查**: 本次重写未检查运行时代码。

## 深挖轮次与收敛说明

- **第 1 轮**: 初审发现 2 项，独立复核后均保留。
- **第 2-5 轮**: raw findings 追加 `03-03` 到 `03-07`，覆盖 React renderer registry seam、public form error query docs、test-support subpath、CSS public subpath alias/path、i18n locale subpath alias/path。
- **收敛说明**: `summary.md` 与 `final-review-results-01-05.md` 均说明第 5 轮达到执行上限后进入最终复核，不声称自然收敛。

## 最终复核摘要

- **最终保留**: 7 项。
- **最终 P2**: 6 项。
- **最终 P3**: 1 项。
- **重大修订**: `03-05` 原“build 不产物”部分为误报，最终问题改为 public `test-support` subpath 的 undeclared testing dependency 与全局 i18n side effects。

## 最终保留项

### [03-01] `flux-renderers-form` root barrel 暴露低层 field helpers

- **文件**: `packages/flux-renderers-form/src/index.tsx:11-22`
- **证据片段**:
  ```tsx
  export { FormRenderer } from './renderers/form.js';
  export { formRendererDefinition } from './renderers/form-definition.js';
  export {
    createFieldValidation,
    createInputRenderer,
    inputRendererDefinitions,
    validateInputFieldSchema,
  } from './renderers/input.js';
  export * from './renderers/shared/index.js';
  export * from './field-utils.js';
  ```
- **严重程度**: P3
- **现状**: package root 同时导出 renderer definitions、shared renderer internals 和全部 `field-utils`。
- **风险**: 消费者可能依赖 helper internals，使后续实现重构被 public API 冻结。
- **建议**: root 缩窄为 stable renderer registration/schema surface；低层 helpers 移入显式 subpath 或 unstable export。
- **误报排除**: 不是 build/export failure，而是 public API width 问题。
- **最终复核结论**: 保留 P3。form root barrel 暴露 renderer internals 和 field-utils；API width concern 成立。
- **修订标题/理由**: 标题与方向维持。

### [03-02] runtime type docs 缺少 exported `subscribeToModelGeneration`

- **文件**: `packages/flux-core/src/types/runtime.ts:79-107`, `318-324`; `packages/flux-runtime/src/form-runtime.ts:217-222`; `docs/references/form-validation-runtime-types.md:215-245`, `288-330`
- **证据片段**:
  ```ts
  export interface FormStoreApi {
    subscribe(listener: () => void): () => void;
    subscribeToPath(path: string, listener: () => void): () => void;
    subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
    subscribeToSubmitting(listener: () => void): () => void;
    subscribeToModelGeneration?(listener: () => void): () => void;
  ...
  export interface ValidationScopeRuntime {
    subscribeToModelGeneration?(listener: () => void): () => void;
  ```
- **严重程度**: P2
- **现状**: core public types 与 runtime 实现存在 `subscribeToModelGeneration`，但 reference doc 的 `ValidationStoreApi`、`FormStoreApi`、`ValidationScopeRuntime` 片段未说明。
- **风险**: public consumers 无法从文档获知 generation subscription contract，可能退回 broad store subscription。
- **建议**: 更新 `docs/references/form-validation-runtime-types.md`，加入并解释 `subscribeToModelGeneration`。
- **误报排除**: live code 显示 public type member，文档片段确实缺失。
- **最终复核结论**: 保留 P2。`subscribeToModelGeneration` 存在于 public types/runtime，reference docs 仍缺。
- **修订标题/理由**: 标题与方向维持。

### [03-03] `reactComponent` 便捷注册路径只在初始化数组归一化

- **文件**: `packages/flux-react/src/schema-renderer.tsx:122-145`
- **证据片段**:

  ```ts
  export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
    const registry = createRendererRegistry(registryDefinitions.map(ensureRendererComponent));

    return function SchemaRenderer(props: SchemaRendererProps) {
      ...
      const runtime = useMemo(() => {
        const resolvedRegistry = props.registry ?? registry;
        ...
        return createRendererRuntime({
          registry: resolvedRegistry,
  ```

- **严重程度**: P2
- **现状**: React 层公开支持 `reactComponent` 便捷字段，但只在 `createSchemaRenderer([...])` 和 `createDefaultRegistry([...])` 的初始 definitions 上调用 `ensureRendererComponent`。宿主若通过 `SchemaRendererProps.registry` 传入 registry，或创建 registry 后再 `registry.register({ type, reactComponent })`，定义会绕过归一化并进入 core registry。
- **风险**: 同一个 `RendererDefinition` 形状在不同接线路径下行为不一致：初始化数组可用，外部 registry / 后续注册会因缺少 `component` 失败。这会误导第三方 renderer 集成和 host tooling。
- **建议**: 提供 React-owned registry wrapper，使 `registry.register` 也归一化 `reactComponent`；或明确 `SchemaRendererProps.registry` 必须是 core-normalized registry，并提供 `createReactRendererRegistry/registerReactRendererDefinitions` 公开入口。
- **误报排除**: 不是要求 `reactComponent` 回流 core，而是 React 层公开 seam 自身不一致。
- **最终复核结论**: 保留 P2。`reactComponent` 只在初始 definitions 归一化，后续 registry/register 或 `SchemaRendererProps.registry` 可绕过。
- **修订标题/理由**: 建议 React registry wrapper 或文档化 core-normalized registry。

### [03-04] `FormErrorQuery` 已进入公开 hook 契约和 core 导出但 docs 未定义 shape

- **文件**: `packages/flux-core/src/types/runtime.ts:44-49`
- **证据片段**:
  ```ts
  export interface FormErrorQuery {
    path?: string;
    ownerPath?: string;
    sourceKinds?: Array<NonNullable<ValidationError['sourceKind']>>;
    rule?: ValidationRule['kind'];
  }
  ```
- **严重程度**: P2
- **现状**: `FormErrorQuery` 是 `@nop-chaos/flux-core` root surface 导出的公开类型，并被 `useCurrentFormErrors/useCurrentFormError/useCurrentFormFieldState` 等公开 hook 使用；`docs/architecture/renderer-runtime.md` 也直接在 hook 签名中引用该类型。但 `docs/references/form-validation-runtime-types.md` 未列出字段含义。
- **风险**: 使用者只能从源码推断 `path / ownerPath / sourceKinds / rule` 的筛选语义，容易误用为普通 field path 查询或忽略 owner/source-kind 过滤。
- **建议**: 在 `docs/references/form-validation-runtime-types.md` 补充 `FormErrorQuery` shape，并说明各字段过滤的是 `ValidationError.path / ownerPath / sourceKind / rule`。
- **误报排除**: 不重复 03-02；03-02 是 `subscribeToModelGeneration` 文档缺口，本条是另一个 public query contract。
- **最终复核结论**: 保留 P2。`FormErrorQuery` 是 public type/hook contract，但 reference docs 缺 shape/filter semantics。
- **修订标题/理由**: 标题与方向维持。

### [03-05] public `test-support` subpath has undeclared testing dependency and global i18n side effects

- **文件**: `packages/flux-renderers-form/package.json:19-22`; `packages/flux-renderers-form/src/test-support.tsx:1-23`
- **证据片段**:
  ```json
  "./test-support": {
    "types": "./dist/test-support.d.ts",
    "default": "./dist/test-support.js"
  }
  ```
- **严重程度**: P2
- **现状**: `package.json` 公开 `./test-support`。最终复核修订后，不再保留“build 不产物”判断；保留问题是该 public subpath 依赖未声明的 `@testing-library/react`，且存在顶层 i18n side effects。
- **风险**: public API 子路径、依赖声明和全局初始化行为不一致，消费方可能在导入测试支撑时触发不可预期的全局 i18n reset/init 或遇到缺失依赖。
- **建议**: 若该子路径是正式测试辅助 API，应声明依赖并隔离全局初始化；若不应公开，删除 package exports 与 workspace alias/paths，改为内部测试工具包或包内相对导入。
- **误报排除**: 原“build 不产物”部分为误报；最终问题不是构建产物缺失，而是 public test-support subpath 的依赖与副作用契约。
- **最终复核结论**: 修订保留 P2。
- **修订标题/理由**: 原“build 不产物”部分为误报：live `tsconfig.build.json` 不排除 `src/test-support.tsx`。保留问题修订为 public `test-support` subpath 依赖未声明的 `@testing-library/react` 且有顶层 i18n side effects。

### [03-06] 多个已导出的 CSS public subpath 未同步到 workspace dev alias/paths

- **文件**: `packages/flux-code-editor/package.json:16-18`; `packages/flux-renderers-form/package.json:16-18`; `packages/report-designer-renderers/package.json:16-18`; `packages/word-editor-renderers/package.json:16`; `packages/flow-designer-renderers/package.json:20-22`; `vite.workspace-alias.ts:25-100`; `tsconfig.base.json:19-54`
- **证据片段**:
  ```json
  "./form-renderers.css": {
    "default": "./dist/form-renderers.css"
  }
  ```
  ```ts
  export const workspaceAliases = {
    '@nop-chaos/flux-react/default-spacing.css': ...,
    '@nop-chaos/theme-tokens/styles.css': ...,
    '@nop-chaos/ui/styles.css': ...,
  };
  ```
- **严重程度**: P2
- **现状**: package exports 声明了多个 CSS 子路径，例如 `@nop-chaos/flux-code-editor/code-editor-styles.css`、`@nop-chaos/flux-renderers-form/form-renderers.css`、`@nop-chaos/report-designer-renderers/report-field-panel.css`、`@nop-chaos/word-editor-renderers/styles.css`、`@nop-chaos/flow-designer-renderers/designer-theme.css`，但 `vite.workspace-alias.ts` / `tsconfig.base.json` 只同步了部分 CSS 子路径。
- **风险**: dist/package exports 视角下这些 CSS 子路径是公开 API，但 workspace dev/test 解析面没有同等支持。源码或 demo 若按公开 API 导入这些 CSS，可能被 root alias 错误匹配或解析失败。
- **建议**: 为所有公开 CSS subpath 补齐 `vite.workspace-alias.ts` 和 `tsconfig.base.json` paths，或删除不应作为 public API 的 CSS exports。
- **误报排除**: 不是普通 CSS 是否导入问题，而是 public exports 与 workspace dev alias contract 漂移。
- **最终复核结论**: 保留 P2。多个 package exports 声明 CSS subpaths，但 workspace alias/paths 只同步部分。
- **修订标题/理由**: 标题与方向维持。

### [03-07] `@nop-chaos/flux-i18n` 的公开 locale 子路径缺少 workspace 开发期 alias/path 契约

- **文件**: `packages/flux-i18n/package.json`; `tsconfig.base.json`; `vite.workspace-alias.ts`
- **证据片段**:
  ```json
  "./locales/zh-CN": {
    "types": "./dist/locales/zh-CN.d.ts",
    "default": "./dist/locales/zh-CN.js"
  },
  "./locales/en-US": {
    "types": "./dist/locales/en-US.d.ts",
    "default": "./dist/locales/en-US.js"
  }
  ```
  ```json
  "@nop-chaos/flux-i18n": ["./packages/flux-i18n/src/index.ts"]
  ```
- **严重程度**: P2
- **现状**: `flux-i18n` 公开 `./locales/zh-CN` 与 `./locales/en-US`，但 workspace 开发期解析只配置了 root alias，没有对应 locale 子路径。
- **风险**: 开发/测试环境中若 dogfood 这些 public subpaths，会绕过源码 alias，依赖 `dist/locales/*.d.ts/js` 是否存在和新鲜。
- **建议**: 为 `@nop-chaos/flux-i18n/locales/zh-CN`、`@nop-chaos/flux-i18n/locales/en-US` 补齐 tsconfig paths 与 Vite aliases。
- **误报排除**: 这些是 package exports 承认的 public API，不是内部 locale 文件。
- **最终复核结论**: 保留 P2。`flux-i18n` locale public subpaths 缺 Vite/TS workspace alias/path。
- **修订标题/理由**: 标题与方向维持。

## 驳回项

无。
