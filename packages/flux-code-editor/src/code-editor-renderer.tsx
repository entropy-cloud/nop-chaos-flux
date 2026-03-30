import { useMemo, useState, useCallback } from 'react';
import type { RendererComponentProps, RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { useCodeMirror } from './use-code-mirror';
import { createBaseExtensions } from './extensions/base';
import type {
  CodeEditorSchema,
  EditorLanguage,
  EditorMode,
  ExpressionEditorConfig,
  SQLEditorConfig,
} from './types';
import {
  getDefaultLineNumbers,
  getDefaultAutoHeight,
  getDefaultHeight,
  resolveVariables,
  resolveFunctions,
  resolveTables,
} from './types';

export const codeEditorFieldRules: SchemaFieldRule[] = [
  { key: 'value', kind: 'prop' },
  { key: 'language', kind: 'prop' },
  { key: 'mode', kind: 'prop' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'expressionConfig', kind: 'prop' },
  { key: 'sqlConfig', kind: 'prop' },
  { key: 'editorTheme', kind: 'prop' },
  { key: 'lineNumbers', kind: 'prop' },
  { key: 'folding', kind: 'prop' },
  { key: 'autoHeight', kind: 'prop' },
  { key: 'allowFullscreen', kind: 'prop' },
  { key: 'options', kind: 'prop' },
  { key: 'height', kind: 'prop' },
  { key: 'width', kind: 'prop' },
  { key: 'onChange', kind: 'event' },
  { key: 'onFocus', kind: 'event' },
  { key: 'onBlur', kind: 'event' },
];

export function CodeEditorRenderer(props: RendererComponentProps<CodeEditorSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();

  const language = (props.props.language as EditorLanguage) ?? 'plaintext';
  const mode = props.props.mode as EditorMode | undefined;
  const readOnly = Boolean(props.props.readOnly ?? props.meta.disabled);
  const placeholder = props.props.placeholder as string | undefined;
  const editorTheme = (props.props.editorTheme as 'light' | 'dark') ?? 'light';
  const lineNumbers = props.props.lineNumbers as boolean | undefined ?? getDefaultLineNumbers(language);
  const folding = props.props.folding as boolean | undefined ?? false;
  const autoHeight = props.props.autoHeight as boolean | undefined ?? getDefaultAutoHeight(language);

  const allowFullscreen = props.props.allowFullscreen as boolean | undefined ?? false;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => setIsFullscreen(v => !v), []);

  const expressionConfig = props.props.expressionConfig as ExpressionEditorConfig | undefined;
  const sqlConfig = props.props.sqlConfig as SQLEditorConfig | undefined;

  const name = String(props.props.name ?? props.schema.name ?? '');

  let value: string;
  if (currentForm && name) {
    const formValues = currentForm.store.getState().values;
    value = String((name.split('.').reduce((obj: any, key: string) => obj?.[key], formValues)) ?? '');
  } else if (name) {
    value = String(scope.get(name) ?? '');
  } else {
    value = String(props.props.value ?? '');
  }

  const completionConfig = useMemo(() => {
    if (language === 'expression' && expressionConfig) {
      return {
        variables: resolveVariables(expressionConfig),
        functions: resolveFunctions(expressionConfig),
      };
    }
    if (language === 'sql' && sqlConfig) {
      return {
        tables: resolveTables(sqlConfig),
      };
    }
    return undefined;
  }, [language, expressionConfig, sqlConfig]);

  const extensions = useMemo(
    () =>
      createBaseExtensions({
        language,
        mode,
        lineNumbers,
        folding,
        autoHeight,
        editorTheme,
        sqlDialect: sqlConfig?.dialect,
        completionConfig,
        lintConfig: language === 'expression' ? expressionConfig?.lint : undefined,
        showFriendlyNames: language === 'expression' ? expressionConfig?.showFriendlyNames : undefined,
      }),
    [language, mode, lineNumbers, folding, autoHeight, editorTheme, sqlConfig?.dialect, completionConfig, expressionConfig?.lint, expressionConfig?.showFriendlyNames],
  );

  const handleChange = (newValue: string) => {
    if (currentForm && name) {
      currentForm.setValue(name, newValue);
      return;
    }
    if (name) {
      scope.update(name, newValue);
    }
  };

  const handleFocus = () => {
    if (currentForm && name) {
      currentForm.visitField(name);
    }
    props.events.onFocus?.();
  };

  const handleBlur = () => {
    if (currentForm && name) {
      currentForm.touchField(name);
    }
    props.events.onBlur?.();
  };

  const height = props.props.height as number | string | undefined ?? getDefaultHeight(language);
  const width = props.props.width as number | string | undefined ?? '100%';

  const containerStyle = useMemo<React.CSSProperties>(
    () => {
      const base: React.CSSProperties = {
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        overflow: autoHeight ? undefined : 'auto',
      };
      if (isFullscreen) {
        return {
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: editorTheme === 'dark' ? '#1e1e1e' : '#ffffff',
          display: 'flex',
          flexDirection: 'column',
        };
      }
      return base;
    },
    [height, width, autoHeight, isFullscreen, editorTheme],
  );

  const { editorRef } = useCodeMirror({
    initialValue: value,
    placeholder,
    readOnly,
    extensions,
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
  });

  return (
    <div
      className="nop-code-editor"
      data-testid={props.meta.testid}
      style={containerStyle}
    >
      {allowFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10000,
            border: 'none',
            background: isFullscreen ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
            color: isFullscreen ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '4px 6px',
            borderRadius: 3,
          }}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? '✕' : '⛶'}
        </button>
      )}
      <div ref={editorRef} style={isFullscreen ? { flex: 1, overflow: 'auto' } : undefined} />
    </div>
  );
}

export const codeEditorRendererDefinition: RendererDefinition = {
  type: 'code-editor',
  component: CodeEditorRenderer,
  fields: codeEditorFieldRules,
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    collectRules(schema: CodeEditorSchema) {
      const rules: Array<{ kind: 'required'; message?: string }> = [];
      if (schema.required) {
        rules.push({ kind: 'required', message: `${schema.label || 'Code'} cannot be empty` });
      }
      return rules;
    },
  },
  wrap: true,
};
