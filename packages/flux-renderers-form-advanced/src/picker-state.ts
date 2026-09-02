/**
 * Fixed state-publish path names inside the picker popup surface's local
 * scope. Instance isolation comes from scope locality (popup content renders
 * under the picker instance's own pathSuffix), NOT from dynamic key mangling
 * — every picker instance uses the same fixed names.
 *
 * The binding protocol has exactly ONE channel: scope state variables.
 * Generic selectable content (CRUD / list / tree) publishes its selection to
 * whatever path its OWN config declares (`selectionStatePath` — a capability
 * of the content control itself); schema authors / converters point that
 * config at these well-known names when the content is used as picker popup.
 * The picker reads only its own fixed variables at Confirm and knows nothing
 * about what the content is.
 */
export const PICKER_SELECTION_STATE_PATH = '$_picker.selection';
export const PICKER_ROWS_STATE_PATH = '$_picker.rows';
