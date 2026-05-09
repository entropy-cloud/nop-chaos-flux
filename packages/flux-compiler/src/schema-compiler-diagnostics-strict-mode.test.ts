import { describe, expect, it } from 'vitest';
import { createCompiler, openRenderer, strictTextRenderer } from './schema-compiler-diagnostics.test-support.js';

describe('schema compiler diagnostics - strict mode', () => {
  it('reports warning for unknown property on open renderer when strictMode is true', () => {
    const compiler = createCompiler(openRenderer);

    expect(
      compiler.validate?.(
        {
          type: 'open-renderer',
          label: 'Hello',
          lable: 'typo',
        },
        {
          validation: {
            strictMode: true,
          },
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/lable',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('does not report unknown property on open renderer when strictMode is false', () => {
    const compiler = createCompiler(openRenderer);

    expect(
      compiler.validate?.(
        {
          type: 'open-renderer',
          label: 'Hello',
          lable: 'typo',
        },
        {
          validation: {
            strictMode: false,
          },
        },
      ),
    ).toEqual([]);
  });

  it('reports error for unknown property on closed renderer when strictMode is true', () => {
    const compiler = createCompiler(strictTextRenderer);

    expect(
      compiler.validate?.(
        {
          type: 'strict-text',
          text: 'Hello',
          txt: 'typo',
        },
        {
          validation: {
            strictMode: true,
          },
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown-property',
          path: '/txt',
          severity: 'error',
        }),
      ]),
    );
  });

  it('does not report unknown property on open renderer when strictMode is not set', () => {
    const compiler = createCompiler(openRenderer);

    expect(
      compiler.validate?.({
        type: 'open-renderer',
        label: 'Hello',
        lable: 'typo',
      }),
    ).toEqual([]);
  });
});
