function toPayloadRecord(payload) {
    return payload ?? {};
}
export function createFormComponentHandle(form) {
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
                        return form.submit(input.api);
                    case 'validate': {
                        const result = await form.validateForm();
                        return {
                            ok: result.ok,
                            data: result,
                            error: result.ok ? undefined : result.errors
                        };
                    }
                    case 'reset':
                        form.reset(input.values);
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
//# sourceMappingURL=form-component-handle.js.map