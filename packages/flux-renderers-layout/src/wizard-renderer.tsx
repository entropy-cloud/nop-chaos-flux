import React, { useEffect, useMemo, useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { unwrapBooleanLiteral, useCurrentComponentRegistry, useStatusPathPublication } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import type {
  WizardLastCommitStatus,
  WizardSchema,
  WizardStatusSummary,
  WizardStepSchema,
} from './schemas.js';

// ───────────────────────────── Interaction state (step switching) ─────────────────────────────
// Per design §6.1: step navigation is the interaction owner layer. This is intentionally
// a SEPARATE state object from the lifecycle layer below — never collapse them.
interface WizardInteractionState {
  currentStepIndex: number;
}

// ───────────────────────────── Lifecycle state (step commit) ─────────────────────────────
// Per design §6.2: step commit / validation / completion is the semantic lifecycle owner layer.
// This MUST stay separate from interaction state — the closure gate (Phase 4 Exit Criteria)
// asserts that stepIndex and committing are NOT in the same state object.
interface WizardLifecycleState {
  committing: boolean;
  validating: boolean;
  lastCommitStatus: WizardLastCommitStatus;
  stepError: string | undefined;
}

const INITIAL_LIFECYCLE: WizardLifecycleState = {
  committing: false,
  validating: false,
  lastCommitStatus: 'idle',
  stepError: undefined,
};

// Compiled step (post-schema-compiler shape): carries regionKey references.
interface CompiledWizardStep extends WizardStepSchema {
  titleRegionKey?: string;
  bodyRegionKey?: string;
  actionsRegionKey?: string;
}

// ───────────────────────────── Helpers ─────────────────────────────

function resolveStepKey(step: WizardStepSchema, index: number): string | number {
  if (step.key !== undefined && step.key !== null && step.key !== '') {
    return step.key;
  }
  return index;
}

function toStepKeyString(key: string | number): string {
  return String(key);
}

function isStepVisible(step: WizardStepSchema): boolean {
  return step.visible !== false && step.visible !== 'false' && step.visible !== 0;
}

export function isStepDisabled(step: WizardStepSchema): boolean {
  return unwrapBooleanLiteral(step.disabled);
}

function findStepIndexByKey(steps: WizardStepSchema[], key: string | number): number {
  return steps.findIndex((step, idx) => resolveStepKey(step, idx) === key);
}

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

/**
 * Compute the next navigable index, skipping hidden and (in linear mode) uncommitted steps.
 * Per design §10 + §12: linear mode blocks jumping past the furthest committed step unless
 * `allowStepJump` overrides.
 */
function computeCanGoTo(
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
    return targetIndex === furthestReachedIndex + 1;
  }
  return true;
}

// ───────────────────────────── Step body view ─────────────────────────────

interface WizardStepBodyProps {
  owner: RendererComponentProps<WizardSchema>;
  step: CompiledWizardStep;
  index: number;
  isActive: boolean;
  mountOnEnter: boolean;
  unmountOnExit: boolean;
  hasBeenMounted: boolean;
  markMounted: () => void;
}

function WizardStepBody(props: WizardStepBodyProps) {
  const { owner, step, index, isActive, mountOnEnter, unmountOnExit, hasBeenMounted, markMounted } =
    props;

  useEffect(() => {
    if (isActive && !hasBeenMounted) {
      markMounted();
    }
  }, [isActive, hasBeenMounted, markMounted]);

  const shouldRender = isActive
    ? true
    : mountOnEnter && hasBeenMounted && !unmountOnExit;

  if (!shouldRender) return null;

  const bodyRegion =
    typeof step.bodyRegionKey === 'string' ? owner.regions[step.bodyRegionKey] : undefined;
  const content = bodyRegion ? asReactNode(bodyRegion.render()) : null;

  if (content === null || content === undefined || content === false) {
    return (
      <div
        data-slot="wizard-step-body"
        data-step-index={index}
        data-empty="true"
        hidden={!isActive ? true : undefined}
      >
        {content ?? null}
      </div>
    );
  }

  return (
    <div
      data-slot="wizard-step-body"
      data-step-index={index}
      data-active={isActive || undefined}
      hidden={!isActive ? true : undefined}
      className="flex flex-col gap-4"
    >
      {content}
    </div>
  );
}

// ───────────────────────────── Wizard root ─────────────────────────────

