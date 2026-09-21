import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { Badge, badgeVariants } from './badge.js';
import { Command, CommandItem, CommandList } from './command.js';
import { NativeSelect } from './native-select.js';
import { Select, SelectTrigger } from './select.js';
import { Sheet, SheetContent } from './sheet.js';

/**
 * V12c Phase 1 — ui 基件属性钉（plan 489 修复批）。
 * 每条断言针对台账裁决的原始缺陷；flux.form.removeItem 占位符钉在
 * flux-i18n 包的 i18n.test.ts。
 */
afterEach(() => cleanup());

describe('V12c P1 — [G6-视角7-01] Badge success/warning ride the design tokens', () => {
  it('success/warning variants resolve through --success/--warning, never the raw palette', () => {
    const success = renderToStaticMarkup(<Badge variant="success">ok</Badge>);
    const warning = renderToStaticMarkup(<Badge variant="warning">warn</Badge>);

    expect(success).toContain('bg-success/15');
    expect(success).toContain('text-success');
    expect(success).toContain('dark:bg-success/20');
    expect(success).not.toMatch(/emerald/);

    expect(warning).toContain('bg-warning/15');
    expect(warning).toContain('text-warning');
    expect(warning).toContain('dark:bg-warning/20');
    expect(warning).not.toMatch(/amber/);

    expect(badgeVariants({ variant: 'success' })).not.toMatch(/emerald|amber/);
    expect(badgeVariants({ variant: 'warning' })).not.toMatch(/emerald|amber/);
  });
});

describe('V12c P1 — [G6-视角8-01] Sheet built-in close button joins the 8px inset family', () => {
  it('close button sits at top-2 right-2 like Dialog/Drawer', () => {
    render(
      <Sheet modal={false} open>
        <SheetContent>
          <div>Body</div>
        </SheetContent>
      </Sheet>,
    );

    const close = document.body.querySelector('[data-slot="sheet-close"]');
    expect(close).toBeTruthy();
    expect(close?.className).toContain('top-2');
    expect(close?.className).toContain('right-2');
    expect(close?.className).not.toContain('top-3');
    expect(close?.className).not.toContain('right-3');
  });
});

describe('V12c P1 — [G6-视角4-02] NativeSelect xs joins the SelectTrigger 28px track', () => {
  it('xs renders h-7 like SelectTrigger xs, never the 24px h-6 track', () => {
    const select = renderToStaticMarkup(<NativeSelect size="xs" aria-label="Size" />);
    expect(select).toContain('data-[size=xs]:h-7');
    expect(select).not.toContain('data-[size=xs]:h-6');

    const { container } = render(
      <Select defaultValue="a">
        <SelectTrigger size="xs" aria-label="Baseline" />
      </Select>,
    );
    const trigger = container.querySelector('[data-slot="select-trigger"]');
    expect(trigger?.className).toContain('data-[size=xs]:h-7');
  });
});

describe('V12c P1 — [G6-R2-视角10-01] CommandItem selected state joins the accent family', () => {
  it('data-selected rides bg-accent/text-accent-foreground like Select/Combobox items', () => {
    render(
      <Command>
        <CommandList>
          <CommandItem value="alpha">Alpha</CommandItem>
        </CommandList>
      </Command>,
    );

    const item = document.body.querySelector('[data-slot="command-item"]');
    expect(item).toBeTruthy();
    expect(item?.className).toContain('data-selected:bg-accent');
    expect(item?.className).toContain('data-selected:text-accent-foreground');
    expect(item?.className).not.toContain('data-selected:bg-muted');
    expect(item?.className).not.toContain('data-selected:text-foreground');
  });
});
