# 03 API Surface

- 深挖轮次: 1
- 深挖发现数: 3

## 第 1 轮初审

### [维度03-01] `report-designer-renderers` live host action provider 未进入根公开面

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\index.ts:14-27`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\host-action-provider.ts:34-49`
- **行号范围**: `index.ts:14-27`, `host-action-provider.ts:34-49`
- **证据片段**:

  ```ts
  export {
    defineReportDesignerPageSchema,
    reportDesignerRendererDefinitions,
    registerReportDesignerRenderers,
  } from './renderers.js';

  export {
    REPORT_DESIGNER_MANIFEST_V1,
    resolveReportDesignerManifest,
    reportDesignerHostContract,
    REPORT_DESIGNER_CAPABILITY_PUBLICATION,
  } from './report-designer-manifest.js';
  ```

  ```ts
  export function createReportDesignerActionProvider(
    dispatch: (command: ReportDesignerCommand) => Promise<ReportDesignerCommandResult>,
  ): ActionNamespaceProvider {
    return {
      kind: 'host',
      listMethods() {
        return [];
      },
      async invoke(method, payload) {
  ```

- **严重程度**: P2（可排期）
- **现状**: `report-designer-renderers` 根入口导出了 renderer definitions、注册函数、manifest、host contract 和 host data，但 live 的 `createReportDesignerActionProvider()` 仍只能通过包内私有文件路径使用。
- **风险**: 外部宿主若要按 live `report-designer:*` namespace contract 接线，只能绕过根入口导入内部模块；这会扩大私有耦合，并让 report / spreadsheet / flow / word 这类 domain-host renderer 的根 API 表面不一致。
- **建议**: 在 `packages/report-designer-renderers/src/index.ts` 显式导出 `createReportDesignerActionProvider`，并考虑同步导出 `toReportDesignerActionResult` 是否属于稳定辅助面。
- **为什么值得现在做**: 这是低成本的 root-barrel 收敛，能避免后续宿主集成依赖内部文件路径，也能让已导出的 `reportDesignerHostContract` 拥有对应 runtime provider 入口。
- **误报排除**: 不是把未完成切片当死代码；该 provider 已被 live `page-renderer.tsx` 使用，且 renderer root 已公开同一 host family 的 manifest/contract。`docs/architecture/report-designer/api.md` 标注 target/reference，未单独作为强制证据；本条主要依据 live package root 与 live provider 的公开面不对齐。
- **历史模式对应**: calibration pattern 5（演进中间态）已降级处理为 P2；不按“target/reference 文档”直接判 P1，只报告 live root surface 与 live host wiring 的漂移。
- **参考文档**: `docs/references/renderer-interfaces.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/components/report-designer-page/design.md`
- **复核状态**: 未复核

### [维度03-02] `spreadsheet-renderers` provider 的 `listMethods()` 与已公开 manifest methods 脱节

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\host-action-provider.ts:30-45`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-manifest.ts:115-127`
- **行号范围**: `host-action-provider.ts:30-45`, `spreadsheet-manifest.ts:115-127`
- **证据片段**:
  ```ts
  export function createSpreadsheetActionProvider(
    dispatch: (command: SpreadsheetCommand) => Promise<SpreadsheetCommandResult>,
  ): ActionNamespaceProvider {
    return {
      kind: 'host',
      listMethods() {
        return [];
      },
      async invoke(method, payload) {
  ```
  ```ts
  const spreadsheetCapabilities: HostCapabilityContract = {
    namespace: 'spreadsheet',
    methods: {
      setActiveSheet: {
        args: {
          kind: 'object',
          fields: {
  ```
