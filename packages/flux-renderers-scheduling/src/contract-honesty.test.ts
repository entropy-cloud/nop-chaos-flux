import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const SRC_DIR = import.meta.dirname;

// INV-1 (renderer-env.md): renderer source must route external IO through
// RendererEnv. Network IO (fetch/XHR/WebSocket/EventSource/import()) and
// storage APIs (localStorage/sessionStorage/indexedDB) are forbidden. The
// barcode camera uses navigator.mediaDevices + BarcodeDetector which are
// device APIs, not network IO (ai-voice-input precedent) — allowed.
const FORBIDDEN_GLOBAL_IO = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection|localStorage|sessionStorage|indexedDB|history\.pushState/g;

function listSourceFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) {
      continue;
    }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full, exts));
    } else if (exts.includes(extname(name))) {
      out.push(full);
    }
  }
  return out;
}

describe('INV-1: scheduling renderer source never calls forbidden global IO APIs', () => {
  it('src/** (excluding tests) has zero direct network/storage IO calls', () => {
    const violations: string[] = [];
    for (const file of listSourceFiles(SRC_DIR, ['.ts', '.tsx'])) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(FORBIDDEN_GLOBAL_IO)) {
        violations.push(`${relative(SRC_DIR, file)}: ${match[0].trim()}`);
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
