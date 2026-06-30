import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

// ───────────────────────────── W2a Wizard ─────────────────────────────

export interface WizardStepSchema extends SchemaObject {
  /** Step key (string/number). Falls back to the step index when absent. */
  key?: string | number;
  /** Step title (value-or-region) */
  title?: SchemaValue | SchemaInput;
  /** Step description (value-or-region) */
  description?: SchemaValue | SchemaInput;
  /** Step body region — renders only when this step is active (unless mountOnEnter keeps it mounted) */
  body?: SchemaInput;
  /** Step-level action region (replaces default Next/Prev footer) */
  actions?: SchemaInput;
  /** Step visibility (expression) — hidden steps are skipped in navigation */
  visible?: SchemaValue;
  /** Step disabled (expression) — disabled steps cannot be entered */
  disabled?: SchemaValue;
  /** Lifecycle action fired before entering this step */
  beforeEnter?: ActionSchema | ActionSchema[];
  /** Lifecycle action fired before leaving this step */
  beforeLeave?: ActionSchema | ActionSchema[];
}

export interface WizardSchema extends BaseSchema {
  type: 'wizard';
  /** Renderer-owned structured step list (declaration order = navigation order). */
  steps: WizardStepSchema[];
  /**
   * Initial current step key or index (1-based index when numeric and no matching key).
   * Seed only — step navigation is local controlled interaction state (renderer-maintained);
   * runtime changes to `value` are NOT reactive. The render-read-only status summary is
   * published via `statusPath`.
   */
  value?: string | number;
  /** Initial current step value when `value` is not provided (seed only, non-reactive). */
  defaultValue?: string | number;
  /** Scope path publishing the read-only wizard status summary */
  statusPath?: string;
  /** Linear mode (default true): uncommitted steps cannot be jumped to unless `allowStepJump` is set */
  linear?: boolean;
  /** Allow non-linear step jumping even when `linear=true` */
  allowStepJump?: boolean;
  /** Mount step body on first enter (keep mounted after) */
  mountOnEnter?: boolean;
  /** Unmount step body when it exits */
  unmountOnExit?: boolean;
  onChange?: ActionSchema;
  onStepCommit?: ActionSchema | ActionSchema[];
  onComplete?: ActionSchema | ActionSchema[];
  onStepError?: ActionSchema | ActionSchema[];
}

export type WizardLastCommitStatus =
  | 'idle'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'timedOut'
  | 'validationError';

/**
 * Wizard status summary published via `statusPath`.
 * Layered per design §6: interaction state (currentStepKey/Index/canGoNext/canGoPrev) and
 * semantic lifecycle state (committing/validating/lastCommitStatus) are intentionally separated
 * — never collapsed into a single broad object.
 */
export interface WizardStatusSummary {
  kind: 'wizard';
  currentStepKey?: string | number;
  currentStepIndex: number;
  stepCount: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  committing: boolean;
  validating: boolean;
  lastCommitStatus: WizardLastCommitStatus;
  stepError?: string;
}

// ───────────────────────────── W3a Grid ─────────────────────────────

export interface GridItemSchema extends SchemaObject {
  /** Grid item body region */
  body?: SchemaInput;
  /** Number of columns to span (normalized/clamped to valid range) */
  colSpan?: number;
  /** Number of rows to span (normalized/clamped to valid range) */
  rowSpan?: number;
}

export interface GridResponsiveColumns extends SchemaObject {
  /** Column count for the small-screen bucket (viewport < 768px). Falls back to base `columns` when absent. */
  sm?: number;
  /** Column count for the large-screen bucket (viewport ≥ 768px). Falls back to `lg` then base `columns`. */
  md?: number;
  /** Column count for the large-screen bucket (viewport ≥ 768px). Falls back to `md` then base `columns`. */
  lg?: number;
}

export interface GridSchema extends BaseSchema {
  type: 'grid';
  /** Grid items collection */
  items?: GridItemSchema[];
  /** Number of columns (number → repeat(N, 1fr); string → raw grid-template-columns) */
  columns?: number | string;
  /**
   * Per-breakpoint column overrides. When provided, the renderer switches the column
   * count based on `useIsMobile()` (< 768px → `sm`; ≥ 768px → `lg ?? md`), each falling
   * back to the base `columns` value when unset. Only applies a numeric override; a
   * string `columns` is left untouched unless a numeric breakpoint value resolves.
   */
  responsiveColumns?: GridResponsiveColumns;
  /** Gap between grid items (number → px; string → raw CSS) */
  gap?: number | string;
  /** CSS grid-auto-flow value */
  autoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
  /** CSS align-items value */
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  /** CSS justify-items value */
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
}

// ───────────────────────────── W3a Collapse ─────────────────────────────

export interface CollapseItemSchema extends SchemaObject {
  /** Collapse item key (falls back to index) */
  key?: string | number;
  /** Collapse item title (value-or-region) */
  title?: SchemaValue | SchemaInput;
  /** Collapse item body region */
  body?: SchemaInput;
  /** Item disabled (cannot toggle) */
  disabled?: SchemaValue;
}

