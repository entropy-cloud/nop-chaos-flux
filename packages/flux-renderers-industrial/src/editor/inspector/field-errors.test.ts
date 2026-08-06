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
    // Selecting a group's child — findSymbolIndex recurses into children.
    const result = parseFieldErrors(['symbols[0].fill must be a string'], 'inner', groupConfig);
    expect(result.fill).toBeDefined();
    // Unknown id within group config — findSymbolIndex returns -1 for all symbols.
    const result2 = parseFieldErrors(['symbols[0].fill must be a string'], 'missing', groupConfig);
    expect(result2).toEqual({});
    // Top-level symbol after group — found at index 1.
    const result3 = parseFieldErrors(['symbols[1].fill must be a string'], 'top', groupConfig);
    expect(result3.fill).toBeDefined();
  });
});
