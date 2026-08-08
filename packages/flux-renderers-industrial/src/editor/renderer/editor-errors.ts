/**
 * `scada-editor-canvas` 编辑扩展错误码注册表（E5.1/E5.4，design-renderer.md §8.5.2）。
 *
 * 编辑扩展错误码与 runtime `SCADA_ERROR_CODES`（`renderer/scada-errors.ts`）**独立**——
 * 前缀 `industrial.scada.editor.error.<code>`（runtime 为 `industrial.scada.error.<code>`）。
 * runtime 既有码（not-mounted/symbol-not-found/invalid-config）经 runtime 注册表消费，
 * 编辑扩展新增码（invalid-node/duplicate-id/invalid-patch 等）经本注册表消费。
 *
 * **M1 子集**（design-renderer.md §8.5.2 全集剔除 M2 专属码 empty-selection/not-a-group/no-undo/no-redo）：
 * addSymbol/removeSymbol/updateSymbol/save/load 失败路径所需的码在此登记；
 * M2 专属码（group/ungroup/undo/redo）属 E7/E7.2，本文件预留全集常量但 i18n 映射 M1 仅覆盖子集。
 *
 * plan 2026-08-08-1931-2 Phase 4 / P2-8：`editor-internal-error`（mutator applyDiff / undo / redo / 事务
 * commit 失败时由 runtime-factories.syncWorkingCopy + runtime-mutators + undo-redo-adapter 派发）补登 M1 子集
 * ——先前漏登使 scadaEditorErrorI18nKey('editor-internal-error') 走 `.unknown` fallback，host 显示 unknown 文案。
 */
export const SCADA_EDITOR_ERROR_CODES = [
  // M1 子集（addSymbol/removeSymbol/updateSymbol/save/load + applyDiff 内部失败路径）
  'editor-mount-failed',
  'invalid-node',
  'duplicate-id',
  'invalid-patch',
  'invalid-config',
  // plan 2026-08-08-1931-2 Phase 4 / P2-8：mutator applyDiff / undo / redo / 事务 commit 失败派发（runtime-factories + runtime-mutators）。
  'editor-internal-error',
  // M2 子集（group/ungroup/undo/redo 失败路径，E7/E7.2 落地行为；码全集登记，i18n 文案随 M2 落地）
  'empty-selection',
  'not-a-group',
  'no-undo',
  'no-redo',
] as const;

export type ScadaEditorErrorCode = (typeof SCADA_EDITOR_ERROR_CODES)[number];

/**
 * M1 子集错误码——i18n 文案 + 句柄失败路径消费（design-renderer.md §8.5.2）。
 * M2 专属码（empty-selection/not-a-group/no-undo/no-redo）i18n 文案随 E7/E7.2 落地补全。
 */
export const SCADA_EDITOR_ERROR_CODES_M1: readonly ScadaEditorErrorCode[] = [
  'editor-mount-failed',
  'invalid-node',
  'duplicate-id',
  'invalid-patch',
  'invalid-config',
  // plan 2026-08-08-1931-2 Phase 4 / P2-8：applyDiff 失败属 M1 路径（addSymbol/removeSymbol/updateSymbol 的 syncWorkingCopy），i18n 文案与本子集同步落地。
  'editor-internal-error',
];

const EDITOR_I18N_KEY_PREFIX = 'industrial.scada.editor.error';

/**
 * 编辑扩展错误码 → i18n key 映射（独立于 runtime `scadaErrorI18nKey`，design-renderer.md §8.5.2）。
 *
 * 独立映射函数原因：runtime `scadaErrorI18nKey` hardcode 前缀 `industrial.scada.error` +
 * 经 `SCADA_ERROR_CODES` 数组守卫；编辑扩展新增码不在 runtime 数组中，runtime 映射返回 `.unknown` fallback。
 * 故编辑扩展须实现自己的映射（前缀 `industrial.scada.editor.error`）。
 */
export function scadaEditorErrorI18nKey(code: string): string {
  return (SCADA_EDITOR_ERROR_CODES as readonly string[]).includes(code)
    ? `${EDITOR_I18N_KEY_PREFIX}.${code}`
    : `${EDITOR_I18N_KEY_PREFIX}.unknown`;
}

/** runtime 既有码（not-mounted/symbol-not-found/invalid-config）经 runtime 注册表映射。 */
export function isRuntimeErrorCode(code: string): boolean {
  return (
    code === 'not-mounted' ||
    code === 'symbol-not-found' ||
    code === 'invalid-config' ||
    code === 'config-parse' ||
    code === 'config-invalid'
  );
}
