import { describe, expect, it } from 'vitest';
import { createCompiler, eventRenderer, pageRenderer } from './schema-compiler-host-action-validation.test-support.js';

describe('componentName targeting removal (2026-08-11-1929-3 Phase 2)', () => {
  it('rejects legacy componentName targeting with invalid-action-shape and a componentId migration hint', () => {
    const compiler = createCompiler(pageRenderer, eventRenderer);

    const diagnostics = compiler.validate?.({
      type: 'page',
      body: [
        {
          type: 'event-text',
          text: 'Hello',
          onClick: { action: 'component:setValue', componentName: 'userForm', args: { name: 123 } },
        },
      ],
    } as any);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-action-shape',
          path: '/body/0/onClick/componentName',
          message: expect.stringContaining('componentId'),
        }),
      ]),
    );
  });

  it('does not reject componentId targeting', () => {
    const compiler = createCompiler(pageRenderer, eventRenderer);

    const diagnostics =
      compiler.validate?.({
        type: 'page',
        body: [
          { type: 'form', id: 'my-form' },
          {
            type: 'event-text',
            text: 'Hello',
            onClick: { action: 'component:setValue', componentId: 'my-form', args: { name: 123 } },
          },
        ],
      } as any) ?? [];

    const componentNameRejections = diagnostics.filter(
      (issue) => issue.path === '/body/1/onClick/componentName',
    );
    expect(componentNameRejections).toEqual([]);
  });
});
