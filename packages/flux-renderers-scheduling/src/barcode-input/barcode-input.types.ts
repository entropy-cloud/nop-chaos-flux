import type { ActionSchema, BaseSchema } from '@nop-chaos/flux-core';

export type BarcodeFormat =
  | 'aztec' | 'code_39' | 'code_93' | 'code_128'
  | 'data_matrix' | 'ean_8' | 'ean_13' | 'itf'
  | 'pdf_417' | 'qr_code' | 'upc_a' | 'upc_e';

export interface BarcodeInputSchema extends BaseSchema {
  type: 'barcode-input';

  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  trimContents?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  validate?: { action: ActionSchema; debounce?: number; message?: string };

  formats?: BarcodeFormat[];
  continuousScan?: boolean;
  scanButton?: boolean;
  scanInterval?: number;
  batchMode?: boolean;
  torchButton?: boolean;
  wasmUrl?: string;
  scanButtonClassName?: string;

  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  onScan?: ActionSchema;
  onScanError?: ActionSchema;
}

export interface BarcodeDetectResult {
  barcode: string;
  format: string;
}

export interface BarcodeQueueItem {
  id: string;
  rawValue: string;
  timestamp: number;
  format: string;
  status: 'pending' | 'submitted' | 'duplicate' | 'error';
  errorMessage?: string;
}
