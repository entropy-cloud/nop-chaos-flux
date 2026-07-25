import type { Editor } from '@tiptap/react';
import { Button } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { TiptapTemplateItem } from '../types.js';
import { insertTemplate } from '../extensions/template.js';

/**
 * Template insertion toolbar — renders one button per `TiptapTemplateItem`.
 * Clicking inserts the template's `content` at the caret.
 */
export function TemplateBar({
  templates,
  editor,
}: {
  templates: TiptapTemplateItem[];
  editor: Editor | null;
}): React.ReactElement {
  return (
    <div
      className="nop-ai-sender-tiptap-templates flex flex-wrap gap-1 pb-1"
      data-slot="ai-sender-tiptap-templates"
      role="toolbar"
      aria-label={t('flux.ai.insertTemplate')}
    >
      {templates.map((tpl) => (
        <Button
          key={tpl.label}
          type="button"
          variant="ghost"
          size="sm"
          data-testid={`ai-sender-template-${tpl.label}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertTemplate(editor, tpl)}
          className="h-6 text-xs"
        >
          {tpl.label}
        </Button>
      ))}
    </div>
  );
}
