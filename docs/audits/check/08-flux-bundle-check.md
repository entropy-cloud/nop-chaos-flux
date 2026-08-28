# 08 flux-bundle 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-bundle/src/` 实现源文件 3 个（`index.tsx` 80 行、`types.ts` 48 行、`use-sync-external-store-shim.ts` 5 行，另 `style.css` 13 行），排除 `*.test.*`。为反误报额外核对了：`flux-core/src/types/renderer-hooks.ts`（`SchemaRendererProps` 契约）、`flux-react/src/schema-renderer.tsx`（内层组件实际消费的 props）、`flux-react/src/defaults.ts`（`createDefaultEnv` 签名）、`flux-react/src/use-sync-external-store-with-selector.ts`（fork/shim 消费关系）、各上游 renderer 包 `package.json` exports 与 src 内 CSS 清单、`scripts/prepare-flux-bundle-dist.mjs` / `check-flux-bundle-pack.mjs`（发布产物契约）、`vite.config.ts` / `vitest.config.ts`、构建产物 `dist/index.js` 的外部 import 面与顶层语句形态、`docs/plans/2026-08-07-1023-2-flux-bundle-boundary-and-metadata-integrity.md`（shim 机制的终裁记录）、`docs/architecture/flux-runtime-module-boundaries.md:521`（facade 集成方式）。
- 结论概览：P0 x0 / P1 x1 / P2 x0 / P3 x3。聚合出口的骨架是干净的：无反向循环依赖、peerDependencies 与 dist 实际外部 import 精确一致、CSS 聚合覆盖了全部被聚合包的自有样式、use-sync-external-store shim 是有文档与 dist 实证的 load-bearing 机制而非死代码。核心问题是 facade 唯一的运行时组件 `FluxSchemaRenderer` 的 props 契约失真：类型声明继承了内层 `SchemaRendererProps` 的全部字段，但包装组件只转发其中 6 个，其余 10 个（含 `onRuntimeChange`、`plugins`、`parentScope` 等关键集成点）被静默丢弃。

## P0 缺陷

无。

## P1 隐患

### F-01 facade 包装组件静默丢弃 `FluxSchemaRendererProps` 声明的 10 个 props（类型承诺与运行时行为不一致）

位置：`packages/flux-bundle/src/index.tsx:60-75`（运行时转发面）与 `packages/flux-bundle/src/types.ts:38-46`、`packages/flux-bundle/types/public-types.d.ts:39-44`（两份类型承诺）。

```tsx
// index.tsx:60-75 —— 仅转发 6 个字段
return function FluxSchemaRenderer(props: FluxSchemaRendererProps) {
  return (
    <div className={FLUX_ROOT_CLASS}>
      <SchemaRenderer
        schema={props.schema}
        schemaUrl={props.schemaUrl}
        env={props.env}
        data={props.data}
        formulaCompiler={formulaCompiler}
        registry={registry}
        strictValidation={props.strictValidation}
        onActionError={props.onActionError}
      />
    </div>
  );
};
```

```ts
// types.ts:38-46 —— Omit 只剔除 5 个字段，其余全部继承
export interface FluxSchemaRendererProps
  extends Omit<
    import('@nop-chaos/flux-core').SchemaRendererProps,
    'schema' | 'env' | 'onActionError' | 'formulaCompiler' | 'registry'
  > {
  schema: FluxSchema;
  ...
}
```

问题：`SchemaRendererProps`（`flux-core/src/types/renderer-hooks.ts:127-146`）共 18 个字段。facade 类型通过 `extends Omit<..., 5 个字段>` 继承了其余 13 个（另重声明 3 个），因此 `FluxSchemaRendererProps` 公开包含 `plugins`、`pageStore`、`surfaceRuntime`、`moduleCache`、`parentScope`、`actionScope`、`componentRegistry`、`onRuntimeChange`、`onComponentRegistryChange`、`onActionScopeChange` 这 10 个字段；但包装组件一个都没有转发。内层组件是真实支持它们的（`flux-react/src/schema-renderer.tsx:129` 读 `onRuntimeChange`、`:154-155` 透传 `plugins`/`pageStore`、`:276` 用 `parentScope`），即被丢弃的不是无效字段。

推理链：宿主（如 nop-chaos-next）经 facade 渲染并传 `onRuntimeChange`（获取 `RendererRuntime` 实例的官方途径）或 `plugins`（`RendererPlugin[]` 扩展点）或 `parentScope`（嵌入宿主已有 scope 树）→ TypeScript 依据 facade 类型编译通过，无任何告警 → 运行时这些 props 在包装层被丢弃 → 宿主永远收不到 runtime 回调、插件静默失效、嵌入场景 scope 树错误。失败模式是"静默无效"而非报错，排查成本高。

影响：facade 是对外唯一的 host-facing 集成入口（README 自述 "Host-facing Flux facade package"），其 props 类型即集成契约；契约中 10/16 个可选集成点实际不可用。两份手写类型（`src/types.ts` 与 `types/public-types.d.ts`）存在同样的失真，现有测试（`index.test.tsx`）只覆盖 3 个转发字段，无法拦截。

