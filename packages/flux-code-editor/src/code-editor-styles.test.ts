import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('src/code-editor-styles.css', 'utf8');
const compactStyles = styles.replace(/\s+/g, ' ').trim();
const baseExtensions = readFileSync('src/extensions/base.ts', 'utf8');

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba\(/;

function stripBalancedVarCalls(css: string): string {
  let out = '';
  for (let i = 0; i < css.length; ) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i;
      for (; j < css.length; j++) {
        if (css[j] === '(') depth++;
        else if (css[j] === ')') {
          depth--;
          if (depth === 0) break;
        }
      }
      i = j + 1;
    } else {
      out += css[i];
      i++;
    }
  }
  return out;
}

/** Returns the body of every rule block whose selector matches `selectorPart`. */
function ruleBodies(css: string, selectorPart: string): string[] {
  const bodies: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{/g)) {
    if (!match[1].includes(selectorPart)) continue;
    let depth = 1;
    let j = match.index + match[0].length;
    const start = j;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    bodies.push(css.slice(start, j));
  }
  return bodies;
}

describe('code-editor stylesheet contract', () => {
  it('scopes package selectors to the code-editor root', () => {
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-toolbar']");
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-header']");
    expect(styles).toContain(".nop-code-editor [data-slot='code-editor-result-header']");
    expect(styles).not.toContain("\n[data-slot='code-editor-toolbar']");
    expect(styles).not.toContain("\n[data-slot='code-editor-header']");
    expect(styles).not.toContain("\n[data-slot='code-editor-result-header']");
  });

  it('derives default chrome tokens from shared theme variables', () => {
    expect(compactStyles).toContain(
      '--nop-code-editor-toolbar-bg: color-mix( in srgb, hsl(var(--background)) 88%, hsl(var(--foreground)) 12% );',
    );
    expect(compactStyles).toContain('--nop-code-editor-header-title-fg: hsl(var(--foreground));');
    expect(compactStyles).toContain(
      '--nop-code-editor-var-item-value-fg: hsl(var(--muted-foreground));',
    );
    expect(styles).not.toContain('--nop-code-editor-toolbar-bg: rgba(0, 0, 0, 0.03);');
    expect(styles).not.toContain('--nop-code-editor-header-title-fg: #333;');
  });

  it('tokenizes the CM6 search panel chrome', () => {
    expect(styles).toContain('.nop-code-editor .cm-panels {');
    expect(styles).toContain('.nop-code-editor .cm-panel.cm-search {');
    expect(styles).toContain('.nop-code-editor .cm-panel.cm-search input.cm-textfield {');
    expect(compactStyles).toContain(
      '--nop-code-editor-search-panel-bg: color-mix(in srgb, hsl(var(--muted)) 62%, transparent);',
    );
    expect(compactStyles).toContain('--nop-code-editor-search-field-fg: hsl(var(--foreground));');
    expect(styles).toContain('.nop-code-editor .cm-searchMatch {');
  });

  it('keeps dark-theme override blocks free of bare color literals', () => {
    const darkBodies = ruleBodies(styles, "[data-theme='dark']");
    expect(darkBodies.length).toBeGreaterThanOrEqual(3);
    for (const body of darkBodies) {
      const outsideVar = stripBalancedVarCalls(body);
      for (const banned of ['#777', '#ccc', '#999', '#fff', '#1e1e1e', '#282c34']) {
        expect(
          outsideVar,
          `dark override block must not carry bare hex ${banned} outside var() fallbacks`,
        ).not.toContain(banned);
      }
      const literal = outsideVar.match(/rgba\(255,\s*255,\s*255/);
      expect(literal, 'dark override block must not carry bare white rgba').toBeNull();
      const anyLiteral = outsideVar.match(COLOR_LITERAL);
      expect(
        anyLiteral,
        `dark override block must only carry color literals inside var() fallbacks, found: ${anyLiteral?.[0]}`,
      ).toBeNull();
    }
    // M1 option a: the chrome dark block maps every chrome token onto a
    // package-level dark token instead of holding raw values inline.
    const darkChromeBlock = darkBodies.find((body) => body.includes('--nop-code-editor-toolbar-bg'));
    expect(darkChromeBlock).toBeDefined();
    const darkTokenRefs =
      darkChromeBlock?.replace(/\s+/g, ' ').match(/var\(\s*--nop-code-editor-dark-[a-z-]+/g) ?? [];
    expect(darkTokenRefs.length).toBe(24);
  });

  it('wires field chrome tokens directly to shared theme variables', () => {
    expect(baseExtensions).not.toContain('--nop-field-border');
    expect(baseExtensions).not.toContain('--nop-field-focus-ring');
    expect(baseExtensions).not.toContain('--nop-field-disabled-bg');
    expect(baseExtensions).toContain('hsl(var(--border))');
    expect(baseExtensions).toContain('hsl(var(--ring))');
    expect(baseExtensions).toContain('hsl(var(--muted))');
  });
});
