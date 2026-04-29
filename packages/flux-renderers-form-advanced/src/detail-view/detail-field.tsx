import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  RendererComponentProps,
  RendererDefinition
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
  useRendererRuntime,
  useRenderScope,
  useScopeSelector,
  useCurrentFormState
} from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import type { DetailFieldSchema } from '../composite-field/composite-schemas';
import {
  formLabelFieldRule,
  useFieldPresentation
} from '@nop-chaos/flux-renderers-form';
import { t } from '@nop-chaos/flux-i18n';
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

export function DetailFieldRenderer(props: RendererComponentProps<DetailFieldSchema>) {
  const parentForm = useCurrentForm();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const schema = props.schema as DetailFieldSchema;
  const schemaProps = props.props as DetailFieldSchema;
  const name = String(schemaProps.name ?? '');
  const readOnly = Boolean(schemaProps.readOnly);
  const surfaceMode = (schema.surface as { mode?: string } | undefined)?.mode ?? 'dialog';
  const surfaceTitle = (schema.surface as { title?: string } | undefined)?.title ?? '';
  const triggerLabel = String(schemaProps.triggerLabel ?? 'Edit');
  const validationMessage = t('flux.common.detailDraftValidationError');

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const currentValue = useCurrentFormState(
    (state) => (name ? (state.values as Record<string, unknown>)[name] : undefined),
    Object.is,
    { path: name || undefined }
  );
  const scopeValue = useScopeSelector(
    (data) => (name ? getIn(data as Record<string, unknown>, name) : undefined),
    Object.is
  );
  const fieldValue = parentForm ? currentValue : scopeValue;

  const [open, setOpen] = React.useState(false);
  const [draftForm, setDraftForm] = React.useState<FormRuntime | undefined>(undefined);
  const [confirming, setConfirming] = React.useState(false);
  const [draftError, setDraftError] = React.useState<string | undefined>(undefined);

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
    if (presentation.effectiveDisabled) return;

    const adaptedValue = await runTransformIn(
      schema.transformInAction,
      {
        rawValue: fieldValue,
        name,
        readOnly
      },
      runAdaptationAction
    );

    if (!mountedRef.current) return;

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
    if (readOnly || !draftForm || !parentForm) return;

    setConfirming(true);
    setDraftError(undefined);

    try {
      const result = await draftForm.validateAll('submit');
      if (!mountedRef.current) return;

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
          originalValue: fieldValue,
          name
        },
        runAdaptationAction
      );

      if (!mountedRef.current) return;

      publishValidateResultErrors(validation, name, parentForm);

      if (!validation.valid) {
        setDraftError(validation.issues?.[0]?.message ?? validationMessage);
        return;
      }

      const writeback = await runTransformOut(
        schema.transformOutAction,
        {
          workingValue,
          originalValue: fieldValue,
          name,
          readOnly
        },
        runAdaptationAction
      );

      if (!mountedRef.current) return;

      parentForm.setValue(name, writeback);
      parentForm.touchField(name);
      void parentForm.validateField(name);

      setOpen(false);
      disposeDraftForm(draftForm, setDraftForm);
    } finally {
      if (mountedRef.current) {
        setConfirming(false);
      }
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
    <>
      <div data-slot="field-control">
        <div data-slot="detail-field-viewer">
          {viewerContent ?? <span>{fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}</span>}
        </div>
        {!presentation.effectiveDisabled && (
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
        readOnly={readOnly}
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
    { key: 'surface', kind: 'ignored' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' }
  ],
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
