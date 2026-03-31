import { useState } from 'react'
import { Code2, GitBranch, Repeat, FileOutput } from 'lucide-react'
import { ToolbarButton, ToolbarGroup } from './shared.js'
import { ExprInsertDialog } from '../dialogs/ExprInsertDialog.js'

interface TemplateControlsProps {
  onInsertExpr: (expr: string) => void
  onInsertTag: (tagName: string) => void
}

export function TemplateControls({ onInsertExpr, onInsertTag }: TemplateControlsProps) {
  const [showExprDialog, setShowExprDialog] = useState(false)

  return (
    <>
      <ToolbarGroup>
        <ToolbarButton
          icon={Code2}
          onClick={() => setShowExprDialog(true)}
          title="Insert Expression"
        />
        <ToolbarButton
          icon={GitBranch}
          onClick={() => onInsertTag('c:if')}
          title="If Block"
        />
        <ToolbarButton
          icon={Repeat}
          onClick={() => onInsertTag('c:for')}
          title="For Loop"
        />
        <ToolbarButton
          icon={FileOutput}
          onClick={() => onInsertTag('c:out')}
          title="Output"
        />
      </ToolbarGroup>
      <ExprInsertDialog
        open={showExprDialog}
        onClose={() => setShowExprDialog(false)}
        onInsert={(expr) => {
          onInsertExpr(expr)
          setShowExprDialog(false)
        }}
      />
    </>
  )
}
