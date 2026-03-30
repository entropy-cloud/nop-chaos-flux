import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import {
  createFieldHandlers,
  formLabelFieldRule,
  useBoundFieldValue
} from '../field-utils';
import type { ExpressionEditorSchema } from '../schemas';
import { ExpressionEditor, Operator } from '@abidibo/react-expression-editor';
import '@abidibo/react-expression-editor/dist/index.esm.css';

const operatorMap: Record<string, Operator> = {
  'AND': Operator.AND,
  'OR': Operator.OR,
  'GT': Operator.GT,
  'LT': Operator.LT,
  'EQ': Operator.EQ,
  'NEQ': Operator.NEQ,
  'GTE': Operator.GTE,
  'LTE': Operator.LTE,
  'PLUS': Operator.PLUS,
  'MINUS': Operator.MINUS,
  'MUL': Operator.MUL,
  'DIV': Operator.DIV,
};

export function ExpressionEditorRenderer(props: RendererComponentProps<ExpressionEditorSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const value = useBoundFieldValue(name, currentForm);
  const handlers = createFieldHandlers({
    name,
    currentForm,
    scope,
    setValue(nextValue) {
      currentForm?.setValue(name, nextValue);
    }
  });

  const variables = Array.isArray(props.props.variables)
    ? (props.props.variables as ExpressionEditorSchema['variables'])
    : (props.schema.variables ?? []);
  const rawOperators = Array.isArray(props.props.operators)
    ? (props.props.operators as ExpressionEditorSchema['operators'])
    : (props.schema.operators ?? []);
  const operators = (rawOperators ?? []).map(
    (op: string) => operatorMap[op] ?? op
  ).filter(Boolean);
  const showValidationText = typeof props.props.showValidationText === 'boolean'
    ? props.props.showValidationText
    : (props.schema.showValidationText ?? true);
  const constraintVariables = typeof props.props.constraintVariables === 'boolean'
    ? props.props.constraintVariables
    : (props.schema.constraintVariables ?? false);

  return (
    <ExpressionEditor
      value={String(value ?? '')}
      onChange={(nextValue) => handlers.onChange(nextValue)}
      variables={variables}
      operators={operators.length > 0 ? operators : undefined}
      showValidationText={showValidationText}
      constraintVariables={constraintVariables}
    />
  );
}

export const expressionEditorRendererDefinition: RendererDefinition<ExpressionEditorSchema> = {
  type: 'expression-editor',
  component: ExpressionEditorRenderer,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema: ExpressionEditorSchema) {
      return schema.name;
    },
    collectRules(schema: ExpressionEditorSchema) {
      const rules: Array<{ kind: 'email' } | { kind: 'async'; api: any; debounce?: number; message?: string }> = [];

      if (schema.validate?.api) {
        rules.push({
          kind: 'async',
          api: schema.validate.api,
          debounce: schema.validate.debounce,
          message: schema.validate.message
        });
      }

      return rules;
    }
  },
  wrap: true
};
