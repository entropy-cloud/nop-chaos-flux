import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition
} from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
  useRendererRuntime,
  useRenderScope,
  useScopeSelector,
  useCurrentFormState,
  FormContext,
  ScopeContext
} from '@nop-chaos/flux-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@nop-chaos/ui';
import type { DetailFieldSchema } from './composite-schemas';
import { formLabelFieldRule, resolveFieldLabelContent, useFieldPresentation } from '../field-utils';
import { FieldHint, FieldLabel } from './shared';

export function DetailFieldRenderer(props: RendererComponentProps<DetailFieldSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const schema = props.schema as DetailFieldSchema;
  const name = String(props.props.name ?? schema.name ?? '');
  const readOnly = Boolean(props.props.readOnly ?? schema.readOnly);
  const surfaceMode = (schema.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schema.surface as { title?: string } | undefined)?.title ?? '';
  const triggerLabel = String(props.props.triggerLabel ?? schema.triggerLabel ?? 'Edit');

  const presentation = useFieldPresentation(name, parentForm, { readOnly });
  const labelContent = resolveFieldLabelContent(props);

  const currentValue = useCurrentFormState(
    (state) => (name ? (state.values as Record<string, unknown>)[name] : undefined),
    Object.is
  );
  const scopeValue = useScopeSelector(
    (data) => (name ? (data as Record<string, unknown>)[name] : undefined),
    Object.is
  );
  const fieldValue = parentForm ? currentValue : scopeValue;

  const [open, setOpen] = React.useState(false);
  const [draftForm, setDraftForm] = React.useState<FormRuntime | undefined>(undefined);
  const [confirming, setConfirming] = React.useState(false);
  const [draftError, setDraftError] = React.useState<string | undefined>(undefined);

  function handleOpen() {
    if (readOnly || presentation.effectiveDisabled) return;

    const initialValues: Record<string, unknown> = typeof fieldValue === 'object' && fieldValue !== null
      ? { ...(fieldValue as Record<string, unknown>) }
      : { __value: fieldValue };

    const newDraftForm = runtime.createFormRuntime({
      id: `detail-field-draft:${name}:${Date.now()}`,
      initialValues,
      parentScope,
      validation: props.templateNode.validationPlan
    });

    setDraftForm(newDraftForm);
    setDraftError(undefined);
    setOpen(true);
  }

  async function handleConfirm() {
    if (!draftForm || !parentForm) return;

    setConfirming(true);
    setDraftError(undefined);

    try {
      const result = await draftForm.validateAll('submit');
      if (!result.ok) {
        setDraftError('Please fix validation errors before confirming.');
        return;
      }

      const rawDraftValues = draftForm.scope.readOwn() as Record<string, unknown> & { $form?: unknown };
      const draftValues = { ...rawDraftValues };
      delete draftValues.$form;
      const writeback = draftValues.__value !== undefined ? draftValues.__value : draftValues;

      parentForm.setValue(name, writeback);
      parentForm.touchField(name);
      void parentForm.validateField(name);

      setOpen(false);
      setDraftForm(undefined);
    } finally {
      setConfirming(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setDraftForm(undefined);
    setDraftError(undefined);
  }

  const viewerContent = resolveRendererSlotContent(props, 'viewer');
  const editContent = resolveRendererSlotContent(props, 'content');

  const draftScope = draftForm?.scope;

  const renderSurfaceContent = () => {
    if (!draftForm || !draftScope) return null;

    return (
      <FormContext.Provider value={draftForm}>
        <ScopeContext.Provider value={draftScope}>
          <div data-slot="detail-field-draft-body">
            {editContent}
          </div>
        </ScopeContext.Provider>
      </FormContext.Provider>
    );
  };

  const renderFooter = () => (
    <>
      {draftError && (
        <p data-slot="detail-field-draft-error">{draftError}</p>
      )}
      <Button type="button" variant="outline" onClick={handleCancel} disabled={confirming}>
        Cancel
      </Button>
      <Button type="button" onClick={() => void handleConfirm()} disabled={confirming}>
        {confirming ? 'Confirming...' : 'Confirm'}
      </Button>
    </>
  );

  const renderSurface = () => {
    if (surfaceMode === 'drawer') {
      return (
        <Drawer open={open} onOpenChange={(next) => { if (!next) handleCancel(); }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{surfaceTitle}</DrawerTitle>
            </DrawerHeader>
            <div data-slot="detail-field-surface-body">
              {renderSurfaceContent()}
            </div>
            <DrawerFooter>
              {renderFooter()}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={open} onOpenChange={(next) => { if (!next) handleCancel(); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{surfaceTitle}</DialogTitle>
          </DialogHeader>
          {renderSurfaceContent()}
          <DialogFooter>
            {renderFooter()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div
      className="nop-field"
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div data-slot="field-control">
        <div data-slot="detail-field-viewer">
          {viewerContent ?? <span>{fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}</span>}
        </div>
        {!readOnly && !presentation.effectiveDisabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpen}
          >
            {triggerLabel}
          </Button>
        )}
      </div>
      {renderSurface()}
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        showError={presentation.showError}
      />
    </div>
  );
}

export const detailFieldRendererDefinition: RendererDefinition = {
  type: 'detail-field',
  component: DetailFieldRenderer as any,
  regions: ['viewer', 'content'],
  fields: [formLabelFieldRule],
  scopePolicy: 'form',
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    }
  }
};
