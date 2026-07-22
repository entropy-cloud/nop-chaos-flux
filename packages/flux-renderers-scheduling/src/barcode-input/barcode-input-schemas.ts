import type { SchemaFieldRule } from '@nop-chaos/flux-core';

const formFieldRules: SchemaFieldRule[] = [
  { key: 'name', kind: 'prop' },
  { key: 'label', kind: 'prop' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'required', kind: 'prop', valueType: 'boolean' },
  { key: 'disabled', kind: 'prop', valueType: 'boolean' },
  { key: 'readOnly', kind: 'prop', valueType: 'boolean' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'trimContents', kind: 'prop', valueType: 'boolean' },
  { key: 'minLength', kind: 'prop' },
  { key: 'maxLength', kind: 'prop' },
  { key: 'pattern', kind: 'prop' },
  { key: 'validate', kind: 'prop' },
];

export const barcodeInputFieldRules: SchemaFieldRule[] = [
  ...formFieldRules,
  { key: 'formats', kind: 'prop' },
  { key: 'continuousScan', kind: 'prop', valueType: 'boolean' },
  { key: 'scanButton', kind: 'prop', valueType: 'boolean' },
  { key: 'scanInterval', kind: 'prop' },
  { key: 'batchMode', kind: 'prop', valueType: 'boolean' },
  { key: 'torchButton', kind: 'prop', valueType: 'boolean' },
  { key: 'wasmUrl', kind: 'prop' },
  { key: 'scanButtonClassName', kind: 'prop' },
  { key: 'autoSubmit', kind: 'prop', valueType: 'boolean' },
  { key: 'scanOnFocus', kind: 'prop', valueType: 'boolean' },
  { key: 'onMount', kind: 'event' },
  { key: 'onUnmount', kind: 'event' },
  { key: 'onScan', kind: 'event' },
  { key: 'onScanError', kind: 'event' },
];
