import React, { useCallback } from 'react';
import type { RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
import type { DesignerFieldSchema } from './schemas';
import { useDesignerContext } from './designer-context';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@nop-chaos/ui';

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
    <div className="grid gap-1.5">
      {label && <label className="block mb-1 text-xs font-medium text-muted-foreground">{label}</label>}
      {fieldType === 'textarea' ? (
        <Textarea
          className="min-h-[110px] resize-y"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : fieldType === 'select' && options ? (
        <Select value={String(value)} onValueChange={(nextValue) => handleChange(nextValue)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : fieldType === 'number' ? (
        <Input
          type="number"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      ) : (
        <Input
          type="text"
          value={String(value)}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}
    </div>
  );
}
