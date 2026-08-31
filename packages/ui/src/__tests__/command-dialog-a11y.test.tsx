import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '../components/ui/command.js';
import { setI18nGetter } from '../lib/i18n.js';

afterEach(() => {
  cleanup();
  setI18nGetter(null);
});

describe('CommandDialog accessible name i18n (20-01)', () => {
  it('resolves the default title/description through the i18n bridge: a bridged zh value replaces the built-in English strings', () => {
    setI18nGetter((key) => {
      if (key === 'flux.command.title') return '命令面板';
      if (key === 'flux.command.searchPlaceholder') return '搜索要运行的命令…';
      return key;
    });
    render(
      <CommandDialog>
        <Command>
          <CommandInput />
          <CommandList />
        </Command>
      </CommandDialog>,
    );
    expect(document.querySelector('[data-slot="dialog-title"]')?.textContent).toBe('命令面板');
    expect(document.querySelector('[data-slot="dialog-description"]')?.textContent).toBe(
      '搜索要运行的命令…',
    );
  });

  it('falls back to the built-in English defaults when no bridge getter is installed', () => {
    render(
      <CommandDialog>
        <Command>
          <CommandInput />
          <CommandList />
        </Command>
      </CommandDialog>,
    );
    expect(document.querySelector('[data-slot="dialog-title"]')?.textContent).toBe(
      'Command Palette',
    );
    expect(document.querySelector('[data-slot="dialog-description"]')?.textContent).toBe(
      'Search for a command to run...',
    );
  });
});

describe('CommandEmpty live semantics (20-02)', () => {
  it('announces the empty state through a role="status" region so "no results" is perceivable by assistive tech', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty>Nothing here</CommandEmpty>
        </CommandList>
      </Command>,
    );
    const empty = document.querySelector('[data-slot="command-empty"]') as HTMLElement | null;
    expect(empty).toBeTruthy();
    const statusNode = empty!.querySelector('[role="status"]');
    expect(statusNode?.getAttribute('aria-live')).toBe('polite');
    expect(statusNode?.textContent).toBe('Nothing here');
  });

  it('renders no empty node while items match the query', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList />
      </Command>,
    );
    expect(document.querySelector('[data-slot="command-empty"]')).toBeNull();
  });
});
