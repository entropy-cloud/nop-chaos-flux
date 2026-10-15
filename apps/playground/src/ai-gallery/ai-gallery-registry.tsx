import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * AI gallery demo registry (plan `2026-10-14-playground-home-ia`).
 *
 * Maps each `ai-*` demo id to its standalone page component, lazy-loaded so the
 * gallery shell stays light (mirrors `domain-route-pages.tsx`). Every page shares
 * the `{ onBack }` prop contract; the gallery passes a callback that returns to
 * the home page, matching the standalone domain-route behaviour.
 *
 * `route-matrix.test.ts` pins coverage: every gallery entry has a component and
 * every component has a gallery entry.
 */
export type AiGalleryDemoComponent = LazyExoticComponent<ComponentType<{ onBack: () => void }>>;

export const AI_GALLERY_REGISTRY: Record<string, AiGalleryDemoComponent> = {
  'ai-chat': lazy(() =>
    import('../pages/ai-chat-demo').then((m) => ({ default: m.AiChatDemoPage })),
  ),
  'ai-conversations': lazy(() =>
    import('../pages/ai-conversations-demo').then((m) => ({
      default: m.AiConversationsDemoPage,
    })),
  ),
  'ai-persistence': lazy(() =>
    import('../pages/ai-persistence-demo').then((m) => ({ default: m.AiPersistenceDemoPage })),
  ),
  'ai-tools': lazy(() =>
    import('../pages/ai-tools-demo').then((m) => ({ default: m.AiToolsDemoPage })),
  ),
  'ai-hitl': lazy(() =>
    import('../pages/ai-hitl-demo').then((m) => ({ default: m.AiHitlDemoPage })),
  ),
  'ai-component-handle': lazy(() =>
    import('../pages/ai-component-handle-demo').then((m) => ({
      default: m.AiComponentHandleDemoPage,
    })),
  ),
  'ai-widgets': lazy(() =>
    import('../pages/ai-widgets-demo').then((m) => ({ default: m.AiWidgetsDemoPage })),
  ),
  'ai-citations': lazy(() =>
    import('../pages/ai-citations-demo').then((m) => ({ default: m.AiCitationsDemoPage })),
  ),
  'ai-p4': lazy(() =>
    import('../pages/ai-p4-widgets-demo').then((m) => ({ default: m.AiP4WidgetsDemoPage })),
  ),
  'ai-virtual-scroll': lazy(() =>
    import('../pages/ai-virtual-scroll-demo').then((m) => ({
      default: m.AiVirtualScrollDemoPage,
    })),
  ),
  'ai-linkage': lazy(() =>
    import('../pages/ai-linkage-demo').then((m) => ({ default: m.AiLinkageDemoPage })),
  ),
  'ai-attachments': lazy(() =>
    import('../pages/ai-attachments-demo').then((m) => ({ default: m.AiAttachmentsDemoPage })),
  ),
  'ai-rich-text': lazy(() =>
    import('../pages/ai-rich-text-demo').then((m) => ({ default: m.AiRichTextDemoPage })),
  ),
  'ai-coverage': lazy(() =>
    import('../pages/ai-coverage-demo').then((m) => ({ default: m.AiCoverageDemoPage })),
  ),
};