export interface CollapseSchema extends BaseSchema {
  type: 'collapse';
  /** Collapse panel items collection */
  items: CollapseItemSchema[];
  /** Currently expanded key(s) — single key when multiple=false, array of keys when multiple=true */
  value?: string | number | (string | number)[];
  /** Initial expanded value when `value` is not provided */
  defaultValue?: string | number | (string | number)[];
  /** Expand-state ownership: local (renderer state) / controlled (parent drives) / scope (valueStatePath) */
  valueOwnership?: 'local' | 'controlled' | 'scope';
  /** Scope path publishing the writable expand-state value */
  valueStatePath?: string;
  /** Allow multiple panels open simultaneously (default true) */
  multiple?: boolean;
  /** Whether each panel can re-collapse itself (default true) */
  collapsible?: boolean;
  onChange?: ActionSchema;
}

// ───────────────────────────── W3b Button Group ─────────────────────────────

export interface ButtonGroupItemSchema extends SchemaObject {
  /** Item key (used for selection; falls back to index) */
  key?: string | number;
  /** Button label */
  label?: string;
  /** Button variant override (falls back to group-level variant) */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  /** Action dispatched on click (no action → static button) */
  action?: ActionSchema | ActionSchema[];
  /** Disabled flag */
  disabled?: boolean;
}

export interface ButtonGroupSchema extends BaseSchema {
  type: 'button-group';
  /** Button items (pure value prop — no nested regions) */
  items: ButtonGroupItemSchema[];
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Default button variant for all items */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  /** Button size */
  size?: 'default' | 'xs' | 'sm' | 'lg';
  /** Selection mode: none (pure actions), single, multiple (toggle-like selection) */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** Initial selected key(s) — seed only. Selection is local controlled state (renderer-maintained, non-reactive to runtime value changes). */
  value?: string | number | (string | number)[];
  /** Initial selected value when `value` is not provided (seed only, non-reactive) */
  defaultValue?: string | number | (string | number)[];
  onChange?: ActionSchema;
}

// ───────────────────────────── W3b Dropdown Button ─────────────────────────────

export interface DropdownButtonItemSchema extends SchemaObject {
  /** Menu item key */
  key?: string | number;
  /** Menu item label */
  label?: string;
  /** Action dispatched on click */
  action?: ActionSchema | ActionSchema[];
  /** Disabled flag */
  disabled?: boolean;
  /** Destructive styling */
  destructive?: boolean;
}

export interface DropdownButtonSchema extends BaseSchema {
  type: 'dropdown-button';
  /** Main button label (value-or-region, inherits string from BaseSchema; compiler extracts region) */
  // label inherited from BaseSchema as string; declared as value-or-region in fields
  /** Icon name (Lucide) */
  icon?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  /** Button size */
  size?: 'default' | 'xs' | 'sm' | 'lg';
  /** Menu items (pure value prop — no nested regions) */
  items?: DropdownButtonItemSchema[];
  /** Menu open trigger */
  trigger?: 'click' | 'hover';
  /** Disabled flag */
  disabled?: boolean;
}

// ───────────────────────────── W4b Steps ─────────────────────────────

export type StepsItemStatus = 'wait' | 'process' | 'finish' | 'error';

export interface StepsItemSchema extends SchemaObject {
  /** Step key/value (falls back to index when absent). */
  value?: string | number;
  /** Alias of `value`. */
  key?: string | number;
  /** Step title. */
  title?: string;
  /** Step description rendered beneath the title. */
  description?: string;
  /** Explicit step status override; otherwise derived from the current step value. */
  status?: StepsItemStatus;
  /** Disabled steps cannot be entered. */
  disabled?: boolean;
}

export interface StepsSchema extends BaseSchema {
  type: 'steps';
  /** Step items collection (pure value prop — no nested regions). */
  items: StepsItemSchema[];
  /** Current step key/value (or numeric index when no key matches). */
  value?: string | number;
  /** Initial current step value when `value` is not provided. */
  defaultValue?: string | number;
  /** Current-step ownership: local / controlled / scope (scope requires `valueStatePath`). */
  valueOwnership?: 'local' | 'controlled' | 'scope';
  /** Scope path publishing the writable current-step value. */
  valueStatePath?: string;
  /** Layout orientation (default horizontal). */
  orientation?: 'horizontal' | 'vertical';
  onChange?: ActionSchema;
}

// ───────────────────────────── W4b Timeline ─────────────────────────────

export type TimelineItemLevel =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type TimelineMode = 'left' | 'right' | 'alternate';

export interface TimelineItemSchema extends SchemaObject {
  /** Timestamp/label shown beside the event (value-or-region candidate; plain string here). */
  time?: string;
  /** Event title. */
  title?: string;
  /** Event detail/body text. */
  detail?: string;
  /** Lucide icon name rendered in the event marker. */
  icon?: string;
  /** Semantic level driving the marker color. */
  level?: TimelineItemLevel;
}

export interface TimelineSchema extends BaseSchema {
  type: 'timeline';
  /** Event items collection (pure value prop — no nested regions). Display-only, no owner state. */
  items: TimelineItemSchema[];
  /** Content placement relative to the axis (default left). */
  mode?: TimelineMode;
  /** Layout orientation (default vertical). */
  orientation?: 'horizontal' | 'vertical';
  /** Render items in reverse chronological order. */
  reverse?: boolean;
}
