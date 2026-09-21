import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Card } from './card.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
} from './alert-dialog.js';
import { Combobox, ComboboxChip, ComboboxChips, ComboboxInput } from './combobox.js';
import { Command, CommandInput } from './command.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog.js';
import { Drawer, DrawerContent } from './drawer.js';
import {
  MenubarCheckboxItem,
  MenubarRadioItem,
  MenubarTrigger,
} from './menubar.js';
import { Input } from './input.js';
import { InputGroup, InputGroupAddon } from './input-group.js';
import { PaginationLink } from './pagination.js';
import { Separator } from './separator.js';
import { Slider } from './slider.js';
import { ToggleGroup, ToggleGroupItem } from './toggle-group.js';
import { ButtonGroup, ButtonGroupSeparator } from './button-group.js';
/**
 * V12f Phase 2 — ui 基件单点批（plan 488）属性/行为钉。
 * 每条断言针对台账审计的原始缺陷；G6-视角9-01（sidebar-label i18n）已由
 * plan 485 吸收，本文件不重复钉（FIXED_SINCE 登记）。
 */
afterEach(() => cleanup());

describe('V12f P2 — [G6-视角3-01] InputGroupAddon visible focus state', () => {
  it('addon exposes focus-visible ring classes (keyboard proxy for the input)', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <span>https://</span>
        </InputGroupAddon>
      </InputGroup>,
    );
    const addon = container.querySelector<HTMLElement>('[data-slot="input-group-addon"]')!;
    expect(addon.tabIndex).toBe(0);
    expect(addon.className).toContain('focus-visible:ring-3');
    expect(addon.className).toContain('focus-visible:outline-1');
  });
});

describe('V12f P2 — [G6-视角3-02] clickable Card focus-visible ring', () => {
  it('interactive card carries focus-visible ring classes', () => {
    const { container } = render(<Card onClick={() => undefined}>Clickable</Card>);
    const card = container.querySelector('[data-slot="card"]')!;
    expect(card.className).toContain('focus-visible:ring-2');
    expect(card.className).toContain('focus-visible:ring-ring');
  });

  it('plain card stays without the interactive focus contract', () => {
    const { container } = render(<Card>Plain</Card>);
    const card = container.querySelector('[data-slot="card"]')!;
    expect(card.className).not.toContain('focus-visible:ring-2');
  });
});

describe('V12f P2 — [G6-视角3-03] Drawer resize handle keyboard semantics', () => {
  it('resize handle is a focusable separator and resizes via arrow keys', () => {
    render(
      <Drawer open>
        <DrawerContent resizable>
          <div>Body</div>
        </DrawerContent>
      </Drawer>,
    );
    const host = document.body;
    const handle = host.querySelector<HTMLElement>(
      '[data-slot="drawer-resize-handle"]',
    )!;
    expect(handle).toBeTruthy();
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.className).toContain('focus-visible:outline-1');

    const popup = host.querySelector<HTMLElement>('[data-slot="drawer-popup"]')!;
    expect(popup.style.getPropertyValue('--drawer-resize-size')).toBe('');

    // jsdom has no layout — pin the current height so the resize math is
    // observable through the --drawer-resize-size consumer on the popup.
    vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 400,
      top: 0,
      left: 0,
      right: 320,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    // Bottom drawer grows upward: ArrowUp grows, ArrowDown (Shift = 48) shrinks.
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(popup.style.getPropertyValue('--drawer-resize-size')).toBe('416px');

    fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true });
    // step reads the popup's live size (the mock stays 400) minus Shift=48.
    expect(popup.style.getPropertyValue('--drawer-resize-size')).toBe('352px');
  });
});

describe('V12f P2 — [G6-视角4-01] Input unified 32px default height', () => {
  it('default size rides the h-8 track (Select/Button/InputGroup parity)', () => {
    const markup = renderToStaticMarkup(<Input />);
    expect(markup).toContain('data-[size=default]:h-8');
    expect(markup).not.toContain('data-[size=default]:h-9');
  });

  it('sm tier mirrors the Select sm scale (h-7)', () => {
    const markup = renderToStaticMarkup(<Input size="sm" />);
    expect(markup).toContain('data-[size=sm]:h-7');
  });
});

describe('V12f P2 — [G6-视角6-01] AlertDialogAction closes via the Close primitive', () => {
  it('clicking the action closes the dialog (symmetric with Cancel)', () => {
    const onOpenChange = vi.fn();
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogAction onClick={() => undefined}>Confirm</AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const action = document.body.querySelector('[data-slot="alert-dialog-action"]')!;
    expect(action.tagName).toBe('BUTTON');
    fireEvent.click(action);
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(false);
  });
});

describe('V12f P2 — [G6-视角10-01] Menubar check indicator joins the trailing slot family', () => {
  it('checkbox/radio items place the indicator right like DropdownMenu', () => {
    const checkboxMarkup = renderToStaticMarkup(
      <MenuPrimitive.Root>
        <MenubarCheckboxItem checked>A</MenubarCheckboxItem>
      </MenuPrimitive.Root>,
    );
    expect(checkboxMarkup).toContain('pr-8');
    expect(checkboxMarkup).toContain('pl-1.5');
    expect(checkboxMarkup).toContain('right-2');
    expect(checkboxMarkup).not.toContain('left-1.5');

    const radioMarkup = renderToStaticMarkup(
      <MenuPrimitive.Root>
        <MenuPrimitive.RadioGroup value="a">
          <MenubarRadioItem value="a">A</MenubarRadioItem>
        </MenuPrimitive.RadioGroup>
      </MenuPrimitive.Root>,
    );
    expect(radioMarkup).toContain('pr-8');
    expect(radioMarkup).toContain('right-2');
  });
});

