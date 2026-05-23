# 维度 17: 命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] `flux-code-editor` source ref 运行时仍接受 `dataPath`，与公开 JSON `path` 约定形成双词汇

- **文件**: `packages/flux-code-editor/src/types.ts:188-193`, `packages/flux-code-editor/src/types.test.ts:41-44`, `docs/references/flux-json-conventions.md:135-142`
- **行号范围**: `packages/flux-code-editor/src/types.ts:188-193`
- **证据片段**:
  ```ts
  export function resolveSourceRefPath(sourceRef: {
    path?: string;
    /** @deprecated Use path instead. */
    dataPath?: string;
  }): string | undefined {
    return sourceRef.path ?? sourceRef.dataPath;
  }
  ```
- **严重程度**: P2
- **冲突名称**: `path` vs `dataPath`
- **冲突位置**: `docs/references/flux-json-conventions.md:137` 明确规定写入动作与 authoring 字段使用 `path`、不使用 `dataPath`；但 `packages/flux-code-editor/src/types.ts:188-193` 的 source-ref 解析主路径仍接受 `dataPath` fallback，且 `packages/flux-code-editor/src/types.test.ts:41-44` 用测试固定了 legacy `dataPath` 行为。
- **统一建议**: 在 v1 / 无兼容负担基线下，将 `resolveSourceRefPath` 输入收敛为仅接受 `path`；删除 `dataPath` fallback 与对应测试，必要时把旧 schema 迁移作为离线迁移工具或文档化破坏性变更处理，而不是保留在运行时主路径。
- **现状**: 公开类型 `VariableSourceRef` / `SQLSchemaSourceRef` 已只有 `path`，但运行时 resolver 仍能消费未声明的 `dataPath`，形成“类型/文档不公开、运行时仍支持”的隐性 authoring 入口。
- **风险**: 后续维护者会看到测试与 fallback 后继续认为 `dataPath` 是受支持的 source-ref 词汇；schema 作者也可能通过未类型化 JSON 使用 `dataPath` 并获得成功结果，导致 `path` 收敛不彻底、测试继续保护旧词汇。
- **为什么值得现在做**: 当前审计基线明确为 v1 / 无兼容负担 / 不接受过渡态主路径；这里不是局部变量命名，而是 JSON authoring 输入可被运行时接受并被测试固化的公开契约边界，清理成本小且可立即消除双词汇。
- **误报排除**: 不是内部局部变量风格问题，也不是只存在于 archive/docs 的历史讨论；`resolveSourceRefPath` 被 `source-resolvers.ts` 的 live hook 调用，`types.test.ts` 明确断言 legacy `dataPath` 仍应工作。虽然字段带 `@deprecated`，但当前 v1 基线不把主路径 compatibility fallback 作为豁免理由。
- **历史模式对应**: 命中 `docs/references/deep-audit-calibration-patterns.md` 的 V1 Override：历史上这类兼容 fallback 可能被降级为 migration residue，但当前 v1 基线下 live compatibility layer 本身就是候选缺陷证据；也对应既往 deep-audit 中反复出现的 `dataPath` public vocabulary drift。
- **参考文档**: `docs/references/flux-json-conventions.md:135-142`, `docs/references/terminology.md:367-378`, `docs/references/deep-audit-calibration-patterns.md:21-28`, `docs/skills/deep-audit-prompts.md:1573-1576`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度17-02] `submitForm` 是正式当前表单提交动作，但 live playground 与测试继续教学/固化 `submit` alias

- **文件**: `apps/playground/src/component-lab/renderers/form-lab-page.tsx:28-31`, `packages/flux-core/src/constants.ts:12-26`, `docs/references/flux-json-conventions.md:123-130`
- **行号范围**: `apps/playground/src/component-lab/renderers/form-lab-page.tsx:28-31`
- **证据片段**:
  ```ts
        ],
        actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submit' } }],
      },
    ],
  };
  ```
- **严重程度**: P2
- **冲突名称**: `submitForm` vs `submit`
- **冲突位置**: `docs/references/flux-json-conventions.md:129` 把当前表单提交的 authoring 约定定义为 `{ action: 'submitForm' }`，`docs/references/action-payload-matrix.md:57` 也明确 `submitForm` 是 canonical baseline、`submit` 只是 compatibility alias；但 `apps/playground/src/component-lab/renderers/form-lab-page.tsx:30` 以及大量 component-lab 示例继续使用 `action: 'submit'`，同时 `packages/flux-core/src/constants.ts:24-25` 仍把 `submit` 与 `submitForm` 并列在 built-in action 名称集合中。
- **统一建议**: 将新示例、component-lab schemas 和非兼容性测试统一改为 `submitForm`；保留 `submit` 时仅在 action dispatcher 的兼容测试或迁移说明中覆盖，并在常量/文档中标注 alias 地位，避免把它作为等价正式 selector 继续传播。
- **现状**: 当前代码路径仍把 `submit` 作为 built-in selector 识别，action dispatcher 也将其与 `submitForm` 走同一分支；这本身可作为兼容层保留，但 live playground 是面向作者的示例入口，继续把 `submit` 当正常写法展示。
- **风险**: 新 schema 作者会从 component-lab 复制 `submit`，导致正式文档的 `submitForm` 与活示例的 `submit` 长期分裂；后续收敛 built-in action 列表、action shape validation 或 xui:actions 命名解析时，也会继续被 alias 用例牵制。
- **为什么值得现在做**: 这不是局部变量命名差异，而是 author-visible action selector 双词汇；现有替换成本低，且 v1 / 无兼容负担基线不应让兼容 alias 继续占据新示例主路径。
- **误报排除**: `docs/references/action-payload-matrix.md:57` 明确承认 `submit` 是 compatibility alias，因此报告目标不是要求立刻删除所有兼容处理，而是指出 live 示例和非兼容性测试仍在教学 alias；这不同于 archive/experiments 中的历史文本，也不同于 component handle 的正式 `component:submit`。
- **历史模式对应**: 命中 `docs/references/deep-audit-calibration-patterns.md` 的 V1 Override：兼容 alias 在主 authoring 示例中继续出现时不能仅以“兼容层”降级为无问题。
- **参考文档**: `docs/references/flux-json-conventions.md:123-130`, `docs/references/action-payload-matrix.md:52-58`, `docs/architecture/action-scope-and-imports.md:486-487`, `docs/references/deep-audit-calibration-patterns.md:21-28`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度17-03] `setValues` 正式写入基准字段是 `args.path`，但运行时仍把 `targetId` 当路径 fallback

