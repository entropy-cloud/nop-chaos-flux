import {
  registerEditorDomain,
  type EditorDomainAdapter,
} from '@nop-chaos/editor-core';
import type { ScadaConfig, ScadaConfigDiff } from '../serialization/config-types.js';
import { diffScadaConfig } from '../serialization/diff.js';
import { serializeScadaConfig } from '../serialization/serialize.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { collectAllSymbols } from './editor-working-helpers.js';
import { ALL_HANDLE_METHODS } from './editor-handle-names.js';
import { applyDiffToConfig } from './undo-redo/compute-inverse.js';

/**
 * SCADA editor 域 adapter（roadmap P1.1，plan 546）：把 SCADA 编辑域接入 editor-core 内核契约。
 *
 * - `diff` = `diffScadaConfig` 的空变更返 null 包装（editor-core diff 契约：结构化相同返回 null）。
 * - `applyDiff` = `applyDiffToConfig`（removed→added→updated→reordered 纯函数）。
 * - 域保留自有 inverse 计算（`computeInverse`）：z-order `reordered` 语义 `diffScadaConfig` 不表达，
 *   内核 `diff(next, prev)` 反演不适用（plan 546 Deferred 裁定的技术事实）。
 * - `domainCommands` = `use-editor-handles.ts` 全量句柄清单（runtime 9 ∪ editor 11 = 20，
 *   roadmap 旧记 18 系 plan 522 增 previewInject/previewClear 前的口径，plan 546 修正）。
 */
export const SCADA_EDITOR_DOMAIN_KIND = 'scada-editor';

/** editor 实例全部可调句柄（单一声明源 `editor-handle-names.ts`；与 `use-editor-handles.ts` 注册同清单）。 */
export const SCADA_EDITOR_DOMAIN_COMMANDS: readonly string[] = ALL_HANDLE_METHODS;

/** diff 是否有变更（与 undo-redo-adapter hasChanges 同规则：含 reordered 增量）。 */
export function hasScadaDiffChanges(diff: ScadaConfigDiff): boolean {
  return (
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.updated.length > 0 ||
    diff.variables !== undefined ||
    (diff.reordered !== undefined && diff.reordered.length > 0)
  );
}

/** 构造 SCADA 编辑域 adapter（editor-core `EditorDomainAdapter` 契约实现）。 */
export function createScadaEditorDomainAdapter(
  initialConfig: ScadaConfig,
): EditorDomainAdapter<ScadaConfig, ScadaConfigDiff> {
  return {
    kind: SCADA_EDITOR_DOMAIN_KIND,
    load: () => initialConfig,
    serialize: (doc) => serializeScadaConfig(doc),
    validate: (doc) => {
      const result = validateScadaConfig(doc);
      return result.ok ? { ok: true } : { ok: false, errors: [...result.errors] };
    },
    diff: (prev, next) => {
      const diff = diffScadaConfig(prev, next);
      return hasScadaDiffChanges(diff) ? diff : null;
    },
    applyDiff: (doc, diff) => applyDiffToConfig(doc, diff),
    getDocumentIds: (doc) => collectAllSymbols(doc.symbols).map((s) => s.id),
    domainCommands: SCADA_EDITOR_DOMAIN_COMMANDS,
  };
}

/**
 * 显式注册 SCADA 编辑域到 editor-core 注册表（kind: 'scada-editor'；重复注册覆盖，
 * editor-core.md §3 裁定）。由消费侧/测试显式调用——不用模块加载 effect
 * （industrial `sideEffects: ["*.css"]` 下加载副作用会被 bundler 摇树剔除）。
 */
export function registerScadaEditorDomain(initialConfig: ScadaConfig): void {
  registerEditorDomain(createScadaEditorDomainAdapter(initialConfig));
}
