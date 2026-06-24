import type { RendererRouteEntry } from './route-model.js';

/**
 * Form + form-advanced renderer route inventory. Extracted from route-model.ts
 * so the registry data does not push that file past the max-lines guardrail
 * (AGENTS.md: files over 500 lines should be evaluated for extraction).
 */
export const FORM_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'form',
    title: 'Form',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Root form container; manages field values, validation, and submit lifecycle.',
  },
  {
    id: 'input-text',
    title: 'Input Text',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Single-line text input bound to a form field.',
  },
  {
    id: 'input-email',
    title: 'Input Email',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Email input with built-in format validation.',
  },
  {
    id: 'input-password',
    title: 'Input Password',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Password input with masked characters.',
  },
  {
    id: 'input-number',
    title: 'Input Number',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Numeric input with min/max, precision, stepper, and prefix/suffix support.',
  },
  {
    id: 'input-date',
    title: 'Input Date',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Single-value date field on the shared date底层: valueFormat/displayFormat, min/max bounds, UTC storage, clearable.',
  },
  {
    id: 'input-datetime',
    title: 'Input Datetime',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Single-value date+time field combining the shared calendar with hour/minute precision.',
  },
  {
    id: 'input-time',
    title: 'Input Time',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Single-value time field with valueFormat/displayFormat conversion and minTime/maxTime clamping.',
  },
  {
    id: 'date-range',
    title: 'Date Range',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Canonical range owner: one type unifies date/datetime/time via rangeKind, normalizes start>end, joins ends with a delimiter.',
  },
  {
    id: 'input-month',
    title: 'Input Month',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Month field family owner: native month input with YYYY-MM storage; selectionMode=range emits a delimiter-joined pair (no second canonical range type).',
  },
  {
    id: 'input-quarter',
    title: 'Input Quarter',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Quarter field family owner: year input + quarter select storing YYYY-Qq with quarter↔date normalization.',
  },
  {
    id: 'input-year',
    title: 'Input Year',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Year field: number input storing YYYY on the shared date token底层.',
  },
  {
    id: 'textarea',
    title: 'Textarea',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Multi-line text input bound to a form field.',
  },
  {
    id: 'markdown-editor',
    title: 'Markdown Editor',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description:
      'Markdown source editor + live preview. Preview composes the registered `markdown` renderer at runtime (helpers.render) so flux-renderers-form stays free of react-markdown.',
  },
  {
    id: 'select',
    title: 'Select',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Single-value dropdown with inline or async options.',
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Boolean toggle bound to a form field.',
  },
  {
    id: 'switch',
    title: 'Switch',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Toggle switch bound to a form field.',
  },
  {
    id: 'radio-group',
    title: 'Radio Group',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Single-choice radio group; options from schema or async source.',
  },
  {
    id: 'checkbox-group',
    title: 'Checkbox Group',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Multi-choice checkbox group; options from schema or async source.',
  },
  {
    id: 'input-tree',
    title: 'Input Tree',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Inline tree selector with checkbox and radio modes.',
  },
  {
    id: 'tree-select',
    title: 'Tree Select',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Popover-based tree selector with search support.',
  },
  {
    id: 'tag-list',
    title: 'Tag List',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Editable list of free-text tags.',
  },
  {
    id: 'key-value',
    title: 'Key Value',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Editable list of key-value pairs.',
  },
  {
    id: 'array-editor',
    title: 'Array Editor',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Structured array editor with per-item column fields and add/remove controls.',
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Visual AND/OR condition tree builder with nested groups.',
  },
  {
    id: 'input-file',
    title: 'Input File',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description:
      'File upload field. Dispatches a host uploadAction (request sink) and writes back the bridged result; pending/result/error state machine; valueMode url/object/array.',
  },
  {
    id: 'input-image',
    title: 'Input Image',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description:
      'Image upload field built on the input-file baseline plus a thumbnail preview shell and a reserved crop extension point.',
  },
  {
    id: 'editor',
    title: 'Editor',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description:
      'TipTap WYSIWYG rich-text field. outputFormat html (sanitized via DOMPurify) or json (TipTap JSON); toolbar bridge reuses @nop-chaos/ui buttons.',
  },
  {
    id: 'fieldset',
    title: 'Fieldset',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    description: 'Semantic field grouping container with optional legend and collapsible body.',
  },
  {
    id: 'object-field',
    title: 'Object Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Inline composite field editing a nested object scope.',
  },
  {
    id: 'array-field',
    title: 'Array Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Inline composite array editing with per-item form regions.',
  },
  {
    id: 'variant-field',
    title: 'Variant Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Discriminated union field that switches schema based on a type selector.',
  },
  {
    id: 'detail-field',
    title: 'Detail Field',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Opens a dialog form to edit a nested object field; writes back on confirm.',
  },
  {
    id: 'detail-view',
    title: 'Detail View',
    category: 'form',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    description: 'Read-only display of a nested object; expands to a dialog for inline editing.',
  },
];
