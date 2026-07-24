import { EditorContent, type Editor } from '@tiptap/react';

/**
 * Thin presentational wrapper around `EditorContent`.
 */
export function TiptapSenderSurface({ editor }: { editor: Editor | null }): React.ReactElement {
  if (!editor) {
    return (
      <div
        className="nop-ai-sender-tiptap min-h-[40px] rounded-md border border-input bg-background"
        data-slot="ai-sender-tiptap"
        data-loading=""
        aria-busy="true"
      />
    );
  }
  return (
    <div
      className="nop-ai-sender-tiptap rounded-md border border-input bg-background"
      data-slot="ai-sender-tiptap"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
