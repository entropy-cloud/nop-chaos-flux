# 17 Naming

- 深挖轮次: 1
- 深挖发现数: 1

## 第 1 轮初审

### [维度17-01] condition-builder 公开 operator 标识使用 snake_case，和 Flux JSON camelCase 约定形成双词汇

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\operators.ts:10-28`
- **行号范围**: `10-28`
- **证据片段**:
  ```ts
  export const OPERATOR_LABEL_KEYS: Record<string, string> = {
    equal: 'conditionBuilder.operators.equal',
    not_equal: 'conditionBuilder.operators.notEqual',
    less: 'conditionBuilder.operators.less',
    less_or_equal: 'conditionBuilder.operators.lessOrEqual',
    greater: 'conditionBuilder.operators.greater',
    greater_or_equal: 'conditionBuilder.operators.greaterOrEqual',
    between: 'conditionBuilder.operators.between',
    not_between: 'conditionBuilder.operators.notBetween',
  ```
- **严重程度**: P2（可排期）
- **冲突名称**: JSON/authoring operator id 的 `not_equal` / `less_or_equal` / `is_empty` / `select_any_in` vs Flux JSON 约定中的 camelCase（如 `notEqual` / `lessOrEqual` / `isEmpty` / `selectAnyIn`）
- **冲突位置**: live operator registry `operators.ts:10-28`、author-facing JSON override keys `apps/playground/src/pages/conditionBuilderSchema.json:129-135`、owner/reference convention `docs/references/flux-json-conventions.md:233-244`。
- **统一建议**: 将 condition-builder 的公开 operator id 收敛为 camelCase，并为旧 snake_case operator id 提供内部兼容映射或一次性迁移说明；`operators.labels` 这类 JSON object key 也应使用同一 canonical camelCase id。
- **现状**: `condition-builder` 已经把 i18n key suffix 写成 camelCase（例如 `conditionBuilder.operators.notEqual`），但 authoring/operator id 仍使用 snake_case；当这些 id 作为 `operators.labels` 的 key 出现在 JSON schema 中时，直接违反当前 JSON key camelCase 基线。
- **风险**: 后续组件作者会在同一个配置面同时看到 camelCase JSON 字段（如 `builderMode`、`showAndOr`、`operatorsByType`）和 snake_case operator key，容易继续扩散出 `not_equal` 风格的 authoring key；如果未来 schema validator 对普通裸 key 的 camelCase 执行严格校验，这类配置会变成需要特判的例外。
- **为什么值得现在做**: 这是已落地组件的公开 authoring vocabulary，当前修复主要集中在一个 operator registry、测试与少量示例；越晚收敛，用户 schema 和示例中的 snake_case operator id 越难迁移。
- **误报排除**: 这不是 `DataSource.name/dataPath`、`CompiledSchemaNode`、`createFlowDesignerRegistry` 这类已明确收口或已降级的旧问题；本条只针对 live `condition-builder` operator id 作为 JSON key/authoring id 时与当前 JSON naming owner doc 的冲突。也不是 package.json 依赖名或第三方资源名，证据中的 key 属于 Flux 组件公开配置与运行时匹配表。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` 的 “Cross-Package Consistency Ideas Reported As Current Defects” 需加强举证门槛；本条保留的原因是它不是单纯跨包风格差异，而是同一 authoring JSON surface 与 owner naming 文档冲突，并已出现在 playground schema 示例中。
- **参考文档**: `docs/references/flux-json-conventions.md`; `docs/components/condition-builder/design.md`; `docs/references/terminology.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度17-02] Button `variant` 公开词汇在 active reference 中仍是 `primary/danger`，但 live renderer 已使用 UI `destructive/default` 体系

- **文件**: `C:\can\nop\nop-chaos-flux\docs\references\flux-json-conventions.md`
- **行号范围**: `189-194`
- **证据片段**:

  ```md
  ### 3.1 `variant` vs `level`

  | 组件类型   | 属性      | 值                                             | 用途         |
  | ---------- | --------- | ---------------------------------------------- | ------------ |
  | **Button** | `variant` | `'default' \| 'primary' \| 'danger'`           | 按钮样式变体 |
  | **Badge**  | `level`   | `'info' \| 'success' \| 'warning' \| 'danger'` | 状态级别     |
  ```

- **严重程度**: P2
- **冲突名称**: Button authoring `variant: 'primary' | 'danger'` vs live `ButtonSchema.variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'`
- **冲突位置**: `docs/references/flux-json-conventions.md:189-204` 仍推荐 `primary/danger`；`packages/flux-renderers-basic/src/schemas.ts:143-147` 的 live Button schema 不再接受 `primary/danger`；`packages/report-designer-renderers/src/schemas.ts:13` 和 `packages/flow-designer-core/src/types.ts:236` 仍把 toolbar button-like config 暴露为 `primary/danger`。
- **统一建议**: 选择一个 canonical authoring vocabulary：若以 live `@nop-chaos/ui` / basic button 为准，则把 reference 与 toolbar configs 收敛到 `destructive/default/...`；若要保留 `primary/danger` 作为 DSL 语义层，则 basic `ButtonRenderer` 必须显式支持并映射，不能让 reference 与 live renderer 分裂。
- **现状**: active JSON naming reference 仍把 Button variant 写成 `primary/danger`，而 live basic button renderer 直接把 schema `variant` 透传给 `@nop-chaos/ui` Button，类型面也只接受 shadcn-style values。
- **风险**: schema 作者按 reference 写 `variant: "primary"` 或 `"danger"` 时，会与 live basic button 类型/运行时 vocabulary 不一致；domain toolbar 又继续复制 `primary/danger`，导致同一“按钮变体”概念在 Flux JSON surface 中出现两套值域。
- **为什么值得现在做**: 这是 author-facing JSON vocabulary，不是内部变量名；当前已能定位到 reference、basic button schema、report/flow toolbar config 几个集中位置，越晚收敛越容易让示例和宿主配置继续扩散双词汇。
- **误报排除**: 不是 package.json、第三方组件 API 或历史 archive 噪声；证据来自 active reference 与 live renderer schema。也不是单纯跨包风格差异，因为 `flux-json-conventions.md` 是 JSON 命名基线，而 `button` 是通用 renderer。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` 的 “Cross-Package Consistency Ideas Reported As Current Defects” 需加强举证门槛；本条保留是因为冲突发生在 active authoring reference 与 live public schema 之间，并已影响 report/flow toolbar authoring vocabulary。
- **参考文档**: `docs/references/flux-json-conventions.md`; `docs/components/button/design.md`; `docs/architecture/styling-system.md`
- **复核状态**: 未复核

### [维度17-03] Button 示例仍使用已从 live size vocabulary 移除的 `md`

- **文件**: `C:\can\nop\nop-chaos-flux\docs\components\button\example.json`
- **行号范围**: `1-7`
- **证据片段**:
  ```json
  {
    "type": "button",
    "label": "提交",
    "variant": "default",
    "size": "md",
    "disabled": false,
    "onClick": {
  ```
- **严重程度**: P3
- **冲突名称**: 示例 JSON `size: "md"` vs live Button schema `size: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"`
- **冲突位置**: `docs/components/button/example.json:1-7` 使用 `md`；`packages/flux-renderers-basic/src/schemas.ts:143-148` 定义的 `ButtonSchema.size` 不包含 `md`；`docs/components/button/design.md:56-59` 要求复用 `@nop-chaos/ui` Button 的 `variant` 和 `size`。
- **统一建议**: 将示例改为 live canonical `size: "default"`，或如果希望 `md` 成为 authoring alias，则在 `ButtonSchema`、renderer 映射和 reference 中显式声明兼容规则。
- **现状**: Button component design 说复用 UI Button size，但示例仍保留旧的 `md` token；live schema 当前没有 `md`。
- **风险**: 用户复制 docs example 会得到一个不属于当前 Button schema 的 size 值；如果后续 schema validator 对 enum 值严格校验，该官方示例会失败。
- **为什么值得现在做**: 这是单文件 active component 示例残留，修复成本低；同时可防止 `sm/md/lg` 旧 token 在新示例中继续被复制。
- **误报排除**: 不是 archive、experiment 或第三方 UI size；证据来自 active `docs/components/button/example.json`。也不是单纯视觉偏好，`md` 与 live schema enum 不一致，属于 authoring vocabulary 漂移。
- **历史模式对应**: 对应已发生过的 Button `variant` / `size` vocabulary 收敛残留模式；本条不是重报已收口代码，而是 active example 未跟随 live schema 的 residual。
- **参考文档**: `docs/components/button/design.md`; `docs/references/flux-json-conventions.md`; `packages/flux-renderers-basic/src/schemas.ts`
- **复核状态**: 未复核