- **文件**: `packages/flux-runtime/src/action-adapter.ts:98-106`, `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts:556-580`, `docs/references/action-payload-matrix.md:63-64`, `docs/references/flux-json-conventions.md:137-141`
- **行号范围**: `packages/flux-runtime/src/action-adapter.ts:98-106`
- **证据片段**:

  ```ts
          const basePath =
            typeof invocation.args?.path === 'string'
              ? invocation.args.path
              : invocation.targeting.targetId;

          const resolvedValues = basePath
            ? Object.fromEntries(
                Object.entries(values).map(([targetPath, val]) => [`${basePath}.${targetPath}`, val]),
  ```

- **严重程度**: P2
- **冲突名称**: `args.path` vs `targetId`
- **冲突位置**: `docs/references/action-payload-matrix.md:63-64` 将 `setValue` / `setValues` 定义为 current-scope write，targeting 为 none；`docs/references/flux-json-conventions.md:137-141` 又记录 `setValues` 兼容读取 `targetId` 作为基准路径 fallback；运行时 `action-adapter.ts:98-101` 仍实际消费 `invocation.targeting.targetId`，并由 `action-adapter.unit.test.ts:556-580` 固化该行为。
- **统一建议**: 在 v1 / 无兼容负担基线下，将 `setValues` 写入基准路径收敛为仅 `args.path`；删除 `targetId` fallback 与对应测试，或仅在离线迁移说明中记录旧 schema 转换规则，避免把 targeting 字段继续复用为数据路径字段。
- **现状**: `targetId` 同时是 action targeting 字段族的一员，也是 `refreshSource` 的正式 runtime-entry 目标字段；但 `setValues` 运行时仍把它解释为数据写入 base path，造成同一字段在不同 built-in action 中语义分裂。
- **风险**: schema 作者和后续维护者会继续把 `targetId` 理解成通用“写入目标路径”，削弱 `args.path` 的唯一性；后续做 action shape validation、payload/targeting 分离或 component-targeted write 收敛时，需要保留额外分支解释 `targetId`，增加迁移和诊断成本。
- **为什么值得现在做**: 这不是局部变量命名问题，而是 author-visible ActionSchema 字段边界混用；现有 canonical 写法已经存在，删除 fallback 的修改面集中且能立即消除 `path` / `targetId` 双词汇。
- **误报排除**: `targetId` 作为 `refreshSource` 目标字段本身是正式契约，本条不要求移除该用途；问题只在于 `setValues` 把 targeting 字段复用成写入路径 fallback。虽然 `flux-json-conventions.md` 显式写了兼容读取，但当前审计基线为 v1 / 无兼容负担，不能仅以 compatibility fallback 豁免主路径双词汇。
- **历史模式对应**: 命中 `docs/references/deep-audit-calibration-patterns.md` 的 V1 Override；与既有 `dataPath` / `path` 问题同属写入路径字段兼容残留，但当前条目是独立的 `targetId` targeting-vs-path 语义冲突。
- **参考文档**: `docs/references/action-payload-matrix.md:63-64`, `docs/references/action-payload-matrix.md:136-147`, `docs/references/flux-json-conventions.md:137-141`, `docs/skills/deep-audit-prompts.md:1573-1576`
- **复核状态**: 未复核

### [维度17-04] `closeSurface` 已是 surface 关闭正式基线，但 component-lab 继续教学 `closeDialog` / `closeDrawer` alias

- **文件**: `apps/playground/src/component-lab/renderers/dialog-lab-page.tsx:10-18`, `apps/playground/src/component-lab/renderers/drawer-lab-page.tsx:17-20`, `docs/architecture/flux-core.md:147-154`, `docs/architecture/action-scope-and-imports.md:480-482`
- **行号范围**: `apps/playground/src/component-lab/renderers/dialog-lab-page.tsx:10-18`
- **证据片段**:
  ```ts
        onClick: {
          action: 'openDialog',
          args: {
            title: 'Example Dialog',
            body: [
              { type: 'text', text: 'This is the dialog body content.' },
              { type: 'text', text: 'Dialogs support body and actions regions.' },
            ],
            actions: [{ type: 'button', label: 'Close', onClick: { action: 'closeDialog' } }],
  ```
- **严重程度**: P2
- **冲突名称**: `closeSurface` vs `closeDialog` / `closeDrawer`
- **冲突位置**: `docs/architecture/flux-core.md:153` 明确要求 active docs 和 new schema 使用 `closeSurface`；`docs/architecture/action-scope-and-imports.md:482` 也规定 new schema should prefer `closeSurface`，`closeDialog` / `closeDrawer` 只是 compatibility aliases；但 live component-lab 的 dialog/drawer 示例仍在面向作者的 schema 中使用 `closeDialog` 和 `closeDrawer`。
- **统一建议**: 将 `apps/playground/src/component-lab/renderers/dialog-lab-page.tsx` 与 `drawer-lab-page.tsx` 中的新示例全部改为 `{ action: 'closeSurface' }`；只在专门的兼容测试或迁移说明中保留 `closeDialog` / `closeDrawer`。
- **现状**: playground component-lab 是活示例入口，用户会直接复制其中 schema；当前示例同时使用 canonical `openDialog` / `openDrawer` 和 legacy close alias，形成“打开动作已收敛、关闭动作仍分裂”的术语不一致。
- **风险**: 新 schema 会继续传播 `closeDialog` / `closeDrawer`，使 surface-family close vocabulary 长期无法收敛；后续收窄 built-in action 名称集合、文档示例校验或 surface owner 语义时，兼容 alias 会被活示例重新固化。
- **为什么值得现在做**: 这不是历史 archive 文本，也不是内部测试专用 alias；component-lab 是当前 playground authoring 样例，替换成本低且能直接减少新代码复制旧词汇。
- **误报排除**: 本条不要求删除运行时兼容 alias，也不否认 `closeDialog` / `closeDrawer` 当前仍可执行；问题在于 active authoring 示例继续教学 alias，违反当前 owner docs 对“new schema should prefer `closeSurface`”的命名基线。
- **历史模式对应**: 命中 `docs/references/deep-audit-calibration-patterns.md` 的 V1 Override；兼容 alias 出现在 live playground 主路径时不能仅以“仍支持兼容”降级为无问题。
- **参考文档**: `docs/architecture/flux-core.md:147-154`, `docs/architecture/action-scope-and-imports.md:480-482`, `docs/architecture/surface-owner.md:258`, `docs/references/deep-audit-calibration-patterns.md:21-28`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度17-05] `refreshSource` 的正式目标字段是 `targetId`，但 runtime adapter DTO 与测试继续使用 `sourceId`

