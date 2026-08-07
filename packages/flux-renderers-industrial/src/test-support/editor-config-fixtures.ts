import type { ScadaConfig } from '../serialization/config-types.js';

/** 合法编辑态 config（含 2 个 scada-rect 图元，供 e2e/integration 断言几何字段变化 + group 多选）。 */
export function validEditorConfig(overrides: Partial<ScadaConfig> = {}): ScadaConfig {
  return {
    version: 1,
    variables: [],
    symbols: [
      { id: 'editor-rect', type: 'scada-rect', x: 100, y: 100, width: 120, height: 80, fill: '#1565c0' },
      { id: 'editor-rect-2', type: 'scada-rect', x: 300, y: 200, width: 100, height: 60, fill: '#d32f2f' },
    ],
    ...overrides,
  };
}

/** 空场景 config（author-less 兜底）。 */
export const emptyEditorConfig: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [],
};
