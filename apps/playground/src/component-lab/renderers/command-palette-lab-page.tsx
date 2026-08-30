import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicPalette = {
  type: 'page',
  data: { lastCommand: '' },
  body: [
    { type: 'text', text: 'The palette starts open (defaultOpen). Pick a command or type to filter.' },
    {
      type: 'command-palette',
      id: 'labPalette',
      testid: 'lab-palette-basic',
      defaultOpen: true,
      placeholder: 'Type a command…',
      groups: [
        {
          label: 'Navigation',
          items: [
            { id: 'go-issues', label: 'Go to Issues', shortcut: 'G I', icon: 'circle-dot' },
            { id: 'go-board', label: 'Go to Board', icon: 'columns-2' },
          ],
        },
        {
          label: 'Actions',
          items: [
            { id: 'new-issue', label: 'New Issue', shortcut: 'C', icon: 'plus' },
            { id: 'toggle-theme', label: 'Toggle Theme', disabled: true },
          ],
        },
      ],
      items: [{ id: 'docs', label: 'Open Documentation', group: 'Help' }],
      onCommand: [{ action: 'setValue', args: { path: 'lastCommand', value: '${id}' } }],
    },
    { type: 'text', text: 'Last command: ${lastCommand}', testid: 'lab-last-command' },
  ],
};

const hotkeyPalette = {
  type: 'page',
  body: [
    { type: 'text', text: 'Press the palette hotkey (mod+k) anywhere on the page to open it. Esc closes.' },
    {
      type: 'command-palette',
      id: 'labHotkeyPalette',
      testid: 'lab-palette-hotkey',
      hotkey: 'mod+k',
      items: [
        { id: 'cut', label: 'Cut', shortcut: '⌘X' },
        { id: 'copy', label: 'Copy', shortcut: '⌘C' },
        { id: 'paste', label: 'Paste', shortcut: '⌘V' },
      ],
    },
  ],
};

const controlledPalette = {
  type: 'page',
  data: { paletteOpen: false },
  body: [
    {
      type: 'button',
      label: 'Open palette',
      onClick: { action: 'setValue', args: { path: 'paletteOpen', value: true } },
    },
    {
      type: 'command-palette',
      id: 'labControlledPalette',
      testid: 'lab-palette-controlled',
      open: '${paletteOpen}',
      items: [
        {
          id: 'notify',
          label: 'Show toast',
          action: { action: 'showToast', args: { level: 'success', message: 'Executed from palette' } },
        },
      ],
      onCommand: [{ action: 'setValue', args: { path: 'paletteOpen', value: false } }],
    },
  ],
};

const sourcePalette = {
  type: 'page',
  data: {
    remoteCommands: [
      { id: 'deploy', label: 'Deploy project', group: 'Remote' },
      { id: 'rollback', label: 'Rollback release', group: 'Remote' },
    ],
  },
  body: [
    { type: 'text', text: 'Source items (expression-driven) append after static sections.' },
    {
      type: 'command-palette',
      id: 'labSourcePalette',
      testid: 'lab-palette-source',
      defaultOpen: true,
      emptyText: 'No commands available',
      items: [{ id: 'refresh', label: 'Refresh data', icon: 'rotate-cw' }],
      source: '${remoteCommands}',
    },
  ],
};

export function CommandPaletteLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Keyboard-first command palette surface: grouped items, built-in filtering, keyboard selection (↑↓/Enter/Esc), and close-after-execute."
      scenarios={[
        {
          title: 'Static groups and items',
          description:
            'Starts open via defaultOpen. Filter by typing, execute with click or Enter — the palette closes first, then onCommand runs.',
          schema: basicPalette,
        },
        {
          title: 'Hotkey invocation',
          description:
            'hotkey: "mod+k" opens the palette via a renderer-local keydown listener. No-op while already open.',
          schema: hotkeyPalette,
        },
        {
          title: 'Controlled open with write-back',
          description:
            'open: "${paletteOpen}" — the button flips the scope variable; executing a command closes via onCommand setValue.',
          schema: controlledPalette,
        },
        {
          title: 'Source (dynamic) track',
          description:
            'source: "${remoteCommands}" appends fetched items after static sections; failures degrade to the empty state.',
          schema: sourcePalette,
        },
      ]}
    />
  );
}