- **文件**: `packages/flux-runtime/src/action-adapter.ts:300-315`, `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts:234-248`, `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:194-205`, `docs/references/action-payload-matrix.md:62`, `docs/references/flux-json-conventions.md:154-160`
- **行号范围**: `packages/flux-runtime/src/action-adapter.ts:300-315`
- **证据片段**:

  ```ts
        case 'refreshSource': {
          const sourceId =
            typeof invocation.args?.sourceId === 'string' ? invocation.args.sourceId : undefined;
          if (!sourceId) {
            return { ok: false, error: new Error('refreshSource requires sourceId') };
          }

          const refreshed = await runtime.refreshDataSource({
            id: sourceId,
            scope: ctx.scope,
          });
  ```

- **严重程度**: P2
- **冲突名称**: `targetId` vs `sourceId`
- **冲突位置**: `docs/references/action-payload-matrix.md:62`、`docs/references/flux-json-conventions.md:154-160`、`docs/architecture/action-scope-and-imports.md:644,789` 都把 `refreshSource` 的 author-visible targeting 字段定义为 `targetId`；但 `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:194-205` 在跨包调用 runtime adapter 时把 `targetId` 改名成 `args.sourceId`，`packages/flux-runtime/src/action-adapter.ts:300-315` 和 `action-adapter.unit.test.ts:239-245` 又把 `sourceId` 固化成 runtime adapter DTO 与错误消息。
- **统一建议**: 保持 `refreshSource` 从 authoring、compiled targeting、runtime adapter invocation 到错误消息都使用 `targetId`；如 runtime 内部需要变量名 `sourceId`，应只在调用 `runtime.refreshDataSource({ id })` 前做局部变量转换，不把 `sourceId` 暴露为 `BuiltInActionInvocation.args` 字段或测试夹具输入。
- **现状**: authoring 层写 `{ action: 'refreshSource', targetId: 'mainData' }` 可以工作，因为 action-core 会把 `action.targeting.targetId` 转成 adapter `args.sourceId`；但跨包 adapter 契约与直接单测已经形成第二套字段名。
- **风险**: 后续维护者在调试 adapter、扩展 `BuiltInActionInvocation`、编写 runtime 级测试或监控错误消息时会认为 `refreshSource` 的目标字段叫 `sourceId`，削弱文档中 `targetId` 作为 runtime-entry targeting 字段的唯一性；一旦新增 action shape validation 或 adapter public test helpers，`sourceId` 可能反向泄露到 authoring 示例。
- **为什么值得现在做**: 这不是局部变量命名风格，而是 `flux-action-core` 到 `flux-runtime` 的 built-in action invocation 边界字段名；修复面集中，且能与既有 `targetId` targeting contract、`refreshSource` 文档和 schema 类型保持一致。
- **误报排除**: 本条不声称当前 schema authoring 必须写 `sourceId`，也不重复 `setValues` 把 `targetId` 当写入路径 fallback 的问题；这里关注的是 `refreshSource` 自己在 runtime adapter DTO 中把正式 targeting 字段重命名为 `sourceId` 并用测试/错误消息固化。
- **历史模式对应**: 对应 `docs/references/deep-audit-calibration-patterns.md` 的 public-boundary vocabulary drift：即使转换发生在内部包边界，只要该边界有共享类型、测试和错误消息，就不应长期保留与 canonical authoring 字段不同的术语。
- **参考文档**: `docs/references/action-payload-matrix.md:62,136-147`, `docs/references/flux-json-conventions.md:154-160`, `docs/architecture/action-scope-and-imports.md:644,789`
- **复核状态**: 未复核

### [维度17-06] Report Designer active docs 仍把 `selection` / `target` 描述为 `selectionTarget` alias，但 live contract 已删除这些名称

- **文件**: `docs/architecture/report-designer/design.md:291-292,417-441`, `docs/architecture/report-designer/config-schema.md:317-318`, `docs/components/report-designer-page/design.md:104-108`, `packages/report-designer-renderers/src/host-data.ts:155-182`, `packages/report-designer-renderers/src/report-designer-manifest.ts:155-158`
- **行号范围**: `docs/architecture/report-designer/design.md:291-292`
- **证据片段**:
  ```md
  - inspector schema 使用固定宿主 scope 读取 canonical `selectionTarget`，并保留 `selection` / `target` 作为兼容 alias，同时读取 `activeSheet`、`meta`
  - `activeCell`、`activeRange` 如需提供，应视为从 `selection` 派生的便利字段，而不是高于 `selection` / `target` 的主契约
  ```
- **严重程度**: P2
- **冲突名称**: `selectionTarget` vs `selection` / `target`
- **冲突位置**: `docs/components/report-designer-page/design.md:107` 与 `docs/architecture/flux-runtime-module-boundaries.md:434` 明确说 `target` / `selection` 不再属于支持的 host projection contract，`packages/report-designer-renderers/src/host-data.ts:155-182` 和 `report-designer-manifest.ts:155-158` 也只发布/声明 `selectionTarget`；但 `docs/architecture/report-designer/design.md:291-292` 与 `docs/architecture/report-designer/config-schema.md:317-318` 仍把 `selection` / `target` 写成兼容 alias。
- **统一建议**: 将 report-designer active architecture/config docs 统一改为只推荐 `selectionTarget`；删除“保留 `selection` / `target` alias”的描述，并把 `activeCell` / `activeRange` 的派生来源表述从 `selection` 改成 `selectionTarget` 或 spreadsheet convenience projection。
- **现状**: live host scope 的 top-level projection 返回 `selectionTarget`，未返回 top-level `selection` / `target`；manifest 也只声明 canonical `selectionTarget`。但两个 active owner docs 仍会引导 inspector schema 作者读取旧 alias。
- **风险**: 新的 inspector/body schema 可能按 active docs 读取 `${target.kind}` 或 `${selection.kind}`，在 live runtime 中得到 `undefined`；后续维护者也会在“aliases removed”和“aliases retained”两套 active 文档之间来回判断，导致 schema contract、manifest 和 docs 继续分裂。
- **为什么值得现在做**: 这是 schema-visible host projection vocabulary，影响 Report Designer inspector authoring；修复只需同步 active docs，不涉及兼容实现成本，却能消除已经完成删除后的残留术语。
- **误报排除**: 不涉及 nested `spreadsheet.selection` 这种 canvas-local projection，也不要求删除 `field-panel` action payload 中名为 `target` 的业务参数；问题限定在 Report Designer host scope 的 top-level current-target 字段 alias。
- **历史模式对应**: 命中既往 `selectionTarget` alias 收敛模式：兼容 alias 已从 live projection/manifest 移除后，active docs 继续传播旧名称，会让已完成的命名收敛在 authoring 侧反向失效。
- **参考文档**: `docs/components/report-designer-page/design.md:104-108`, `docs/architecture/flux-runtime-module-boundaries.md:432-434`, `docs/architecture/report-designer/design.md:417-441`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度17-07] `data-source` 当前规范以 `name` 作为资源身份/发布路径，但 compiler/runtime 公开边界与测试仍以 `id` 作为主刷新身份

