#!/usr/bin/env node
// [2026-09-09-0001-ui-family-class-nesting-cleanup follow-up] Persists the family-class
// nesting check: same `nop-<family>` literal must appear at most once per ui component
// file, except for sanctioned parallel roots (portal siblings / user-placed并列根),
// which are whitelisted explicitly below with the structural reason.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const UI_DIR = join(process.cwd(), 'packages/ui/src/components/ui');

// Sanctioned parallel roots: same-family class on elements that are NOT on one DOM
// ancestor chain (portal siblings, or并列 roots the user places side by side).
// File → family list; only these families are exempt in that file.
const PARALLEL_ROOT_WHITELIST = {
  'combobox.tsx': ['nop-combobox'], // Trigger + Content(portal)
  'context-menu.tsx': ['nop-context-menu'], // Trigger + Content(portal)
  'dialog.tsx': ['nop-dialog'], // Overlay + Content(portal siblings)
  'item.tsx': ['nop-item'], // Item + ItemSeparator(sibling between items)
  'menubar.tsx': ['nop-menubar'], // Root + MenubarContent(portal dropdown)
  'navigation-menu.tsx': ['nop-navigation-menu'], // Root + Positioner(portal)
  'sidebar-layout.tsx': ['nop-sidebar'], // sibling panes inside Sidebar / outside Trigger+Inset
};

// Family literals carry a trailing space inside the quotes by convention
// ("nop-table ") — the ` ?` keeps the check working if a literal drops it.
const literalPattern = /['"]nop-[a-z0-9-]+ ?['"]/g;
const familyPattern = /['"]nop-([a-z0-9-]+) ?['"]/;

let failures = 0;
for (const file of readdirSync(UI_DIR).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))) {
  const exemptFamilies = PARALLEL_ROOT_WHITELIST[file] ?? [];
  const source = readFileSync(join(UI_DIR, file), 'utf8');
  const counts = new Map();
  for (const match of source.matchAll(literalPattern)) {
    const family = familyPattern.exec(match[0])?.[1];
    if (!family || exemptFamilies.includes(`nop-${family}`)) continue;
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  for (const [family, count] of counts) {
    if (count > 1) {
      failures += 1;
      console.error(
        `[check-ui-family-nesting] ${file}: nop-${family} appears ${count}x (not whitelisted as parallel roots)`,
      );
    }
  }
}

if (failures > 0) {
  console.error(
    '[check-ui-family-nesting] violations found. Same-ancestor-chain family classes defeat host element-selector targeting; keep the class on the family usage root only (see plan 2026-09-09-0001 appendix A).',
  );
  process.exit(1);
}
console.log('[check-ui-family-nesting] ok: no non-whitelisted duplicate family classes in packages/ui.');
