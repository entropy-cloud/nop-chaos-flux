import React from 'react';

export interface FlowDesignerToastProps {
  message: string;
}

export function FlowDesignerToast({ message }: FlowDesignerToastProps) {
  return (
    <div className="flow-designer-example__toast">
      {message}
    </div>
  );
}
