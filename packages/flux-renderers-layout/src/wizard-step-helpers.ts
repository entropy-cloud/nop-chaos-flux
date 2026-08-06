import type { ActionSchema, RendererRenderOutput } from '@nop-chaos/flux-core';
import { unwrapBooleanLiteral, unwrapPreservedLiteral } from '@nop-chaos/flux-react';
import type { ReactNode } from 'react';
import type { WizardStepSchema } from './schemas.js';

// ───────────────────────────── Wizard step helpers ─────────────────────────────
// Pure step-navigation/visibility/lifecycle helpers extracted from
// wizard-renderer.tsx to keep the renderer within the workspace max-lines
// budget. `isStepDisabled` is re-exported by wizard-renderer.tsx to preserve
// its public API.

export function resolveStepKey(step: WizardStepSchema, index: number): string | number {
  if (step.key !== undefined && step.key !== null && step.key !== '') {
    return step.key;
  }
  return index;
}

export function toStepKeyString(key: string | number): string {
  return String(key);
}

export function isStepVisible(step: WizardStepSchema): boolean {
  return step.visible !== false && step.visible !== 'false' && step.visible !== 0;
}

export function isStepDisabled(step: WizardStepSchema): boolean {
  return unwrapBooleanLiteral(step.disabled);
}

export function findStepIndexByKey(steps: WizardStepSchema[], key: string | number): number {
  return steps.findIndex((step, idx) => resolveStepKey(step, idx) === key);
}

export function asReactNode(value: RendererRenderOutput): ReactNode {
  return value as ReactNode;
}

/**
 * Resolve a per-step lifecycle action (beforeEnter/beforeLeave).
 *
 * The schema-definition compiler delivers these `event`-kind fields as
 * `{ __nopPreserveLiteral: true, value }` envelopes (template-preserved so the
 * action args are never polluted by row/step-scope evaluation at compile
 * time). Unwrap before dispatch; bare authoring-form actions pass through.
 */
export function resolveStepLifecycleAction(
  step: WizardStepSchema,
  key: 'beforeEnter' | 'beforeLeave',
): ActionSchema | ActionSchema[] | undefined {
  const raw = step[key];
  const unwrapped = unwrapPreservedLiteral(raw);
  return (unwrapped ?? raw) as ActionSchema | ActionSchema[] | undefined;
}

/**
 * Compute the next navigable index, skipping hidden and (in linear mode) uncommitted steps.
 * Per design §10 + §12: linear mode blocks jumping past the furthest committed step unless
 * `allowStepJump` overrides. Hidden steps are skipped entirely: linear progression allows
 * reaching any target with no visible step between the high-water mark and the target
 * (C5.1 P1-3 — visible:false steps must not block linear advancement).
 */
export function computeCanGoTo(
  steps: WizardStepSchema[],
  targetIndex: number,
  linear: boolean,
  allowStepJump: boolean,
  furthestReachedIndex: number,
): boolean {
  if (targetIndex < 0 || targetIndex >= steps.length) return false;
  const target = steps[targetIndex];
  if (!isStepVisible(target)) return false;
  if (isStepDisabled(target)) return false;
  if (linear && !allowStepJump && targetIndex > furthestReachedIndex) {
    for (let i = furthestReachedIndex + 1; i < targetIndex; i += 1) {
      if (isStepVisible(steps[i])) return false;
    }
  }
  return true;
}
