import { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { File as FileIcon, ImageIcon, Paperclip, X } from 'lucide-react';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import type { ChatMessageContentPart } from '../engine/types.js';
import type { AiAttachmentsSchema, AiAttachmentItem } from '../schemas.js';

/**
 * Runtime attachment model (renderers.md §9.1). Mirrors the serializable
 * `AiAttachmentItem` schema fields but adds a local `file` reference (for
 * object URLs). Defined independently from the schema type because `File` is
 * not assignable to the schema's `SchemaValue` index signature.
 */
export interface AiAttachment {
  id: string;
  url: string;
  name?: string;
  contentType?: string;
  size?: number;
  status?: 'uploading' | 'success' | 'error';
  /** Underlying File (when sourced from a picker / drop). Absent for remote. */
  file?: File;
}

/**
 * ai-attachments (Widget, P2): multimodal attachment uploader + preview.
 *
 * - image / card mode (auto-detect by MIME when `mode='auto'`, the default).
 * - `accept` / `multiple` / `maxSize` / `maxFiles` validation; over-limit files
 *   are rejected and fire `onError` (Failure Paths `attachment-too-large` /
 *   `attachment-too-many`).
 * - drag-and-drop + paste; drag state is local `useState` (NOT pushed into the
 *   engine, design.md §4.6).
 * - attachments are sent as `image_url` content parts via `engine.sendMessage`
 *   (multimodal). The `onUpload` event lets the host persist the upload first.
 *
 * Marker `nop-ai-attachments`; `data-slot="ai-attachments"`.
 */
export function AiAttachmentsRenderer(props: RendererComponentProps<AiAttachmentsSchema>): RendererRenderOutput {
  const resolved = props.props;
  const ctx = useAiChatContext();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const accept = typeof resolved.accept === 'string' ? resolved.accept : undefined;
  const multiple = resolved.multiple !== false;
  const maxSize = typeof resolved.maxSize === 'number' ? resolved.maxSize : undefined;
  const maxFiles = typeof resolved.maxFiles === 'number' ? resolved.maxFiles : undefined;
  const enableDrop = resolved.enableDrop !== false;
  const mode = resolved.mode ?? 'auto';

  const controlledValue = Array.isArray(resolved.value) ? (resolved.value as AiAttachmentItem[]) : null;
  const [internalAttachments, setInternalAttachments] = useState<AiAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const attachments = controlledValue ?? internalAttachments;
  // AI-10 (resource lifecycle): object URLs created locally (via the picker /
  // drop / paste) are tracked here so they can be revoked on remove and on
  // unmount. Remote/controlled URLs (host-owned) are never revoked here.
  const localUrlsRef = useRef<Set<string>>(new Set());

  // Revoke every locally-created object URL on unmount so long sessions do not
  // leak blob memory (Failure Path `object-url-revoked`).
  useEffect(() => {
    const localUrls = localUrlsRef.current;
    return () => {
      for (const url of localUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // revokeObjectURL never throws in practice; guard anyway.
        }
      }
      localUrls.clear();
    };
  }, []);

  function reportChange(next: AiAttachment[]) {
    if (!controlledValue) setInternalAttachments(next);
    void props.events.onChange?.({ type: 'ai:attachments-change', attachments: next });
  }

  function addFiles(incoming: File[]) {
    const accepted: AiAttachment[] = [];
    let tooLarge = false;
    let tooMany = false;
    for (const file of incoming) {
      if (maxSize !== undefined && file.size > maxSize) {
        tooLarge = true;
        continue;
      }
      if (maxFiles !== undefined && attachments.length + accepted.length >= maxFiles) {
        tooMany = true;
        continue;
      }
      const url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '';
      if (url) localUrlsRef.current.add(url);
      accepted.push({
        id: generateAttachmentId(),
        url,
        name: file.name,
        contentType: file.type,
        size: file.size,
        status: 'success',
        file,
      });
    }
    if (accepted.length > 0) {
      reportChange([...attachments, ...accepted]);
    }
    if (tooLarge) {
      void props.events.onError?.({ type: 'ai:attachments-error', reason: 'attachment-too-large' });
    }
    if (tooMany) {
      void props.events.onError?.({ type: 'ai:attachments-error', reason: 'attachment-too-many' });
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    addFiles(files);
    event.target.value = '';
  }

  function handleRemove(id: string) {
    const removed = attachments.find((a) => a.id === id);
    if (removed && localUrlsRef.current.has(removed.url)) {
      try {
        URL.revokeObjectURL(removed.url);
      } catch {
        // ignore
      }
      localUrlsRef.current.delete(removed.url);
    }
    const next = attachments.filter((a) => a.id !== id);
    reportChange(next);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!enableDrop) return;
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
    if (files.length > 0) addFiles(files);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!enableDrop) return;
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = event.clipboardData?.files ? Array.from(event.clipboardData.files) : [];
    if (files.length > 0) {
      event.preventDefault();
      addFiles(files);
    }
  }

  async function handleUpload() {
    const imageAttachments = attachments.filter((a) => isImageMime(a.contentType) || isImageExt(a.name));
    void props.events.onUpload?.({ type: 'ai:attachments-upload', attachments });
    if (imageAttachments.length > 0 && ctx) {
      const parts: ChatMessageContentPart[] = imageAttachments.map((a) => ({
        type: 'image_url',
        image_url: { url: a.url },
      }));
      await ctx.sendMessage(parts);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  const effectiveMode = mode === 'auto' ? detectMode(attachments) : mode;

  return (
    <div
      className={cn('nop-ai-attachments', props.meta.className)}
      data-slot="ai-attachments"
      data-mode={effectiveMode}
      data-dragging={dragging ? '' : undefined}
      data-cid={props.meta.cid || undefined}
      data-testid={props.meta.testid || undefined}
      role="button"
      tabIndex={0}
      aria-label={t('flux.ai.attachFiles')}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          data-slot="ai-attachments-input"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="ai-attachments-pick"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          {t('flux.ai.attachFiles')}
        </Button>
        {attachments.length > 0 ? (
          <Button
            type="button"
            size="sm"
            data-slot="ai-attachments-upload"
            onClick={handleUpload}
          >
            {t('flux.ai.send')}
          </Button>
        ) : null}
      </div>
      {attachments.length > 0 ? (
        <div
          data-slot="ai-attachments-list"
          className={cn(
            'mt-2',
            effectiveMode === 'image' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-1',
          )}
        >
          {attachments.map((a) => (
            <AttachmentItemView
              key={a.id}
              attachment={a}
              mode={effectiveMode}
              onRemove={() => handleRemove(a.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentItemView(props: {
  attachment: AiAttachment;
  mode: 'image' | 'card';
  onRemove: () => void;
}): React.ReactElement {
  const { attachment, mode, onRemove } = props;
  if (mode === 'image' && (isImageMime(attachment.contentType) || isImageExt(attachment.name))) {
    return (
      <div className="group relative" data-slot="ai-attachments-item">
        <img
          src={attachment.url}
          alt={attachment.name ?? ''}
          className="h-20 w-20 rounded object-cover"
          data-slot="ai-attachments-thumb"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
          data-slot="ai-attachments-remove"
          aria-label={t('flux.ai.removeFile')}
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-2 rounded border border-border p-2 text-xs"
      data-slot="ai-attachments-item"
    >
      {isImageMime(attachment.contentType) ? (
        <ImageIcon className="h-4 w-4" />
      ) : (
        <FileIcon className="h-4 w-4" />
      )}
      <span className="flex-1 truncate">{attachment.name}</span>
      {typeof attachment.size === 'number' ? (
        <span className="text-muted-foreground">{formatBytes(attachment.size)}</span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0"
        data-slot="ai-attachments-remove"
        aria-label={t('flux.ai.removeFile')}
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/** Assemble image attachments as `image_url` content parts (multimodal send). */
export function buildImageContentParts(attachments: AiAttachment[]): ChatMessageContentPart[] {
  return attachments
    .filter((a) => isImageMime(a.contentType) || isImageExt(a.name))
    .map((a) => ({ type: 'image_url' as const, image_url: { url: a.url } }));
}

/**
 * O-4 (attachment id collision): attachments need a stable React key + removal
 * handle that does NOT collide when two files share name/size/lastModified.
 * Prefer `crypto.randomUUID`; fall back to an incrementing counter for non-browser
 * runtimes (SSR / test envs without the Web Crypto impl).
 */
let attachmentIdCounter = 0;
function generateAttachmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  attachmentIdCounter += 1;
  return `ai-att-${Date.now().toString(36)}-${attachmentIdCounter.toString(36)}`;
}

function detectMode(attachments: AiAttachment[]): 'image' | 'card' {
  if (attachments.length === 0) return 'image';
  return attachments.every((a) => isImageMime(a.contentType) || isImageExt(a.name)) ? 'image' : 'card';
}

function isImageMime(mime?: string): boolean {
  return typeof mime === 'string' && mime.startsWith('image/');
}

function isImageExt(name?: string): boolean {
  if (!name) return false;
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
