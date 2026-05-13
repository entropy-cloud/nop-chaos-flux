import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StructuralLoopProvider } from '../structural-loop-provider.js';
import { useStructuralLoopContext } from '../hooks.js';

describe('StructuralLoopProvider', () => {
  it('publishes structural loop context through the stable flux-react entry', () => {
    function Probe() {
      const context = useStructuralLoopContext();
      return <span data-testid="loop-depth">{String(context?.depth ?? -1)}</span>;
    }

    render(
      <StructuralLoopProvider
        value={{
          bindings: { itemName: 'item', indexName: 'index', keyName: undefined },
          itemData: undefined,
          evaluateItemData: undefined,
          keyBy: 'id',
          instancePath: [],
          depth: 2,
          renderBody: () => null,
        }}
      >
        <Probe />
      </StructuralLoopProvider>,
    );

    expect(screen.getByTestId('loop-depth').textContent).toBe('2');
  });
});
