import React from 'react';

export interface FlowDesignerToastProps {
  message: string;
}

export function FlowDesignerToast({ message }: FlowDesignerToastProps) {
  return <div data-slot="flow-designer-example-toast">{message}</div>;
}