describe('V12f P2 — [G6-R2-视角3-01] DialogHeader visible focus state', () => {
  it('focusable drag header exposes focus-visible classes', () => {
    render(
      <Dialog modal={false} open>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Draggable</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    const header = document.body.querySelector('[data-slot="dialog-header"]')!;
    expect(header.getAttribute('tabindex')).toBe('0');
    expect(header.className).toContain('focus-visible:outline-1');
  });
});

describe('V12f P2 — [G6-R2-视角3-02] MenubarTrigger focus-visible', () => {
  it('trigger restores a visible focus state after outline-hidden', () => {
    const markup = renderToStaticMarkup(
      <MenuPrimitive.Root>
        <MenubarTrigger>File</MenubarTrigger>
      </MenuPrimitive.Root>,
    );
    expect(markup).toContain('focus-visible:bg-muted');
    expect(markup).toContain('focus-visible:outline-1');
  });
});

describe('V12f P2 — [G6-R2-视角9-01] Combobox icon controls carry aria-labels', () => {
  it('clear, embedded dropdown toggle and chip remove name themselves', () => {
    const markup = renderToStaticMarkup(
      <Combobox multiple={false} value={null}>
        <ComboboxInput showTrigger showClear />
        <ComboboxChips>
          <ComboboxChip>Alice</ComboboxChip>
        </ComboboxChips>
      </Combobox>,
    );
    // embedded dropdown toggle + chip remove name themselves in the DOM
    expect(markup).toContain('aria-label="Toggle dropdown"');
    expect(markup).toContain('aria-label="Remove entry"');
    // the clear affordance carries its label (rendered when a value exists)
    const source = readFileSync('src/components/ui/combobox.tsx', 'utf8');
    expect(source).toContain("aria-label={t('flux.combobox.clear')}");
    expect(source).toContain("aria-label={t('flux.combobox.toggleDropdown')}");
    expect(source).toContain("aria-label={t('flux.combobox.removeChip')}");
  });
});

describe('V12f P2 — [G6-R4-视角3-01] CommandInput joins the input-group-control slot', () => {
  it('cmdk input carries the slot that the InputGroup focus ring matches', () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search" />
      </Command>,
    );
    const input = container.querySelector('input[data-slot="input-group-control"]');
    expect(input).toBeTruthy();
    expect(input?.className).toContain('outline-hidden');
  });
});

describe('V12f P2 — pagination disabled style consumption', () => {
  it('disabled link exposes aria-disabled and consumes it visually', () => {
    const markup = renderToStaticMarkup(<PaginationLink disabled href="#prev">
      <span>Prev</span>
    </PaginationLink>);
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('aria-disabled:pointer-events-none');
    expect(markup).toContain('aria-disabled:opacity-50');
  });
});

describe('V12f P2 — [G6-R5-视角6-01] explicit bidirectional orientation rules', () => {
  const DEAD_VARIANTS = [
    'data-horizontal:',
    'data-vertical:',
    'group-data-horizontal',
    'group-data-vertical',
  ];

  it('ScrollBar uses explicit data-[orientation] rules', () => {
    // Base UI suppresses scrollbar DOM in static render, so the class contract
    // is pinned at the source level (alert-dialog.test.ts style).
    const source = readFileSync('src/components/ui/scroll-area.tsx', 'utf8');
    expect(source).toContain('data-[orientation=horizontal]:h-2.5');
    expect(source).toContain('data-[orientation=vertical]:w-2.5');
    DEAD_VARIANTS.forEach((dead) => expect(source).not.toContain(dead));
  });

  it('Separator uses explicit data-[orientation] rules', () => {
    const markup = renderToStaticMarkup(<Separator />);
    expect(markup).toContain('data-[orientation=horizontal]:h-px');
    expect(markup).toContain('data-[orientation=vertical]:w-px');
    DEAD_VARIANTS.forEach((dead) => expect(markup).not.toContain(dead));
  });

  it('Slider family uses explicit data-[orientation] rules', () => {
    const markup = renderToStaticMarkup(<Slider defaultValue={[25]} max={100} />);
    expect(markup).toContain('data-[orientation=horizontal]:w-full');
    expect(markup).toContain('data-[orientation=vertical]:h-full');
    expect(markup).toContain('data-[orientation=vertical]:flex-col');
    DEAD_VARIANTS.forEach((dead) => expect(markup).not.toContain(dead));
  });

  it('ToggleGroup forwards orientation and uses explicit group rules', () => {
    const groupMarkup = renderToStaticMarkup(
      <ToggleGroup orientation="vertical" spacing={0} aria-label="items">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(groupMarkup).toContain('data-orientation="vertical"');
    expect(groupMarkup).toContain('data-[orientation=vertical]:flex-col');
    expect(groupMarkup).toContain('group-data-[orientation=horizontal]/toggle-group');
    DEAD_VARIANTS.forEach((dead) => expect(groupMarkup).not.toContain(dead));
  });

  it('ButtonGroupSeparator uses explicit data-[orientation] rules', () => {
    const markup = renderToStaticMarkup(
      <ButtonGroup orientation="horizontal">
        <ButtonGroupSeparator />
      </ButtonGroup>,
    );
    expect(markup).toContain('data-[orientation=horizontal]:mx-px');
    DEAD_VARIANTS.forEach((dead) => expect(markup).not.toContain(dead));
  });
});
