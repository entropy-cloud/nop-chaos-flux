import type { ReactNode } from 'react';
import type { SchemaValue } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import type { SelectOptionGroup } from '../schemas.js';

export type ChoiceOption = {
  [key: string]: SchemaValue;
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
  disabledTip?: string;
};

export type OptionTemplateRenderer = (
  option: ChoiceOption,
  index: number,
) => ReactNode | undefined;

export function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
  if (sourceState?.status !== 'error') {
    return undefined;
  }

  if (typeof sourceState.error === 'string' && sourceState.error) {
    return sourceState.error;
  }

  if (
    sourceState.error &&
    typeof sourceState.error === 'object' &&
    'message' in sourceState.error &&
    typeof (sourceState.error as { message?: unknown }).message === 'string'
  ) {
    return (sourceState.error as { message: string }).message;
  }

  return t('flux.form.failedToLoadOptions');
}

export function getChoiceOptionKey(value: ChoiceOption['value']): string {
  return String(value);
}

export function sanitizeChoiceOptions(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      label?: unknown;
      value?: unknown;
      disabled?: unknown;
      disabledTip?: unknown;
    };
    if (
      typeof candidate.label !== 'string' ||
      !(
        typeof candidate.value === 'string' ||
        typeof candidate.value === 'number' ||
        typeof candidate.value === 'boolean'
      )
    ) {
      return [];
    }

    return [
      {
        ...(entry as Record<string, unknown>),
        label: candidate.label,
        value: candidate.value,
        disabled: candidate.disabled === true ? true : undefined,
        disabledTip: typeof candidate.disabledTip === 'string' ? candidate.disabledTip : undefined,
      },
    ];
  });
}

export function sanitizeChoiceGroups(value: unknown): SelectOptionGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as { label?: unknown; options?: unknown };
    if (typeof candidate.label !== 'string' || !Array.isArray(candidate.options)) {
      return [];
    }

    const options = sanitizeChoiceOptions(candidate.options);
    if (options.length === 0) {
      return [];
    }

    return [{ label: candidate.label, options }];
  });
}

export function matchChoiceLabel(label: string, query: string, ignoreCase: boolean): boolean {
  if (!query) {
    return true;
  }

  const lowerLabel = ignoreCase ? label.toLowerCase() : label;
  const lowerQuery = ignoreCase ? query.toLowerCase() : query;

  // 精确匹配（最高优先级）
  if (lowerLabel === lowerQuery) {
    return true;
  }

  // 前缀匹配
  if (lowerLabel.startsWith(lowerQuery)) {
    return true;
  }

  // 子串匹配
  if (lowerLabel.includes(lowerQuery)) {
    return true;
  }

  return false;
}

export function resolveChoiceVisibleOptions(input: {
  rawOptions: ChoiceOption[];
  remoteOptions: ChoiceOption[] | null;
  searchMergeMode: 'append' | 'replace';
  query: string;
  ignoreCase: boolean;
}): ChoiceOption[] {
  const { rawOptions, remoteOptions, searchMergeMode, query, ignoreCase } = input;
  const remoteSearchActive = remoteOptions !== null;
  if (!remoteSearchActive) {
    return query
      ? rawOptions.filter((option) => matchChoiceLabel(option.label, query, ignoreCase))
      : rawOptions;
  }

  if (searchMergeMode === 'replace') {
    return remoteOptions;
  }

  // append mode with a settled empty remote result for a non-empty query means
  // the remote search found nothing: show the empty list (ComboboxEmpty)
  // instead of the unfiltered raw options (2-6).
  if (remoteOptions.length === 0 && query) {
    return [];
  }

  return [...rawOptions, ...remoteOptions];
}

export function resolveChoiceVisibleGroups(input: {
  groups: SelectOptionGroup[];
  remoteSearchActive: boolean;
  useGroups: boolean;
  query: string;
  ignoreCase: boolean;
}): SelectOptionGroup[] {
  const { groups, remoteSearchActive, useGroups, query, ignoreCase } = input;
  return remoteSearchActive
    ? []
    : useGroups
      ? (query
          ? groups
              .map((group) => ({
                label: group.label,
                options: group.options.filter((option) =>
                  matchChoiceLabel(option.label, query, ignoreCase),
                ),
              }))
              .filter((group) => group.options.length > 0)
          : groups)
      : [];
}

export function resolveChoiceComboboxValue(input: {
  allOptions: ChoiceOption[];
  value: unknown;
  multiple: boolean;
  noMatchText?: string;
}): ChoiceOption | ChoiceOption[] | null {
  const { allOptions, value, multiple, noMatchText } = input;
  const valueArray = Array.isArray(value) ? (value as unknown[]) : [];
  const hasEchoValue = value !== undefined && value !== null && value !== '';
  if (multiple) {
    // O(n+m) membership indexes instead of filter×some over options × values —
    // large option sets with many selected values used to go quadratic per render.
    // Selection set uses SameValueZero (Object.is semantics modulo ±0, which is
    // not a distinguishing value for choice options).
    const selectedValues = new Set<unknown>(valueArray);
    const optionByValue = new Map<unknown, ChoiceOption>(allOptions.map((option) => [option.value, option]));
    const matched = allOptions.filter((option) => selectedValues.has(option.value));
    for (const candidate of valueArray) {
      if (!optionByValue.has(candidate)) {
        matched.push({ label: String(candidate), value: candidate as ChoiceOption['value'] });
      }
    }
    return matched;
  }
  return (
    allOptions.find((option) => Object.is(option.value, value)) ??
    (hasEchoValue
      ? { label: noMatchText ?? String(value), value: value as ChoiceOption['value'] }
      : null));
}

export function resolveChoiceMobileTriggerText(input: {
  allOptions: ChoiceOption[];
  value: unknown;
  multiple: boolean;
  noMatchText?: string;
}): string {
  const { allOptions, value, multiple, noMatchText } = input;
  const valueArray = Array.isArray(value) ? (value as unknown[]) : [];
  const hasEchoValue = value !== undefined && value !== null && value !== '';
  if (multiple) {
    // O(n+m): one option lookup index instead of a find per selected value.
    const optionByValue = new Map<unknown, ChoiceOption>(allOptions.map((option) => [option.value, option]));
    return valueArray
      .map((candidate) => optionByValue.get(candidate)?.label ?? String(candidate))
      .join(', ');
  }
  return (
    allOptions.find((option) => Object.is(option.value, value))?.label ??
    (hasEchoValue ? noMatchText ?? String(value) : ''));
}
