import type { MouseEvent as ReactMouseEvent } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { CheckIcon, XIcon } from 'lucide-react';
import type { WizardSchema } from './schemas.js';
import type { CompiledWizardStep } from './wizard-step-body.js';
import {
  asReactNode,
  computeCanGoTo,
  isStepDisabled,
  resolveStepKey,
  toStepKeyString,
} from './wizard-step-helpers.js';

interface WizardStepNavItemProps {
  owner: RendererComponentProps<WizardSchema>;
  steps: CompiledWizardStep[];
  step: CompiledWizardStep;
  index: number;
  currentStepIndex: number;
  currentStepHasError: boolean;
  mode: 'horizontal' | 'vertical';
  linear: boolean;
  allowStepJump: boolean;
  furthestReached: number;
  onGoToStep: (index: number) => void;
}

// Per-step navigation item. Extracted from wizard-renderer.tsx to keep the
// renderer within the workspace max-lines budget (same pattern as
// wizard-step-body.tsx). Hidden steps never reach this component — the parent
// filters them out (C5.1 P1-3: hidden steps are not rendered as disabled nav
// items).
export function WizardStepNavItem(props: WizardStepNavItemProps) {
  const {
    owner,
    steps,
    step,
    index,
    currentStepIndex,
    currentStepHasError,
    mode,
    linear,
    allowStepJump,
    furthestReached,
    onGoToStep,
  } = props;

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
    typeof step.titleRegionKey === 'string' ? owner.regions[step.titleRegionKey] : undefined;
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
    ? (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onGoToStep(index);
      }
    : undefined;

  return (
    <li
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
}