修复方向（二选一，推荐 a）：
a. 包装组件改为整体透传：`<SchemaRenderer {...props} formulaCompiler={formulaCompiler} registry={registry} />`（`formulaCompiler`/`registry` 由 facade 持有，覆盖传入值即可），使运行时与类型一致；
b. 若刻意收窄，则把 10 个不支持的字段加入 `Omit` 列表，让宿主在编译期得到明确信号——但这会砍掉 `onRuntimeChange`/`plugins` 等高价值集成点，与 facade 定位不符。
同时在 `index.test.tsx` 中补一条"传入 `onRuntimeChange` 能收到回调"的契约测试。

## P2 隐患

无。导出面抽查（见检查过程记录第 8 条）未发现 facade 有意收窄面之外的功能性遗漏；mobile / scheduling / ai / graph 未纳入默认注册属文档明示的设计。

## P3 建议

### F-02 发布 d.ts 与运行时模块导出面漂移：`FluxSchemaObject` 只存在于手写 d.ts，且无全量等价守卫

位置：`packages/flux-bundle/types/public-types.d.ts:19`（`export interface FluxSchemaObject`）vs `packages/flux-bundle/src/index.tsx:20-32`（export type 列表无此名）；`src/types.ts:18-20` 定义并导出了它，但 barrel 未转出。

问题：`scripts/prepare-flux-bundle-dist.mjs:9-14` 把 `types/public-types.d.ts` 原样拷贝为 `dist/index.d.ts`，因此发布产物的类型面声称导出 `FluxSchemaObject`，而运行时模块（`src/index.tsx`，经 vite alias 以源码消费时）没有该导出。全仓 grep 确认 `FluxSchemaObject` 零使用（apps/packages/dist 均无）。type-only 导入会被擦除所以 dist 消费不炸运行时，但同一包两种消费路径（dist vs workspace src alias）下类型解析行为不一致。根因是 d.ts 与 `src/index.tsx` 双份手工平行维护，而 `check-flux-bundle-pack.mjs` 只校验文件存在性与 peer 清单、`index.test.tsx:59-66` 只 grep 3 行字符串，均不校验两份导出面的全量等价——未来任何一侧的增删都会静默漂移。

影响：低（当前漂移仅 1 个未使用类型），但守卫缺失使漂移会持续累积；F-01 的类型失真同样源于这两份手写副本无一致性约束。

修复方向：要么在 `src/index.tsx` 补 `FluxSchemaObject` 转出、要么从 d.ts 删除；并在测试中加"d.ts 导出名集合 === index.tsx 导出名集合"的等价断言（解析两份文件的 export 声明做 diff），替代目前的字符串 grep。附带一提：`onActionError` 签名中的 `ActionContext` 也未随 facade 转出（宿主只能靠 contextual typing，无法显式命名该类型），可一并考虑补转。

### F-03 devDependencies 声明的 `@nop-chaos/flux-i18n` 无任何直接引用

位置：`packages/flux-bundle/package.json:39`。

问题：`src/`（index.tsx、types.ts、shim）、`vite.config.ts`、`vitest.config.ts`、两个测试文件均未 import `@nop-chaos/flux-i18n`。flux-i18n 经各 renderer 包的 dependencies 传递可达，pnpm 严格模式下由依赖方各自的 node_modules 解析，flux-bundle 自身无需声明。

影响：冗余依赖声明（D8 结构噪音），误导读者以为 facade 直接消费 i18n 层。

修复方向：确认 `check:workspace-manifest-deps` 类门禁无"必须声明"的存量豁免后移除该条目。同理可复核 devDeps 中 `zustand`（仅作为 peer 的本地安装载体，external 构建不解析它）是否仍需保留。

### F-04 README / description 的"按需注册族"清单不完备

位置：`packages/flux-bundle/README.md:5` 与 `package.json:62`（description）——"The mobile, scheduling, ai, and graph families are registered on demand by hosts"。

问题：仓库实际存在 8 个未纳入默认栈的 renderer 族：`flux-renderers-dashboard`、`flux-renderers-industrial`、`flux-renderers-map`、`flux-renderers-pivot` 亦不在默认注册内，但两处文案均未提及。

影响：宿主方按文档判断"默认 6 族 + 按需 4 族"会漏掉其余 4 族的存在（D2 文档完备性，轻微）。

修复方向：文案改为"其余族（mobile / scheduling / ai / graph / dashboard / industrial / map / pivot 等）由宿主按需经各自 `register*Renderers` 入口注册"。

## 检查过程记录

