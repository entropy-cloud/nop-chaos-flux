import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';

const registerReaction = vi.fn(() => ({
  dispose: vi.fn(),
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererRuntime: () => ({ registerReaction }),
  useRenderScope: () => ({ scopeId: 'test-scope' }),
}));

import { ReactionRenderer } from './reaction';

function createProps(): RendererComponentProps<any> {
  return {
    id: 'reaction-node',
    type: 'reaction',
    node: { scope: { scopeId: 'node-scope' } },
    templateNode: {},
    props: {},
    meta: {},
    events: {},
    helpers: {
      dispatch: vi.fn(),
    },
    regions: {},
  } as unknown as RendererComponentProps<any>;
}

describe('ReactionRenderer', () => {
  it('throws when compiled reaction metadata is missing', () => {
    expect(() => render(<ReactionRenderer {...createProps()} />)).toThrow(
      /requires compiledReaction/,
    );
    expect(registerReaction).not.toHaveBeenCalled();
  });
});
