import { describe, expect, it } from 'vitest';
import type { ValidationError } from '@nop-chaos/flux-core';
import { remapErrorState, transformArrayIndexedPath } from '../form-path-state';

describe('transformArrayIndexedPath', () => {
  it('remaps indexed paths under the target array', () => {
    expect(transformArrayIndexedPath('contacts.1.email', 'contacts', (index) => index - 1)).toBe('contacts.0.email');
  });

  it('leaves unrelated paths unchanged', () => {
    expect(transformArrayIndexedPath('email', 'contacts', (index) => index - 1)).toBe('email');
  });
});

describe('remapErrorState', () => {
  it('preserves relative related paths while remapping the owning array path', () => {
    const input: Record<string, ValidationError[]> = {
      contacts: [
        {
          path: 'contacts',
          ownerPath: 'contacts',
          rule: 'uniqueBy',
          ruleId: 'contacts#0:uniqueBy',
          message: 'Duplicate email',
          sourceKind: 'array',
          relatedPaths: ['email']
        }
      ]
    };

    const output = remapErrorState(input, 'contacts', (index) => index);

    expect(output.contacts?.[0]?.relatedPaths).toEqual(['email']);
  });

  it('remaps fully qualified related paths that point inside the target array', () => {
    const input: Record<string, ValidationError[]> = {
      'contacts.1.email': [
        {
          path: 'contacts.1.email',
          ownerPath: 'contacts.1',
          rule: 'equalsField',
          ruleId: 'contacts.1.email#0:equalsField',
          message: 'Emails must match',
          sourceKind: 'field',
          relatedPaths: ['contacts.1.confirmEmail', 'email']
        }
      ]
    };

    const output = remapErrorState(input, 'contacts', (index) => index - 1);

    expect(output['contacts.0.email']?.[0]?.relatedPaths).toEqual(['contacts.0.confirmEmail', 'email']);
  });
});