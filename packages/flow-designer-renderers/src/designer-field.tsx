import React, { useCallback } from 'react';
import type { RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
import type { DesignerFieldSchema } from './schemas';
import { useDesignerContext } from './designer-context';

export function DesignerFieldRenderer(props: RendererComponentProps<DesignerFieldSchema>) {
  const schemaProps = props.props as Record<string, SchemaValue>;
  const label = schemaProps.label as string | undefined;
  const name = schemaProps.name as string;
  const fieldType = schemaProps.fieldType as string | undefined;
  const options = schemaProps.options as Array<{ label: string; value: string }> | undefined;
  const ctx = useDesignerContext();
  const { dispatch, snapshot } = ctx;
  const { activeNode, activeEdge } = snapshot;

  const value = activeNode?.data[name] ?? activeEdge?.data[name] ?? '';

  const handleChange = useCallback(
    (newValue: string) => {
      if (activeNode) {
        dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [name]: newValue } });
      } else if (activeEdge) {
        dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [name]: newValue } });
      }
    },
    [dispatch, activeNode, activeEdge, name]
  );

  return (
    <div className="fd-field">
      {label && <label className="fd-field__label">{label}</label>}
      {fieldType === 'textarea' ? (
        <textarea
          className="fd-field__textarea"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : fieldType === 'select' && options ? (
        <select
          className="fd-field__select"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : fieldType === 'number' ? (
        <input
          type="number"
          className="fd-field__input"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className="fd-field__input"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
    </div>
  );
}