- **文件**: `packages/flux-core/src/types/schema.ts:167-177`, `packages/flux-compiler/src/source-compiler.ts:63-80`, `packages/flux-runtime/src/async-data/source-registry.ts:84-90,133-134,337-343`, `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts:19-41`, `docs/references/terminology.md:367-375`
- **行号范围**: `packages/flux-runtime/src/async-data/source-registry.ts:337-343`
- **证据片段**:
  ```ts
  async function refreshDataSource(args: { id: string; scope?: ScopeRef }): Promise<boolean> {
    if (args.scope) {
      const bucket = scopeEntries.get(args.scope.id);
      const entry =
        bucket?.get(args.id) ??
        Array.from(bucket?.values() ?? []).find((candidate) => candidate.name === args.id);
  ```
- **严重程度**: P2
- **冲突名称**: `DataSourceSchema.name` vs runtime/compiler `id`
- **冲突位置**: `docs/references/terminology.md:373-375` 将 `DataSourceSchema` 描述为以 `name` 作为规范 author-visible identity 和默认发布路径；`packages/flux-core/src/types/schema.ts:167-177` 的当前 schema 类型也只在 `BaseDataSourceSchema` 上声明 `name`、`mergeToScope`、`statusPath` 等 data-source 字段。但 `packages/flux-compiler/src/source-compiler.ts:63-80` 的 `compileDataSource(id, schema, ...)` 仍把外部传入 `id` 写入 `CompiledDataSource.id`，而 `name` 只转成 `targetPath`；`packages/flux-runtime/src/async-data/source-registry.ts:84-90,337-343` 的公开 registry API 仍是 `registerDataSource({ id })` / `refreshDataSource({ id })`，并优先用 `bucket.get(args.id)` 命中旧 id，再 fallback 到 `entry.name`；`packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts:19-41` 固化了 `{ id: 'scoped-total', name: 'total' }` 时通过 `refreshDataSource({ id: 'scoped-total' })` 刷新，而不是用规范 `name: 'total'`。
- **统一建议**: 将 data-source 的跨包身份命名收敛到 `name`：`CompiledDataSource`、`registerDataSource`、`refreshDataSource` 和测试夹具的公开/共享参数应使用 `name` 或 `sourceName` 表达规范资源身份；如果内部仍需要 node identity，应明确命名为 `nodeId` / `ownerNodeId`，仅用于 owner/debug，不作为 refresh lookup 的主字段。`refreshSource.targetId` 可以继续作为 action targeting 字段，但其值应明确指向 canonical data-source `name`。
- **现状**: 当前 live code 实际支持两套 identity：运行时 bucket 主键是 `args.id`，`nameIndex` / candidate.name 是 fallback；测试和 runtime API 名称继续把 `id` 放在主路径。作者文档则已经把 data-source 的正常身份/发布路径收敛到 `name`。
- **风险**: 维护者会继续把 data-source 的“可刷新目标”理解为 node/schema `id`，而 schema 作者从文档和 playground 看到的是 `name`。后续做 source registry diagnostics、`refreshSource` 校验、schema 文件验证或跨包 runtime adapter 时，容易出现“targetId 应填 id 还是 name”的二义性；特别是 `id !== name` 时，测试会保护旧 id 路径，削弱 `name` 作为唯一资源身份的收敛。
- **为什么值得现在做**: 这是 schema-visible source identity 与 runtime cross-package API 的术语分裂，不是局部变量风格。已有规范名 `name` 和 fallback 实现都在场，修复主要是重命名/拆分 owner node id 与 source name，可避免 `refreshSource`、source registry 和 DataSourceSchema 后续继续扩大双身份。
- **误报排除**: 本条不重复 `refreshSource targetId/sourceId`：`targetId` 作为 action targeting 字段可保留；问题限定在 `targetId` 所指向的 data-source resource identity 在 registry/compiler/runtime 中被命名为 `id`，并与 `DataSourceSchema.name` 形成双词汇。也不涉及 `dataPath/path`，这里的冲突是资源身份字段 `name` 与 runtime `id`。
- **历史模式对应**: 对应 `docs/references/deep-audit-calibration-patterns.md` 的 public-boundary vocabulary drift；这里的 `id` 不只是内部变量，而是 compiler/runtime/test 共享边界参数名。
- **参考文档**: `docs/references/terminology.md:367-375`, `docs/architecture/api-data-source.md:653-657`, `docs/skills/deep-audit-prompts.md:1573-1576`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度17-08] active Component Lab 仍用 Badge `label` / `variant`，但 live schema contract 已收敛到 `text` / `level`

- **文件**: `apps/playground/src/component-lab/renderers/page-lab-page.tsx:10-22`, `apps/playground/src/component-lab/renderers/tabs-lab-page.tsx:19-25`, `packages/flux-renderers-basic/src/schemas.ts:157-160`, `packages/flux-renderers-basic/src/badge.tsx:6-15`
- **行号范围**: `apps/playground/src/component-lab/renderers/page-lab-page.tsx:10-22`
- **证据片段**:
  ```ts
        body: [
          { type: 'text', text: 'Acme Corp' },
          { type: 'badge', label: 'v2.4.1', variant: 'secondary' },
        ],
      },
    ],
    body: [
      { type: 'text', text: 'Welcome to the team dashboard. Select a section to get started.' },
      {
        type: 'flex',
        body: [
          { type: 'badge', label: 'Active Members: 12' },
          { type: 'badge', label: 'Open Tasks: 5', variant: 'destructive' },
  ```
