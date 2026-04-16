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
  useCurrentFormState
} from '@nop-chaos/flux-react';
import {
  Button,
  cn
} from '@nop-chaos/ui';
import type { DetailFieldSchema } from '../composite-field/composite-schemas';
import {
  FieldHint,
  FieldLabel,
  formLabelFieldRule,
  resolveFieldLabelContent,
  useFieldPresentation
} from '@nop-chaos/flux-renderers-form';
import { publishValidateResultErrors, valueAdaptationOwnerHelper } from './value-adaptation-helper';
import { DetailDraftBody, DetailDraftFooter, DetailSurface } from './detail-surface';

type BaseNodeInstance = RendererComponentProps['node'];

export function DetailFieldRenderer(props: RendererComponentProps<DetailFieldSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const schema = props.schema as DetailFieldSchema;
  const name = String(props.props.name ?? '');
  const readOnly = Boolean(props.props.readOnly);
  const surfaceMode = (schema.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schema.surface as { title?: string } | undefined)?.title ?? '';
  const triggerLabel = String(props.props.triggerLabel ?? 'Edit');

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

  const runAdaptationAction = React.useCallback(
    (actionSchema: DetailFieldSchema['transformInAction']) =>
      props.helpers.dispatch(actionSchema as any, {
        scope: parentScope,
        form: parentForm ?? undefined,
        page: undefined,
        nodeInstance: props.node as BaseNodeInstance
      }),
    [parentForm, parentScope, props.helpers, props.node]
  );

  async function handleOpen() {
    if (readOnly || presentation.effectiveDisabled) return;

    const adaptedValue = await valueAdaptationOwnerHelper.runTransformIn(
      schema.transformInAction,
      {
        rawValue: fieldValue,
        name,
        readOnly
      },
      runAdaptationAction
    );

    const initialValues: Record<string, unknown> = typeof adaptedValue === 'object' && adaptedValue !== null
      ? { ...(adaptedValue as Record<string, unknown>) }
      : { __value: adaptedValue };

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
      const workingValue = draftValues.__value !== undefined ? draftValues.__value : draftValues;

      const validation = await valueAdaptationOwnerHelper.runValidate(
        schema.validateValueAction,
        {
          workingValue,
          originalValue: fieldValue,
          name
        },
        runAdaptationAction
      );

      publishValidateResultErrors(validation, name, parentForm);

      if (!validation.valid) {
        setDraftError(validation.issues?.[0]?.message ?? 'Please fix validation errors before confirming.');
        return;
      }

      const writeback = await valueAdaptationOwnerHelper.runTransformOut(
        schema.transformOutAction,
        {
          workingValue,
          originalValue: fieldValue,
          name,
          readOnly
        },
        runAdaptationAction
      );

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

  return (
    <div
      className={cn('nop-field', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
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
            onClick={() => void handleOpen()}
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
        onClose={handleCancel}
        footer={(
          <DetailDraftFooter
            error={draftError}
            errorSlot="detail-field-draft-error"
            confirming={confirming}
            onCancel={handleCancel}
            onConfirm={() => void handleConfirm()}
          />
        )}
      >
        <DetailDraftBody form={draftForm} bodySlot="detail-field-draft-body">
          {editContent}
        </DetailDraftBody>
      </DetailSurface>
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
