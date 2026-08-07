import { describe, expect, it } from 'vitest';
import {
  getChoiceOptionKey,
  getSourceErrorMessage,
  matchChoiceLabel,
  resolveChoiceComboboxValue,
  resolveChoiceMobileTriggerText,
  resolveChoiceVisibleGroups,
  resolveChoiceVisibleOptions,
  sanitizeChoiceGroups,
  sanitizeChoiceOptions,
} from '../renderers/input-choice-utils.js';

describe('input-choice-utils pure functions (14-3)', () => {
  describe('getSourceErrorMessage', () => {
    it('returns undefined for non-error source states', () => {
      expect(getSourceErrorMessage(undefined)).toBeUndefined();
      expect(getSourceErrorMessage({ status: 'loading', loading: true, error: undefined })).toBeUndefined();
      expect(getSourceErrorMessage({ status: 'ready', loading: false, error: undefined })).toBeUndefined();
    });

    it('extracts string and Error-shaped error payloads with an i18n fallback', () => {
      expect(
        getSourceErrorMessage({ status: 'error', loading: false, error: 'custom failure' }),
      ).toBe('custom failure');
      expect(
        getSourceErrorMessage({ status: 'error', loading: false, error: new Error('message property') }),
      ).toBe('message property');
      expect(getSourceErrorMessage({ status: 'error', loading: false, error: 42 })).toEqual(
        expect.any(String),
      );
    });
  });

  describe('getChoiceOptionKey', () => {
    it('stringifies any primitive option value into the stable key', () => {
      expect(getChoiceOptionKey('a')).toBe('a');
      expect(getChoiceOptionKey(0)).toBe('0');
      expect(getChoiceOptionKey(false)).toBe('false');
    });
  });

  describe('sanitizeChoiceOptions', () => {
    it('returns [] for non-array input', () => {
      expect(sanitizeChoiceOptions(undefined)).toEqual([]);
      expect(sanitizeChoiceOptions({})).toEqual([]);
    });

    it('drops entries without string label or scalar value', () => {
      expect(
        sanitizeChoiceOptions([
          { label: 'ok', value: 1 },
          { label: 42, value: 'bad-label' },
          { label: 'missing-value' },
          null,
          'string-entry',
        ]),
      ).toEqual([{ label: 'ok', value: 1, disabled: undefined, disabledTip: undefined }]);
    });

    it('normalizes disabled/disabledTip and preserves extra fields', () => {
      const [option] = sanitizeChoiceOptions([
        { label: 'a', value: 'a', disabled: true, disabledTip: 'locked', extra: 'kept' },
        { label: 'b', value: 'b', disabled: false, disabledTip: 7 },
      ]);
      expect(option).toMatchObject({
        label: 'a',
        value: 'a',
        disabled: true,
        disabledTip: 'locked',
        extra: 'kept',
      });
      expect(sanitizeChoiceOptions([{ label: 'b', value: 'b', disabled: false, disabledTip: 7 }])[0]).toMatchObject(
        { disabled: undefined, disabledTip: undefined },
      );
    });

    it('supports boolean option values', () => {
      expect(sanitizeChoiceOptions([{ label: 'yes', value: true }])).toEqual([
        { label: 'yes', value: true, disabled: undefined, disabledTip: undefined },
      ]);
    });
  });

  describe('sanitizeChoiceGroups', () => {
    it('returns [] for non-array input', () => {
      expect(sanitizeChoiceGroups(undefined)).toEqual([]);
    });

    it('drops groups with no valid options and keeps valid ones', () => {
      expect(
        sanitizeChoiceGroups([
          { label: 'group-a', options: [{ label: 'a', value: 'a' }] },
          { label: 'empty', options: [] },
          { label: 'bad', options: [{ label: 1, value: 'x' }] },
          { label: 42, options: [] },
        ]),
      ).toEqual([
        { label: 'group-a', options: [{ label: 'a', value: 'a', disabled: undefined, disabledTip: undefined }] },
      ]);
    });
  });

  describe('matchChoiceLabel', () => {
    it('matches everything on empty query', () => {
      expect(matchChoiceLabel('anything', '', true)).toBe(true);
      expect(matchChoiceLabel('anything', '', false)).toBe(true);
    });

    it('exact / prefix / substring match matrix', () => {
      expect(matchChoiceLabel('apple', 'apple', true)).toBe(true);
      expect(matchChoiceLabel('apple', 'app', true)).toBe(true);
      expect(matchChoiceLabel('pineapple', 'apple', true)).toBe(true);
      expect(matchChoiceLabel('apple', 'pear', true)).toBe(false);
    });

    it('ignoreCase toggles case folding', () => {
      expect(matchChoiceLabel('Apple', 'apple', true)).toBe(true);
      expect(matchChoiceLabel('Apple', 'apple', false)).toBe(false);
      expect(matchChoiceLabel('APPLE', 'apple', true)).toBe(true);
      expect(matchChoiceLabel('APPLE', 'APP', false)).toBe(true);
      expect(matchChoiceLabel('APPLE', 'app', false)).toBe(false);
    });
  });

  describe('resolveChoiceVisibleOptions', () => {
    const raw = [
      { label: 'alpha', value: 'a' },
      { label: 'beta', value: 'b' },
    ];
    const remote = [{ label: 'gamma', value: 'g' }];
    const base = {
      rawOptions: raw,
      remoteOptions: null,
      searchMergeMode: 'append' as const,
      query: '',
      ignoreCase: true,
    };

    it('returns all raw options when remote search is inactive', () => {
      expect(resolveChoiceVisibleOptions(base)).toEqual(raw);
    });

    it('filters raw options locally when remote search is inactive and a query is set', () => {
      expect(resolveChoiceVisibleOptions({ ...base, query: 'alp' })).toEqual([raw[0]]);
    });

    it('replace mode returns the remote options as-is', () => {
      expect(
        resolveChoiceVisibleOptions({ ...base, remoteOptions: remote, searchMergeMode: 'replace' }),
      ).toEqual(remote);
    });

    it('append mode merges raw + remote options on a non-empty remote result', () => {
      expect(
        resolveChoiceVisibleOptions({ ...base, remoteOptions: remote, query: 'gam' }),
      ).toEqual([...raw, ...remote]);
    });

    it('append mode with a settled empty remote result and a non-empty query shows the empty list (2-6)', () => {
      expect(resolveChoiceVisibleOptions({ ...base, remoteOptions: [], query: 'zzz' })).toEqual([]);
    });

    it('append mode with an empty remote result and no query still shows the raw options', () => {
      expect(resolveChoiceVisibleOptions({ ...base, remoteOptions: [] })).toEqual(raw);
    });
  });

  describe('resolveChoiceVisibleGroups', () => {
    const groups = [
      { label: 'g1', options: [{ label: 'alpha', value: 'a' }] },
      { label: 'g2', options: [{ label: 'beta', value: 'b' }] },
    ];

    it('returns [] while remote search is active', () => {
      expect(resolveChoiceVisibleGroups({ groups, remoteSearchActive: true, useGroups: true, query: '', ignoreCase: true })).toEqual([]);
    });

    it('returns all groups without a query', () => {
      expect(resolveChoiceVisibleGroups({ groups, remoteSearchActive: false, useGroups: true, query: '', ignoreCase: true })).toEqual(groups);
    });

    it('filters group options by query and drops empty groups', () => {
      expect(
        resolveChoiceVisibleGroups({
          groups,
          remoteSearchActive: false,
          useGroups: true,
          query: 'alp',
          ignoreCase: true,
        }),
      ).toEqual([groups[0]]);
      expect(
        resolveChoiceVisibleGroups({
          groups,
          remoteSearchActive: false,
          useGroups: true,
          query: 'zzz',
          ignoreCase: true,
        }),
      ).toEqual([]);
    });

    it('returns [] when groups are not used', () => {
      expect(
        resolveChoiceVisibleGroups({ groups, remoteSearchActive: false, useGroups: false, query: '', ignoreCase: true }),
      ).toEqual([]);
    });
  });

  describe('resolveChoiceComboboxValue', () => {
    const all = [
      { label: 'one', value: 1 },
      { label: 'two', value: 2 },
    ];

    it('single mode resolves the matched option', () => {
      expect(resolveChoiceComboboxValue({ allOptions: all, value: 2, multiple: false })).toEqual(all[1]);
    });

    it('single mode echoes unmatched non-empty values with the label', () => {
      expect(
        resolveChoiceComboboxValue({ allOptions: all, value: 99, multiple: false, noMatchText: 'No match' }),
      ).toEqual({ label: 'No match', value: 99 });
      expect(
        resolveChoiceComboboxValue({ allOptions: all, value: 99, multiple: false }),
      ).toEqual({ label: '99', value: 99 });
    });

    it('single mode returns null for empty values', () => {
      expect(resolveChoiceComboboxValue({ allOptions: all, value: undefined, multiple: false })).toBeNull();
      expect(resolveChoiceComboboxValue({ allOptions: all, value: '', multiple: false })).toBeNull();
    });

    it('multiple mode matches options and echoes unmatched primitives', () => {
      expect(
        resolveChoiceComboboxValue({ allOptions: all, value: [1, 99], multiple: true }),
      ).toEqual([
        all[0],
        { label: '99', value: 99 },
      ]);
    });

    it('multiple mode returns [] for no value', () => {
      expect(resolveChoiceComboboxValue({ allOptions: all, value: undefined, multiple: true })).toEqual([]);
    });
  });

  describe('resolveChoiceMobileTriggerText', () => {
    const all = [
      { label: 'one', value: 1 },
      { label: 'two', value: 2 },
    ];

    it('single mode shows the matched label', () => {
      expect(resolveChoiceMobileTriggerText({ allOptions: all, value: 1, multiple: false })).toBe('one');
    });

    it('single mode echoes unmatched values with the raw value or noMatchText', () => {
      expect(
        resolveChoiceMobileTriggerText({ allOptions: all, value: 99, multiple: false, noMatchText: 'No match' }),
      ).toBe('No match');
      expect(resolveChoiceMobileTriggerText({ allOptions: all, value: 99, multiple: false })).toBe('99');
    });

    it('single mode is empty for empty values', () => {
      expect(resolveChoiceMobileTriggerText({ allOptions: all, value: undefined, multiple: false })).toBe('');
      expect(resolveChoiceMobileTriggerText({ allOptions: all, value: '', multiple: false })).toBe('');
    });

    it('multiple mode joins matched labels and echoes unmatched primitives', () => {
      expect(
        resolveChoiceMobileTriggerText({ allOptions: all, value: [1, 99], multiple: true }),
      ).toBe('one, 99');
      expect(resolveChoiceMobileTriggerText({ allOptions: all, value: [99, 98], multiple: true })).toBe('99, 98');
    });
  });
});
