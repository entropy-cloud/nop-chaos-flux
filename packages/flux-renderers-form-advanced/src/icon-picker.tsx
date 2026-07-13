import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormState,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { Button, cn, Input, Popover, PopoverContent, PopoverTrigger } from '@nop-chaos/ui';
import { icons, SearchIcon, XIcon } from 'lucide-react';
import {
  formFieldRules,
  shouldValidateOn,
  useFieldPresentation,
} from '@nop-chaos/flux-renderers-form';
import { normalizeIconName, resolveLucideIcon } from '@nop-chaos/ui';

export interface IconPickerSchema extends BaseSchema {
  type: 'icon-picker';
  name?: string;
  label?: string;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean | string;
  readOnly?: boolean;
  required?: boolean | string;
  defaultValue?: string;
  value?: string;
}

const VISIBLE_STEP = 200;

function pascalToKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const ICON_NAMES: string[] = Object.keys(icons)
  .map((key) => pascalToKebab(key))
  .filter(Boolean)
  .sort();

function matchIcon(value: string | undefined, iconName: string): boolean {
  if (!value) return false;
  const normalized = normalizeIconName(value);
  return normalized === iconName;
}

export function IconPickerRenderer(props: RendererComponentProps<IconPickerSchema>) {
  const schemaProps = props.props as IconPickerSchema;
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = typeof schemaProps.name === 'string' ? schemaProps.name : '';
  const hasName = name.length > 0;
  const placeholder = typeof schemaProps.placeholder === 'string' ? schemaProps.placeholder : '选择图标';
  const searchable = schemaProps.searchable !== false;
  const clearable = schemaProps.clearable !== false;

  const presentation = useFieldPresentation(name, currentForm, {
    disabled: schemaProps.disabled === true,
    required: schemaProps.required === true,
    readOnly: schemaProps.readOnly === true,
  });

  const formValue = useCurrentFormState(
    (state) => (currentForm && hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (currentForm || !hasName ? undefined : getIn(scopeData, name)),
    Object.is,
    { enabled: Boolean(!currentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const rawFieldValue = currentForm ? formValue : scopeValue;
  const currentValue = typeof rawFieldValue === 'string' ? rawFieldValue : undefined;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [visibleCount, setVisibleCount] = React.useState(VISIBLE_STEP);

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;

  const filteredIcons = React.useMemo(() => {
    if (query.trim() === '') return ICON_NAMES;
    const q = query.trim().toLowerCase();
    return ICON_NAMES.filter((name) => name.includes(q));
  }, [query]);

  const visibleIcons = React.useMemo(
    () => filteredIcons.slice(0, visibleCount),
    [filteredIcons, visibleCount],
  );

  const hasMore = visibleCount < filteredIcons.length;

  const writeValue = React.useCallback(
    (next: unknown) => {
      if (currentForm && name) {
        if (!currentForm.isTouched(name)) {
          currentForm.touchField(name);
        }
        currentForm.setValue(name, next);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
        return;
      }
      scope.update(name, next);
    },
    [currentForm, name, scope],
  );

  const selectIcon = React.useCallback(
    (iconName: string) => {
      if (interactionDisabled) return;
      writeValue(iconName);
      setOpen(false);
      setQuery('');
      setVisibleCount(VISIBLE_STEP);
    },
    [interactionDisabled, writeValue],
  );

  const clearValue = React.useCallback(() => {
    if (interactionDisabled) return;
    writeValue(undefined);
  }, [interactionDisabled, writeValue]);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
      setVisibleCount(VISIBLE_STEP);
    }
  }, []);

  if (!props.meta.visible) {
    return null;
  }

  const selectedName = currentValue ? normalizeIconName(currentValue) : undefined;
  const selectedIcon = selectedName ? resolveLucideIcon(selectedName) : null;

  return (
    <div
      className={cn('nop-icon-picker', 'flex items-center gap-2', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={interactionDisabled}
              aria-haspopup="listbox"
              aria-expanded={open}
              data-slot="icon-picker-trigger"
            />
          }
        >
          {selectedIcon ? (
            <span className="flex items-center gap-2">
              {React.createElement(selectedIcon, { className: 'size-4' })}
              <span className="text-sm">{selectedName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {searchable && (
            <div className="border-b p-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={query}
                  placeholder="搜索图标..."
                  className="h-8 pl-8"
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setVisibleCount(VISIBLE_STEP);
                  }}
                />
              </div>
            </div>
          )}
          <div className="grid max-h-72 grid-cols-6 gap-1 overflow-y-auto p-2">
            {visibleIcons.length === 0 ? (
              <div className="col-span-6 py-6 text-center text-sm text-muted-foreground">
                无匹配项
              </div>
            ) : (
              visibleIcons.map((iconName) => {
                const IconComp = resolveLucideIcon(iconName);
                const isSelected = matchIcon(currentValue, iconName);
                return (
                  <button
                    key={iconName}
                    type="button"
                    className={cn(
                      'flex size-8 items-center justify-center rounded hover:bg-accent',
                      isSelected && 'bg-accent text-accent-foreground ring-1 ring-primary',
                    )}
                    title={iconName}
                    onClick={() => selectIcon(iconName)}
                  >
                    <IconComp className="size-4" />
                  </button>
                );
              })
            )}
          </div>
          {hasMore && (
            <div className="border-t p-2 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
              >
                显示更多 ({filteredIcons.length - visibleCount})
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {clearable && currentValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={interactionDisabled}
          aria-label="清空"
          onClick={clearValue}
          data-slot="icon-picker-clear"
        >
          <XIcon className="size-4" />
        </Button>
      )}

      <input
        type="hidden"
        data-testid="icon-picker-value"
        value={currentValue ?? ''}
        readOnly
      />
    </div>
  );
}

export const iconPickerRendererDefinition: RendererDefinition = {
  type: 'icon-picker',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: IconPickerRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'placeholder', kind: 'prop' },
    { key: 'searchable', kind: 'prop', valueType: 'boolean' },
    { key: 'clearable', kind: 'prop', valueType: 'boolean' },
    { key: 'disabled', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'defaultValue', kind: 'prop' },
  ],
  frameRootTag: 'div',
};
