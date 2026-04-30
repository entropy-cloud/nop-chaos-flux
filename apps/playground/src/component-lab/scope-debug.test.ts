import { describe, expect, it } from 'vitest';
import { attachScopeDebugToSchema } from './scope-debug';

describe('attachScopeDebugToSchema', () => {
  it('injects scope-debug into the first top-level form body before falling back to page body', () => {
    const schema = {
      type: 'page',
      body: [
        {
          type: 'form',
          body: [
            {
              type: 'detail-view',
              name: 'summary',
            },
          ],
        },
      ],
    } as const;

    const result = attachScopeDebugToSchema(schema as any, 'Current Scope') as any;

    expect(result.body).toHaveLength(1);
    expect(result.body[0].type).toBe('form');
    expect(result.body[0].body).toHaveLength(2);
    expect(result.body[0].body[1]).toMatchObject({
      type: 'scope-debug',
      title: 'Current Scope',
    });
  });

  it('injects scope-debug directly into form schemas', () => {
    const schema = {
      type: 'form',
      body: [
        {
          type: 'input-text',
          name: 'title',
        },
      ],
    } as const;

    const result = attachScopeDebugToSchema(schema as any, 'Form Scope') as any;

    expect(result.body).toHaveLength(2);
    expect(result.body[1]).toMatchObject({
      type: 'scope-debug',
      title: 'Form Scope',
    });
  });
});
