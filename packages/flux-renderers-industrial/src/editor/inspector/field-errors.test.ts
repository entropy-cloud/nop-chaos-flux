import { describe, it, expect } from 'vitest';
import { parseFieldErrors } from './field-errors.js';
import type { ScadaConfig } from '../../serialization/config-types.js';

const config: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    { id: 's1', type: 'scada-rect', x: 0, y: 0, width: 100, height: 100 },
    { id: 's2', type: 'scada-ellipse', x: 0, y: 0, width: 50, height: 50 },
  ],
};

describe('parseFieldErrors', () => {
  it('returns empty map for empty errors', () => {
    expect(parseFieldErrors([], 's1', config)).toEqual({});
  });

  it('returns empty map when no selectedNodeId', () => {
    expect(parseFieldErrors(['some error'], undefined, config)).toEqual({});
  });

  it('maps field-level errors for selected node', () => {
    const errors = ['symbols[0].fill must be a string', 'symbols[0].x must be a finite number'];
    const result = parseFieldErrors(errors, 's1', config);
    expect(result.fill).toBeDefined();
    expect(result.fill[0]).toContain('fill');
    expect(result.x).toBeDefined();
  });

  it('ignores errors for other nodes', () => {
    const errors = ['symbols[1].fill must be a string'];
    const result = parseFieldErrors(errors, 's1', config);
    expect(result).toEqual({});
  });

  it('attributes nested path to top-level field', () => {
    const errors = ['symbols[0].bindings.fill must contain at least one of: point | expression | map | scale | format'];
    const result = parseFieldErrors(errors, 's1', config);
    expect(result.bindings).toBeDefined();
  });

  it('attributes shadow sub-field to shadow field', () => {
    const errors = ['symbols[0].shadow.blur must be a number'];
    const result = parseFieldErrors(errors, 's1', config);
    expect(result.shadow).toBeDefined();
  });

  it('returns empty for unknown nodeId', () => {
    expect(parseFieldErrors(['symbols[0].fill must be a string'], 'nonexistent', config)).toEqual({});
  });

  it('handles group child node selection', () => {
    const groupConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'grp',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'inner', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30 },
          ],
        },
        { id: 'top', type: 'scada-ellipse', x: 0, y: 0, width: 50, height: 50 },
      ],
    };
    // Selecting a group's child — scope path is symbols[0].children[0] (validate.ts real format).
    // plan 2026-08-08-1230-1 Phase 2 / P3-FE-2：先前用 symbols[0].fill（父索引+父字段）是假绿，
    // 现改为真实嵌套格式 symbols[0].children[0].fill（与 P2-FE-1 修复对齐）。
    const result = parseFieldErrors(['symbols[0].children[0].fill must be a string'], 'inner', groupConfig);
    expect(result.fill).toBeDefined();
    // Unknown id within group config — findSymbolIndex returns -1 for all symbols.
    const result2 = parseFieldErrors(['symbols[0].fill must be a string'], 'missing', groupConfig);
    expect(result2).toEqual({});
    // Top-level symbol after group — found at index 1.
    const result3 = parseFieldErrors(['symbols[1].fill must be a string'], 'top', groupConfig);
    expect(result3.fill).toBeDefined();
  });

  // plan 2026-08-08-1230-1 Phase 2 / P2-FE-1（failing-first proof）：嵌套子节点校验错误归因。
  // validate.ts 对 group 子节点产出的 scope path 格式为 `symbols[N].children[M].field`（validate.ts:342）。
  // 先前 findSymbolIndex 对子节点返回父节点顶层索引 → prefix=`symbols[N].` → remainder=`children[M].field`
  // → fieldKey=`children[M]`（不匹配任何 panel 字段）→ 嵌套子节点选中时字段级错误静默丢失。
  it('attributes nested child errors to the correct field (real validate.ts scope path)', () => {
    const groupConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'grp',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            { id: 'inner', type: 'scada-rect', x: 5, y: 5, width: 30, height: 30 },
          ],
        },
      ],
    };
    // validate.ts real format: symbols[0].children[0].<field>
    const errors = [
      'symbols[0].children[0].fill must be a string',
      'symbols[0].children[0].x must be a finite number',
    ];
    const result = parseFieldErrors(errors, 'inner', groupConfig);
    // Error must attribute to the actual field keys, NOT to 'children[0]'.
    expect(result.fill).toBeDefined();
    expect(result.fill[0]).toContain('fill');
    expect(result.x).toBeDefined();
    expect(result['children[0]']).toBeUndefined();
  });

  it('attributes deeply nested (multi-level group) child errors to the correct field', () => {
    const deepConfig: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [
        {
          id: 'outer',
          type: 'scada-group',
          x: 0,
          y: 0,
          children: [
            {
              id: 'inner-group',
              type: 'scada-group',
              x: 0,
              y: 0,
              children: [
                { id: 'leaf', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 },
              ],
            },
          ],
        },
      ],
    };
    // validate.ts real format for depth-2 child: symbols[0].children[0].children[0].<field>
    const errors = ['symbols[0].children[0].children[0].width must be a finite number'];
    const result = parseFieldErrors(errors, 'leaf', deepConfig);
    expect(result.width).toBeDefined();
    expect(result['children[0]']).toBeUndefined();
  });
});
