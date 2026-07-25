import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ENGINE_DIR = join(__dirname, '..', 'engine');
const RENDERERS_DIR = join(__dirname, '..', 'renderers');
const ADAPTERS_DIR = join(__dirname, '..', 'adapters');

const FORBIDDEN_GLOBAL_IO = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection|localStorage|sessionStorage|indexedDB|history\.pushState|navigator\.(geolocation|mediaDevices)/;
// Anchored to line start so prose mentions of `import 'react'` in doc comments
// (e.g. "MUST NOT import 'react'") do not trigger a false positive.
const FORBIDDEN_IMPORTS = /^\s*import\s+(?:['"]react['"]|.*\sfrom\s+['"]react['"])/m;
// P6 (A6) bundle-isolation invariant: `src/engine/`, `src/renderers/`, and
// `src/adapters/` MUST NOT import Tiptap — only the opt-in `./rich-text`
// subpath (host-imported) is allowed to pull Tiptap into the bundle. See
// design.md §18.2 #11 + plan 2026-07-24-2200-1 Phase 1.
const FORBIDDEN_TIPTAP_IMPORTS = /^\s*import\s+.*\sfrom\s+['"]@tiptap\//m;

function listSourceFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full, exts));
    } else if (exts.includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

describe('INV-1: engine + renderers do not touch external IO APIs', () => {
  it('src/engine/ has zero react imports', () => {
    for (const file of listSourceFiles(ENGINE_DIR, ['.ts'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_IMPORTS);
    }
  });

  it('src/engine/ never calls forbidden global IO APIs', () => {
    for (const file of listSourceFiles(ENGINE_DIR, ['.ts'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_GLOBAL_IO);
    }
  });

  it('src/engine/ has no dynamic import()', () => {
    for (const file of listSourceFiles(ENGINE_DIR, ['.ts'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/\bimport\s*\(/);
    }
  });

  it('src/renderers/ never calls forbidden global IO APIs directly', () => {
    for (const file of listSourceFiles(RENDERERS_DIR, ['.ts', '.tsx'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_GLOBAL_IO);
    }
  });

  // Major-3: the FORBIDDEN_GLOBAL_IO scan must cover `adapters/` too so that
  // host helpers like `useConversation` cannot bypass the storage injection
  // invariant (INV-1) by touching `localStorage`/`fetch`/`IndexedDB` directly.
  it('src/adapters/ never calls forbidden global IO APIs directly', () => {
    for (const file of listSourceFiles(ADAPTERS_DIR, ['.ts', '.tsx'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_GLOBAL_IO);
    }
  });

  it('src/adapters/ connector factory has no hardcoded backend config (baseURL/apiKey/model)', () => {
    const factory = readFileSync(join(ADAPTERS_DIR, 'ai-connector-factory.ts'), 'utf8');
    // The factory must not hardcode baseURL/apiKey/model literals.
    expect(factory).not.toMatch(/\bapiKey\s*[=:]/);
    expect(factory).not.toMatch(/baseURL\s*[:=]\s*['"]/);
  });

  // P6 (A6): bundle-isolation guard. Tiptap is an optional peerDep exposed
  // only via the `./rich-text` subpath. The three bundled runtime subtrees
  // (`src/engine/`, `src/renderers/`, `src/adapters/`) MUST NOT import Tiptap
  // — otherwise every host would pay the Tiptap cost even when it never opts
  // into rich text. The `src/rich-text/` subpath is explicitly exempt.
  it('src/engine/ has no @tiptap imports', () => {
    for (const file of listSourceFiles(ENGINE_DIR, ['.ts'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_TIPTAP_IMPORTS);
    }
  });

  it('src/renderers/ has no @tiptap imports', () => {
    for (const file of listSourceFiles(RENDERERS_DIR, ['.ts', '.tsx'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_TIPTAP_IMPORTS);
    }
  });

  it('src/adapters/ has no @tiptap imports', () => {
    for (const file of listSourceFiles(ADAPTERS_DIR, ['.ts', '.tsx'])) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(FORBIDDEN_TIPTAP_IMPORTS);
    }
  });
});

describe('INV-1: storage ships interface only', () => {
  it('src/storage/types.ts contains the interface and no concrete implementation', () => {
    const types = readFileSync(join(__dirname, '..', 'storage', 'types.ts'), 'utf8');
    expect(types).toMatch(/interface ConversationStorageStrategy/);
    // No exported function/class/factory in the contract file.
    expect(types).not.toMatch(/^\s*export\s+(async\s+)?(function|class)\s/m);
    expect(types).not.toMatch(/^\s*(function|class)\s+\w+/m);
  });
});

// ============================================================================
// F1.4 (schema honesty): `groupStrategy` / `dividerRole` / `maxGroupSize` were
// declared on `ai-message-list` but never implemented by `AiMessageListView`
// (dead contract). They were adjudicated REMOVED (not implemented) so the
// schema cannot promise grouping behaviour the renderer does not provide.
// ============================================================================

describe('F1.4: ai-message-list declares no unimplemented grouping contract', () => {
  const DEAD_FIELDS = /\b(groupStrategy|dividerRole|maxGroupSize)\b/;

  it('schemas.ts no longer declares groupStrategy/dividerRole/maxGroupSize', () => {
    const src = readFileSync(join(__dirname, '..', 'schemas.ts'), 'utf8');
    expect(src).not.toMatch(DEAD_FIELDS);
  });

  it('ai-renderer-definitions.ts no longer registers the three fields', () => {
    const src = readFileSync(join(__dirname, '..', 'ai-renderer-definitions.ts'), 'utf8');
    expect(src).not.toMatch(DEAD_FIELDS);
  });

  it('ai-message-list.tsx no longer threads groupStrategy through the view', () => {
    const src = readFileSync(join(RENDERERS_DIR, 'ai-message-list.tsx'), 'utf8');
    expect(src).not.toMatch(DEAD_FIELDS);
  });
});

// ============================================================================
// 0707 P2-3 (schema honesty): 6 schema TYPE fields were declared but had zero
// consumers in src/renderers/** + src/rich-text/** + src/adapters/** (dead
// contract). Adjudicated REMOVED so the schema cannot promise behaviour the
// renderers do not provide. `actions` is excluded here because the live
// `AiFeedbackSchema.actions?: SchemaValue` (consumed by ai-feedback.tsx) is
// intentionally KEPT — only the dead `AiSenderSchema.actions?: SchemaInput`
// was removed; that distinction is asserted by its own dedicated test below.
//
// NOTE on `trigger`: `ai-message-list.tsx:40` has an unrelated local
// `const trigger` (auto-scroll dep), so `trigger` MUST be scanned against
// schemas.ts ONLY — folding it into the shared 3-file `DEAD_FIELDS` regex
// above would false-positive on the renderer local. This suite therefore
// scans schemas.ts in isolation for the 0707 set.
// ============================================================================

describe('0707 P2-3: schemas.ts declares no dead unconsumed TYPE fields', () => {
  // schemas.ts-only: these identifiers must not appear as field declarations.
  // Matching the bare word is safe here because schemas.ts is the single
  // source of schema field declarations and none of these names appear in
  // its prose except as the (now-removed) fields themselves.
  const SCHEMAS_DEAD_FIELDS = /\b(conversationId|onSend|itemRegion|avatarRegion|menuItems|trigger)\b\s*\??:/;

  it('schemas.ts no longer declares conversationId/onSend/itemRegion/avatarRegion/menuItems/trigger', () => {
    const src = readFileSync(join(__dirname, '..', 'schemas.ts'), 'utf8');
    expect(src).not.toMatch(SCHEMAS_DEAD_FIELDS);
  });

  it('AiSenderSchema no longer declares the dead `actions?: SchemaInput`', () => {
    // `actions` is intentionally KEPT on AiFeedbackSchema (SchemaValue, live —
    // consumed by ai-feedback.tsx via `resolved.actions`). Only the dead
    // AiSender `SchemaInput` declaration was removed. Extract the AiSender
    // interface block and assert it has no `actions` field.
    const src = readFileSync(join(__dirname, '..', 'schemas.ts'), 'utf8');
    const senderBlock = src.match(/export interface AiSenderSchema extends BaseSchema \{[\s\S]*?\n\}/);
    expect(senderBlock, 'AiSenderSchema interface block must exist').not.toBeNull();
    expect(senderBlock![0]).not.toMatch(/\bactions\b\s*\??:/);
  });

  it('AiFeedbackSchema still declares the live `actions?: SchemaValue` (regression guard)', () => {
    const src = readFileSync(join(__dirname, '..', 'schemas.ts'), 'utf8');
    const feedbackBlock = src.match(/export interface AiFeedbackSchema extends BaseSchema \{[\s\S]*?\n\}/);
    expect(feedbackBlock, 'AiFeedbackSchema interface block must exist').not.toBeNull();
    expect(feedbackBlock![0]).toMatch(/actions\?:\s*SchemaValue/);
  });
});

// ============================================================================
// AI-29 / Renderer Styling Contract: the `nop-ai-` marker prefix is reserved
// for component ROOT elements only (semantic identity). Internal regions use
// `data-slot`. A `nop-ai-` class on an internal element (e.g. `nop-ai-*-item`,
// `nop-ai-*-wave`, `nop-ai-*-branches`) leaks the marker namespace and breaks
// the marker-purity invariant. This scan enforces it statically.
// ============================================================================

const ROOT_MARKER_CLASSES = new Set([
  'nop-ai-chat',
  'nop-ai-message-list',
  'nop-ai-bubble',
  'nop-ai-sender',
  'nop-ai-conversations',
  'nop-ai-welcome',
  'nop-ai-prompts',
  'nop-ai-feedback',
  'nop-ai-tool-call',
  'nop-ai-attachments',
  'nop-ai-citations',
  'nop-ai-voice-input',
  'nop-ai-token-usage',
  'nop-ai-suggestions',
]);

describe('AI-29: nop- prefix appears only on component root elements', () => {
  it('renderers/**/*.tsx never applies a non-root nop-ai-* class', () => {
    // Match a quote-delimited `nop-ai-…` token. Doc-comment prose wraps these
    // in backticks (`nop-ai-x`), so anchoring on a quote avoids false hits.
    const tokenRe = /['"]nop-ai-[a-z-]+/g;
    const violations: string[] = [];
    for (const file of listSourceFiles(RENDERERS_DIR, ['.tsx'])) {
      if (file.includes('__tests__')) continue;
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(tokenRe)) {
        const token = match[0].slice(1);
        if (!ROOT_MARKER_CLASSES.has(token)) {
          violations.push(`${relative(RENDERERS_DIR, file)}: "${token}"`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