- **严重程度**: P2
- **冲突名称**: `text` / `level` vs `label` / `variant`
- **冲突位置**: `docs/references/flux-json-conventions.md:197-204` 规定 Badge 使用 `level` 表达语义级别；`packages/flux-renderers-basic/src/schemas.ts:157-160` 的 `BadgeSchema` 只声明 `text` 与 `level`；`packages/flux-renderers-basic/src/badge.tsx:7-15` 实际只读取 `props.props.text` 与 `props.props.level`。但 active Component Lab 的 page/tabs/container/flex/loop/recurse/detail-view 等示例仍大量使用 `label` / `variant`，且 `packages/flux-renderers-basic/src/__tests__/basic-coverage-gaps.test.tsx:62-85` 已用测试证明这些字段会被忽略。
- **统一建议**: 将所有 Flux schema 层 badge authoring 示例统一改为 `{ type: 'badge', text, level }`；只在 UI 组件内部或 `@nop-chaos/ui` shadcn adapter 层保留 `variant`，不要把 UI-level visual variant 反向暴露为 Flux BadgeSchema 字段。
- **现状**: canonical `badge-lab-page.tsx` 已使用 `text` / `level`，但其他 active lab 页面仍传播旧的 `label` / `variant` 写法，导致同一 renderer 在同一个 Component Lab 中有两套互斥词汇。
- **风险**: schema 作者从 live playground 复制 `label` / `variant` 后会得到空 badge 或错误视觉级别；维护者也会误以为 BadgeRenderer 应兼容 `label` / `variant`，从而重新扩大公开 schema surface。
- **为什么值得现在做**: 这是 active authoring 示例与 live renderer contract 的直接命名漂移，且已有测试明确证明旧字段无效；替换成本低，可避免 stale examples 继续制造运行时“看似渲染但内容为空”的误导。
- **误报排除**: 不是要求修改 `@nop-chaos/ui` 的 `Badge` 组件 `variant` prop；问题限定在 Flux JSON `type: 'badge'` schema。`BadgeRenderer` 当前明确只消费 `text` / `level`，所以这不是内部 UI 命名差异。
- **历史模式对应**: 命中 v1 baseline 下 authoring 示例继续传播旧词汇的 public vocabulary drift。
- **参考文档**: `docs/references/flux-json-conventions.md:197-204`, `docs/architecture/variant-vocabulary.md:180-201`, `packages/flux-renderers-basic/src/__tests__/basic-coverage-gaps.test.tsx:62-85`
- **复核状态**: 未复核

### [维度17-09] `showToast` 正式 payload 使用 `args.level`，但 active action-flow 示例继续写 `args.variant`

- **文件**: `apps/playground/src/schemas/action-flow-tree-schema.json:54-60`, `docs/examples/action-flow-tree.md:140-146`, `packages/flux-core/src/types/actions.ts:30-33`, `packages/flux-runtime/src/action-adapter.ts:254-265`
- **行号范围**: `apps/playground/src/schemas/action-flow-tree-schema.json:54-60`
- **证据片段**:
  ```json
  "data": {
    "label": "显示错误",
    "action": "showToast",
    "args": { "message": "保存失败", "variant": "destructive" }
  }
  ```
- **严重程度**: P2
- **冲突名称**: `args.level` vs `args.variant`
- **冲突位置**: `packages/flux-core/src/types/actions.ts:30-33` 定义 `ShowToastActionArgs` 为 `level` / `message`；`packages/flux-runtime/src/action-adapter.ts:254-265` 运行时也只读取 `invocation.args?.level`，且合法值为 `info | success | warning | error`。但 active playground schema 与 `docs/examples/action-flow-tree.md:140-146` 的 showToast 示例仍使用 `args.variant: "destructive"`。
- **统一建议**: 将 showToast 示例统一改为 `args: { message, level: 'error' }` 或省略 level 使用默认 `info`；保留 `variant: 'destructive'` 仅限直接 shadcn `Button` / UI visual variant，不用于 action payload。
- **现状**: 当前 runtime 会忽略 `variant`，因此这些示例看起来像在声明 destructive toast，实际通知级别仍退回默认 `info`。
- **风险**: schema 作者会把 `variant` 当作 showToast 的正式 payload 字段，导致错误/失败提示以默认 info 级别展示；后续维护者也可能为了适配示例而给 `showToast` 再加一套 `variant` alias，扩大 action payload 双词汇。
- **为什么值得现在做**: 这是 active example/playground 中的 action payload 命名漂移，直接影响低代码 authoring 复制路径；修复只需改示例字段名和值，不涉及 runtime 行为变更。
- **误报排除**: `docs/architecture/variant-vocabulary.md:188-189` 明确说明 notification API 使用 `info | success | warning | error`，不应把 visual `danger/destructive` 强行套入通知 API；本条不要求把 notification `error` 改成 visual `danger`。
- **历史模式对应**: 对应 action payload public vocabulary drift；不是 UI visual variant 的内部命名问题。
- **参考文档**: `docs/references/flux-json-conventions.md:100-119`, `docs/references/action-payload-matrix.md:54,88-91`, `docs/architecture/variant-vocabulary.md:188-201`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度17-10] `word-editor-page` active example 仍用旧 dataset 词汇 `sourceType` / `label`，但 live `Dataset` 契约只接受 `type` / `description`

- **文件**: `docs/components/word-editor-page/example.json:16-22`, `packages/word-editor-renderers/src/types.ts:27-28`, `packages/word-editor-core/src/dataset-model.ts:10-15`, `packages/word-editor-core/src/document-io.ts:345-348,366-375`
- **行号范围**: `docs/components/word-editor-page/example.json:16-22`
- **证据片段**:
  ```json
  "datasets": [
    {
      "id": "users",
      "name": "users",
      "label": "Users",
      "sourceType": "static",
  ```
- **严重程度**: P2
- **冲突名称**: `type` / `description` vs `sourceType` / `label`
- **冲突位置**: `packages/word-editor-renderers/src/types.ts:27-28` 把 `word-editor-page.datasets` 公开声明为 `Dataset[]`；`packages/word-editor-core/src/dataset-model.ts:10-15` 的 live `Dataset` 字段是 `id/name/description/type/columns`；`packages/word-editor-core/src/document-io.ts:345-348,366-375` 的 normalize/validate 路径只读取 `record.description` 与 `record.type`。但 active example `docs/components/word-editor-page/example.json:16-22` 仍写 `label` 与 `sourceType`。
- **统一建议**: 将 `word-editor-page` 的公开 example 全部收敛到 live `Dataset` 词汇：使用 `type` 表示数据集来源类型，使用 `description` 表示展示性说明；如果旧字段需要迁移说明，只保留在专门迁移文档，不继续出现在 active example。
- **现状**: 当前 example 复制到 live schema 后，`label` 会被静默忽略，`sourceType` 不会被识别为 `Dataset.type`，而 `normalizeDataset()` 又要求 `type` 存在并合法，导致示例数据集无法按 example 预期进入 runtime。
- **风险**: schema 作者会直接从组件文档 example 复制旧字段，得到“示例能看懂、运行时却无数据集”的错误体验；维护者也会误以为 Word Editor dataset contract 兼容 `sourceType` / `label`，进一步扩大公开词汇面。
- **为什么值得现在做**: 这是 active docs/example 与 live cross-package public type (`@nop-chaos/word-editor-core` → `word-editor-renderers`) 的直接术语漂移，且会影响真实 authoring 复制路径，不是内部变量命名差异。
- **误报排除**: 不是历史讨论稿或测试夹具；`docs/components/word-editor-page/example.json` 是面向作者的 active example，而 `WordEditorPageSchemaInput.datasets` 确实直接走 live `Dataset[]` 契约与 normalize 路径。
- **参考文档**: `docs/components/word-editor-page/design.md:27-40,144`, `docs/architecture/word-editor/design.md:97-100`
- **复核状态**: 未复核

