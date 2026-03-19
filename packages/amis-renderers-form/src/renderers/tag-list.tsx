import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/amis-schema';
import { useCurrentForm, useRenderScope } from '@nop-chaos/amis-react';
import {
  readCheckboxGroupValue,
  renderFieldHint,
  useFieldPresentation
} from '../field-utils';
import type { TagListSchema } from '../schemas';

export function TagListRenderer(props: RendererComponentProps<TagListSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = readCheckboxGroupValue(scope, name);
  const presentation = useFieldPresentation(name, currentForm);
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
              message: `${props.meta.label ?? name} requires at least one tag`
            }
          ];
        }

        return [];
      }
    });
  }, [currentForm, name, props.meta.label]);

  return (
    <label className={presentation.className}>
      {props.meta.label ? <span className="na-field__label">{props.meta.label}</span> : null}
      <div className="na-tag-list">
        {tags.map((tag) => {
          const active = value.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              className={active ? 'na-tag na-tag--active' : 'na-tag'}
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
      {renderFieldHint({
        errorMessage: presentation.fieldState.error?.message,
        validating: presentation.fieldState.validating,
        showError: presentation.showError
      })}
    </label>
  );
}

export const tagListRendererDefinition: RendererDefinition = {
  type: 'tag-list',
  component: TagListRenderer
};
