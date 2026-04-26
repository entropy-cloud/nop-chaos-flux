import { describe, expect, it } from 'vitest';
import { mergeFieldStateErrors } from '../form-runtime-owner-field-states';

describe('mergeFieldStateErrors', () => {
  it('preserves non-error field state while replacing error payloads', () => {
    const next = mergeFieldStateErrors({
      currentFieldStates: {
        name: { touched: true, errors: [{ path: 'name', ownerPath: 'name', rule: 'required', message: 'Required' }] },
      },
      nextErrors: {
        name: [{ path: 'name', ownerPath: 'name', rule: 'minLength', message: 'Too short' }],
      },
    });

    expect(next.name).toEqual({
      touched: true,
      errors: [{ path: 'name', ownerPath: 'name', rule: 'minLength', message: 'Too short' }],
    });
  });

  it('removes entries that only contained errors when nextErrors omits the path', () => {
    const next = mergeFieldStateErrors({
      currentFieldStates: {
        name: { errors: [{ path: 'name', ownerPath: 'name', rule: 'required', message: 'Required' }] },
      },
      nextErrors: {},
    });

    expect(next).toEqual({});
  });

  it('keeps non-error metadata when clearing obsolete errors', () => {
    const next = mergeFieldStateErrors({
      currentFieldStates: {
        name: { touched: true, dirty: true, errors: [{ path: 'name', ownerPath: 'name', rule: 'required', message: 'Required' }] },
      },
      nextErrors: {},
    });

    expect(next.name).toEqual({ touched: true, dirty: true });
  });
});
