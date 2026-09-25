import type { InputSchema } from './schemas.js';

/**
 * Missing-components L2.3 (plan 507): handwritten signature field. The value
 * is the current canvas bitmap as a PNG data URL; the zero-stroke state is
 * always `undefined` (draw / undo-to-empty / clear all converge — plan 507
 * 值语义不变式).
 */
export interface InputSignatureSchema extends InputSchema {
  type: 'input-signature';
  /** Stroke color. Defaults to `#1f2937`. */
  penColor?: string;
  /** Stroke width in CSS pixels. Defaults to `2`. */
  penWidth?: number;
  /** Canvas height in CSS pixels. Defaults to `160`. */
  height?: number;
  /** Canvas background (rendered under the strokes, exported into the PNG). */
  backgroundColor?: string;
  /** Show the clear (✕) affordance on the toolbar. Defaults to `true`. */
  clearable?: boolean;
}