- **严重程度**: P2（可排期）
- **现状**: 根入口已导出 `SPREADSHEET_MANIFEST_V1` / `spreadsheetHostContract` / `createSpreadsheetActionProvider`，manifest 声明了 `setActiveSheet` 等 action methods，但 provider 自省面 `listMethods()` 固定返回空数组。
- **风险**: runtime dispatch 的 `invoke()` 仍可工作，但 debugger、builder autocomplete、capability inspection 或 future host tooling 会从同一 package 得到“manifest 有方法、provider 无方法”的两套公共契约。
- **建议**: 让 provider 的 `listMethods()` 从 manifest capability methods 派生，或导出一个共享 method-name 常量供 manifest 与 provider 共用。
- **为什么值得现在做**: 同一包内已存在公开 manifest 和公开 provider，收敛点明确；修复能减少后续工具链围绕 host capability 做二次猜测。
- **误报排除**: `ActionNamespaceProvider.listMethods` 是 optional，因此不是派发正确性 P1；但当前 provider 主动实现了该方法且返回与公开 manifest 相反的信息，已经是 live public introspection drift，不是未完成切片或测试支撑代码。
- **历史模式对应**: calibration pattern 10（跨包一致性想法）已抬高举证门槛；本条不是“flow/word 做法不同”本身，而是同一 live package 的 manifest 与 provider 互相矛盾。
- **参考文档**: `docs/references/renderer-interfaces.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度03-03] `report-designer-renderers` provider 的 `listMethods()` 与已公开 manifest methods 脱节

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\host-action-provider.ts:34-49`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-manifest.ts:204-217`
- **行号范围**: `host-action-provider.ts:34-49`, `report-designer-manifest.ts:204-217`
- **证据片段**:
  ```ts
  export function createReportDesignerActionProvider(
    dispatch: (command: ReportDesignerCommand) => Promise<ReportDesignerCommandResult>,
  ): ActionNamespaceProvider {
    return {
      kind: 'host',
      listMethods() {
        return [];
      },
      async invoke(method, payload) {
  ```
  ```ts
  const reportDesignerCapabilities: HostCapabilityContract = {
    namespace: 'report-designer',
    methods: {
      dropFieldToTarget: {
        args: {
          kind: 'object',
          fields: {
  ```
- **严重程度**: P2（可排期）
- **现状**: `reportDesignerHostContract` / `REPORT_DESIGNER_MANIFEST_V1` 声明 `dropFieldToTarget`、`updateMeta`、`preview` 等 capability methods；同族 live provider 却通过 `listMethods()` 对外宣称无方法。
- **风险**: host action 的可发现性与静态 contract 分裂，后续 builder/debugger 可能基于 provider 判断无可用动作，而基于 manifest 又生成可配置动作，导致 authoring tooling 行为不稳定。
- **建议**: 与 spreadsheet 同步处理，让 `createReportDesignerActionProvider()` 的 `listMethods()` 来自 `REPORT_DESIGNER_MANIFEST_V1.capabilities.methods` 或共享 method-name 常量。
- **为什么值得现在做**: report designer 已是 domain-host renderer，root 已公开 manifest/hostContract；让 runtime provider 自省面与静态 contract 对齐能避免下一阶段工具化时继续扩大漂移。
- **误报排除**: 不是只因 provider 位于非 root 文件就判死代码；该 provider 是 live page wiring。也不是 target-only API 约束；证据来自当前源码中同时存在的 manifest methods 与 provider self-report。
- **历史模式对应**: calibration pattern 5 与 10：不把 host wiring 过渡结构直接判为架构违约，但同一 live contract 的 manifest/provider 自省结果已经漂移，保留为 P2。
- **参考文档**: `docs/references/renderer-interfaces.md`, `docs/architecture/action-scope-and-imports.md`, `docs/components/report-designer-page/design.md`
- **复核状态**: 未复核

## 每个包 API 表面积摘要

- `@nop-chaos/flux-core`: 根入口为核心类型、schema diagnostics、validation model、registry、class aliases、path/object/schema utils、runtime host reporting、i18n sink、workbench types 等稳定基础面；exports map 仅 `"."`，与入口对齐。未报告问题。
- `@nop-chaos/flux-formula`: 根入口导出 compiler/parser/evaluator/registry/date helper/binding；exports map 仅 `"."`，未发现与当前契约冲突的多余公开面。
- `@nop-chaos/flux-compiler`: 根入口导出 schema/action/source/reaction compiler 与 diagnostics/host-action-validation/validation lowering；exports map 仅 `"."`，与 compiler package role 对齐。
- `@nop-chaos/flux-action-core`: 根入口导出 action-core、operation-control、dispatcher 与 debounce re-export；exports map 仅 `"."`，未发现 API drift。
- `@nop-chaos/flux-runtime`: 根入口保持薄 runtime factory / action scope / component handle / status owner / projected scope / request helper 面；owner doc 明确 `createReadonlyScopeBinding` 同时可从 runtime root 与 `flux-react/unstable` 触达，未作为漂移报告。
- `@nop-chaos/flux-react`: 根入口导出 stable renderer/runtime hooks、SchemaRenderer、FieldFrame、DialogHost、workbench shell、container/source/status helpers；`./unstable` 承载 raw contexts、RenderNodes、internal helpers。该分层与 `flux-runtime-module-boundaries.md` 当前规则一致。
- `@nop-chaos/flux-renderers-basic`: 根入口导出 schema、基础 renderer、renderer definitions 与注册函数；exports map 仅 `"."`，未发现 root surface 与 renderer registration 漂移。
- `@nop-chaos/flux-renderers-form`: 根入口导出 form renderer、input definitions、shared primitives、field-utils、schemas；`test-support.tsx` 存在但 package exports map 未公开 `./test-support`，测试中对 `@nop-chaos/flux-renderers-form/test-support` 的引用按 calibration pattern 4/6 视为测试支撑或 workspace alias 候选，不在本轮直接判公开 API 缺陷。
- `@nop-chaos/flux-renderers-form-advanced`: 根入口导出 advanced field renderer definitions、composite schemas、tree options、condition-builder types；未把未完成复合字段切片直接判死代码。
- `@nop-chaos/flux-renderers-data`: 根入口导出 table/data-source/chart/tree/crud renderer 与 data definitions；未发现 root/export map drift。
- `@nop-chaos/flux-code-editor`: 根入口导出 schema types、source resolvers、CodeMirror hook、renderer definition 与注册函数；未发现当前 live contract drift。
- `@nop-chaos/flow-designer-core`: 根入口导出 domain types、core、layout、tree projection/domain adapter；未发现 API 表面积问题。
- `@nop-chaos/flow-designer-renderers`: 根入口导出 schemas、action provider、manifest/host contract、renderer definitions；`./unstable` 明确承载 xyflow bridge/context/canvas internals，符合 owner doc 中 unstable 分层。未报告问题。
- `@nop-chaos/spreadsheet-core`: 根入口导出 spreadsheet document/types/commands/core factory；exports map 仅 `"."`，未发现入口 drift。
- `@nop-chaos/spreadsheet-renderers`: 根入口导出 bridge、action provider、schema、renderer definitions、UI subcomponents、interactions hook、manifest/host contract；发现 provider `listMethods()` 与 manifest methods 不一致。
- `@nop-chaos/report-designer-core`: 根入口导出 report semantic types、commands、adapters、core factory；未发现当前 API 表面积问题。
- `@nop-chaos/report-designer-renderers`: 根入口导出 bridge、renderer definitions、manifest/host contract、field panel、host data、canvas；发现 live action provider 未进 root surface，且 provider `listMethods()` 与 manifest methods 不一致。
- `@nop-chaos/word-editor-core`: 根入口导出 canvas-editor bridge、stores、document IO、template/dataset/chart/code model；未发现入口 drift。
- `@nop-chaos/word-editor-renderers`: 根入口导出 page renderer、renderer registration/schema、manifest/host contract、action provider；provider root export 与 flow/spreadsheet pattern 对齐，未发现问题。
- `@nop-chaos/ui`: 根入口导出 shadcn-style UI components、chart helpers、`cn`；exports map仅 `"."`，`@nop-chaos/ui/chart` 测试/代码导入需要单独 package subpath 核对，但本轮未找到足够 live contract 证据判定为维度 03 缺陷。
- `@nop-chaos/flux-i18n`: 根入口导出 i18n init/state/hooks/locales；未发现 API drift。
- `@nop-chaos/nop-debugger`: 根入口导出 debugger panel/controller/types；未发现 API drift。
- `@nop-chaos/tailwind-preset`: 根入口导出 preset；未发现 API drift。
- `@nop-chaos/theme-tokens`: 根入口导出 token module，exports map 另有 `./styles.css` 静态样式；未发现 API drift。

## 问题清单

- [维度03-01] `report-designer-renderers` live host action provider 未进入根公开面。严重程度 P2。
- [维度03-02] `spreadsheet-renderers` provider `listMethods()` 与 manifest methods 脱节。严重程度 P2。
- [维度03-03] `report-designer-renderers` provider `listMethods()` 与 manifest methods 脱节。严重程度 P2。

## 深挖第 2 轮追加

未发现新的问题。深挖结束。