### [维度17-11] `refreshTable` 仍以“表格刷新”词汇暴露在公开面，但 live 行为与当前 authoring 基线已转向 page/source/component owner 入口

- **文件**: `apps/playground/src/pages/fluxBasicPageSchema.json:208-219`, `packages/flux-core/src/types/actions.ts:89-91`, `packages/flux-core/src/constants.ts:12-27`, `packages/flux-runtime/src/action-adapter.ts:292-297`, `docs/architecture/action-scope-and-imports.md:472-487`, `docs/references/flux-json-conventions.md:156-160`
- **行号范围**: `apps/playground/src/pages/fluxBasicPageSchema.json:208-219`
- **证据片段**:
  ```json
  {
    "type": "button",
    "label": "Submit Form",
    "onClick": {
      "action": "component:submit",
      "componentId": "user-form",
      "args": { "method": "post", "url": "/api/users" },
      "then": { "action": "refreshTable" }
  ```
- **严重程度**: P2
- **冲突名称**: `refreshTable` vs `component:refresh` / `refreshSource` / page refresh
- **冲突位置**: `docs/references/flux-json-conventions.md:156-160` 的定向调用矩阵已把实例能力收敛到 `component:<method>`、source/runtime 入口收敛到 `refreshSource + targetId`；`docs/architecture/action-scope-and-imports.md:486-487` 又明确 `refreshTable` 属于“older built-in selectors”，新 schema 应优先使用更窄的 semantic-owner 或 instance-targeted 入口。但 `packages/flux-core/src/types/actions.ts:89-91`、`packages/flux-core/src/constants.ts:12-27` 仍把 `refreshTable` 暴露为正式 built-in action，`apps/playground/src/pages/fluxBasicPageSchema.json:218` 继续面向作者教学该写法，而 `packages/flux-runtime/src/action-adapter.ts:292-297` 的实际行为只是 `ctx.page?.refresh()`。
- **统一建议**: 将 active examples 从 `refreshTable` 收敛到明确 owner 的入口：刷新具体组件用 `component:refresh`，刷新 runtime-owned source 用 `refreshSource`；若必须保留兼容处理，应在类型/文档中把 `refreshTable` 明确降为 legacy page-refresh alias，而不是继续作为面向新 schema 的正式动作名传播。
- **现状**: 当前公开词汇 `refreshTable` 名称看起来指向“表格实例刷新”，但 runtime 实际只触发 page-level `refresh()`；与此同时，owner docs 已开始把更准确的 refresh 入口表述为 component/source 级能力。
- **风险**: schema 作者会误把 `refreshTable` 当作表格或 CRUD 实例的正式刷新动作并继续复制到新 schema；维护者也会在 `refreshTable`（旧名）、`component:refresh`（实例能力）、`refreshSource`（source owner）三套词汇之间长期摇摆，增加 action contract 收敛成本。
- **为什么值得现在做**: 这是 built-in public action 名称与 live owner semantics 之间的公开术语漂移，且已经出现在 active playground 示例中，会直接影响 authoring 入口，而不只是内部实现注释。
- **误报排除**: 本条不是泛泛地要求删除所有旧 built-ins；问题限定在 `refreshTable` 这个名字仍被活示例和 public types 当作正常 authoring 词汇，而 runtime 行为与 owner docs 已表明它并不是精确的当前命名基线。
- **参考文档**: `docs/references/action-payload-matrix.md:61,234-241`, `docs/references/renderer-interfaces.md:280-288`, `docs/architecture/action-scope-and-imports.md:40-48,472-487`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度17-12] Tabs active examples 继续教授 `tabsMode` / `sidePosition`，但组件文档已把 `variant` / `orientation` 视为更贴近正式命名的基线

- **文件**: `apps/playground/src/component-lab/renderers/tabs-lab-page.tsx:50-53,74-77,106-108,131-133,203-221`, `docs/components/tabs/design.md:123-129,451-454`, `docs/components/index.md:267-270`, `packages/flux-renderers-basic/src/schemas.ts:84-87`, `packages/flux-renderers-basic/src/tabs.tsx:90-95,160`
- **行号范围**: `apps/playground/src/component-lab/renderers/tabs-lab-page.tsx:50-53,74-77,106-108,131-133`
- **证据片段**:
  ```ts
      {
        type: 'tabs',
        tabsMode: 'line',
  ```
  ```ts
      {
        type: 'tabs',
        tabsMode: 'sidebar',
        sidePosition: 'left',
  ```
- **严重程度**: P2
- **冲突名称**: `variant` / `orientation` vs `tabsMode` / `sidePosition`
- **冲突位置**: `docs/components/index.md:269-270` 明确要求 renderer 优先沿用 UI primitive 名称如 `orientation` / `variant`；`docs/components/tabs/design.md:128` 又写明前者“更贴近 Flux/UI primitive 命名”，后者只是 live contract 的兼容表达；但 `apps/playground/src/component-lab/renderers/tabs-lab-page.tsx:52,76,107-108,132-133` 的 active lab 仍主要用 `tabsMode` / `sidePosition` 教学，`packages/flux-renderers-basic/src/schemas.ts:84-87` 也继续把两套字段并列暴露为公开 schema。
- **统一建议**: 将 Tabs 的 author-facing 示例优先改成 `variant: 'line'`、`orientation: 'vertical'` 等 primitive-aligned 词汇；若 `sidebar` 确有独立语义，建议收敛为更窄且单义的新正式字段，而不是长期保留 `tabsMode` / `sidePosition` 这一整套并行命名。
- **现状**: live renderer 实际已把 `tabsMode` 映射为 `orientation` / `variant` 内核（`tabs.tsx:90-95,160`），但 public schema、组件文档和 playground 示例仍同时教授两套作者词汇。
- **风险**: schema 作者会继续从 component-lab 复制 `tabsMode` / `sidePosition`，使 Tabs 命名长期停留在“双词汇”状态；后续若想统一到 UI primitive 语言，测试/示例/公开类型都会反向固化旧名。
- **为什么值得现在做**: 这不是内部变量风格，而是面向 schema author 的公开字段命名分叉；当前 Component Lab 同一组件已同时出现 `orientation` 和 `tabsMode`，收敛收益直接且成本低。
- **误报排除**: 本条不否认 `tabsMode` 当前仍可工作，也不重复 `[维度17-08]` 的 Badge `variant` 问题；这里的问题是 Tabs 自己的公开 authoring surface 在 active docs/example 中同时维持 primitive-aligned 与 legacy-mode 两套命名。
- **参考文档**: `docs/components/index.md:267-270`, `docs/components/tabs/design.md:123-129,451-454`
- **复核状态**: 未复核

## 深挖第 9 轮追加

### [维度17-13] CRUD 正式作者字段已收敛到 `listActions`，但 live schema 仍把 `bulkActions` 暴露为 `toolbarLayout` 公共块名

