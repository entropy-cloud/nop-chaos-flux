import { describe, expect, it } from 'vitest';
import {
  buildTreeOptionMetaList,
  cascadeDeselectParent,
  cascadeSelectParent,
  deriveCheckedState,
  flattenTreeOptions,
} from './tree-options.js';

describe('tree-options — TR2 cascade contract confirmation (down-propagate + up-derive)', () => {
  const tree = () =>
    buildTreeOptionMetaList([
      {
        value: 'parent',
        label: 'Parent',
        children: [
          { value: 'leaf-1', label: 'Leaf 1' },
          { value: 'leaf-2', label: 'Leaf 2' },
        ],
      },
    ]);

  it('selecting a parent propagates down to all descendants', () => {
    const options = tree();
    const parent = options[0]!;
    const selected = cascadeSelectParent([], parent, false);
    expect(selected).toContain('parent');
    expect(selected).toContain('leaf-1');
    expect(selected).toContain('leaf-2');
  });

  it('derives indeterminate when some (not all) descendants are selected', () => {
    const options = tree();
    const parent = options[0]!;
    expect(deriveCheckedState(parent, ['leaf-1'], false)).toEqual({
      checked: false,
      indeterminate: true,
    });
  });

  it('derives checked when all descendants are selected', () => {
    const options = tree();
    const parent = options[0]!;
    expect(deriveCheckedState(parent, ['leaf-1', 'leaf-2'], false)).toEqual({
      checked: true,
      indeterminate: false,
    });
  });

  it('deselecting a parent removes the whole group', () => {
    const options = tree();
    const parent = options[0]!;
    const selected = cascadeSelectParent([], parent, false);
    const deselected = cascadeDeselectParent(selected, parent, false);
    expect(deselected).toHaveLength(0);
  });
});

describe('tree-options — TR1 empty children[] is a leaf', () => {
  it('treats { children: [] } as a leaf (no children, expandable=false)', () => {
    const options = buildTreeOptionMetaList([{ value: 'a', label: 'A', children: [] }]);
    expect(options).toHaveLength(1);
    expect(options[0]!.children).toHaveLength(0);
    expect(options[0]!.deferChildren).toBeUndefined();
    // A node with no children and no defer flag is a selectable leaf.
  });

  it('treats a node missing the children key as a leaf too', () => {
    const options = buildTreeOptionMetaList([{ value: 'b', label: 'B' }]);
    expect(options[0]!.children).toHaveLength(0);
  });

  it('treats a node with real children as non-leaf', () => {
    const options = buildTreeOptionMetaList([
      {
        value: 'p',
        label: 'P',
        children: [{ value: 'c', label: 'C' }],
      },
    ]);
    expect(options[0]!.children).toHaveLength(1);
  });
});

describe('tree-options — TR3 cascade writes no duplicate parent', () => {
  const tree = () =>
    buildTreeOptionMetaList([
      {
        value: 'parent',
        label: 'Parent',
        children: [
          { value: 'leaf-1', label: 'Leaf 1' },
          { value: 'leaf-2', label: 'Leaf 2' },
        ],
      },
    ]);

  it('repeatedly selecting the same parent keeps it exactly once in the value array', () => {
    const options = tree();
    const parent = options[0]!;
    let value: unknown[] = [];
    // Toggle the parent on 5 times — dedup must keep it (and descendants) single.
    for (let i = 0; i < 5; i++) {
      value = cascadeSelectParent(value, parent, false);
    }
    const parentOccurrences = value.filter((v) => Object.is(v, 'parent')).length;
    expect(parentOccurrences).toBe(1);
    // Descendants also appear exactly once each.
    expect(value.filter((v) => Object.is(v, 'leaf-1')).length).toBe(1);
    expect(value.filter((v) => Object.is(v, 'leaf-2')).length).toBe(1);
  });

  it('deselect then reselect yields no duplicates and a clean group', () => {
    const options = tree();
    const parent = options[0]!;
    let value: unknown[] = cascadeSelectParent([], parent, false);
    value = cascadeDeselectParent(value, parent, false);
    expect(value).toHaveLength(0);
    value = cascadeSelectParent(value, parent, false);
    expect(value.filter((v) => Object.is(v, 'parent')).length).toBe(1);
    expect(new Set(value).size).toBe(value.length);
  });
});

describe('tree-options — TR5 option input immutability', () => {
  it('build/flatten/cascade do not throw or mutate a frozen option input', () => {
    const input = Object.freeze([
      Object.freeze({
        value: 'parent',
        label: 'Parent',
        children: Object.freeze([
          Object.freeze({ value: 'leaf-1', label: 'Leaf 1' }),
          Object.freeze({ value: 'leaf-2', label: 'Leaf 2' }),
        ]),
      }),
    ]);

    const options = buildTreeOptionMetaList(input);
    expect(options[0]!.children).toHaveLength(2);

    const flattened = flattenTreeOptions(options);
    expect(flattened.length).toBeGreaterThan(0);

    // Cascade helpers produce new arrays without touching the frozen input.
    const selected = cascadeSelectParent([], options[0]!, false);
    expect(selected.length).toBeGreaterThan(0);
    const deselected = cascadeDeselectParent(selected, options[0]!, false);
    expect(deselected).toHaveLength(0);

    // The frozen source is byte-for-byte unchanged (still 1 root, 2 leaves).
    expect(input).toHaveLength(1);
    expect(input[0]!.children).toHaveLength(2);
    expect(input[0]!.children![0]).toMatchObject({ value: 'leaf-1' });
  });
});

describe('tree-options — TR6 valueField remap', () => {
  it('reads value from valueField:"code" across build/flatten/derive', () => {
    const config = { valueField: 'code' };
    const options = buildTreeOptionMetaList(
      [
        {
          code: 'A',
          label: 'Alpha',
          children: [
            { code: 'A1', label: 'Alpha One' },
            { code: 'A2', label: 'Alpha Two' },
          ],
        },
      ],
      config,
    );

    // Build resolves the value via `code`.
    expect(options[0]!.value).toBe('A');
    expect(options[0]!.children[0]!.value).toBe('A1');
    expect(options[0]!.children[1]!.value).toBe('A2');

    // Flatten carries the remapped values.
    const flattened = flattenTreeOptions(options, config);
    const values = flattened.map((o) => o.value);
    expect(values).toContain('A');
    expect(values).toContain('A1');
    expect(values).toContain('A2');

    // Cascade/derive operate on the remapped `code` values, not a default key.
    // One of two descendants selected → indeterminate (partial).
    const partial = deriveCheckedState(options[0]!, ['A1'], false);
    expect(partial.checked).toBe(false);
    expect(partial.indeterminate).toBe(true);

    // All descendants selected → checked.
    const full = deriveCheckedState(options[0]!, ['A1', 'A2'], false);
    expect(full.checked).toBe(true);
    expect(full.indeterminate).toBe(false);

    const selected = cascadeSelectParent([], options[0]!, false);
    expect(selected).toContain('A');
    expect(selected).toContain('A1');
    expect(selected).toContain('A2');
  });
});
