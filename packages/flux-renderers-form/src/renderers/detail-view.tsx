import React from 'react';
import type {
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
  DrawerTitle,
  cn
} from '@nop-chaos/ui';
import type { DetailViewSchema } from './composite-schemas';
import { resolveFieldLabelContent } from '../field-utils';
import { FieldLabel } from './shared';

export function DetailViewRenderer(props: RendererComponentProps<DetailViewSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const schema = props.schema as DetailViewSchema;
  const readOnly = Boolean(props.props.readOnly ?? schema.readOnly);
  const scopePath = schema.scopePath ?? (typeof schema.name === 'string' ? schema.name : undefined);
  const staticData = schema.data as Record<string, unknown> | undefined;
  const surfaceMode = (schema.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schema.surface as { title?: string } | undefined)?.title ?? '';
  const triggerLabel = String(props.props.triggerLabel ?? schema.triggerLabel ?? 'Edit');

  const labelContent = resolveFieldLabelContent(props);

  const scopeProjectedValue = useScopeSelector(
    (data) => (scopePath ? (data as Record<string, unknown>)[scopePath] : undefined),
    Object.is
  );

  function getInitialValues(): Record<string, unknown> {
    if (staticData) {
      return { ...staticData };
    }
    if (scopePath && scopeProjectedValue !== undefined && typeof scopeProjectedValue === 'object' && scopeProjectedValue !== null) {
      return { ...(scopeProjectedValue as Record<string, unknown>) };
    }
    if (scopePath && scopeProjectedValue !== undefined) {
      return { __value: scopeProjectedValue };
    }
    return {};
  }

  const [open, setOpen] = React.useState(false);
  const [draftForm, setDraftForm] = React.useState<FormRuntime | undefined>(undefined);
  const [confirming, setConfirming] = React.useState(false);
  const [draftError, setDraftError] = React.useState<string | undefined>(undefined);

  function handleOpen() {
    if (readOnly) return;

    const newDraftForm = runtime.createFormRuntime({
      id: `detail-view-draft:${scopePath ?? 'static'}:${Date.now()}`,
      initialValues: getInitialValues(),
      parentScope,
      validation: props.templateNode.validationPlan
    });

    setDraftForm(newDraftForm);
    setDraftError(undefined);
    setOpen(true);
  }

  async function applyCommitResult(draftValues: Record<string, unknown>) {
    if (!parentForm && !scopePath) return;

    if (scopePath) {
      if ('patch' in draftValues && Array.isArray(draftValues.patch)) {
        const patches = draftValues.patch as Array<{ path: string; value: unknown }>;
        for (const p of patches) {
          if (parentForm) {
            parentForm.setValue(`${scopePath}.${p.path}`, p.value);
          } else {
            parentScope.update(`${scopePath}.${p.path}`, p.value);
          }
        }
      } else if ('updates' in draftValues && typeof draftValues.updates === 'object' && draftValues.updates !== null) {
        const updates = draftValues.updates as Record<string, unknown>;
        for (const [key, val] of Object.entries(updates)) {
          if (parentForm) {
            parentForm.setValue(`${scopePath}.${key}`, val);
          } else {
            parentScope.update(`${scopePath}.${key}`, val);
          }
        }
      } else {
        if (parentForm) {
          parentForm.setValue(scopePath, draftValues);
        } else {
          parentScope.update(scopePath, draftValues);
        }
      }

      if (parentForm && scopePath) {
        void parentForm.validateSubtree(scopePath);
      }
    } else {
      const updates = draftValues.updates !== undefined
        ? draftValues.updates as Record<string, unknown>
        : draftValues;

      if (parentForm) {
        for (const [key, val] of Object.entries(updates as Record<string, unknown>)) {
          parentForm.setValue(key, val);
        }
        void parentForm.validateAll('commit');
      } else {
        parentScope.merge(updates as Record<string, unknown>);
      }
    }
  }

  async function handleConfirm() {
    if (!draftForm) return;

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
      await applyCommitResult(draftValues);

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
          <div data-slot="detail-view-draft-body">
            {editContent}
          </div>
        </ScopeContext.Provider>
      </FormContext.Provider>
    );
  };

  const renderFooter = () => (
    <>
      {draftError && (
        <p data-slot="detail-view-draft-error">{draftError}</p>
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
            <div data-slot="detail-view-surface-body">
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
      className={cn('nop-detail-view', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      <FieldLabel content={labelContent} />
      <div data-slot="detail-view-viewer">
        {viewerContent}
      </div>
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpen}
        >
          {triggerLabel}
        </Button>
      )}
      {renderSurface()}
    </div>
  );
}

export const detailViewRendererDefinition: RendererDefinition = {
  type: 'detail-view',
  component: DetailViewRenderer as any,
  regions: ['viewer', 'content'],
  fields: [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' }
  ],
  scopePolicy: 'form',
  validation: {
    kind: 'container'
  }
};
