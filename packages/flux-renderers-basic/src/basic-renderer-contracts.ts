/**
 * Plan 462 (2026-08-23): extracted the inline `propContracts` blocks
 * for the basic package renderers into this sibling module so the
 * main `basic-renderer-definitions.ts` file stays under the 710-line
 * lint ceiling. Each entry is a `RendererPropContract` keyed by prop
 * name; renderers in the parent file reference these as
 * `propContracts: { ...containerContracts, ... }`.
 *
 * Conventions:
 * - union-of-literals shapes are kept inline (the `anyOf` array
 *   benefits from being next to the field declaration in many
 *   definitions; we only hoist here when the file is too long).
 * - `displayName` and `editorType` are mirrored from the closest
 *   existing pattern (e.g. `union` of 2-3 literals → `select`,
 *   `boolean` → `switch`).
 * - `defaultValue` matches the convention used by the existing
 *   `button` renderer's `variant` (line ~218 of the parent file).
 */
import type { RendererPropContract } from '@nop-chaos/flux-core';

export const containerContracts: Record<string, RendererPropContract> = {
  direction: {
    shape: {
      kind: 'union',
      anyOf: [{ kind: 'literal', value: 'row' }, { kind: 'literal', value: 'column' }],
    },
    displayName: 'Direction',
    description: 'Container axis. "col" (amis short form) is rejected at compile time; use "column".',
    editorType: 'select',
    defaultValue: 'row',
  },
  wrap: { shape: { kind: 'boolean' }, displayName: 'Wrap', editorType: 'switch' },
  align: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'start' },
        { kind: 'literal', value: 'center' },
        { kind: 'literal', value: 'end' },
        { kind: 'literal', value: 'stretch' },
      ],
    },
    displayName: 'Align',
    editorType: 'select',
    defaultValue: 'stretch',
  },
};

export const flexContracts: Record<string, RendererPropContract> = {
  direction: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'row' },
        { kind: 'literal', value: 'column' },
        { kind: 'literal', value: 'row-reverse' },
        { kind: 'literal', value: 'column-reverse' },
      ],
    },
    displayName: 'Direction',
    description: 'Flex axis. Invalid values (e.g. "col") silently degrade at runtime — schema-level contract catches typos at compile time.',
    editorType: 'select',
    defaultValue: 'row',
  },
  wrap: {
    shape: { kind: 'boolean' },
    displayName: 'Wrap',
    description: 'Whether children wrap to the next line (flex-wrap).',
    editorType: 'switch',
  },
  align: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'start' },
        { kind: 'literal', value: 'center' },
        { kind: 'literal', value: 'end' },
        { kind: 'literal', value: 'stretch' },
        { kind: 'literal', value: 'baseline' },
      ],
    },
    displayName: 'Align (cross axis)',
    editorType: 'select',
    defaultValue: 'stretch',
  },
  justify: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'start' },
        { kind: 'literal', value: 'center' },
        { kind: 'literal', value: 'end' },
        { kind: 'literal', value: 'between' },
        { kind: 'literal', value: 'around' },
        { kind: 'literal', value: 'evenly' },
      ],
    },
    displayName: 'Justify (main axis)',
    editorType: 'select',
    defaultValue: 'start',
  },
  alignContent: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'start' },
        { kind: 'literal', value: 'center' },
        { kind: 'literal', value: 'end' },
        { kind: 'literal', value: 'between' },
        { kind: 'literal', value: 'around' },
        { kind: 'literal', value: 'evenly' },
        { kind: 'literal', value: 'stretch' },
      ],
    },
    displayName: 'Align Content',
    description: 'Cross-axis distribution of multi-line flex lines.',
    editorType: 'select',
    defaultValue: 'stretch',
  },
};

export const textContracts: Record<string, RendererPropContract> = {
  tag: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'span' },
        { kind: 'literal', value: 'p' },
        { kind: 'literal', value: 'h1' },
        { kind: 'literal', value: 'h2' },
        { kind: 'literal', value: 'h3' },
        { kind: 'literal', value: 'h4' },
        { kind: 'literal', value: 'h5' },
        { kind: 'literal', value: 'h6' },
        { kind: 'literal', value: 'label' },
        { kind: 'literal', value: 'div' },
      ],
    },
    displayName: 'Tag',
    description: 'HTML tag wrapping the text. Defaults to "span".',
    editorType: 'select',
    defaultValue: 'span',
  },
  copyable: {
    shape: { kind: 'boolean' },
    displayName: 'Copyable',
    description: 'Whether the text exposes a copy-to-clipboard action.',
    editorType: 'switch',
  },
  maxLineToggle: {
    shape: { kind: 'boolean' },
    displayName: 'Max Line Toggle',
    description: 'Show a "show more" affordance when text exceeds maxLine.',
    editorType: 'switch',
  },
};

export const iconContracts: Record<string, RendererPropContract> = {
  icon: {
    shape: { kind: 'string' },
    displayName: 'Icon',
    description: 'Lucide icon name (kebab-case).',
    editorType: 'text',
    defaultValue: 'star',
  },
  size: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'number' },
        { kind: 'literal', value: 'sm' },
        { kind: 'literal', value: 'md' },
        { kind: 'literal', value: 'lg' },
      ],
    },
    displayName: 'Size',
    description: 'Numeric pixel size (e.g. 24) or named token (sm/md/lg). Renderer falls back to 16 on invalid values.',
    editorType: 'text',
    defaultValue: 'md',
  },
};

export const badgeContracts: Record<string, RendererPropContract> = {
  level: {
    shape: {
      kind: 'union',
      anyOf: [
        { kind: 'literal', value: 'info' },
        { kind: 'literal', value: 'success' },
        { kind: 'literal', value: 'warning' },
        { kind: 'literal', value: 'danger' },
      ],
    },
    displayName: 'Level',
    description: 'Semantic color level. Maps to bg-{level} tokens.',
    editorType: 'select',
    defaultValue: 'info',
  },
};
