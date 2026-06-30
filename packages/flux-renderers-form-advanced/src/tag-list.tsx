import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import {
  useCurrentFormFieldState,
  useCurrentValidationScope,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import {
  formFieldRules,
  resolveFieldLabelText,
  shouldValidateOn,
  shouldValidateOnOwner,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import type { TagListSchema } from '@nop-chaos/flux-renderers-form';
import { WrappedFieldAction } from './wrapped-field-action.js';

export function TagListRenderer(props: RendererComponentProps<TagListSchema>) {
  const name = String(props.props.name ?? '');
  const required = props.props.required ?? false;
  const {
    currentForm,
    scope,
    value: boundValue,
    presentation,
  } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required,
    readOnly: props.props.readOnly,
  });
  const value = Array.isArray(boundValue) ? boundValue.map((item) => String(item)) : [];
  const labelText = resolveFieldLabelText(props, name);
  const tags = Array.isArray(props.props.tags) ? (props.props.tags as string[]) : [];
  const currentValidationScope = useCurrentValidationScope();
  const _fieldState = useCurrentFormFieldState(name, { path: name, ownerPath: name });

  const syncErrorVisibility = React.useCallback(() => {
    if (!name) {
      return;
    }

    if (currentForm && shouldValidateOn(name, currentForm, 'change')) {
      void currentForm.validateField(name, 'change');
      return;
    }

    if (currentValidationScope?.touchField && shouldValidateOnOwner(name, currentValidationScope, 'change')) {
      void currentValidationScope.validateAt(name, 'change');
    }
  }, [currentForm, currentValidationScope, name]);

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
  }, [currentForm, currentValidationScope, labelText, name, required, scope]);

  return (
    <div
      className={cn('nop-tag-list', 'flex flex-wrap gap-2.5', props.meta.className)}
      data-slot="tag-list-control"
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
                if (
                  currentValidationScope &&
                  shouldValidateOnOwner(name, currentValidationScope, 'change')
                ) {
                  void currentValidationScope.validateAt(name, 'change');
                }
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
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: TagListRenderer,
  wrap: true,
  frameRootTag: 'div',
  fields: formFieldRules,
};
