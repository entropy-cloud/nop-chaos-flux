import type { ComponentHandle, FormRuntime } from '@nop-chaos/flux-core';

function toPayloadRecord(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  return payload ?? {};
}

function fail(error: string) {
  return { ok: false as const, error: new Error(error) };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createFormComponentHandle(form: FormRuntime): ComponentHandle {
  return {
    id: form.id,
    name: form.name,
    type: 'form',
    capabilities: {
      store: form.store,
      hasMethod(method) {
        return ['submit', 'validate', 'reset', 'setValue', 'setValues', 'getValues'].includes(
          method,
        );
      },
      listMethods() {
        return ['submit', 'validate', 'reset', 'setValue', 'setValues', 'getValues'];
      },
      async invoke(method, payload) {
        const input = toPayloadRecord(payload);

        switch (method) {
          case 'submit':
            return form.submit({
              interactionId:
                payload && 'interactionId' in payload
                  ? String(payload.interactionId ?? '') || undefined
                  : undefined,
              signal:
                payload && 'signal' in payload && payload.signal instanceof AbortSignal
                  ? payload.signal
                  : undefined,
            });
          case 'validate': {
            form.store.setSubmitAttempted(true);
            const result = await form.validateForm();
            return {
              ok: result.ok,
              data: result,
              error: result.ok ? undefined : result.errors,
            };
          }
          case 'reset':
            if (input.values !== undefined && !isPlainRecord(input.values)) {
              return fail('reset values must be an object when provided');
            }
            form.reset(input.values as object | undefined);
            return { ok: true };
          case 'setValue':
            if (typeof input.name !== 'string' || input.name.length === 0) {
              return fail('setValue requires a non-empty string name');
            }
            form.setValue(input.name, input.value);
            return { ok: true, data: input.value };
          case 'setValues':
            if (!isPlainRecord(input.values)) {
              return fail('setValues requires an object values payload');
            }
            form.setValues(input.values);
            return { ok: true, data: input.values ?? {} };
          case 'getValues':
            return { ok: true, data: form.store.getState().values };
          default:
            return {
              ok: false,
              error: new Error(`Unsupported form method: ${method}`),
            };
        }
      },
    },
  };
}
