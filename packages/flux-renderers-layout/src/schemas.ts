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
  /** Step is skippable (does not block linear progress when omitted from commit chain) */
  optional?: SchemaValue;
  /** Lifecycle action fired before entering this step */
  beforeEnter?: ActionSchema | ActionSchema[];
  /** Lifecycle action fired before leaving this step */
  beforeLeave?: ActionSchema | ActionSchema[];
}

export interface WizardSchema extends BaseSchema {
  type: 'wizard';
  /** Renderer-owned structured step list (declaration order = navigation order). */
  steps: WizardStepSchema[];
  /** Current step key or index (1-based index when numeric and no matching key) */
  value?: string | number;
  /** Initial current step value when `value` is not provided */
  defaultValue?: string | number;
  /** Step-switching ownership: local controlled (renderer maintains interaction state) */
  valueOwnership?: 'local' | 'controlled' | 'scope';
  /** Scope path publishing the writable current-step value */
  valueStatePath?: string;
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
