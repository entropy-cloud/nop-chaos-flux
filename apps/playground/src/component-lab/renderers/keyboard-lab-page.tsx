import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const singleCombo = {
  type: 'page',
  body: [
    { type: 'text', text: 'hits: ${hits ?? 0}' },
    {
      type: 'keyboard',
      bindings: [
        { keys: 'mod+shift+s', action: { action: 'setValue', args: { path: 'hits', value: '${(hits ?? 0) + 1}' } } },
      ],
    },
    { type: 'text', text: 'Press Mod+Shift+S anywhere on the page.' },
  ],
};

const chordSequence = {
  type: 'page',
  body: [
    { type: 'text', text: 'last chord: ${lastChord ?? "none"}' },
    {
      type: 'keyboard',
      chordTimeout: 1000,
      bindings: [
        { keys: 'g o', action: { action: 'setValue', args: { path: 'lastChord', value: 'g o' } } },
        { keys: 'g mod+i', action: { action: 'setValue', args: { path: 'lastChord', value: 'g mod+i' } } },
        { keys: 'g', action: { action: 'setValue', args: { path: 'lastChord', value: 'g (fallback)' } } },
      ],
      onTrigger: { action: 'showToast', args: { level: 'info', message: 'Triggered ${keys}' } },
    },
    { type: 'text', text: 'Press "g o" quickly (within 1s). A bare "g" falls back after the window closes.' },
  ],
};

const inputGating = {
  type: 'page',
  body: [
    { type: 'input-text', name: 'note', label: 'Note (keys are ignored while focused here)' },
    { type: 'text', text: 'gated hits: ${gatedHits ?? 0}' },
    {
      type: 'keyboard',
      bindings: [
        { keys: 'g', action: { action: 'setValue', args: { path: 'gatedHits', value: '${(gatedHits ?? 0) + 1}' } } },
        {
          keys: 'mod+enter',
          allowInInput: true,
          action: { action: 'showToast', args: { level: 'success', message: 'Saved (allowInInput)' } },
        },
      ],
    },
    { type: 'text', text: 'Focus the field and press "g" (ignored) or Mod+Enter (allowed by allowInInput).' },
  ],
};

export function KeyboardLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Invisible keyboard binding channel: single key combos and chord sequences dispatch schema actions, with input-focus gating and a configurable chord window."
      scenarios={[
        {
          title: 'Single combo binding',
          description: 'A page-level keyboard node binds Mod+Shift+S to an increment action.',
          schema: singleCombo,
          data: { hits: 0 },
        },
        {
          title: 'Chord sequences',
          description:
            'Chord "g o" / "g mod+i" buffer within the 1s window; a bare "g" is a complete binding that falls back on timeout (longest match).',
          schema: chordSequence,
        },
        {
          title: 'Input focus gating',
          description:
            'Bindings stay quiet while typing in editable targets unless the binding declares allowInInput.',
          schema: inputGating,
        },
      ]}
    />
  );
}
