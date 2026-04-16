import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useCurrentFormModelGeneration } from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import {
  formLabelFieldRule,
  readCheckboxGroupValue,
  resolveFieldLabelContent,
  resolveFieldLabelText,
  useFormFieldController
} from '../field-utils';
import type { TagListSchema } from '../schemas';
import { FieldHint, FieldLabel } from './shared';

export function TagListRenderer(props: RendererComponentProps<TagListSchema>) {
  const name = String(props.props.name ?? '');
  const { currentForm, scope, presentation } = useFormFieldController(name, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });
  const value = readCheckboxGroupValue(scope, name);
  const labelContent = resolveFieldLabelContent(props);
  const labelText = resolveFieldLabelText(props, name);
  const tags = Array.isArray(props.props.tags) ? (props.props.tags as string[]) : [];
  const modelGeneration = useCurrentFormModelGeneration();

  const syncErrorVisibility = React.useCallback(() => {
    if (!currentForm || !name) {
      return;
    }

    if (currentForm.isTouched(name) || currentForm.store.getState().submitting) {
      void currentForm.validateField(name);
    }
  }, [currentForm, name]);

  React.useEffect(() => {
    if (!currentForm || !name) {
      return;
    }

    return currentForm.registerField({
      path: name,
      getValue() {
        return currentForm.scope.get(name);
      },
      validate() {
        const currentValue = currentForm.scope.get(name);
        const currentTags = Array.isArray(currentValue) ? currentValue.map((item) => String(item)) : [];

        if (currentTags.length === 0) {
          return [
            {
              path: name,
              rule: 'required',
              message: `${labelText} requires at least one tag`
            }
          ];
        }

        return [];
      }
    }).unregister;
  }, [currentForm, labelText, modelGeneration, name]);

  return (
    <div
      className={presentation.className}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div className="flex flex-wrap gap-2.5" data-slot="field-control">
        {tags.map((tag) => {
          const active = value.includes(tag);

          return (
            <Button
              key={tag}
              type="button"
              variant={active ? 'secondary' : 'outline'}
              size="sm"
              disabled={presentation.effectiveDisabled}
              onFocus={() => {
                if (currentForm && name) {
                  currentForm.visitField(name);
                }
              }}
              onClick={() => {
                const nextValue = active ? value.filter((item) => item !== tag) : [...value, tag];

                if (currentForm) {
                  if (!currentForm.isTouched(name)) {
                    currentForm.touchField(name);
                  }
                  currentForm.setValue(name, nextValue);
                  syncErrorVisibility();
                } else {
                  scope.update(name, nextValue);
                }
              }}
            >
              {tag}
            </Button>
          );
        })}
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        validating={presentation.fieldState.validating}
        showError={presentation.showError}
      />
    </div>
  );
}

export const tagListRendererDefinition: RendererDefinition = {
  type: 'tag-list',
  component: TagListRenderer,
  fields: [formLabelFieldRule]
};
