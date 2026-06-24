/**
 * W4c — minimal valueKey/labelKey option normalization for the selection fields
 * (transfer / picker).
 *
 * The existing `select` renderer (`flux-renderers-form`) uses a fixed
 * `{label,value}` option shape with NO valueKey/labelKey mapping
 * (`schemas.ts:39 SelectOptionSchema`). transfer/picker must accept arbitrary
 * option records with author-supplied key fields, so this helper normalizes them
 * into the canonical `{label,value}` form without duplicating select's dropdown
 * protocol — it only performs the projection.
 */
export interface NormalizedOption {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
  raw: unknown;
}

function asKeyedRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toOptionValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

/**
 * Normalize an arbitrary candidate into the canonical {label,value} form.
 *
 * Resolution order for each option record:
 *  1. `valueKey` / `labelKey` (when declared) — explicit author mapping.
 *  2. `{label,value}` short-circuit — already-canonical records pass through.
 *  3. fallback `value` <- `value` ?? `id`, `label` <- `label` ?? `name` ?? `value`.
 *
 * Primitives (string/number/boolean) become `{label: String(v), value: v}`.
 */
export function normalizeOption(
  candidate: unknown,
  valueKey: string | undefined,
  labelKey: string | undefined,
): NormalizedOption | undefined {
  const record = asKeyedRecord(candidate);

  if (record) {
    const rawValue =
      valueKey && valueKey in record
        ? record[valueKey]
        : 'value' in record
          ? record.value
          : 'id' in record
            ? record.id
            : undefined;
    const rawLabel =
      labelKey && labelKey in record
        ? record[labelKey]
        : 'label' in record
          ? record.label
          : 'name' in record
            ? record.name
            : undefined;

    const value = toOptionValue(rawValue);
    if (value === undefined) {
      return undefined;
    }

    const label =
      rawLabel !== undefined && rawLabel !== null
        ? String(rawLabel)
        : typeof value === 'string'
          ? value
          : String(value);

    const disabled = record.disabled === true ? true : undefined;

    return { label, value, disabled, raw: candidate };
  }

  const primitiveValue = toOptionValue(candidate);
  if (primitiveValue === undefined) {
    return undefined;
  }

  return {
    label: String(primitiveValue),
    value: primitiveValue,
    raw: candidate,
  };
}

export function normalizeOptions(
  options: unknown,
  valueKey: string | undefined,
  labelKey: string | undefined,
): NormalizedOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  const result: NormalizedOption[] = [];
  for (const candidate of options) {
    const normalized = normalizeOption(candidate, valueKey, labelKey);
    if (normalized) {
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Resolve the display label for a currently-selected value, degrading gracefully
 * when the value is no longer present in the candidate set (picker-selection-mismatch
 * failure path): falls back to the raw value stringified, then to a placeholder.
 */
export function resolveSelectedLabel(
  selectedValue: unknown,
  options: NormalizedOption[],
  placeholder: string,
): string {
  if (selectedValue === undefined || selectedValue === null || selectedValue === '') {
    return placeholder;
  }

  if (Array.isArray(selectedValue)) {
    if (selectedValue.length === 0) {
      return placeholder;
    }
    return selectedValue
      .map((item) => resolveSelectedLabel(item, options, placeholder))
      .filter((label) => label !== placeholder)
      .join(', ');
  }

  const match = options.find((option) => option.value === selectedValue);
  if (match) {
    return match.label;
  }

  return typeof selectedValue === 'string' ? selectedValue : String(selectedValue);
}
