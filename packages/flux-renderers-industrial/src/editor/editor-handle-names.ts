/**
 * editor 实例句柄方法名清单（单一声明源；`use-editor-handles.ts` 注册与
 * `editor-core-adapter.ts` domainCommands 声明共同消费，防漂移）。
 */

/** runtime 9 句柄（design-renderer.md §8.5 表；与 runtime `use-scada-handles` 同名集）。 */
export const RUNTIME_HANDLE_METHODS = [
  'fit',
  'center',
  'getSymbols',
  'getSymbol',
  'setPointValue',
  'getPointTable',
  'exportConfig',
  'importConfig',
  'destroy',
] as const;

/**
 * editor 扩展句柄方法名（design-renderer.md §8.5.2）。
 * editor 扩展：addSymbol/removeSymbol/updateSymbol/save/load（M1）+ undo/redo（E7.2）+
 * group/ungroup（E7.2 Phase 3）+ previewInject/previewClear（plan 522 / L5.5，design-renderer.md §13.3）。
 */
export const EDITOR_HANDLE_METHODS = [
  'addSymbol',
  'removeSymbol',
  'updateSymbol',
  'save',
  'load',
  'undo',
  'redo',
  'group',
  'ungroup',
  'previewInject',
  'previewClear',
] as const;

/** editor 实例全部可调句柄（runtime 9 ∪ editor 扩展 11；plan 546 修正 roadmap 旧记 18）。 */
export const ALL_HANDLE_METHODS = [...RUNTIME_HANDLE_METHODS, ...EDITOR_HANDLE_METHODS] as const;
