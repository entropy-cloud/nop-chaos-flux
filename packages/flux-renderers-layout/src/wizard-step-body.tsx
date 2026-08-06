import { useEffect } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { WizardSchema, WizardStepSchema } from './schemas.js';
import { asReactNode } from './wizard-step-helpers.js';

// Compiled step (post-schema-compiler shape): carries regionKey references.
export interface CompiledWizardStep extends WizardStepSchema {
  titleRegionKey?: string;
  bodyRegionKey?: string;
  actionsRegionKey?: string;
}

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

export function WizardStepBody(props: WizardStepBodyProps) {
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
