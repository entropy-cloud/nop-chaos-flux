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
  useScopeSelector
} from '@nop-chaos/flux-react';
import {
  Button,
  cn
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DetailViewSchema } from '../composite-field/composite-schemas';
import { formLabelFieldRule, resolveFieldLabelContent, FieldLabel } from '@nop-chaos/flux-renderers-form';
import { publishValidateResultErrors, runTransformIn, runTransformOut, runValidate } from './value-adaptation-helper';
import { DetailDraftBody, DetailDraftFooter, DetailSurface } from './detail-surface';

type BaseNodeInstance = RendererComponentProps['node'];

function disposeDraftForm(
  draftForm: FormRuntime | undefined,
  setDraftForm: React.Dispatch<React.SetStateAction<FormRuntime | undefined>>
) {
  draftForm?.dispose();
  setDraftForm(undefined);
}

export function DetailViewRenderer(props: RendererComponentProps<DetailViewSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const schema = props.schema as DetailViewSchema;
  const readOnly = Boolean(props.props.readOnly);
  const scopePath = schema.scopePath ?? (typeof schema.name === 'string' ? schema.name : undefined);
  const staticData = props.props.data as Record<string, unknown> | undefined;
  const surfaceMode = (schema.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schema.surface as { title?: string } | undefined)?.title ?? '';
  const triggerLabel = String(props.props.triggerLabel ?? 'Edit');
  const validationMessage = t('flux.common.detailDraftValidationError');
  const effectiveDisabled = Boolean(props.meta.disabled);

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

  const currentValue = React.useMemo(() => {
    if (staticData) {
      return staticData;
    }

    return scopeProjectedValue;
  }, [scopeProjectedValue, staticData]);

  const runAdaptationAction = React.useCallback(
    (actionSchema: DetailViewSchema['transformInAction']) =>
      props.helpers.dispatch(actionSchema as any, {
        scope: parentScope,
        form: parentForm ?? undefined,
        page: undefined,
        nodeInstance: props.node as BaseNodeInstance
      }),
    [parentForm, parentScope, props.helpers, props.node]
  );

  async function handleOpen() {
    if (effectiveDisabled) return;

    const adaptedValue = await runTransformIn(
      schema.transformInAction,
      {
        rawValue: currentValue,
        readOnly
      },
      runAdaptationAction
    );

    const initialValues = typeof adaptedValue === 'object' && adaptedValue !== null
      ? { ...(adaptedValue as Record<string, unknown>) }
      : adaptedValue !== undefined
        ? { __value: adaptedValue }
        : getInitialValues();

    const newDraftForm = runtime.createFormRuntime({
      id: `detail-view-draft:${scopePath ?? 'static'}:${Date.now()}`,
      initialValues,
      parentScope,
      validation: props.templateNode.validationPlan
    });

    setDraftForm(newDraftForm);
    setDraftError(undefined);
    setOpen(true);
  }

  async function applyCommitResult(draftValues: Record<string, unknown>) {
    const commitValue = Object.prototype.hasOwnProperty.call(draftValues, '__value')
      ? draftValues.__value
      : draftValues;

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
          parentForm.setValue(scopePath, commitValue);
        } else {
          parentScope.update(scopePath, commitValue);
        }
      }

      if (parentForm && scopePath) {
        void parentForm.validateSubtree(scopePath);
      }
    } else {
      const updates = draftValues.updates !== undefined
        ? draftValues.updates as Record<string, unknown>
        : commitValue;

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
    if (readOnly || !draftForm) return;

    setConfirming(true);
    setDraftError(undefined);

    try {
      const result = await draftForm.validateAll('submit');
      if (!result.ok) {
        setDraftError(validationMessage);
        return;
      }

      const rawDraftValues = draftForm.scope.readOwn() as Record<string, unknown> & { $form?: unknown };
      const draftValues = { ...rawDraftValues };
      delete draftValues.$form;
      const workingValue = draftValues.__value !== undefined ? draftValues.__value : draftValues;

      const validation = await runValidate(
        schema.validateValueAction,
        {
          workingValue,
          originalValue: currentValue
        },
        runAdaptationAction
      );

      if (parentForm && scopePath) {
        publishValidateResultErrors(validation, scopePath, parentForm);
      }

      if (!validation.valid) {
        setDraftError(validation.issues?.[0]?.message ?? validationMessage);
        return;
      }

      const commitResult = await runTransformOut(
        schema.transformOutAction,
        {
          workingValue,
          originalValue: currentValue,
          readOnly
        },
        runAdaptationAction
      );

      await applyCommitResult(
        typeof commitResult === 'object' && commitResult !== null
          ? commitResult as Record<string, unknown>
          : { __value: commitResult }
      );

      setOpen(false);
      disposeDraftForm(draftForm, setDraftForm);
    } finally {
      setConfirming(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    disposeDraftForm(draftForm, setDraftForm);
    setDraftError(undefined);
  }

  const viewerContent = resolveRendererSlotContent(props, 'viewer');
  const editContent = resolveRendererSlotContent(props, 'content');

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
      {!effectiveDisabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleOpen()}
        >
          {triggerLabel}
        </Button>
      )}
      <DetailSurface
        open={open}
        mode={surfaceMode}
        title={surfaceTitle}
        bodySlot="detail-view-surface-body"
        readOnly={readOnly}
        onClose={handleCancel}
        footer={(
          <DetailDraftFooter
            error={draftError}
            errorSlot="detail-view-draft-error"
            confirming={confirming}
            onCancel={handleCancel}
            onConfirm={() => void handleConfirm()}
          />
        )}
      >
        <DetailDraftBody form={draftForm} bodySlot="detail-view-draft-body">
          {editContent}
        </DetailDraftBody>
      </DetailSurface>
    </div>
  );
}

export const detailViewRendererDefinition: RendererDefinition = {
  type: 'detail-view',
  component: DetailViewRenderer as any,
  regions: ['viewer', 'content'],
  fields: [formLabelFieldRule],
  scopePolicy: 'form',
  validation: {
    kind: 'container'
  }
};
