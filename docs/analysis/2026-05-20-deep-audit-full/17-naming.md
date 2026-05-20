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
