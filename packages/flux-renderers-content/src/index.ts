import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { contentRendererDefinitions } from './content-renderer-definitions.js';

export type {
  SeparatorSchema,
  SpinnerSchema,
  SpinnerSize,
  ProgressSchema,
  ProgressVariant,
  EmptySchema,
  CardSchema,
  CardVariant,
  LinkSchema,
  ImageSchema,
  ImageFit,
  JsonViewSchema,
  MarkdownSchema,
  HtmlSchema,
  CardsSchema,
  CardsSelectionMode,
  AlertSchema,
  AlertLevel,
  MappingSchema,
  StatusSchema,
  StatusLevel,
  AudioSchema,
  VideoSchema,
  CarouselSchema,
  CarouselItemSchema,
  QrCodeSchema,
  QrCodeLevel,
  DiffViewSchema,
  DiffFileMeta,
} from './schemas.js';

export { SeparatorRenderer } from './separator.js';
export { SpinnerRenderer } from './spinner.js';
export { ProgressRenderer, normalizeProgressValue, type NormalizedProgress } from './progress.js';
export { EmptyRenderer } from './empty.js';
export { CardRenderer } from './card.js';
export { LinkRenderer } from './link.js';
export { ImageRenderer } from './image.js';
export { JsonViewRenderer } from './json-view.js';
export { MarkdownRenderer } from './markdown.js';
export { HtmlRenderer } from './html.js';
export { CardsRenderer } from './cards-renderer.js';
export { AlertRenderer } from './alert-renderer.js';
export { MappingRenderer } from './mapping.js';
export { StatusRenderer } from './status.js';
export { AudioRenderer } from './audio.js';
export { VideoRenderer } from './video.js';
export { CarouselRenderer } from './carousel.js';
export { QrCodeRenderer } from './qrcode.js';
export { DiffViewRenderer } from './diff-view/diff-view-renderer.js';
export { sanitizeHtml, type SanitizeOptions } from './sanitize.js';

export { contentRendererDefinitions } from './content-renderer-definitions.js';
export type { ContentRendererSchema } from './content-renderer-definitions.js';

export function registerContentRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, contentRendererDefinitions);
}
