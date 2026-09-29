import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../core/config.js';

describe('default toolbar normalization', () => {
  it('supplies undo/redo/save items when toolbar absent', () => {
    const config = normalizeConfig({
      version: '1.0.0',
      kind: 'test',
      nodeTypes: [{ id: 'task', label: 'Task', body: { type: 'text' } }],
    } as never);
    expect(config.toolbar?.items.map((item) => (item.type === 'button' ? item.action : item.type))).toEqual([
      'undo',
      'redo',
      'spacer',
      'save',
    ]);
  });
});
