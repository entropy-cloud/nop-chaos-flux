import { useState } from 'react';
import { Code2, GitBranch, Repeat, FileOutput } from 'lucide-react';
import type { TemplateExpr } from '@nop-chaos/word-editor-core';
import { ToolbarButton, ToolbarGroup } from './shared.js';
import { ExprInsertDialog } from '../dialogs/expr-insert-dialog.js';

interface TemplateControlsProps {
  onInsertExpr: (expr: string) => void;
  onInsertTag: (tagName: string) => void;
  onInsertTemplateTag?: (expr: TemplateExpr) => void;
}

export function TemplateControls({
  onInsertExpr,
  onInsertTag,
  onInsertTemplateTag,
}: TemplateControlsProps) {
  const [showExprDialog, setShowExprDialog] = useState(false);

  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          icon={Code2}
          onClick={() => setShowExprDialog(true)}
          title="Insert Expression"
        />
        <ToolbarButton icon={GitBranch} onClick={() => onInsertTag('c:if')} title="If Block" />
        <ToolbarButton icon={Repeat} onClick={() => onInsertTag('c:for')} title="For Loop" />
        <ToolbarButton icon={FileOutput} onClick={() => onInsertTag('c:out')} title="Output" />
      </ToolbarGroup>
      <ExprInsertDialog
        open={showExprDialog}
        onClose={() => setShowExprDialog(false)}
        onInsertExpr={(expr) => {
          onInsertExpr(expr);
          setShowExprDialog(false);
        }}
        onInsertTag={(expr) => {
          if (onInsertTemplateTag) {
            onInsertTemplateTag(expr);
          } else if (expr.tagName) {
            onInsertTag(expr.tagName);
          }
          setShowExprDialog(false);
        }}
      />
    </>
  );
}
