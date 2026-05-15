# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] 多个包的 CSS 子路径导出未统一采用 `types + default` 双条件导出

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\flux-bundle\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\theme-tokens\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\ui\package.json`
  - `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\package.json`
- **证据片段**:

  ```json
  // C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\package.json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./designer-theme.css": {
      "default": "./dist/designer-theme.css"
    }
  }
  ```

  ```json
  // C:\can\nop\nop-chaos-flux\packages\ui\package.json
  "exports": {
    "./lib/utils": {
      "types": "./dist/lib/utils.d.ts",
      "default": "./dist/lib/utils.js"
    },
    "./base.css": "./dist/styles/base.css",
    "./styles.css": "./dist/styles/index.css"
  }
  ```

- **严重程度**: P3
- **现状**: JS/TS 入口大多使用了统一的 `types + default` 对象导出，但 10 个包的 CSS 子路径导出仍混用字符串简写或仅 `default` 条件对象，导出形状不一致。
- **风险**: 增加包发布面和工具链假设的不一致性；后续若有针对 `exports` 形状的自动检查、清单生成、打包适配或 facade 收口脚本，容易出现例外分支。
- **建议**: 明确仓库规则：CSS 导出究竟是允许例外，还是也必须收敛为统一对象形状；若不允许例外，应把这些子路径统一为同一种显式导出约定，并同步补充文档/门禁。
- **为什么值得现在做**: 这是低成本的包边界整洁度问题；当前受影响面集中在 manifest，收敛窗口小，后续继续扩散会放大治理成本。
- **误报排除**: 这不是对允许的 `renderers -> flux-core/flux-formula/flux-runtime` 公开 API 依赖的误报；`docs/references/audit-tooling.md` 也没有覆盖 `exports` 形状一致性的现有硬门禁；问题直接存在于 manifest 文本本身。
- **历史模式对应**: 对应 calibration pattern #10（跨包一致性类问题默认降级），但本例保留为真实 public package surface 上的低严重度问题。
- **参考文档**: `docs/references/audit-tooling.md`、`docs/references/deep-audit-calibration-patterns.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`AGENTS.md`
- **复核状态**: 未复核

## 依赖图与初审摘要

### 完整依赖图

- `@nop-chaos/flow-designer-core` -> `@nop-chaos/flux-core`
- `@nop-chaos/flow-designer-renderers` -> `@nop-chaos/flow-designer-core`, `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-action-core` -> `@nop-chaos/flux-compiler`, `@nop-chaos/flux-core`
- `@nop-chaos/flux` -> `peer:@nop-chaos/ui`
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

### 违规清单

- 本轮确认问题：`exports` 形状不一致（见 `[维度01-01]`）。
- 本轮未确认问题：未发现 `@nop-chaos/.../src/...` 内部路径 import、未发现 manifest 图循环依赖、未发现缺失 `tsconfig.build.json`、未发现缺失 `build` 脚本、未发现 `flux-react -> renderers` 依赖、未发现 `*-core -> *-renderers` 反向依赖、未发现 `spreadsheet-core -> report-designer-core`、未发现 `ui` 依赖未文档支撑的内部运行时包、未发现 `tailwind-preset` / `theme-tokens` 依赖运行时包。

### 合规包清单

- `packages/flow-designer-core/package.json`
- `packages/flux-action-core/package.json`
- `packages/flux-compiler/package.json`
- `packages/flux-core/package.json`
- `packages/flux-formula/package.json`
- `packages/flux-i18n/package.json`
- `packages/flux-renderers-basic/package.json`
- `packages/flux-renderers-data/package.json`
- `packages/flux-renderers-form-advanced/package.json`
- `packages/flux-runtime/package.json`
- `packages/nop-debugger/package.json`
- `packages/report-designer-core/package.json`
- `packages/spreadsheet-core/package.json`
- `packages/tailwind-preset/package.json`
- `packages/word-editor-core/package.json`

### 总结评估

