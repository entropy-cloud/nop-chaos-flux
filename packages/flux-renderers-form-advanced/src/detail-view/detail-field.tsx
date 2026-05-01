import React from 'react';
import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
  useRendererRuntime,
  useRenderScope,
  useScopeSelector,
  useCurrentFormState,
} from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import type { DetailFieldSchema } from '../composite-field/composite-schemas';
import { formLabelFieldRule, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { t } from '@nop-chaos/flux-i18n';
import {
  publishValidateResultErrors,
  runTransformIn,
  runTransformOut,
  runValidate,
} from './value-adaptation-helper';
import { DetailDraftBody, DetailDraftFooter, DetailSurface } from './detail-surface';
import {
  buildDetailDraftInitialValues,
  readDetailDraftValues,
  useDetailAdaptationAction,
  useDetailChildValidationContract,
  useDetailDraftControllerState,
} from './detail-draft-controller';
import { useCurrentValidationScope } from '@nop-chaos/flux-react';

export function DetailFieldRenderer(props: RendererComponentProps<DetailFieldSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const parentValidationOwner = useCurrentValidationScope();
  const schemaProps = props.props as DetailFieldSchema;
  const name = String(schemaProps.name ?? '');
  const readOnly = Boolean(schemaProps.readOnly);
  const surfaceMode = (schemaProps.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schemaProps.surface as { title?: string } | undefined)?.title ?? '';
  const triggerLabel = String(schemaProps.triggerLabel ?? 'Edit');
  const validationMessage = t('flux.common.detailDraftValidationError');

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly,
  });

  const currentValue = useCurrentFormState(
    (state) => (name ? (state.values as Record<string, unknown>)[name] : undefined),
    Object.is,
    { path: name || undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (name ? getIn(data as Record<string, unknown>, name) : undefined),
    Object.is,
  );
  const fieldValue = parentForm ? currentValue : scopeValue;

  const {
    open,
    draftForm,
    confirming,
    draftError,
    mountedRef,
    openDraft,
    closeDraft,
    beginConfirm,
    finishConfirm,
    setDraftErrorSafe,
  } = useDetailDraftControllerState();

  const childOwnerId = React.useMemo(
    () => `detail-field:${props.id}:${name || 'value'}`,
    [props.id, name],
  );

  useDetailChildValidationContract({
    parentValidationOwner,
    draftForm,
    childOwnerId,
    mode: props.templateNode.validationOwnerPlan?.childContractMode,
    active: open,
  });

  const runAdaptationAction = useDetailAdaptationAction({
    helpers: props.helpers,
    parentScope,
    parentForm,
    node: props.node,
  });

  async function handleOpen() {
    if (presentation.effectiveDisabled) return;

    const adaptedValue = await runTransformIn(
      schemaProps.transformInAction,
      {
        rawValue: fieldValue,
        name,
        readOnly,
      },
      runAdaptationAction,
    );

    if (!mountedRef.current) return;

    const initialValues = buildDetailDraftInitialValues(adaptedValue);

    const newDraftForm = runtime.createFormRuntime({
      id: `detail-field-draft:${name}:${Date.now()}`,
      initialValues,
      parentScope,
      validation: props.templateNode.validationPlan,
    });

    openDraft(newDraftForm);
  }

  async function handleConfirm() {
    if (readOnly || !draftForm || !parentForm) return;

    beginConfirm();

    try {
      const result = await draftForm.validateAll('submit');
      if (!mountedRef.current) return;

      if (!result.ok) {
        setDraftErrorSafe(validationMessage);
        return;
      }

      const { workingValue } = readDetailDraftValues(draftForm);

      const validation = await runValidate(
        schemaProps.validateValueAction,
        {
          workingValue,
          originalValue: fieldValue,
          name,
        },
        runAdaptationAction,
      );

      if (!mountedRef.current) return;

      publishValidateResultErrors(validation, name, parentForm);

      if (!validation.valid) {
        setDraftErrorSafe(validation.issues?.[0]?.message ?? validationMessage);
        return;
      }

      const writeback = await runTransformOut(
        schemaProps.transformOutAction,
        {
          workingValue,
          originalValue: fieldValue,
          name,
          readOnly,
        },
        runAdaptationAction,
      );

      if (!mountedRef.current) return;

      parentForm.setValue(name, writeback);
      parentForm.touchField(name);
      void parentForm.validateField(name);

      closeDraft();
    } finally {
      finishConfirm();
    }
  }

  function handleCancel() {
    closeDraft();
  }

  const viewerContent = resolveRendererSlotContent(props, 'viewer');
  const editContent = resolveRendererSlotContent(props, 'content');

  return (
    <>
      <div data-slot="field-control">
        <div data-slot="detail-field-viewer">
          {viewerContent ?? (
            <span>
              {fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}
            </span>
          )}
        </div>
        {!presentation.effectiveDisabled && (
          <Button type="button" variant="outline" size="sm" onClick={() => void handleOpen()}>
            {triggerLabel}
          </Button>
        )}
      </div>
      <DetailSurface
        open={open}
        mode={surfaceMode}
        title={surfaceTitle}
        bodySlot="detail-field-surface-body"
        readOnly={readOnly}
        onClose={handleCancel}
        footer={
          <DetailDraftFooter
            error={draftError}
            errorSlot="detail-field-draft-error"
            confirming={confirming}
            onCancel={handleCancel}
            onConfirm={() => void handleConfirm()}
          />
        }
      >
        <DetailDraftBody form={draftForm} bodySlot="detail-field-draft-body">
          {editContent}
        </DetailDraftBody>
      </DetailSurface>
    </>
  );
}

export const detailFieldRendererDefinition: RendererDefinition = {
  type: 'detail-field',
  component: DetailFieldRenderer as any,
  wrap: true,
  regions: ['viewer', 'content'],
  fields: [
    formLabelFieldRule,
    { key: 'triggerLabel', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'surface', kind: 'prop' },
    { key: 'transformInAction', kind: 'prop' },
    { key: 'validateValueAction', kind: 'prop' },
    { key: 'transformOutAction', kind: 'prop' },
  ],
  scopePolicy: 'form',
  validation: {
    kind: 'field',
    ownerResolution: 'create-owner',
    childContractMode: 'summary-gate',
    valueKind: 'object',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
};
