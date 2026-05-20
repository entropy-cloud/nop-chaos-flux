# 维度 13: 类型安全与动态边界

## 第 1 轮（初审）

### [维度13-01] Flow Designer host action provider 未复用已声明 manifest 参数形状，断言/默认值会让非法 payload 进入核心命令

- **文件**: `packages/flow-designer-renderers/src/designer-action-provider.ts:55-66`, `packages/flow-designer-renderers/src/designer-action-provider.ts:291-299`, `packages/flow-designer-renderers/src/designer-action-provider.ts:353-366`
- **行号范围**: `designer-action-provider.ts:55-66,291-299,353-366`
- **证据片段**:
  ```ts
  invoke(method, payload, ctx) {
    switch (method) {
      case 'addNode': {
        const result = adapter.execute({
          type: 'addNode',
          nodeType: String(payload?.nodeType ?? ''),
          position: (payload?.position as { x: number; y: number } | undefined) ?? {
            x: 200,
  ```
- **严重程度**: P1
- **分类**: 危险
- **现状**: Flow Designer 已在 `designer-manifest.ts` 为 `addNode`、`moveNode`、`setViewport`、`moveNodes`、`updateMultipleNodes` 等 host capability 声明了参数 shape，但 provider 主路径没有按 manifest 做结构化校验，而是通过 `String(...)`、对象断言、数组断言和默认值直接组装 `DesignerCommand`。
- **真实风险**: schema/host 调用传入 `{ position: { x: "bad", y: 1 } }`、`{ viewport: { x: "bad" } }` 或 `moveNodes.deltas` 中非数值对象时，TypeScript 断言不会在运行时拦截；后续 core 会执行数值运算或写入 viewport，可能产生 `NaN`、错误坐标、脏历史记录或不可诊断的命令失败。
- **建议**: 像 `spreadsheet-renderers/src/host-action-provider.ts` 与 `report-designer-renderers/src/host-action-provider.ts` 一样，基于 `FLOW_DESIGNER_MANIFEST_V1.capabilities.methods[method].args` 增加统一 `validateMethodPayload` / `matchesShape`；只有通过 shape 校验后再构造 `DesignerCommand`，对 `moveNodes.deltas` 这类 map-of-object 形状补足 manifest 表达或专门 validator。
- **为什么值得现在做**: 这是 host capability 公开写边界，不是内部 UI 小范围断言；Flow/Spreadsheet/Report 都属于同一复杂控件 host 家族，后两者已收敛到 runtime payload validation，Flow 继续靠断言会让 manifest 的类型契约在最常用设计器命令面失效。
- **误报排除**: 这不是低代码 schema/action 的合理动态边界；当前代码已经有更精确的内部类型 `DesignerCommand`，并且 manifest 已公开声明参数 shape。问题不在于使用 `Record<string, unknown>`，而在于把公开 payload 直接断言成精确命令字段却没有 runtime narrowing。
- **历史模式对应**: 对应 `docs/architecture/capability-projection-manifest.md` 中“manifest 声明 host capability 参数/结果，runtime bridge 执行”的分层要求；也对应深审提示中“manifest -> provider/adapter 链不能仅靠 `as XxxCommand` 或任意对象转发”的契约真实性模式。命中校准模式 10 时已排除：这不是跨包风格一致性建议，而是同一公开 host contract 的 runtime enforcement 缺口。
- **参考文档**: `docs/architecture/capability-projection-manifest.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/design.md`, `docs/skills/react19-best-practices-review.md`, `docs/references/deep-audit-calibration-patterns.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

## any 使用统计摘要

- **统计口径**: 搜索 `packages/` 下 `.ts/.tsx`，排除 `dist/coverage/node_modules`；统计 explicit `any` / `as any` / `any[]` / `Array<any>` / 多重断言候选。测试 mock、schema 动态输入、host/function 注入、公式系统、异构 registry 擦除按合理动态边界归类。
- **源码候选概览**: `flux-formula` 合理 22 / 可疑 0 / 危险 0（公式动态输入输出）。
- **源码候选概览**: `flux-react` 合理 11 / 可疑 0 / 危险 0（scope selector 泛型、render helper/action dispatch 动态边界；NodeRenderer hot path 未发现 live `as any`）。
- **源码候选概览**: `flux-core` 合理 8 / 可疑 0 / 危险 0（RendererEnv functions/filters host 注入、工具型断言）。
- **源码候选概览**: `flux-compiler` 合理 9 / 可疑 0 / 危险 0（schema 编译动态值收敛）。
- **源码候选概览**: `flux-renderers-data` 合理 6 / 可疑 0 / 危险 0（CRUD/Table schema 桥接中未发现会越过运行时边界的 any；快编 controller 使用 `Record<string, unknown>` 为行数据动态边界）。
- **源码候选概览**: `spreadsheet-renderers` 合理 1 / 可疑 0 / 危险 0（公开 schema helper 的交叉类型断言；host provider 已有 payload validation）。
- **源码候选概览**: `report-designer-renderers` 合理 1 / 可疑 0 / 危险 0（公开 schema helper 的交叉类型断言；host provider 已有 payload validation）。
- **源码候选概览**: `flow-designer-renderers` 合理 2 / 可疑 0 / 危险 1（危险项为 host action provider 对 manifest-declared payload 的未校验断言/默认值路径）。
- **源码候选概览**: 其他源码包少量候选（`flux-action-core`, `flux-runtime`, `flux-renderers-basic`, `flux-renderers-form-advanced`, `ui`, `word-editor-renderers`）均为合理动态边界或 DOM/React 类型适配，未形成发现。
- **测试候选概览**: 测试与 test-support 中大量 `as any` 主要用于 mock runtime/env/schema、构造负例、访问 debug API，未作为本轮生产风险发现统计。
