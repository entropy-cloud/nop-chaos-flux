import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, extname } from 'node:path';

const ENGINE_DIR = join(__dirname, '..', 'engine');
const RENDERERS_DIR = join(__dirname, '..', 'renderers');
const ADAPTERS_DIR = join(__dirname, '..', 'adapters');

const FORBIDDEN_GLOBAL_IO = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection|localStorage|sessionStorage|indexedDB|history\.pushState|navigator\.(geolocation|mediaDevices)/;
// Anchored to line start so prose mentions of `import 'react'` in doc comments
// (e.g. "MUST NOT import 'react'") do not trigger a false positive.
const FORBIDDEN_IMPORTS = /^\s*import\s+(?:['"]react['"]|.*\sfrom\s+['"]react['"])/m;

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
