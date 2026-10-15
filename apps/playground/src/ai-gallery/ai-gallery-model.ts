/**
 * AI gallery inventory (plan `2026-10-14-playground-home-ia`).
 *
 * The 14 `ai-*` demo pages are registered as `DOMAIN_RENDERER_ROUTES` entries and
 * keep their standalone `#/<ai-id>` routes. The home page no longer lists them
 * individually; instead one "AI Scenarios" aggregate card opens `#/ai`, where a
 * left nav groups the demos by phase and embeds the selected demo.
 *
 * Titles/descriptions are derived from `DOMAIN_RENDERER_ROUTES` (single source of
 * truth); only the phase assignment is owned here. `route-matrix.test.ts` pins the
 * bidirectional coverage between this inventory and the `ai` family in
 * `home-families.ts`.
 */

import { DOMAIN_RENDERER_ROUTES } from '../domain-route-entries.js';

export type AiGalleryPhase = 'chat' | 'agentic' | 'widgets' | 'input' | 'coverage';

export interface AiGalleryPhaseMeta {
  id: AiGalleryPhase;
  label: string;
  description: string;
}

export const AI_GALLERY_PHASE_ORDER: AiGalleryPhase[] = [
  'chat',
  'agentic',
  'widgets',
  'input',
  'coverage',
];

export const AI_GALLERY_PHASE_META: Record<AiGalleryPhase, AiGalleryPhaseMeta> = {
  chat: {
    id: 'chat',
    label: 'Chat Core',
    description: 'Conversation panel, list, switching, and persistence.',
  },
  agentic: {
    id: 'agentic',
    label: 'Agentic & Tools',
    description: 'Tool-call loop, human-in-the-loop approval, and imperative handles.',
  },
  widgets: {
    id: 'widgets',
    label: 'Widgets & Display',
    description: 'Bubble, citations, suggestions, token usage, virtual scroll, and linkage.',
  },
  input: {
    id: 'input',
    label: 'Input & Multimodal',
    description: 'Attachment uploader and rich-text sender.',
  },
  coverage: {
    id: 'coverage',
    label: 'Coverage & States',
    description: 'Deterministic state and edge-case coverage harness.',
  },
};

const AI_GALLERY_PHASE_BY_ID: Record<string, AiGalleryPhase> = {
  'ai-chat': 'chat',
  'ai-conversations': 'chat',
  'ai-persistence': 'chat',

  'ai-tools': 'agentic',
  'ai-hitl': 'agentic',
  'ai-component-handle': 'agentic',

  'ai-widgets': 'widgets',
  'ai-citations': 'widgets',
  'ai-p4': 'widgets',
  'ai-virtual-scroll': 'widgets',
  'ai-linkage': 'widgets',

  'ai-attachments': 'input',
  'ai-rich-text': 'input',

  'ai-coverage': 'coverage',
};

export interface AiGalleryEntry {
  id: string;
  title: string;
  description: string;
  phase: AiGalleryPhase;
}

export const AI_GALLERY_ENTRIES: AiGalleryEntry[] = DOMAIN_RENDERER_ROUTES.filter(
  (entry) => entry.id in AI_GALLERY_PHASE_BY_ID,
).map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: entry.description,
  phase: AI_GALLERY_PHASE_BY_ID[entry.id]!,
}));

export function groupAiGalleryByPhase(): Array<{
  phase: AiGalleryPhase;
  meta: AiGalleryPhaseMeta;
  entries: AiGalleryEntry[];
}> {
  const map = new Map<AiGalleryPhase, AiGalleryEntry[]>();
  for (const entry of AI_GALLERY_ENTRIES) {
    const list = map.get(entry.phase);
    if (list) list.push(entry);
    else map.set(entry.phase, [entry]);
  }
  return AI_GALLERY_PHASE_ORDER.filter((phase) => map.has(phase)).map((phase) => ({
    phase,
    meta: AI_GALLERY_PHASE_META[phase],
    entries: map.get(phase)!,
  }));
}
