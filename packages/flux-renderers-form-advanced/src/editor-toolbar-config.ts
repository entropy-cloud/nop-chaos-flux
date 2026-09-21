import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  HighlighterIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { t } from '@nop-chaos/flux-i18n';
import type { EditorToolbarButton } from './editor-schemas.js';

export interface ToolbarButtonConfig {
  id: EditorToolbarButton;
  isActive: (editor: Editor) => boolean;
  /** Returns a feedback token for inline display; `undefined` when nothing to surface. */
  run: (editor: Editor) => ToolbarRunFeedback | undefined;
  canRun: (editor: Editor) => boolean;
}

/** V12b G2-R3-视角4-01: unsafe link scheme no longer drops silently — the
 * renderer surfaces this token as inline feedback below the toolbar. */
export type ToolbarRunFeedback = 'unsafe-link';

export const TOOLBAR_BUTTONS: Record<EditorToolbarButton, ToolbarButtonConfig> = {
  bold: {
    id: 'bold',
    isActive: (e) => e.isActive('bold'),
    canRun: (e) => e.can().toggleBold(),
    run: (e) => {
      e.chain().focus().toggleBold().run();
    },
  },
  italic: {
    id: 'italic',
    isActive: (e) => e.isActive('italic'),
    canRun: (e) => e.can().toggleItalic(),
    run: (e) => {
      e.chain().focus().toggleItalic().run();
    },
  },
  underline: {
    id: 'underline',
    isActive: (e) => e.isActive('underline'),
    canRun: (e) => e.can().toggleUnderline(),
    run: (e) => {
      e.chain().focus().toggleUnderline().run();
    },
  },
  strike: {
    id: 'strike',
    isActive: (e) => e.isActive('strike'),
    canRun: (e) => e.can().toggleStrike(),
    run: (e) => {
      e.chain().focus().toggleStrike().run();
    },
  },
  h1: {
    id: 'h1',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    canRun: (e) => e.can().toggleHeading({ level: 1 }),
    run: (e) => {
      e.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  h2: {
    id: 'h2',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    canRun: (e) => e.can().toggleHeading({ level: 2 }),
    run: (e) => {
      e.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  bulletList: {
    id: 'bulletList',
    isActive: (e) => e.isActive('bulletList'),
    canRun: (e) => e.can().toggleBulletList(),
    run: (e) => {
      e.chain().focus().toggleBulletList().run();
    },
  },
  orderedList: {
    id: 'orderedList',
    isActive: (e) => e.isActive('orderedList'),
    canRun: (e) => e.can().toggleOrderedList(),
    run: (e) => {
      e.chain().focus().toggleOrderedList().run();
    },
  },
  code: {
    id: 'code',
    isActive: (e) => e.isActive('code'),
    canRun: (e) => e.can().toggleCode(),
    run: (e) => {
      e.chain().focus().toggleCode().run();
    },
  },
  blockquote: {
    id: 'blockquote',
    isActive: (e) => e.isActive('blockquote'),
    canRun: (e) => e.can().toggleBlockquote(),
    run: (e) => {
      e.chain().focus().toggleBlockquote().run();
    },
  },
  link: {
    id: 'link',
    isActive: (e) => e.isActive('link'),
    canRun: () => true,
    run: (e) => {
      const url = typeof window !== 'undefined' ? window.prompt(t('flux.editor.linkPrompt')) : null;
      if (url === null) {
        // Prompt dismissed → remove the link on the current range.
        e.chain().focus().extendMarkRange('link').unsetLink().run();
        return undefined;
      }
      if (isSafeLinkUrl(url)) {
        e.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
        return undefined;
      }
      // Unsafe scheme (javascript:/data:/vbscript:) → report inline instead of
      // dropping silently (V12b G2-R3-视角4-01, same guard reused).
      return 'unsafe-link';
    },
  },
  image: {
    id: 'image',
    isActive: () => false,
    canRun: () => true,
    run: (e) => {
      // URL prompt only (plan 480: the upload channel is out of scope).
      const src =
        typeof window !== 'undefined' ? window.prompt(t('flux.editor.imagePrompt')) : null;
      if (src !== null && isSafeImageUrl(src)) {
        e.chain().focus().setImage({ src: src.trim() }).run();
      }
      // Dismissed prompt or unsafe scheme (javascript:/data:text/html…) →
      // ignored; nothing is inserted.
    },
  },
  highlight: {
    id: 'highlight',
    isActive: (e) => e.isActive('highlight'),
    canRun: (e) => e.can().toggleHighlight(),
    run: (e) => {
      e.chain().focus().toggleHighlight().run();
    },
  },
  undo: {
    id: 'undo',
    isActive: () => false,
    canRun: (e) => e.can().undo(),
    run: (e) => {
      e.chain().focus().undo().run();
    },
  },
  redo: {
    id: 'redo',
    isActive: () => false,
    canRun: (e) => e.can().redo(),
    run: (e) => {
      e.chain().focus().redo().run();
    },
  },
};

export const TOOLBAR_ICONS: Record<EditorToolbarButton, typeof BoldIcon> = {
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
  blockquote: QuoteIcon,
  code: CodeIcon,
  link: LinkIcon,
  image: ImageIcon,
  highlight: HighlighterIcon,
  bold: BoldIcon,
  italic: ItalicIcon,
  underline: UnderlineIcon,
  strike: StrikethroughIcon,
  h1: Heading1Icon,
  h2: Heading2Icon,
  undo: Undo2Icon,
  redo: Redo2Icon,
};

/** Static i18n key per toolbar button (static keys so `check:i18n-keys` can verify them). */
export function toolbarButtonTitle(id: EditorToolbarButton): string {
  switch (id) {
    case 'bold':
      return t('flux.editor.bold');
    case 'italic':
      return t('flux.editor.italic');
    case 'underline':
      return t('flux.editor.underline');
    case 'strike':
      return t('flux.editor.strike');
    case 'h1':
      return t('flux.editor.heading1');
    case 'h2':
      return t('flux.editor.heading2');
    case 'bulletList':
      return t('flux.editor.bulletList');
    case 'orderedList':
      return t('flux.editor.orderedList');
    case 'code':
      return t('flux.editor.code');
    case 'blockquote':
      return t('flux.editor.blockquote');
    case 'link':
      return t('flux.editor.link');
    case 'image':
      return t('flux.editor.image');
    case 'highlight':
      return t('flux.editor.highlight');
    case 'undo':
      return t('flux.editor.undo');
    case 'redo':
      return t('flux.editor.redo');
  }
}

/**
 * Security red line (design §W3d): links may only use safe schemes. Absolute
 * URLs must be http/https/mailto/tel; anything else with a scheme
 * (javascript:/data:/vbscript:/file: …) is rejected. Relative URLs,
 * protocol-relative URLs and anchors are allowed.
 */
export function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return /^(https?|mailto|tel):/i.test(trimmed);
  }
  return true;
}

/**
 * Image src guard (plan 480 Failure Path: image-unsafe-src). Mirrors
 * `isSafeLinkUrl` plus one extension: `data:image/…` URIs are allowed (inline
 * image payloads), while every other `data:` type (`data:text/html` …) and
 * every script-capable scheme is rejected. The image URL prompt refuses to
 * insert a node when this returns false.
 */
export function isSafeImageUrl(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    if (/^data:image\//i.test(trimmed)) {
      return true;
    }
    return /^(https?):/i.test(trimmed);
  }
  return true;
}
