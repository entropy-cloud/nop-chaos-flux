import { describe, expect, it } from 'vitest';
import { createPathBinding, projectBooleanMap, projectFieldStates } from './path-binding.js';

describe('createPathBinding', () => {
  it('maps relative and absolute paths for nested owners', () => {
    const binding = createPathBinding({ ownerRootPath: 'profile' });

    expect(binding.toAbsolute('name')).toBe('profile.name');
    expect(binding.toAbsolute('')).toBe('profile');
    expect(binding.toRelative('profile.name')).toBe('name');
    expect(binding.toRelative('profile')).toBe('');
    expect(binding.toRelative('external')).toBeUndefined();
    expect(binding.owns('profile.name')).toBe(true);
    expect(binding.owns('external')).toBe(false);
  });

  it('supports scalar alias at owner root', () => {
    const binding = createPathBinding({ ownerRootPath: 'payload', scalarValueAlias: 'value' });

    expect(binding.toAbsolute('value')).toBe('payload');
    expect(binding.toRelative('payload')).toBe('value');
  });
});

describe('projection helpers', () => {
  it('projects only owned boolean-map keys', () => {
    const binding = createPathBinding({ ownerRootPath: 'profile' });

    expect(projectBooleanMap({ 'profile.name': true, external: true }, binding)).toEqual({
      name: true,
    });
  });

  it('projects field states and rewrites validation paths', () => {
    const binding = createPathBinding({ ownerRootPath: 'profile' });

    expect(
      projectFieldStates(
        {
          'profile.name': {
            touched: true,
            errors: [
              {
                path: 'profile.name',
                ownerPath: 'profile.name',
                rule: 'required',
                message: 'Required',
                sourceKind: 'field',
              },
            ],
          },
          external: {
            dirty: true,
          },
        },
        binding,
      ),
    ).toEqual({
      name: {
        touched: true,
        errors: [
          {
            path: 'name',
            ownerPath: 'name',
            rule: 'required',
            message: 'Required',
            sourceKind: 'field',
          },
        ],
      },
    });
  });
});
