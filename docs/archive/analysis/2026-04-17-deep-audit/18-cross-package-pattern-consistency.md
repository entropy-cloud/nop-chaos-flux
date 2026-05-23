# 18 跨包模式一致性

- Task ID: `ses_268b24ce3ffewHKs4kxVhQ5fYu`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Calibration note: this file was revised on `2026-04-17` to keep only cross-package differences with concrete contract impact, and to stop treating shared-package reuse or different internal implementation styles as defects by default.

## Verification Audit: 2026-04-17

All issues were re-verified against the live repo. Results below.

# 跨包不一致清单

## 保留的问题

### [维度18] word-editor-renderers 未兑现文档里的 Flux renderer 契约 — ❌ NOT CONFIRMED (audit incorrect)

- **涉及包**: `spreadsheet-renderers` / `report-designer-renderers` / `flow-designer-renderers` vs `word-editor-renderers`
- **文件**: `packages/word-editor-renderers/src/index.ts:1-18` 和 `packages/word-editor-renderers/src/renderers.tsx:1-29`
- **严重程度**: P2
- **不一致类别**: 注册模式
- **原审计描述**: 仅导出 `WordEditorPage`、`EditorCanvas` 等普通 React 组件，没有 `RendererDefinition[]` 和注册入口。
- **验证结果**: **审计有误。** `word-editor-renderers/src/renderers.tsx` 已导出 `wordEditorRendererDefinitions: RendererDefinition[]`（包含 `word-editor-page` 定义）和 `registerWordEditorRenderers(registry)` 注册函数。`src/index.ts` 也公开导出了这些。该包的 Flux renderer 契约履行完整，与其他 renderer 包模式一致。此条应从问题清单中移除。

### [维度18] value-or-region 的 `regionKey` 声明仍有不一致，属于真实契约噪音 — ✅ CONFIRMED, FIXED

- **涉及包**: `flux-renderers-basic` vs `flux-renderers-data`
- **文件**: `packages/flux-renderers-data/src/index.tsx:114-121,137-141,149-158`
- **严重程度**: P2
- **不一致类别**: 注册模式
- **包 A 模式**: `basic` 中 `title` 这类 `value-or-region` 字段统一显式声明 `regionKey`。
- **包 B 模式**: `data` 中 `table.empty`、`tree.empty` 显式写了 `regionKey`，但 `chart.empty` 仅写 `kind: 'value-or-region'`，而组件又在运行期按 slot 解析。
- **验证结果**: 问题确实存在。`chart.empty`（`index.tsx:140`）缺少 `regionKey: 'empty'`，而 `table.empty`（line 121）和 `tree.empty`（line 154）都有。
- **修复**: 已在 `flux-renderers-data/src/index.tsx` 中为 `chart.empty` 补充 `regionKey: 'empty'`。

## 降级为观察项

### renderer 事件透传模式不完全一致

- 这说明包间还有收敛空间，但当前更像风格差异而不是明确缺陷。
- 只有在事件协议已经影响第三方接入、文档或测试稳定性时，才应升级为整改项。

### 用户可见文本的组织方式不一致

- 默认文案集中管理是不错的方向，但当前没有证据表明它已经造成真实 bug 或明显维护障碍。
- 因此不作为当前优先整改项。

## 不应作为问题的差异

### `report-designer-renderers -> spreadsheet-renderers`

- 这是共享公共 spreadsheet renderer/bridge 包的正常复用。
- 不应把这种依赖机械解释为"跨 domain renderer 不一致"或"必须消除的耦合"。

### domain core 的 store 创建方式不同

- `flow-designer-core` 的手写 emitter 与 `spreadsheet-core` / `report-designer-core` 的 `zustand/vanilla` 实现不同，本身不构成问题。
- 只有当这种差异已经造成外部契约混乱、难以维护或无法复用时，才应升级。

### domain bridge 公开形态不同

- Flow Designer 更偏 React context / adapter 组合，Spreadsheet / Report 更偏显式 bridge 接口。
- 这属于实现手法差异，不应为了统一而统一。

## 统一方向建议（仅作为方向，不直接等同整改项）

- 优先统一那些已经进入公共契约、文档契约或 metadata 契约的部分。
- 不要为了内部实现同构而强制把所有 domain core、bridge、store 方案改成同一种写法。
- 共享 renderer/bridge 包的复用关系应优先被文档化和稳定化，而不是先验地被消除。
