import type { ChatMessage, ChatMessageContentPart } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';

/**
 * `image` bubble content renderer (design.md §3.3). Matches assistant / user
 * messages whose content array contains one or more `image_url` parts and
 * renders them as a responsive grid.
 *
 * Registered at `CONTENT` priority so it takes precedence over the generic
 * text fallback for image parts.
 */
export function ImageContentRenderer({ message }: BubbleContentRendererProps): React.ReactElement | null {
  const images = extractImages(message);
  if (images.length === 0) return null;
  return (
    <div data-slot="ai-bubble-image" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((img) => (
        <img
          key={img.image_url.url}
          src={img.image_url.url}
          alt=""
          loading="lazy"
          className="max-h-48 w-full rounded object-cover"
          data-slot="ai-bubble-image-item"
        />
      ))}
    </div>
  );
}

type ImagePart = Extract<ChatMessageContentPart, { type: 'image_url' }>;

function extractImages(message: ChatMessage): ImagePart[] {
  const content = message.content;
  if (!Array.isArray(content)) return [];
  const out: ImagePart[] = [];
  for (const part of content) {
    if (isImagePart(part)) out.push(part);
  }
  return out;
}

function isImagePart(part: ChatMessageContentPart): part is ImagePart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as { type?: unknown }).type === 'image_url'
  );
}

export function imageMatcher(message: ChatMessage): boolean {
  return extractImages(message).length > 0;
}
