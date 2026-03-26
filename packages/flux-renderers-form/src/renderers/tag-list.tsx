import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import {
  formLabelFieldRule,
  readCheckboxGroupValue,
  resolveFieldLabelContent,
  resolveFieldLabelText,
  useFieldPresentation
} from '../field-utils';
import type { TagListSchema } from '../schemas';
import { FieldHint, FieldLabel } from './shared';

export function TagListRenderer(props: RendererComponentProps<TagListSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = readCheckboxGroupValue(scope, name);
  const presentation = useFieldPresentation(name, currentForm);
  const labelContent = resolveFieldLabelContent(props);
  const labelText = resolveFieldLabelText(props, name);
  const tags = Array.isArray(props.props.tags) ? (props.props.tags as string[]) : [];

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
    });
  }, [currentForm, labelText, name]);

  return (
    <label className={presentation.className}>
      <FieldLabel content={labelContent} />
      <div className="nop-tag-list">
        {tags.map((tag) => {
          const active = value.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              className={active ? 'nop-tag nop-tag--active' : 'nop-tag'}
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
            </button>
          );
        })}
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        validating={presentation.fieldState.validating}
        showError={presentation.showError}
      />
    </label>
  );
}

export const tagListRendererDefinition: RendererDefinition = {
  type: 'tag-list',
  component: TagListRenderer,
  fields: [formLabelFieldRule]
};

