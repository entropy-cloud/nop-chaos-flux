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
import { Button, cn } from '@nop-chaos/ui';
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

function logDetailFieldAsyncError(action: 'open' | 'confirm', error: unknown) {
  console.warn(`[detail-field] ${action} failed`, error);
}

export function DetailFieldRenderer(props: RendererComponentProps<DetailFieldSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const parentValidationOwner = useCurrentValidationScope();
  const schemaProps = props.props;
  const name = String(schemaProps.name ?? '');
  const hasName = name.length > 0;
  const readOnly = Boolean(schemaProps.readOnly);
  const surfaceMode = (schemaProps.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schemaProps.surface as { title?: string } | undefined)?.title ?? '';
  const fieldLabel = String((schemaProps.label ?? name) || t('flux.common.detail'));
  const triggerLabel = String(
    schemaProps.triggerLabel ?? t('flux.common.editItem', { item: fieldLabel }),
  );
  const validationMessage = t('flux.common.detailDraftValidationError');

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly,
  });

  const currentValue = useCurrentFormState(
    (state) => (hasName ? (state.values as Record<string, unknown>)[name] : undefined),
    Object.is,
    { enabled: hasName, path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data as Record<string, unknown>, name) : undefined),
    Object.is,
    { enabled: hasName, fallback: undefined },
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
    openSequencer,
    confirmSequencer,
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

    const openToken = openSequencer.nextToken();

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

    if (!mountedRef.current || !openSequencer.isCurrent(openToken)) {
      newDraftForm.dispose();
      return;
    }

    openDraft(newDraftForm);
  }

  async function handleConfirm() {
    if (readOnly || !draftForm || !parentForm) return;

    const confirmToken = beginConfirm();

    if (confirmToken == null) {
      return;
    }

    try {
      const result = await draftForm.validateAll('submit');
      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

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

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

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

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      parentForm.setValue(name, writeback);
      parentForm.touchField(name);
      void parentForm.validateField(name);

      closeDraft();
    } finally {
      if (confirmSequencer.isCurrent(confirmToken)) {
        finishConfirm();
      }
    }
  }

  function handleCancel() {
    closeDraft();
  }

  const viewerContent = resolveRendererSlotContent(props, 'viewer');
  const editContent = resolveRendererSlotContent(props, 'content');

  return (
    <>
      <div className={cn('nop-detail-field')} data-slot="field-control">
        <div data-slot="detail-field-viewer">
          {viewerContent ?? (
            <span>
              {fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}
            </span>
          )}
        </div>
        {!presentation.effectiveDisabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={triggerLabel}
            onClick={() => {
              handleOpen().catch((error) => {
                logDetailFieldAsyncError('open', error);
              });
            }}
          >
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
            onConfirm={() => {
              handleConfirm().catch((error) => {
                logDetailFieldAsyncError('confirm', error);
              });
            }}
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

export const detailFieldRendererDefinition: RendererDefinition<DetailFieldSchema> = {
  type: 'detail-field',
  component: DetailFieldRenderer,
  wrap: true,
  fields: [
    { key: 'viewer', kind: 'region', regionKey: 'viewer' },
    { key: 'content', kind: 'region', regionKey: 'content' },
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
