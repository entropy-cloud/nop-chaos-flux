import React from 'react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
  useCurrentFormState,
  useRendererRuntime,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { getIn, setIn } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DetailViewSchema } from '../composite-field/composite-schemas.js';
import {
  formFieldRules,
  resolveFieldLabelContent,
  FieldLabel,
} from '@nop-chaos/flux-renderers-form';
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

export function DetailViewRenderer(props: RendererComponentProps<DetailViewSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const parentValidationOwner = useCurrentValidationScope();
  const schemaProps = props.props;
  const readOnly = schemaProps.readOnly ?? false;
  const scopePath =
    schemaProps.scopePath ?? (typeof schemaProps.name === 'string' ? schemaProps.name : undefined);
  const staticData = schemaProps.data as Record<string, unknown> | undefined;
  const surfaceMode = (schemaProps.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schemaProps.surface as { title?: string } | undefined)?.title ?? '';
  const labelContent = resolveFieldLabelContent(props);
  const labelText = typeof labelContent === 'string' && labelContent ? labelContent : undefined;
  const triggerLabel = String(
    schemaProps.triggerLabel ?? t('flux.common.editItem', { item: labelText ?? t('flux.common.detail') }),
  );
  const validationMessage = t('flux.common.detailDraftValidationError');
  const openFailureMessage = t('flux.common.saveFailed');
  const effectiveDisabled = props.props.disabled ?? false;

  function reportOpenFailure(error: unknown) {
    runtime.env.notify?.(
      'warning',
      error instanceof Error && error.message ? error.message : openFailureMessage,
    );
  }

  const formProjectedValue = useCurrentFormState(
    (state) => (scopePath ? getIn(state.values, scopePath) : state.values),
    Object.is,
    { enabled: Boolean(parentForm), path: scopePath || undefined },
  );

  const scopeProjectedValue = useScopeSelector(
    (data) => (scopePath ? getIn(data as Record<string, unknown>, scopePath) : undefined),
    Object.is,
  );

  function getInitialValues(): Record<string, unknown> {
    if (staticData) {
      return { ...staticData };
    }
    if (
      scopePath &&
      scopeProjectedValue !== undefined &&
      typeof scopeProjectedValue === 'object' &&
      scopeProjectedValue !== null
    ) {
      return { ...(scopeProjectedValue as Record<string, unknown>) };
    }
    if (scopePath && scopeProjectedValue !== undefined) {
      return { __value: scopeProjectedValue };
    }
    return {};
  }

  const {
    open,
    draftForm,
    confirming,
    draftError,
    openDraft,
    closeDraft,
    beginConfirm,
    finishConfirm,
    setDraftErrorSafe,
    openSequencer,
    confirmSequencer,
  } = useDetailDraftControllerState();
  const [, bumpViewerRevision] = React.useReducer((value: number) => value + 1, 0);

  const childOwnerId = React.useMemo(
    () => `detail-view:${props.id}:${scopePath ?? 'root'}`,
    [props.id, scopePath],
  );

  useDetailChildValidationContract({
    parentValidationOwner,
    draftForm,
    childOwnerId,
    mode: props.templateNode.validationOwnerPlan?.childContractMode,
    active: open,
    blocked: confirming,
  });

  const currentValue = React.useMemo(() => {
    if (staticData) {
      return staticData;
    }

    return parentForm ? formProjectedValue : scopeProjectedValue;
  }, [formProjectedValue, parentForm, scopeProjectedValue, staticData]);
  const runAdaptationAction = useDetailAdaptationAction({
    helpers: props.helpers,
    parentScope,
    parentForm,
    node: props.node,
  });

  function hasUsableParentValidationOwner() {
    if (!parentValidationOwner) {
      return false;
    }

    if (parentValidationOwner.validation) {
      return true;
    }

    if (parentValidationOwner.lifecycleState === 'active') {
      return true;
    }

    return (
      parentValidationOwner.lifecycleState == null &&
      typeof parentValidationOwner.validateSubtree === 'function' &&
      typeof parentValidationOwner.validateAll === 'function'
    );
  }

  function buildDraftValuesFromCommitResult(
    draftValues: Record<string, unknown>,
    currentDraftValues: Record<string, unknown>,
  ): Record<string, unknown> {
    if ('patch' in draftValues && Array.isArray(draftValues.patch)) {
      return (draftValues.patch as Array<{ path: string; value: unknown }>).reduce<Record<string, unknown>>(
        (acc, patch) => setIn(acc, patch.path, patch.value) as Record<string, unknown>,
        { ...currentDraftValues },
      );
    }

    if (
      'updates' in draftValues &&
      typeof draftValues.updates === 'object' &&
      draftValues.updates !== null
    ) {
      return {
        ...currentDraftValues,
        ...(draftValues.updates as Record<string, unknown>),
      };
    }

    const commitValue = Object.prototype.hasOwnProperty.call(draftValues, '__value')
      ? draftValues.__value
      : draftValues;

    if (Object.prototype.hasOwnProperty.call(currentDraftValues, '__value')) {
      return { __value: commitValue };
    }

    return typeof commitValue === 'object' && commitValue !== null
      ? { ...(commitValue as Record<string, unknown>) }
      : { __value: commitValue };
  }

  async function validateCommittedDraftLocally(
    draftValues: Record<string, unknown>,
  ): Promise<boolean> {
    if (!draftForm) {
      return true;
    }

    const currentDraftValues = readDetailDraftValues(draftForm).draftValues ?? {};
    draftForm.setValues(buildDraftValuesFromCommitResult(draftValues, currentDraftValues));
    const result = await draftForm.validateAll('commit');

    if (!result.ok) {
      setDraftErrorSafe(result.errors[0]?.message ?? validationMessage);
      return false;
    }

    return true;
  }

  async function handleOpen() {
    if (effectiveDisabled) return;

    const openToken = openSequencer.nextToken();

    const adaptedValue = await runTransformIn(
      schemaProps.transformInAction,
      {
        rawValue: currentValue,
        readOnly,
      },
      runAdaptationAction,
    );

    const initialValues = buildDetailDraftInitialValues(adaptedValue, getInitialValues());

    const newDraftForm = runtime.createFormRuntime({
      id: `detail-view-draft:${scopePath ?? 'static'}:${Date.now()}`,
      initialValues,
      parentScope,
      validation: props.templateNode.validationPlan,
    });

    if (!openSequencer.isCurrent(openToken)) {
      newDraftForm.dispose();
      return;
    }

    openDraft(newDraftForm);
  }

  async function settleParentValidation(): Promise<boolean> {
    const result = parentForm
      ? scopePath
        ? await parentForm.validateSubtree(scopePath)
        : await parentForm.validateAll('commit')
      : hasUsableParentValidationOwner()
        ? scopePath
          ? await parentValidationOwner!.validateSubtree(scopePath, 'commit')
          : await parentValidationOwner!.validateAll('commit')
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

  async function applyCommitResult(draftValues: Record<string, unknown>): Promise<boolean> {
    const commitValue = Object.prototype.hasOwnProperty.call(draftValues, '__value')
      ? draftValues.__value
      : draftValues;

      if (scopePath) {
      if ('patch' in draftValues && Array.isArray(draftValues.patch)) {
        const patches = draftValues.patch as Array<{ path: string; value: unknown }>;
        if (parentForm) {
          parentForm.setValues(
            Object.fromEntries(patches.map((patch) => [`${scopePath}.${patch.path}`, patch.value])),
          );
        } else {
          for (const p of patches) {
            parentScope.update(`${scopePath}.${p.path}`, p.value);
          }
        }
      } else if (
        'updates' in draftValues &&
        typeof draftValues.updates === 'object' &&
        draftValues.updates !== null
      ) {
        const updates = draftValues.updates as Record<string, unknown>;
        if (parentForm) {
          parentForm.setValues(
            Object.fromEntries(
              Object.entries(updates).map(([key, value]) => [`${scopePath}.${key}`, value]),
            ),
          );
        } else {
          for (const [key, val] of Object.entries(updates)) {
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

      if (parentForm) {
        return await settleParentValidation();
      }

      if (hasUsableParentValidationOwner()) {
        const settled = await settleParentValidation();
        if (!settled) {
          return false;
        }
      }

      return await validateCommittedDraftLocally(draftValues);
    } else {
      const updates =
        draftValues.updates !== undefined
          ? (draftValues.updates as Record<string, unknown>)
          : commitValue;

      if (parentForm) {
        parentForm.setValues(updates as Record<string, unknown>);
        return await settleParentValidation();
      } else {
        parentScope.merge(updates as Record<string, unknown>);
        if (hasUsableParentValidationOwner()) {
          const settled = await settleParentValidation();
          if (!settled) {
            return false;
          }
        }

        return await validateCommittedDraftLocally(draftValues);
      }
    }

    return true;
  }

  async function handleConfirm() {
    if (readOnly || !draftForm) return;

    const confirmToken = beginConfirm();

    if (confirmToken == null) {
      return;
    }

    try {
      const result = await draftForm.validateAll('submit');
      if (!confirmSequencer.isCurrent(confirmToken)) {
        return;
      }

      if (!result.ok) {
        setDraftErrorSafe(validationMessage);
        return;
      }

      const { workingValue } = readDetailDraftValues(draftForm);

      const validation = await runValidate(
        schemaProps.validateValueAction,
        {
          workingValue,
          originalValue: currentValue,
        },
        runAdaptationAction,
      );

      if (!confirmSequencer.isCurrent(confirmToken)) {
        return;
      }

      if (parentForm && scopePath) {
        publishValidateResultErrors(validation, scopePath, parentForm);
      }

      if (!validation.valid) {
        setDraftErrorSafe(validation.issues?.[0]?.message ?? validationMessage);
        return;
      }

      const commitResult = await runTransformOut(
        schemaProps.transformOutAction,
        {
          workingValue,
          originalValue: currentValue,
          readOnly,
        },
        runAdaptationAction,
      );

      if (!confirmSequencer.isCurrent(confirmToken)) {
        return;
      }

      const commitApplied = await applyCommitResult(
        typeof commitResult === 'object' && commitResult !== null
          ? (commitResult as Record<string, unknown>)
          : { __value: commitResult },
      );

      if (!confirmSequencer.isCurrent(confirmToken)) {
        return;
      }

      if (!commitApplied) {
        return;
      }

      bumpViewerRevision();
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
    <div
      className={cn('nop-detail-view', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      <FieldLabel content={labelContent} />
      <div data-slot="detail-view-viewer">{viewerContent}</div>
      {!effectiveDisabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={triggerLabel}
          onClick={() => {
            handleOpen().catch((error) => {
              reportOpenFailure(error);
            });
          }}
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
        footer={
          <DetailDraftFooter
            error={draftError}
            errorSlot="detail-view-draft-error"
            confirming={confirming}
            onCancel={handleCancel}
            onConfirm={() => {
              handleConfirm().catch(() => undefined);
            }}
          />
        }
      >
        <DetailDraftBody form={draftForm} bodySlot="detail-view-draft-body">
          {editContent}
        </DetailDraftBody>
      </DetailSurface>
    </div>
  );
}

export const detailViewRendererDefinition: RendererDefinition<DetailViewSchema> = {
  type: 'detail-view',
  component: DetailViewRenderer,
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'viewer', kind: 'region', regionKey: 'viewer' },
    { key: 'content', kind: 'region', regionKey: 'content' },
    ...formFieldRules,
    { key: 'scopePath', kind: 'prop' },
    { key: 'data', kind: 'prop' },
    { key: 'triggerLabel', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'surface', kind: 'prop' },
    { key: 'transformInAction', kind: 'prop' },
    { key: 'validateValueAction', kind: 'prop' },
    { key: 'transformOutAction', kind: 'prop' },
  ],
  scopePolicy: 'form',
  validation: {
    kind: 'container',
    ownerResolution: 'create-owner',
    childContractMode: 'summary-gate',
  },
};