- **文件**: `packages/flux-renderers-data/src/crud-schema.ts:63-79`, `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:67-74`, `docs/components/crud/design.md:118-133`, `docs/components/crud/example.json:52-55`
- **行号范围**: `packages/flux-renderers-data/src/crud-schema.ts:63-79`
- **证据片段**:

  ```ts
  export interface CrudToolbarItemConfig extends SchemaObject {
    type?: 'bulkActions' | 'pagination' | 'statistics' | 'switch-per-page' | 'columns-toggler';
    align?: 'left' | 'right';
  }

  export interface CrudToolbarLayoutConfig extends SchemaObject {
    header?: SchemaInput;
    footer?: SchemaInput;
    showPagination?: boolean;
    showStatistics?: boolean;
    showSwitchPerPage?: boolean;
    showBulkActions?: boolean;
  }
  ```

- **严重程度**: P2
- **冲突名称**: `listActions` vs `bulkActions`
- **冲突位置**: `docs/components/crud/design.md:118-133` 明确把依赖 selection 的批量动作收敛进 canonical `listActions`，并写明 `bulkActions` 不再属于支持中的 authoring surface；`docs/components/crud/example.json:52-55` 的 live 示例也只使用 `toolbarLayout.header: ["listActions", "pagination"]`。但 `packages/flux-renderers-data/src/crud-schema.ts:64,78` 仍把 `bulkActions` / `showBulkActions` 暴露为公开 schema 名称，`packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:68-69` 还把 `bulkActions` 与 `listActions` 当同义块处理。
- **统一建议**: 将 CRUD 的 toolbar public vocabulary 收敛为 `listActions`：`CrudToolbarItemConfig.type` 只保留 `listActions`，布尔开关改为 `showListActions`；若需要兼容旧输入，只在编译期迁移或专门兼容层中处理，不继续把 `bulkActions` 保留在 live `CrudSchema` 公开类型与 renderer 主路径。
- **现状**: CRUD 顶层 authoring 字段已经拒绝 `bulkActions`，但同一组件的 `toolbarLayout` 子契约仍公开 `bulkActions` / `showBulkActions`，形成“主字段已收敛、布局块名仍沿用旧词汇”的双命名面。
- **风险**: schema 作者和后续维护者会误以为 CRUD 仍正式支持 `bulkActions` 这一套命名，只是位置从顶层挪到了 `toolbarLayout`；后续做 schema 校验、文档生成、低代码编辑器提示或迁移脚本时，也会被这套残留块名继续牵制。
- **为什么值得现在做**: 这属于 live public/schema-visible 命名漂移，不是内部变量风格；修复面集中在 CRUD toolbar schema 与 block 解析，能直接消除同一组件内 `listActions`/`bulkActions` 并存的作者词汇。
- **误报排除**: 本条不重复“AMIS 迁移输入可以出现 `bulkActions`”这一历史映射，也不质疑 migration example 中的旧字段展示；问题限定在 live `CrudSchema` 与 toolbar renderer 当前仍把 `bulkActions` 当公开可写块名，而 owner docs 已把 canonical authoring surface 收敛到 `listActions`。
- **历史模式对应**: 属于 public/schema-visible vocabulary drift；与前面 action alias 类问题同类，但这是 CRUD 自身公开布局块名的独立残留，不是已有条目的近邻变体。
- **参考文档**: `docs/components/crud/design.md:118-133,204-212`, `packages/flux-renderers-data/src/data-schema-validation.ts:213-218`
- **复核状态**: 未复核

## 深挖第 10 轮追加

### [维度17-14] Flow Designer toolbar 正式语义字段已收敛到 `intent`，但 active docs/playground 仍教授无效的 `variant`

- **文件**: `apps/playground/src/schemas/workflow-designer-schema.json:752-758`, `docs/components/designer-page/example.json:109-116`, `docs/architecture/flow-designer/config-schema.md:753-770`, `packages/flow-designer-core/src/types.ts:231-239`, `packages/flow-designer-renderers/src/designer-toolbar.tsx:217-222`
- **行号范围**: `apps/playground/src/schemas/workflow-designer-schema.json:752-758`
- **证据片段**:
  ```json
  {
    "type": "button",
    "action": "designer:save",
    "icon": "save",
    "label": "保存",
    "variant": "default",
    "disabled": "${!isDirty}"
  }
  ```
  ```ts
  const variant =
    item.intent === 'danger'
      ? 'destructive'
      : active || item.intent === 'primary'
        ? 'default'
        : 'outline';
  ```
- **严重程度**: P2
- **冲突名称**: `intent` vs `variant`
- **冲突位置**: `packages/flow-designer-core/src/types.ts:231-239` 的 live toolbar button contract 只声明 `intent?: ActionIntent`；`packages/flow-designer-renderers/src/renderer-definitions.ts:141-150` 也只校验 `intent`；`packages/flow-designer-renderers/src/designer-toolbar.tsx:217-222` 渲染时只读取 `item.intent` 决定按钮样式。但 `apps/playground/src/schemas/workflow-designer-schema.json:752-758`、`docs/components/designer-page/example.json:109-116`、`docs/architecture/flow-designer/config-schema.md:753-770` 仍把保存按钮写成 `variant: "default"`。
- **统一建议**: 将 Flow Designer toolbar 的 author-facing schema 统一收敛为 `intent`；保存按钮应写成 `intent: "primary"` 或省略以表达 neutral，而不是继续使用 `variant`。如果 `variant` 仅用于普通 `button` renderer，应明确限定它不属于 `designer-page.toolbar.items[]` 合同。
- **现状**: active 文档与 playground 继续展示 `variant`，但 live toolbar owner 根本不消费该字段；这些示例里的 `variant: "default"` 实际不会进入 toolbar 语义映射。
- **风险**: schema 作者会从活示例复制 `variant`，得到“看起来声明了主按钮样式、实际运行时被忽略”的 toolbar 配置；后续维护者也会误以为 Flow Designer toolbar 与普通 `ButtonSchema` 共用一套样式词汇，重新扩大已收敛的 `intent`/`variant` 双词汇。
- **为什么值得现在做**: 这是当前仍在 docs/playground 主路径上教学的 schema-visible 命名漂移，不是内部变量差异；而且它已从纯命名问题升级为示例配置被 runtime 忽略的真实行为偏差。
- **误报排除**: 不是泛化到所有 `button.variant` 使用。普通 Flux `button` renderer 继续使用 `variant` 是正式契约；问题仅限 `designer-page.toolbar.items[]` 这条 repo-owned toolbar contract，它的正式字段已经是 `intent`。
- **复核状态**: 未复核

## 维度复核结论

