import type { Editor } from '@tiptap/react';
import { Button } from '@nop-chaos/ui';
import type { TiptapTemplateItem } from '../types.js';
import { insertTemplate } from '../extensions/template.js';

/**
 * Template insertion toolbar — renders one button per `TiptapTemplateItem`.
 * Clicking inserts the template's `content` at the caret.
 *
 * Plan 480 (R5/A5): no toolbar composite role (20-07 decision — APG toolbar
 * requires roving tabindex; every button is already an independent tab stop)
 * and the unified Button spec (ghost + h-7 min-w-7 px-1.5; text label keys
 * keep `text-xs`).
 */
export function TemplateBar({
  templates,
  editor,
  locked = false,
}: {
  templates: TiptapTemplateItem[];
  editor: Editor | null;
  /** [G5-R5-视角3-02] disabled/loading lock: inserting a template is a WRITE —
   * gate it like the editor's own editable flag instead of letting commands
   * bypass it. */
  locked?: boolean;
}): React.ReactElement {
  return (
    <div
      className="nop-ai-sender-tiptap-templates flex flex-wrap gap-1 pb-1"
      data-slot="ai-sender-tiptap-templates"
    >
      {templates.map((tpl) => (
        <Button
          key={tpl.label}
          type="button"
          variant="ghost"
          size="sm"
          data-testid={`ai-sender-template-${tpl.label}`}
          disabled={locked || !editor || !editor.isEditable}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertTemplate(editor, tpl)}
          className="h-7 min-w-7 px-1.5 text-xs"
        >
          {tpl.label}
        </Button>
      ))}
    </div>
  );
}
