import type { BaseSchema } from '@nop-chaos/flux-core';

export const COMPONENT_LAB_SCOPE_DEBUG_RENDERER_ID = 'scope-debug';

export function createScopeDebugNode(title: string): BaseSchema {
  return {
    type: COMPONENT_LAB_SCOPE_DEBUG_RENDERER_ID,
    title,
    defaultExpand: false,
    testid: `scope-debug-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  } as BaseSchema;
}

export function attachScopeDebugToSchema(schema: BaseSchema, title: string): BaseSchema {
  if (schema.type === 'form') {
    const formBody = Array.isArray((schema as { body?: BaseSchema[] }).body)
      ? [...((schema as { body?: BaseSchema[] }).body ?? [])]
      : [];

    return {
      ...schema,
      body: [...formBody, createScopeDebugNode(title)]
    } as BaseSchema;
  }

  const pageBody = Array.isArray((schema as { body?: BaseSchema[] }).body)
    ? [...((schema as { body?: BaseSchema[] }).body ?? [])]
    : [];

  const firstFormIndex = pageBody.findIndex((node) => node?.type === 'form');

  if (firstFormIndex >= 0) {
    const targetForm = pageBody[firstFormIndex] as BaseSchema & { body?: BaseSchema[] };
    const targetFormBody = Array.isArray(targetForm.body) ? [...targetForm.body] : [];

    pageBody[firstFormIndex] = {
      ...targetForm,
      body: [...targetFormBody, createScopeDebugNode(title)]
    };

    return {
      ...schema,
      body: pageBody
    } as BaseSchema;
  }

  const body = Array.isArray((schema as { body?: BaseSchema[] }).body)
    ? [...((schema as { body?: BaseSchema[] }).body ?? [])]
    : [];

  return {
    ...schema,
    body: [...body, createScopeDebugNode(title)]
  } as BaseSchema;
}