- [维度17-01]: 保留 (P2)。`packages/flux-code-editor/src/types.ts:188-194` 仍接受 `dataPath` fallback，`types.test.ts:41-44` 仍用测试固化该 legacy 词汇，而公开约定已经收敛到 `path`。
- [维度17-02]: 保留 (P2)。`apps/playground/src/component-lab/renderers/form-lab-page.tsx:30` 仍在作者示例中教学 `action: 'submit'`，而 `docs/references/flux-json-conventions.md:123-130` 已把 `submitForm` 写为 canonical baseline。
- [维度17-03]: 保留 (P2)。`packages/flux-runtime/src/action-adapter.ts:98-106` 仍在 `setValues` 中把 `invocation.targeting.targetId` 当写入基准路径 fallback，继续与 `args.path` 的正式词汇并存。
- [维度17-04]: 保留 (P2)。`apps/playground/src/component-lab/renderers/dialog-lab-page.tsx:18` 与 `drawer-lab-page.tsx:17-20` 仍在新示例里使用 `closeDialog` / `closeDrawer`，没有收敛到 `closeSurface`。
- [维度17-05]: 保留 (P2)。`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts` 到 `packages/flux-runtime/src/action-adapter.ts:125-134,300-315` 的 adapter DTO 仍以 `sourceId` 命名 refreshSource 目标，与 author-facing `targetId` 继续分裂。
- [维度17-06]: 驳回。事实本身成立，但与 [维度16-14] 指向同一 Report Designer host projection alias 漂移；最终汇总按文档-代码契约问题保留，不再在命名维度重复计数。
- [维度17-07]: 保留 (P2)。`packages/flux-runtime/src/async-data/source-registry.ts:337-343` 的 refresh lookup 与 compiler/runtime 共享边界仍以 `id` 为主、`name` 为 fallback，继续与 `DataSourceSchema.name` 的资源身份词汇并存。
- [维度17-08]: 保留 (P2)。`apps/playground/src/component-lab/renderers/page-lab-page.tsx:10-25` 等 active labs 仍大量使用 Badge 的 `label` / `variant`，而 live `BadgeSchema` 与 renderer 已只消费 `text` / `level`。
- [维度17-09]: 保留 (P2)。`apps/playground/src/schemas/action-flow-tree-schema.json:57-59` 仍用 `showToast.args.variant = 'destructive'`，但 `packages/flux-core/src/types/actions.ts:30-33` 与 runtime adapter 只识别 `level`。
- [维度17-10]: 保留 (P2)。`docs/components/word-editor-page/example.json:16-22` 仍用 `sourceType` / `label`，而 live `Dataset` contract 已收敛到 `type` / `description`。
- [维度17-11]: 保留 (P2)。`apps/playground/src/pages/fluxBasicPageSchema.json:291-295` 仍教学 `refreshTable`，runtime 也仍把它保留在 built-in action 名称集合中，但当前 owner docs 已把新写法收敛到 component/source/page 更窄入口。
- [维度17-12]: 保留 (P2)。`apps/playground/src/component-lab/renderers/tabs-lab-page.tsx:50-53,74-77,106-108,131-133` 仍主要教学 `tabsMode` / `sidePosition`，没有向 `variant` / `orientation` 的 primitive-aligned 词汇收敛。
- [维度17-13]: 保留 (P2)。`packages/flux-renderers-data/src/crud-schema.ts:63-79` 与 `crud-renderer-toolbar.tsx:67-74` 仍把 `bulkActions` / `showBulkActions` 暴露在 live toolbar public vocabulary 中，而 owner docs 已收敛到 `listActions`。
- [维度17-14]: 保留 (P2)。`apps/playground/src/schemas/workflow-designer-schema.json:752-758`、`docs/components/designer-page/example.json:109-116` 与 `docs/architecture/flow-designer/config-schema.md:753-770` 仍用 `variant` 教学 Flow Designer toolbar item，但 live contract 只消费 `intent`。

## 子项复核结论

- [维度17-01] 至 [维度17-05]: 成立 (P2)。运行时/示例主路径仍在传播 legacy action/path/source 词汇。
- [维度17-06]: 驳回。与 [维度16-14] 属同一 Report Designer host projection alias 根因，不再重复计数。
- [维度17-07] 至 [维度17-14]: 成立 (P2)。资源身份、badge/showToast、dataset、refresh、tabs、CRUD、designer toolbar 等作者词汇仍未收敛。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                        | 一句话摘要                                                        |
| ----- | -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 17-01 | P2       | `packages/flux-code-editor/src/types.ts:188-194`                                            | code-editor source ref 仍接受 `dataPath` fallback                 |
| 17-02 | P2       | `apps/playground/src/component-lab/renderers/form-lab-page.tsx:30`                          | live 示例仍教学 `submit` alias                                    |
| 17-03 | P2       | `packages/flux-runtime/src/action-adapter.ts:98-106`                                        | `setValues` 仍把 `targetId` 当写入基准路径 fallback               |
| 17-04 | P2       | `apps/playground/src/component-lab/renderers/dialog-lab-page.tsx:18`                        | dialog/drawer 示例仍教学 `closeDialog/closeDrawer` alias          |
| 17-05 | P2       | `packages/flux-runtime/src/action-adapter.ts:300-315`                                       | refreshSource runtime adapter DTO 仍用 `sourceId` 命名目标        |
| 17-07 | P2       | `packages/flux-runtime/src/async-data/source-registry.ts:337-343`                           | data-source 资源身份在 runtime/compiler 边界仍以 `id` 为主        |
| 17-08 | P2       | `apps/playground/src/component-lab/renderers/page-lab-page.tsx:10-25`                       | active labs 仍传播 Badge 的 `label/variant` 旧词汇                |
| 17-09 | P2       | `apps/playground/src/schemas/action-flow-tree-schema.json:57-59`                            | showToast 示例仍用 `args.variant` 而非 `args.level`               |
| 17-10 | P2       | `docs/components/word-editor-page/example.json:16-22`                                       | Word Editor dataset active example 仍用 `sourceType/label`        |
| 17-11 | P2       | `apps/playground/src/pages/fluxBasicPageSchema.json:291-295`                                | live 示例仍教学 `refreshTable` 旧词汇                             |
| 17-12 | P2       | `apps/playground/src/component-lab/renderers/tabs-lab-page.tsx:50-53,74-77,106-108,131-133` | Tabs active examples 仍主要教学 `tabsMode/sidePosition`           |
| 17-13 | P2       | `packages/flux-renderers-data/src/crud-schema.ts:63-79`                                     | CRUD toolbar public vocabulary 仍暴露 `bulkActions`               |
| 17-14 | P2       | `apps/playground/src/schemas/workflow-designer-schema.json:752-758`                         | Flow Designer toolbar active docs/playground 仍教学无效 `variant` |
