import { describe, expect, it, vi } from 'vitest';
import { applyNonFormObjectFieldCommit } from './object-field.js';

describe('object-field non-form commit helper', () => {
  it('writes the final value and revalidates the projected owner subtree', async () => {
    const parentScope = {
      update: vi.fn(),
    };
    const parentValidationOwner = {
      validateSubtree: vi.fn(async () => ({ ok: false, errors: [], fieldErrors: {} })),
    };

    await applyNonFormObjectFieldCommit({
      name: 'profile',
      committedValue: { firstName: '' },
      parentScope,
      parentValidationOwner,
    });

    expect(parentScope.update).toHaveBeenCalledWith('profile', { firstName: '' });
    expect(parentValidationOwner.validateSubtree).toHaveBeenCalledWith('profile', 'commit');
  });

  it('rejects when projected owner revalidation fails', async () => {
    const parentScope = {
      update: vi.fn(),
    };
    const parentValidationOwner = {
      validateSubtree: vi.fn(async () => {
        throw new Error('Revalidation failed');
      }),
    };

    await expect(
      applyNonFormObjectFieldCommit({
        name: 'profile',
        committedValue: { firstName: '' },
        parentScope,
        parentValidationOwner,
      }),
    ).rejects.toThrow('Revalidation failed');

    expect(parentScope.update).toHaveBeenCalledWith('profile', { firstName: '' });
  });
});