1. **范围确认**：`find` 列出 `packages/flux-bundle` 全部文件；实现源 = `src/index.tsx`(80 行) + `src/types.ts`(48) + `use-sync-external-store-shim.ts`(5) + `style.css`(13)，测试 `index.test.tsx`/`crud-loadaction.test.tsx` 按任务排除；另有手写 `types/public-types.d.ts`、`types/css.d.ts`、`vite.config.ts`、`vitest.config.ts`、`tsconfig*.json` 纳入契约核对。
2. **循环依赖（D8）**：grep 全 `packages/*/package.json`（单双引号两种形态）与 `packages/*/src` 中对 `@nop-chaos/flux`（本包发布名）的反向引用——零命中，聚合包未被上游引用，无环。另核对 shim 边：`use-sync-external-store-shim.ts:5` re-export 自 `@nop-chaos/flux-react`，而 flux-react 自身只用相对路径消费自己的 fork（`use-sync-external-store-with-selector.ts`，5 处），不回引 shim —— 单向边，非环。
3. **shim 是否死代码（反误报）**：`dist/index.js` 中存在 `//#region src/use-sync-external-store-shim.ts` region 标记，证明有被聚合的 npm 依赖（tiptap CJS）import 了 `use-sync-external-store` 并被 `vite.config.ts:28` 的 alias 拦截到 shim；`docs/plans/2026-08-07-1023-2` 终裁记录确认 alias "load-bearing"。结论：机制必要，非 finding。
4. **peerDependencies vs 实际 import（D2）**：提取 `dist/index.js` 全部裸 import：`react`、`react/jsx-runtime`、`react-dom`、`zustand/vanilla`、`lucide-react`、`recharts`、`i18next`、`react-i18next`、`@nop-chaos/ui`、`@nop-chaos/ui/chart`——与 `peerDependencies` 8 项精确一一对应（`/chart`、`/vanilla`、`/jsx-runtime` 为子路径，随包解析）；`ui` package.json 确有 `"./chart"` export。无缺漏、无多余（`recharts` 等重依赖对只用局部功能的宿主也强制安装，属单 bundle + 静态 ESM import 的固有设计取舍，且 `check-flux-bundle-pack.mjs:96-100` 有意强制，不作 finding）。
5. **sideEffects / tree-shaking**：`dist/index.js` 顶层仅 var/函数声明与 rolldown 惰性 `__esmMin` thunk（`head`/`tail` 实证）；所有注册副作用都在导出函数体内、需显式调用才执行。`"sideEffects": ["*.css", "./dist/style.css"]` 不会导致错误剔除。标记合理。
6. **exports/main/module/types 字段**：`exports["."]` 的 `types`/`default` 与顶层 `main`/`module`/`types` 均指向 `dist/index.js`/`dist/index.d.ts`，一致；`prepare-flux-bundle-dist.mjs:20-28` 对两处路径做强校验；ESM-only（`type: module`）+ `private: true` + 独立 pack 脚本的发布形态自洽。
7. **CSS 聚合完整性**：`find` 确认被聚合的 basic / data / form-advanced 的 src 无任何 `.css`；自有 CSS 的四包（flux-react `default-spacing.css`、form `form-renderers.css`、content `styles.css`、layout `styles.css`）已全部被 `src/style.css:1-4` @import，且各子路径在对应包 exports 中合法声明。无遗漏。
8. **导出面差集抽查（D2）**：facade 有意收窄（6 值导出 + 11 类型别名），README/boundaries 文档明示；上游代表导出逐一核实存在且签名匹配：`createRendererRegistry`（flux-core/src/registry.ts:9，经 index `export *`）、`createFormulaCompiler`（flux-formula/src/compile.js:1→index.ts:1）、`createDefaultEnv(input?: Partial<...>)`（flux-react/src/defaults.ts:14）、`createSchemaRenderer`、`useSyncExternalStoreWithSelector`（flux-react/src/index.tsx:110）、`registerFormRenderers`（form 的 `./definitions` 子路径合法导出，主 index.tsx:2 亦转出）。未转出 hooks/types 属设计而非遗漏；唯一实质漂移是 `FluxSchemaObject`（F-02）。
9. **props 转发核对（F-01 证据链）**：对照 `flux-core/src/types/renderer-hooks.ts:127-146`（18 字段）与 `flux-react/src/schema-renderer.tsx`（:129、:154-155、:167-169、:276、:348-353 实际消费 `onRuntimeChange`/`plugins`/`pageStore`/`parentScope`），确认被丢字段是内层组件的有效集成点；构建产物 `dist/index.js` 尾部 wrapper 字节码同样只含 6 个转发字段，与源码一致。
10. **测试覆盖**：`index.test.tsx` 锁定 exports 字段、peer 清单、默认 6 族的注册结果（page/form/table/object-field/array-field/separator/grid）、根类名与样式组合来源；`crud-loadaction.test.tsx` 锁定全 registry + ajax loadAction 渲染路径。未覆盖 props 全量透传（F-01 的修复应补）。
11. **其他核对未列 finding 的项**：`tsconfig.build.json` 正确排除测试；`files` 仅含 dist/README；`prepare-flux-bundle-dist.mjs:30-31` 对 index.js 的读写回写是无效操作（无变化），位于 scripts/ 不在本审计范围内，仅备注；dist 4.4MB 未压缩系 `minify: false` 的显式构建配置，非缺陷。