- 本轮维度 01 初审结果：1 项 P3 发现。
- 内部依赖图整体清晰，未见循环依赖迹象。
- 代码 import 扫描未发现跨包私有路径或 `src` 子路径耦合。
- 当前最明确的边界层问题不在依赖方向，而在 package public surface 的 `exports` 形状一致性。

## 深挖第 2 轮追加

### [维度01-02] `@nop-chaos/flux` 的“默认渲染器栈”未纳入 `flux-renderers-form-advanced`，导致 host 边界文档与实际可用能力脱节

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-bundle\src\index.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\index.tsx`
  - `C:\can\nop\nop-chaos-flux\apps\playground\src\App.tsx`
  - `C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md`
  - `C:\can\nop\nop-chaos-flux\docs\plans\253-flux-host-facing-facade-package-and-release-integration-plan.md`
- **证据片段**:

  ```ts
  // packages/flux-bundle/src/index.tsx
  export function registerDefaultFluxRenderers(
    registry: FluxRendererRegistry,
  ): FluxRendererRegistry {
    const resolvedRegistry = asRendererRegistry(registry);
    registerBasicRenderers(resolvedRegistry);
    registerFormRenderers(resolvedRegistry);
    registerDataRenderers(resolvedRegistry);
    return registry;
  }
  ```

  ```ts
  // packages/flux-renderers-form-advanced/src/index.tsx
  export const formAdvancedRendererDefinitions: RendererDefinition[] = [
    ...treeControlRendererDefinitions,
    tagListRendererDefinition,
    keyValueRendererDefinition,
    arrayEditorRendererDefinition,
    conditionBuilderRendererDefinition,
    objectFieldRendererDefinition,
    arrayFieldRendererDefinition,
    variantFieldRendererDefinition,
    detailFieldRendererDefinition,
    detailViewRendererDefinition,
  ];
  ```

  ```ts
  // apps/playground/src/App.tsx
  const registry = createDefaultRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerFormAdvancedRenderers(registry);
  registerDataRenderers(registry);
  ```

- **严重程度**: P2
- **现状**: facade 文档把 `@nop-chaos/flux` 描述为 host 的默认入口，并明确说 ordinary page rendering 不应再直接依赖内部 `flux-renderers-*` 包；但 facade 的默认注册只包含 `basic + form + data`，未包含 `form-advanced`。仓库自己的 playground 仍需手动额外注册 `registerFormAdvancedRenderers(...)`。
- **风险**: 使用 facade 的外部 host 会在 `condition-builder`、`object-field`、`array-field`、`variant-field`、`detail-view`、`tree-select` 等 schema 上出现“默认入口不可用”，随后被迫回退到直接导入内部包，等于把已声明的 host 边界重新打穿。
- **建议**: 若这些高级表单渲染器属于 ordinary page rendering，应把 `flux-renderers-form-advanced` 纳入 facade 默认栈；若仍是显式 opt-in，则需同步收窄 owner 文档和 facade 说明，明确默认栈的真实覆盖边界。
- **为什么值得现在做**: 这是 facade 边界的实质性契约问题，不是风格一致性问题；继续放任会让 host 文档、示例接入路径、真实可渲染 schema 集合长期分叉。
- **误报排除**: 这不是 calibration pattern #2 的允许依赖形态，也不是 pattern #10 的纯一致性建议；这里有明确 owner-doc 断言、明确 facade API、明确遗漏的 live renderer 集合，以及 playground 仍需绕回内部包的现实证据。
- **历史模式对应**: 不属于已记录的 reopened adjudication；属于 host-facing facade 合同与实际默认能力不一致的 live defect。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/audit-tooling.md`、`docs/references/deep-audit-calibration-patterns.md`、`docs/plans/253-flux-host-facing-facade-package-and-release-integration-plan.md`、`AGENTS.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度01-01]：降级为 P3。当前 live 规则只要求 CSS 子路径正确导向 `dist`，未建立 CSS 导出形状统一的硬契约。
- [维度01-02]：降级为 P2。更准确是 facade 默认覆盖范围说明不够清楚，而不是已证实的包边界 defect。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度无通过独立复核的保留项 |
