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
          title="flux.wordEditor.insertExpression"
          testId="insert-expression"
        />
        <ToolbarButton
          icon={GitBranch}
          onClick={() => onInsertTag('c:if')}
          title="flux.wordEditor.ifBlock"
          testId="insert-if-block"
        />
        <ToolbarButton
          icon={Repeat}
          onClick={() => onInsertTag('c:for')}
          title="flux.wordEditor.forLoop"
          testId="insert-for-loop"
        />
        <ToolbarButton
          icon={FileOutput}
          onClick={() => onInsertTag('c:out')}
          title="flux.wordEditor.output"
          testId="insert-output"
        />
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
