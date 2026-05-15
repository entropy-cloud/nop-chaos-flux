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
import type { DetailFieldSchema } from '../composite-field/composite-schemas.js';
import { formFieldRules, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { t } from '@nop-chaos/flux-i18n';
import {
  publishValidateResultErrors,
  runTransformIn,
  runTransformOut,
  runValidate,
} from './value-adaptation-helper.js';
import { DetailDraftBody, DetailDraftFooter, DetailSurface } from './detail-surface.js';
import {
  buildDetailDraftInitialValues,
  readDetailDraftValues,
  useDetailAdaptationAction,
  useDetailChildValidationContract,
  useDetailDraftControllerState,
} from './detail-draft-controller.js';
import { useCurrentValidationScope } from '@nop-chaos/flux-react';

function logDetailFieldAsyncError(action: 'open' | 'confirm', error: unknown) {
  console.warn(`[detail-field] ${action} failed`, error);
}

function toAsyncFailureMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function DetailFieldRenderer(props: RendererComponentProps<DetailFieldSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const parentValidationOwner = useCurrentValidationScope();
  const schemaProps = props.props;
  const name = String(schemaProps.name ?? '');
  const hasName = name.length > 0;
  const readOnly = schemaProps.readOnly ?? false;
  const surfaceMode = (schemaProps.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schemaProps.surface as { title?: string } | undefined)?.title ?? '';
  const fieldLabel = String((schemaProps.label ?? name) || t('flux.common.detail'));
  const triggerLabel = String(
    schemaProps.triggerLabel ?? t('flux.common.editItem', { item: fieldLabel }),
  );
  const validationMessage = t('flux.common.detailDraftValidationError');
  const openFailureMessage = t('flux.common.saveFailed');
  const confirmFailureMessage = t('flux.common.saveFailed');

  function reportOpenFailure(error: unknown) {
    runtime.env.notify?.('warning', toAsyncFailureMessage(error, openFailureMessage));
  }

  function reportConfirmFailure(error: unknown) {
    const message = toAsyncFailureMessage(error, confirmFailureMessage);
    setDraftErrorSafe(message);
    runtime.env.notify?.('warning', message);
  }

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.props.disabled,
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

  async function settleParentValidation(): Promise<boolean> {
    if (!hasName) {
      return true;
    }

    const result = parentForm
      ? await parentForm.validateField(name, 'commit')
      : parentValidationOwner
        ? await parentValidationOwner.validateSubtree(name, 'commit')
        : undefined;

    if (!result) {
      return true;
    }

    if (!result.ok) {
      setDraftErrorSafe(result.errors[0]?.message ?? validationMessage);
      return false;
    }

    return true;
  }

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
    if (readOnly || !draftForm || !hasName) return;

    const confirmToken = beginConfirm();

    if (confirmToken == null) {
      return;
    }

    try {
      const submitValidationResult = await draftForm.validateAll('submit');
      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      if (!submitValidationResult.ok) {
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

      if (parentForm) {
        publishValidateResultErrors(validation, name, parentForm);
      } else if (parentValidationOwner && validation.issues?.length) {
        parentValidationOwner.applyExternalErrors({
          sourceId: `value-adaptation:${name}`,
          errors: validation.issues.map((issue) => ({
            path: issue.path ? `${name}.${issue.path}` : name,
            message: issue.message,
            rule: 'async',
            sourceKind: 'runtime-overlay',
          })),
          replace: true,
        });
      }

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

      if (parentForm) {
        parentForm.setValue(name, writeback);
        parentForm.touchField(name);
      } else {
        parentScope.update(name, writeback);
      }

      const fieldValidationResult = await settleParentValidation();

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      if (!fieldValidationResult) {
        return;
      }

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
                reportOpenFailure(error);
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
                reportConfirmFailure(error);
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
    { key: 'name', kind: 'prop' },
    { key: 'viewer', kind: 'region', regionKey: 'viewer' },
    { key: 'content', kind: 'region', regionKey: 'content' },
    ...formFieldRules,
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
