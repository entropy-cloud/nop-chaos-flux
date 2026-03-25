import type { ComponentHandle, FormRuntime } from '@nop-chaos/flux-core';

function toPayloadRecord(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  return payload ?? {};
}

export function createFormComponentHandle(form: FormRuntime): ComponentHandle {
  return {
    id: form.id,
    name: form.name,
    type: 'form',
    capabilities: {
      store: form.store,
      hasMethod(method) {
        return ['submit', 'validate', 'reset', 'setValue'].includes(method);
      },
      listMethods() {
        return ['submit', 'validate', 'reset', 'setValue'];
      },
      async invoke(method, payload) {
        const input = toPayloadRecord(payload);

        switch (method) {
          case 'submit':
            return form.submit(input.api as never);
          case 'validate': {
            const result = await form.validateForm();
            return {
              ok: result.ok,
              data: result,
              error: result.ok ? undefined : result.errors
            };
          }
          case 'reset':
            form.reset(input.values as object | undefined);
            return { ok: true };
          case 'setValue':
            form.setValue(String(input.name ?? ''), input.value);
            return { ok: true, data: input.value };
          default:
            return {
              ok: false,
              error: new Error(`Unsupported form method: ${method}`)
            };
        }
      }
    }
  };
}
