import React from 'react';
import type {
  ActionSchema,
  BaseSchema,
  RendererComponentProps,
  RegisteredRendererDefinition,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
  useRendererRuntime,
  useRenderScope,
  useScopeSelector,
  useCurrentFormState,
} from '@nop-chaos/flux-react';
import { Button, Input, cn, Spinner } from '@nop-chaos/ui';
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
  isDetailDraftDirty,
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
  return error instanceof Error
    ? t('flux.common.saveFailedDetail', { message: error.message })
    : fallback;
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
    runtime?.env?.notify?.('warning', toAsyncFailureMessage(error, openFailureMessage));
  }

  function reportConfirmFailure(error: unknown) {
    const message = toAsyncFailureMessage(error, confirmFailureMessage);
    setDraftErrorSafe(message);
    runtime?.env?.notify?.('warning', message);
  }

  const presentation = useFieldPresentation(name, parentValidationOwner, {
    disabled: props.props.disabled,
    readOnly,
  });

  const currentValue = useCurrentFormState(
    (state) => (hasName ? (state.values as Record<string, unknown>)[name] : undefined),
    Object.is,
    { enabled: Boolean(parentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data as Record<string, unknown>, name) : undefined),
    Object.is,
    { enabled: !parentForm && hasName, fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const fieldValue = parentForm ? currentValue : scopeValue;

  const {
    open,
    draftForm,
    opening,
    confirming,
    draftError,
    mountedRef,
    openDraft,
    closeDraft,
    beginOpen,
    finishOpen,
    beginConfirm,
    finishConfirm,
    setDraftErrorSafe,
    openSequencer,
    confirmSequencer,
  } = useDetailDraftControllerState();
  // [G2-R6-视角6-01] baseline the dirty check against the values the draft opened with.
  const draftInitialValuesRef = React.useRef<Record<string, unknown>>({});

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

  async function settleParentValidation(
    reportError: (message: string) => void = setDraftErrorSafe,
  ): Promise<boolean> {
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
      reportError(result.errors[0]?.message ?? validationMessage);
      return false;
    }

    return true;
  }

  function readCurrentParentValue(): unknown {
    if (parentForm) {
      return currentValue;
    }

    return fieldValue;
  }

  function applyParentWriteback(value: unknown) {
    if (parentForm) {
      parentForm.setValue(name, value);
      return;
    }

    parentScope?.update(name, value);
  }

  async function rollbackParentWriteback(
    previousValue: unknown,
    reportError: (message: string) => void = setDraftErrorSafe,
  ) {
    applyParentWriteback(previousValue);

    if (parentForm || parentValidationOwner) {
      await settleParentValidation(reportError);
    }
  }

  async function handleOpen() {
    if (presentation.effectiveDisabled) return;

    const openToken = openSequencer.nextToken();
    beginOpen();

    try {
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
      draftInitialValuesRef.current = initialValues;

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
    } finally {
      if (mountedRef.current && openSequencer.isCurrent(openToken)) {
        finishOpen();
      }
    }
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
      } else if (parentValidationOwner) {
        parentValidationOwner.applyExternalErrors({
          sourceId: `value-adaptation:${name}`,
          errors: validation.valid
            ? []
            : (validation.issues ?? []).map((issue) => ({
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

      const previousValue = readCurrentParentValue();

      applyParentWriteback(writeback);

      const fieldValidationResult = await settleParentValidation();

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      if (!fieldValidationResult) {
        await rollbackParentWriteback(previousValue);

        if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

        return;
      }

      parentForm?.touchField(name);

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

  const isDraftDirty = React.useCallback(
    () => (draftForm ? isDetailDraftDirty(draftForm, draftInitialValuesRef.current) : false),
    [draftForm],
  );

  const viewerContent = resolveRendererSlotContent(props, 'viewer');
  const editContent = resolveRendererSlotContent(props, 'content');

  const inlineMode = schemaProps.editMode === 'inline';
  const [inlinePhase, setInlinePhase] = React.useState<'idle' | 'opening' | 'editing' | 'confirming'>(
    'idle',
  );
  const [inlineDraft, setInlineDraft] = React.useState('');
  const [inlineError, setInlineError] = React.useState<string | undefined>(undefined);
  const inlineBusyRef = React.useRef(false);
  const inlineViewerRef = React.useRef<HTMLButtonElement | null>(null);
  const inlineEditorRef = React.useRef<HTMLInputElement | null>(null);
  const inlinePrevPhaseRef = React.useRef(inlinePhase);

  React.useEffect(() => {
    if (inlinePrevPhaseRef.current === inlinePhase) return;
    inlinePrevPhaseRef.current = inlinePhase;
    if (inlinePhase === 'editing') {
      inlineEditorRef.current?.focus();
    } else if (inlinePhase === 'idle') {
      inlineViewerRef.current?.focus();
    }
  }, [inlinePhase]);

  async function handleInlineOpen() {
    if (!hasName || !presentation.interactive || inlineBusyRef.current) return;

    const openToken = openSequencer.nextToken();
    inlineBusyRef.current = true;
    setInlineError(undefined);
    setInlinePhase('opening');

    try {
      const adaptedValue = await runTransformIn(
        schemaProps.transformInAction,
        { rawValue: fieldValue, name, readOnly },
        runAdaptationAction,
      );

      if (!mountedRef.current || !openSequencer.isCurrent(openToken)) return;

      inlineBusyRef.current = false;
      setInlineDraft(
        adaptedValue === null || adaptedValue === undefined ? '' : String(adaptedValue),
      );
      setInlinePhase('editing');
    } catch (error) {
      if (mountedRef.current && openSequencer.isCurrent(openToken)) {
        inlineBusyRef.current = false;
        setInlinePhase('idle');
        reportOpenFailure(error);
        throw error;
      }
    }
  }

  async function handleInlineCommit() {
    if (!hasName || inlineBusyRef.current) return;

    const confirmToken = confirmSequencer.nextToken();
    inlineBusyRef.current = true;
    setInlineError(undefined);
    setInlinePhase('confirming');

    const backToEditing = () => {
      inlineBusyRef.current = false;
      setInlinePhase('editing');
    };

    const reportInlineSettleFailure = (message: string) => {
      setInlineError(message);
      runtime?.env?.notify?.('warning', message);
    };

    try {
      const workingValue = inlineDraft;

      const validation = await runValidate(
        schemaProps.validateValueAction,
        { workingValue, originalValue: fieldValue, name },
        runAdaptationAction,
      );

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      if (parentForm) {
        publishValidateResultErrors(validation, name, parentForm);
      } else if (parentValidationOwner) {
        parentValidationOwner.applyExternalErrors({
          sourceId: `value-adaptation:${name}`,
          errors: validation.valid
            ? []
            : (validation.issues ?? []).map((issue) => ({
                path: issue.path ? `${name}.${issue.path}` : name,
                message: issue.message,
                rule: 'async',
                sourceKind: 'runtime-overlay',
              })),
          replace: true,
        });
      }

      if (!validation.valid) {
        const issueMessage = validation.issues?.[0]?.message ?? validationMessage;
        setInlineError(issueMessage);
        runtime?.env?.notify?.('warning', issueMessage);
        backToEditing();
        return;
      }

      const writeback = await runTransformOut(
        schemaProps.transformOutAction,
        { workingValue, originalValue: fieldValue, name, readOnly },
        runAdaptationAction,
      );

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      const previousValue = readCurrentParentValue();

      applyParentWriteback(writeback);

      const fieldValidationResult = await settleParentValidation(reportInlineSettleFailure);

      if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

      if (!fieldValidationResult) {
        await rollbackParentWriteback(previousValue, reportInlineSettleFailure);

        if (!mountedRef.current || !confirmSequencer.isCurrent(confirmToken)) return;

        backToEditing();
        return;
      }

      parentForm?.touchField(name);

      inlineBusyRef.current = false;
      setInlinePhase('idle');
      setInlineDraft('');
    } catch (error) {
      if (mountedRef.current && confirmSequencer.isCurrent(confirmToken)) {
        logDetailFieldAsyncError('confirm', error);
        const message = toAsyncFailureMessage(error, confirmFailureMessage);
        setInlineError(message);
        runtime?.env?.notify?.('warning', message);
        backToEditing();
      }
    }
  }

  function handleInlineCancel() {
    if (inlineBusyRef.current) return;
    setInlineDraft('');
    setInlineError(undefined);
    setInlinePhase('idle');
  }

  return (
    <>
      <div className={cn('nop-detail-field', props.meta.className)}>
        {inlineMode ? (
          inlinePhase === 'editing' || inlinePhase === 'confirming' ? (
            <span>
              <Input
                ref={inlineEditorRef}
                data-slot="detail-field-inline-editor"
                aria-label={triggerLabel}
                aria-busy={inlinePhase === 'confirming' || undefined}
                value={inlineDraft}
                disabled={inlinePhase === 'confirming'}
                onChange={(event) => setInlineDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleInlineCommit();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    handleInlineCancel();
                  }
                }}
                onBlur={() => {
                  handleInlineCommit();
                }}
              />
              {inlineError ? (
                <span
                  data-slot="detail-field-inline-error"
                  role="status"
                  aria-live="assertive"
                >
                  {inlineError}
                </span>
              ) : null}
            </span>
          ) : (
            <button
              type="button"
              ref={inlineViewerRef}
              data-slot="detail-field-viewer"
              data-editable="true"
              aria-label={triggerLabel}
              aria-busy={inlinePhase === 'opening' || undefined}
              disabled={!hasName || !presentation.interactive}
              onClick={() => {
                handleInlineOpen().catch((error) => {
                  logDetailFieldAsyncError('open', error);
                });
              }}
            >
              {inlinePhase === 'opening' ? (
                <Spinner className="size-4" aria-hidden="true" />
              ) : null}
              {viewerContent ?? (
                <span>
                  {fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}
                </span>
              )}
            </button>
          )
        ) : (
          <div data-slot="detail-field-viewer">
            {viewerContent ?? (
              <span>
                {fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}
              </span>
            )}
          </div>
        )}
        {!inlineMode && !presentation.effectiveDisabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={triggerLabel}
            aria-busy={opening || undefined}
            onClick={() => {
              handleOpen().catch((error) => {
                logDetailFieldAsyncError('open', error);
                reportOpenFailure(error);
              });
            }}
          >
            {opening ? <Spinner className="size-4" aria-hidden="true" /> : null}
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
        size={(schemaProps.surface as { size?: string } | undefined)?.size}
        placement={(schemaProps.surface as { placement?: string } | undefined)?.placement}
        onClose={handleCancel}
        isDirty={readOnly ? undefined : isDraftDirty}
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
        <DetailDraftBody form={draftForm} bodySlot="detail-field-draft-body" staticReadOnly={readOnly}>
          {editContent}
        </DetailDraftBody>
      </DetailSurface>
    </>
  );
}

function compileDetailValueAdaptationAction(value: unknown, context: {
  compileActions: (
    input: ActionSchema | ActionSchema[],
    sourcePath?: string,
  ) => import('@nop-chaos/flux-core').CompiledActionProgram;
  sourcePath: string;
}) {
  if (!value) {
    return value;
  }

  if (Array.isArray(value)) {
    return context.compileActions(value, context.sourcePath);
  }

  if (typeof value === 'object' && value !== null && 'action' in value) {
    return context.compileActions(value as ActionSchema, context.sourcePath);
  }

  return value;
}

export const detailFieldRendererDefinition: RegisteredRendererDefinition<DetailFieldSchema> = {
  type: 'detail-field',
  displayName: 'Detail Field',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: DetailFieldRenderer,
  wrap: true,
  frameRootTag: 'div',
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'viewer', kind: 'region', regionKey: 'viewer' },
    { key: 'content', kind: 'region', regionKey: 'content' },
    ...formFieldRules,
    { key: 'triggerLabel', kind: 'prop' },
    { key: 'editMode', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'surface', kind: 'prop' },
    { key: 'transformInAction', kind: 'prop', compile: compileDetailValueAdaptationAction },
    { key: 'validateValueAction', kind: 'prop', compile: compileDetailValueAdaptationAction },
    { key: 'transformOutAction', kind: 'prop', compile: compileDetailValueAdaptationAction },
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