export function WizardRenderer(props: RendererComponentProps<WizardSchema>) {
  const schemaProps = props.props;
  const rawSteps = Array.isArray(schemaProps.steps)
    ? (schemaProps.steps as unknown as CompiledWizardStep[])
    : [];
  const steps = rawSteps;
  const stepCount = steps.length;
  const linear = schemaProps.linear !== false; // default true per design
  const allowStepJump = schemaProps.allowStepJump === true;
  const mountOnEnter = schemaProps.mountOnEnter === true;
  const unmountOnExit = schemaProps.unmountOnExit === true;
  const mode = schemaProps.mode === 'vertical' ? 'vertical' : 'horizontal';
  const componentRegistry = useCurrentComponentRegistry();

  const prevLabel =
    typeof schemaProps.actionPrevLabel === 'string'
      ? schemaProps.actionPrevLabel
      : t('flux.wizard.previous');
  const nextLabel =
    typeof schemaProps.actionNextLabel === 'string'
      ? schemaProps.actionNextLabel
      : t('flux.wizard.next');
  const finishLabel =
    typeof schemaProps.actionFinishLabel === 'string'
      ? schemaProps.actionFinishLabel
      : t('flux.wizard.complete');

  const statusPath =
    typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined;

  // LAYER 1: interaction state (step switching). Local controlled.
  const [interaction, setInteraction] = useState<WizardInteractionState>(() => {
    const initial =
      schemaProps.value !== undefined
        ? schemaProps.value
        : schemaProps.defaultValue !== undefined
          ? schemaProps.defaultValue
          : 0;
    if (typeof initial === 'number') {
      return { currentStepIndex: Math.max(0, Math.min(initial, Math.max(0, stepCount - 1))) };
    }
    const found = findStepIndexByKey(steps, initial);
    return { currentStepIndex: found >= 0 ? found : 0 };
  });

  // LAYER 2: lifecycle state (step commit / completion). Local controlled.
  // Kept deliberately separate from `interaction` per design §6 / Phase 4 Exit Criteria.
  const [lifecycle, setLifecycle] = useState<WizardLifecycleState>(INITIAL_LIFECYCLE);

  // Track the furthest step the user has reached, for linear-mode gating.
  // Updated inside the navigation handler (goToStep) — NOT via effect+setState,
  // so we avoid the react-hooks/set-state-in-effect violation while still
  // tracking high-water-mark progress.
  const [furthestReached, setFurthestReached] = useState<number>(interaction.currentStepIndex);

  // Track which step bodies have been mounted (for mountOnEnter/unmountOnExit).
  const [mountedSteps, setMountedSteps] = useState<ReadonlySet<number>>(
    () => new Set([interaction.currentStepIndex]),
  );
  const markStepMounted = React.useCallback((index: number) => {
    setMountedSteps((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const currentStepIndex = interaction.currentStepIndex;
  const currentStep = steps[currentStepIndex];
  const currentStepKey = currentStep ? resolveStepKey(currentStep, currentStepIndex) : undefined;

  const canGoPrev = useMemo(() => {
    for (let i = currentStepIndex - 1; i >= 0; i -= 1) {
      if (isStepVisible(steps[i]) && !isStepDisabled(steps[i])) return true;
    }
    return false;
  }, [currentStepIndex, steps]);

  const canGoNext = useMemo(() => {
    for (let i = currentStepIndex + 1; i < steps.length; i += 1) {
      if (computeCanGoTo(steps, i, linear, allowStepJump, furthestReached)) return true;
    }
    return false;
  }, [currentStepIndex, steps, linear, allowStepJump, furthestReached]);

  const isLastStep = currentStepIndex === stepCount - 1;

  const summary: WizardStatusSummary = useMemo(
    () => ({
      kind: 'wizard',
      currentStepKey,
      currentStepIndex,
      stepCount,
      canGoNext,
      canGoPrev,
      committing: lifecycle.committing,
      validating: lifecycle.validating,
      lastCommitStatus: lifecycle.lastCommitStatus,
      stepError: lifecycle.stepError,
    }),
    [
      currentStepKey,
      currentStepIndex,
      stepCount,
      canGoNext,
      canGoPrev,
      lifecycle.committing,
      lifecycle.validating,
      lifecycle.lastCommitStatus,
      lifecycle.stepError,
    ],
  );

  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, statusPath, summary);

  // ─────────── Navigation handlers (interaction layer) ───────────

  const goToStep = (targetIndex: number, options?: { skipLinearGate?: boolean }) => {
    if (targetIndex < 0 || targetIndex >= stepCount) return;
    if (targetIndex === currentStepIndex) return;
    const skipLinearGate = options?.skipLinearGate === true;
    if (
      !skipLinearGate &&
      !computeCanGoTo(steps, targetIndex, linear, allowStepJump, furthestReached)
    ) {
      return;
    }

    setInteraction({ currentStepIndex: targetIndex });
    // Update high-water-mark in the same handler (not in an effect) so render
    // derivations read a consistent value next pass.
    setFurthestReached((prev) => (targetIndex > prev ? targetIndex : prev));
    const targetKey = resolveStepKey(steps[targetIndex], targetIndex);
    void props.events.onChange?.(
      {
        type: 'wizard:change',
        currentStepKey: targetKey,
        currentStepIndex: targetIndex,
      },
      { scope: props.node.scope },
    );
  };

  const goNext = () => {
    if (!canGoNext) return;
    for (let i = currentStepIndex + 1; i < stepCount; i += 1) {
      if (computeCanGoTo(steps, i, linear, allowStepJump, furthestReached)) {
        goToStep(i);
        return;
      }
    }
  };

  const goPrev = () => {
    if (!canGoPrev) return;
    for (let i = currentStepIndex - 1; i >= 0; i -= 1) {
      if (isStepVisible(steps[i]) && !isStepDisabled(steps[i])) {
        goToStep(i, { skipLinearGate: true });
        return;
      }
    }
  };

  // ─────────── Commit handler (lifecycle layer — separated from navigation) ───────────

  const commitStep = async () => {
    if (lifecycle.committing) return;

    // Enter committing state — lifecycle layer ONLY, interaction state untouched.
    setLifecycle({
      committing: true,
      validating: false,
      lastCommitStatus: 'idle',
      stepError: undefined,
    });

    try {
      // ─── Step form validation (if step.formId is configured) ───
      const stepFormId = typeof currentStep?.formId === 'string' ? currentStep.formId : undefined;
      if (stepFormId && componentRegistry) {
        const formHandle = componentRegistry.resolve({ componentId: stepFormId });
        if (formHandle?.capabilities?.hasMethod?.('validate')) {
          setLifecycle((prev) => ({ ...prev, validating: true }));
          const validateResult = (await Promise.resolve(
            formHandle.capabilities.invoke('validate', undefined, {} as never),
          )) as { ok?: boolean };
          setLifecycle((prev) => ({ ...prev, validating: false }));

          if (!validateResult?.ok) {
            setLifecycle({
              committing: false,
              validating: false,
              lastCommitStatus: 'validationError',
              stepError: 'Validation failed',
            });
            void props.events.onStepError?.(
              {
                type: 'wizard:step-error',
                currentStepKey,
                currentStepIndex,
                reason: 'validation-failed',
              },
              { scope: props.node.scope },
            );
            return;
          }
        }
      }

      // ─── User-defined commit action ───
      const result = await props.events.onStepCommit?.(
        {
          type: 'wizard:step-commit',
          currentStepKey,
          currentStepIndex,
        },
        { scope: props.node.scope },
      );

      const ok = !result || (result as { ok?: boolean })?.ok !== false;

      if (!ok) {
        setLifecycle({
          committing: false,
          validating: false,
          lastCommitStatus: 'error',
          stepError: 'Step commit returned failure',
        });
        void props.events.onStepError?.(
          {
            type: 'wizard:step-error',
            currentStepKey,
            currentStepIndex,
            reason: 'commit-failed',
          },
          { scope: props.node.scope },
        );
        return;
      }

      setLifecycle({
        committing: false,
        validating: false,
        lastCommitStatus: 'success',
        stepError: undefined,
      });

      if (isLastStep) {
        void props.events.onComplete?.(
          {
            type: 'wizard:complete',
            currentStepKey,
            currentStepIndex,
          },
          { scope: props.node.scope },
        );
        return;
      }

      // Advance to next step — interaction layer mutation.
      goNext();
    } catch (error) {
      setLifecycle({
        committing: false,
        validating: false,
        lastCommitStatus: 'error',
        stepError: error instanceof Error ? error.message : String(error),
      });
      void props.events.onStepError?.(
        {
          type: 'wizard:step-error',
          currentStepKey,
          currentStepIndex,
          reason: 'commit-threw',
          error,
        },
        { scope: props.node.scope },
      );
    }
  };

  // ─────────── Step nav rendering ───────────

  const currentStepHasError = lifecycle.lastCommitStatus === 'error';

  const stepNav = steps.map((step, index) => {
    const stepKey = resolveStepKey(step, index);
    const isActive = index === currentStepIndex;
    const isPast = index < currentStepIndex;
    const reachable = computeCanGoTo(
      steps,
      index,
      linear,
      allowStepJump,
      furthestReached,
    );
    const titleRegion =
      typeof step.titleRegionKey === 'string' ? props.regions[step.titleRegionKey] : undefined;
    const titleContent = titleRegion ? asReactNode(titleRegion.render()) : null;
    const titleText =
      (typeof step.title === 'string' ? step.title : null) ??
      (typeof titleContent === 'string' ? titleContent : null) ??
      toStepKeyString(stepKey);
    const descText =
      typeof step.description === 'string' ? step.description : null;

    const stepStatus = isActive && currentStepHasError
      ? 'error'
      : isActive
        ? 'process' as const
        : isPast
          ? 'finish' as const
          : 'wait' as const;

    const clickable = reachable && !isActive && !isStepDisabled(step);
    const handleStepClick = clickable
      ? (event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          goToStep(index);
        }
      : undefined;

    return (
      <li
        key={toStepKeyString(stepKey)}
        data-slot="wizard-step-nav-item"
        data-step-index={index}
        data-status={stepStatus}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-slot="wizard-step-nav-button"
          data-step-index={index}
          data-active={isActive || undefined}
          data-past={isPast || undefined}
          data-reachable={reachable || undefined}
          data-disabled={isStepDisabled(step) || undefined}
          data-status={stepStatus}
          aria-current={isActive ? 'step' : undefined}
          disabled={!clickable && !isActive}
          onClick={handleStepClick}
          className={cn(
            'h-auto gap-1.5 px-3 py-2 text-sm',
            isActive
              ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
              : stepStatus === 'error'
                ? 'text-destructive hover:bg-destructive/10'
                : reachable
                  ? 'text-foreground hover:bg-muted'
                  : 'text-muted-foreground cursor-not-allowed',
            mode === 'vertical' && 'w-full justify-start',
          )}
        >
          <span
            data-slot="wizard-step-nav-marker"
            className={cn(
              'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs',
              stepStatus === 'process'
                ? 'bg-primary-foreground/20'
                : stepStatus === 'finish'
                  ? 'bg-primary/20 text-primary'
                  : stepStatus === 'error'
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-muted',
            )}
          >
            {stepStatus === 'finish' ? (
              <CheckIcon className="size-3" />
            ) : stepStatus === 'error' ? (
              <XIcon className="size-3" />
            ) : (
              index + 1
            )}
          </span>
          <span className="flex flex-col items-start text-left">
            <span data-slot="wizard-step-nav-title">{titleText}</span>
            {descText ? (
              <span
                data-slot="wizard-step-nav-description"
                className="text-xs font-normal opacity-70"
              >
                {descText}
              </span>
            ) : null}
          </span>
        </Button>
      </li>
    );
  });

  const currentActionsRegion = currentStep
    ? typeof currentStep.actionsRegionKey === 'string'
      ? props.regions[currentStep.actionsRegionKey]
      : undefined
    : undefined;
  const hasStepActions = Boolean(currentActionsRegion);

  return (
    <div
      className={cn('nop-wizard', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="wizard-root"
      data-current-step-index={currentStepIndex}
      data-current-step-key={currentStepKey !== undefined ? toStepKeyString(currentStepKey) : undefined}
      data-step-count={stepCount}
      data-committing={lifecycle.committing || undefined}
      data-last-commit-status={lifecycle.lastCommitStatus}
      data-mode={mode}
    >
      {stepCount > 0 ? (
        <nav data-slot="wizard-step-nav" aria-label={t('flux.wizard.stepNav')}>
          <ol
            className={cn(
              mode === 'vertical'
                ? 'flex flex-col gap-1'
                : 'flex flex-wrap items-center gap-1',
            )}
          >
            {stepNav}
          </ol>
        </nav>
      ) : null}

      <div
        data-slot="wizard-body-region"
        className={mode === 'vertical' ? 'mt-4' : 'mt-4'}
      >
        {stepCount === 0 ? (
          <div data-slot="wizard-empty">{t('flux.wizard.noSteps')}</div>
        ) : (
          steps.map((step, index) => (
            <WizardStepBody
              key={toStepKeyString(resolveStepKey(step, index))}
              owner={props}
              step={step}
              index={index}
              isActive={index === currentStepIndex}
              mountOnEnter={mountOnEnter}
              unmountOnExit={unmountOnExit}
              hasBeenMounted={mountedSteps.has(index)}
              markMounted={() => markStepMounted(index)}
            />
          ))
        )}
      </div>

      <div
        data-slot="wizard-actions"
        className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3"
      >
        {hasStepActions ? (
          <div data-slot="wizard-step-actions-region">
            {asReactNode(currentActionsRegion?.render() as RendererRenderOutput)}
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="wizard-prev"
              data-slot="wizard-prev-button"
              onClick={goPrev}
              disabled={!canGoPrev}
            >
              <ChevronLeftIcon className="size-4" />
              <span>{prevLabel}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid="wizard-next"
              data-slot="wizard-next-button"
              data-committing={lifecycle.committing || undefined}
              onClick={commitStep}
              disabled={lifecycle.committing}
            >
              {lifecycle.committing ? <span>{t('flux.wizard.committing')}</span> : null}
              {!lifecycle.committing ? (
                <span>{isLastStep ? finishLabel : nextLabel}</span>
              ) : null}
              {!lifecycle.committing && !isLastStep ? (
                <ChevronRightIcon className="size-4" />
              ) : null}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
