import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import {
  useCurrentFormFieldState,
  useCurrentFormModelGeneration,
  useCurrentValidationScope,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  resolveFieldLabelText,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import type { TagListSchema } from '@nop-chaos/flux-renderers-form';
import { WrappedFieldAction } from './wrapped-field-action.js';

export function TagListRenderer(props: RendererComponentProps<TagListSchema>) {
  const name = String(props.props.name ?? '');
  const required = Boolean(props.props.required);
  const {
    currentForm,
    scope,
    value: boundValue,
    presentation,
  } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required,
    readOnly: Boolean(props.props.readOnly),
  });
  const value = Array.isArray(boundValue) ? boundValue.map((item) => String(item)) : [];
  const labelText = resolveFieldLabelText(props, name);
  const tags = Array.isArray(props.props.tags) ? (props.props.tags as string[]) : [];
  const modelGeneration = useCurrentFormModelGeneration();
  const currentValidationScope = useCurrentValidationScope();
  const fieldState = useCurrentFormFieldState(name, { path: name, ownerPath: name });

  const syncErrorVisibility = React.useCallback(() => {
    if (!name) {
      return;
    }

    if (currentForm && (currentForm.isTouched(name) || fieldState.submitting)) {
      void currentForm.validateField(name);
      return;
    }

    if (currentValidationScope?.touchField && fieldState.touched) {
      void currentValidationScope.validateAt(name, 'change');
    }
  }, [currentForm, currentValidationScope, fieldState.submitting, fieldState.touched, name]);

  React.useEffect(() => {
    const owner = currentForm ?? currentValidationScope;

    if (!owner || !name) {
      return;
    }

    return owner.registerField({
      path: name,
      getValue() {
        return (owner.scope ?? scope).get(name);
      },
      validate() {
        const currentValue = (owner.scope ?? scope).get(name);
        const currentTags = Array.isArray(currentValue)
          ? currentValue.map((item) => String(item))
          : [];

        if (required && currentTags.length === 0) {
          return [
            {
              path: name,
              rule: 'required',
              message: `${labelText} requires at least one tag`,
            },
          ];
        }

        return [];
      },
    }).unregister;
  }, [currentForm, currentValidationScope, labelText, modelGeneration, name, required, scope]);

  return (
    <div
      className={cn('nop-tag-list', 'flex flex-wrap gap-2.5', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
      {tags.map((tag) => {
        const active = value.includes(tag);

        return (
            <WrappedFieldAction
              key={tag}
              variant={active ? 'secondary' : 'outline'}
              size="sm"
              disabled={presentation.effectiveDisabled || presentation.readOnly}
                onFocus={() => {
                  if (currentForm && name) {
                    currentForm.visitField(name);
                } else if (currentValidationScope && name) {
                  currentValidationScope.visitField?.(name);
                }
              }}
              aria-pressed={active}
              onClick={() => {
                if (presentation.readOnly) {
                  return;
                }

                const nextValue = active ? value.filter((item) => item !== tag) : [...value, tag];

              if (currentForm) {
                if (!currentForm.isTouched(name)) {
                  currentForm.touchField(name);
                }
                currentForm.setValue(name, nextValue);
                syncErrorVisibility();
              } else {
                currentValidationScope?.touchField?.(name);
                scope.update(name, nextValue);
                void currentValidationScope?.validateAt(name, 'change');
              }
            }}
          >
            {tag}
          </WrappedFieldAction>
        );
      })}
    </div>
  );
}

export const tagListRendererDefinition: RendererDefinition = {
  type: 'tag-list',
  component: TagListRenderer,
  wrap: true,
  fields: [formLabelFieldRule],
};
