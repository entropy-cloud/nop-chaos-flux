import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AlertDialog, AlertDialogOverlay } from './alert-dialog.js';
import { ChartContainer } from './chart.js';
import { Dialog, DialogOverlay } from './dialog.js';
import { Drawer, DrawerOverlay } from './drawer.js';
import { Sheet, SheetOverlay } from './sheet.js';
import { Slider } from './slider.js';
import { TableRow } from './table.js';
import { getTableRowClassName } from './table-row-class-name.js';

describe('ui theme contracts', () => {
  it('keeps subtle table rows on the shared surface-hover token', () => {
    expect(getTableRowClassName('subtle')).toBe('hover:bg-surface-hover');

    const markup = renderToStaticMarkup(
      React.createElement(
        'table',
        null,
        React.createElement('tbody', null, React.createElement(TableRow, { variant: 'subtle' })),
      ),
    );

    expect(markup).toContain('hover:bg-surface-hover');
  });

  it('uses semantic overlay and surface classes for interactive primitives', () => {
    const dialogOverlayMarkup = renderToStaticMarkup(
      React.createElement(Dialog, { open: true }, React.createElement(DialogOverlay)),
    );
    const drawerOverlayMarkup = renderToStaticMarkup(
      React.createElement(Drawer, { open: true }, React.createElement(DrawerOverlay)),
    );
    const alertDialogOverlayMarkup = renderToStaticMarkup(
      React.createElement(AlertDialog, { open: true }, React.createElement(AlertDialogOverlay)),
    );
    const sheetOverlayMarkup = renderToStaticMarkup(
      React.createElement(Sheet, { open: true }, React.createElement(SheetOverlay)),
    );
    const sliderMarkup = renderToStaticMarkup(
      React.createElement(Slider, {
        defaultValue: [25],
        max: 100,
      }),
    );

    expect(dialogOverlayMarkup).toContain('bg-surface-overlay');
    expect(dialogOverlayMarkup).not.toContain('bg-black/10');
    expect(drawerOverlayMarkup).toContain('bg-surface-overlay');
    expect(drawerOverlayMarkup).not.toContain('bg-black/10');
    expect(alertDialogOverlayMarkup).toContain('bg-surface-overlay');
    expect(alertDialogOverlayMarkup).not.toContain('bg-black/10');
    expect(sheetOverlayMarkup).toContain('bg-surface-overlay');
    expect(sheetOverlayMarkup).not.toContain('bg-black/10');
    expect(sliderMarkup).toContain('bg-background');
    expect(sliderMarkup).not.toContain('bg-white');
  });

  it('styles chart defaults without hard-coded light-theme color literals', () => {
    const markup = renderToStaticMarkup(
      <ChartContainer config={{}}>
        <div />
      </ChartContainer>,
    );

    expect(markup).toContain('[&amp;_.recharts-cartesian-grid_[stroke]]:stroke-border/50');
    expect(markup).toContain('[&amp;_.recharts-dot[stroke]]:stroke-background');
    expect(markup).toContain('[&amp;_.recharts-reference-line_[stroke]]:stroke-border');
    expect(markup).not.toContain('#fff');
    expect(markup).not.toContain('#ccc');
  });
});
