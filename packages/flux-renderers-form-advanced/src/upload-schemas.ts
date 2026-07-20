import type {
  ActionSchema,
  BoundFieldSchemaBase,
  SchemaFieldRule,
  SchemaObject,
} from '@nop-chaos/flux-core';

/**
 * Normalized upload result returned by the host `uploadAction` (the action's
 * resolved `data`). The renderer never inspects upload protocol details — it
 * only bridges the action result into the field value.
 */
export interface UploadResultItem {
  url: string;
  name?: string;
  size?: number;
  type?: string;
  [key: string]: unknown;
}

/**
 * Field value shape.
 * - `url` (default): each upload contributes its `url` string.
 * - `object`: each upload contributes the full {@link UploadResultItem}.
 * - `array`: forces an array container of objects (multiple).
 */
export type UploadValueMode = 'url' | 'object' | 'array';

export interface InputFileSchema extends BoundFieldSchemaBase {
  type: 'input-file';
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  /** Max file size in bytes for client-side validation. Files exceeding this are rejected before upload. */
  maxSize?: number;
  /** Host action reference that performs the actual upload (request sink). */
  uploadAction?: ActionSchema | ActionSchema[];
  /** Action dispatched to delete an uploaded file on the server. The file identity is available in scope. */
  deleteAction?: ActionSchema | ActionSchema[];
  valueMode?: UploadValueMode;
  buttonText?: string;
  /** Action triggered when a file is rejected (e.g. exceeds maxSize). Receives rejection reason in payload. */
  onReject?: ActionSchema;
  /** Action triggered when the user removes an existing file from the list. */
  onDelete?: ActionSchema;
  /** Action triggered after a server-side delete succeeds. */
  onDeleteSuccess?: ActionSchema;
  /** Action triggered after a server-side delete fails. */
  onDeleteFail?: ActionSchema;
}

export interface InputImageSchema extends BoundFieldSchemaBase {
  type: 'input-image';
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  /** Max file size in bytes for client-side validation. */
  maxSize?: number;
  uploadAction?: ActionSchema | ActionSchema[];
  /** Action dispatched to delete an uploaded file on the server. */
  deleteAction?: ActionSchema | ActionSchema[];
  valueMode?: UploadValueMode;
  previewMode?: 'thumbnail' | 'fill';
  /**
   * Crop extension point — reserved for a future crop workbench. The first
   * version exposes the slot but does not implement the workbench (design §11).
   */
  crop?: SchemaObject;
  buttonText?: string;
  /** Action triggered when a file is rejected (e.g. exceeds maxSize). */
  onReject?: ActionSchema;
  /** Action triggered when the user removes an existing file from the list. */
  onDelete?: ActionSchema;
  /** Action triggered after a server-side delete succeeds. */
  onDeleteSuccess?: ActionSchema;
  /** Action triggered after a server-side delete fails. */
  onDeleteFail?: ActionSchema;
}

export const uploadFieldRules: SchemaFieldRule[] = [
  { key: 'placeholder', kind: 'prop' },
  { key: 'multiple', kind: 'prop', valueType: 'boolean' },
  { key: 'accept', kind: 'prop' },
  { key: 'maxFiles', kind: 'prop' },
  { key: 'maxSize', kind: 'prop' },
  { key: 'uploadAction', kind: 'prop' },
  { key: 'deleteAction', kind: 'prop' },
  { key: 'valueMode', kind: 'prop' },
  { key: 'buttonText', kind: 'prop' },
  { key: 'onReject', kind: 'event' },
  { key: 'onDelete', kind: 'event' },
  { key: 'onDeleteSuccess', kind: 'event' },
  { key: 'onDeleteFail', kind: 'event' },
];

export const imageFieldRules: SchemaFieldRule[] = [
  ...uploadFieldRules,
  { key: 'previewMode', kind: 'prop' },
  { key: 'crop', kind: 'prop' },
];

export type UploadItemState =
  | { status: 'pending'; id: string; name: string }
  | { status: 'error'; id: string; name: string; message: string }
  | { status: 'done'; id: string; name: string; item: UploadResultItem };

export interface NormalizedUploadValue {
  value: unknown;
  items: UploadResultItem[];
}

/**
 * Fold a list of successful upload results into the field value per `valueMode`
 * and `multiple`. Failed/missing results are dropped (the field value is never
 * polluted by a failed upload — design Failure Paths).
 */
export function normalizeUploadValue(
  items: UploadResultItem[],
  mode: UploadValueMode,
  multiple: boolean,
): unknown {
  const asEntry = (item: UploadResultItem): unknown =>
    mode === 'url' ? item.url : item;
  const forceArray = multiple || mode === 'array';

  if (forceArray) {
    return items.map(asEntry);
  }

  if (items.length === 0) {
    return undefined;
  }

  return asEntry(items[0]!);
}

/**
 * Read the field value back into a list of {@link UploadResultItem} for display
 * (file list / image thumbnails).
 */
export function readUploadValue(
  value: unknown,
  multiple: boolean,
): UploadResultItem[] {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const coerce = (entry: unknown): UploadResultItem | undefined => {
    if (typeof entry === 'string') {
      return { url: entry };
    }
    if (entry && typeof entry === 'object' && typeof (entry as UploadResultItem).url === 'string') {
      return entry as UploadResultItem;
    }
    return undefined;
  };

  if (multiple && Array.isArray(value)) {
    return value.map(coerce).filter((v): v is UploadResultItem => Boolean(v));
  }

  if (Array.isArray(value)) {
    return value
      .map(coerce)
      .filter((v): v is UploadResultItem => Boolean(v))
      .slice(0, 1);
  }

  const single = coerce(value);
  return single ? [single] : [];
}
