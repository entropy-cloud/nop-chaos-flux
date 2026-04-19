import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const counterDoubled = {
  type: 'page',
  body: [
    { type: 'text', text: 'counter: ${counter}' },
    {
      type: 'button',
      label: 'Increment',
      onClick: { action: 'setValue', args: { path: 'counter', value: '${(counter ?? 0) + 1}' } }
    },
    {
      type: 'reaction',
      watch: ['counter'],
      actions: [
        { action: 'setValue', args: { path: 'doubled', value: '${(counter ?? 0) * 2}' } }
      ]
    },
    { type: 'text', text: 'doubled: ${doubled}' }
  ]
};

const charCountWatcher = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'watchForm',
      body: [
        { type: 'input-text', name: 'message', label: 'Message', placeholder: 'Type something...' }
      ]
    },
    {
      type: 'reaction',
      watch: ['watchForm.message'],
      actions: [
        {
          action: 'setValue',
          args: {
            path: 'charCount',
            value: '${(watchForm.message ?? "").length}'
          }
        }
      ]
    },
    { type: 'text', text: 'Character count: ${charCount ?? 0}' }
  ]
};

export function ReactionLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Side-effect trigger that fires a list of actions whenever watched scope values change. Useful for derived state, auto-save, or field synchronization."
      scenarios={[
        {
          title: 'Counter with derived doubled value',
          description: 'Click "Increment" to increase the counter. The reaction automatically computes doubled = counter × 2 on every change.',
          schema: counterDoubled,
          data: { counter: 0, doubled: 0 }
        },
        {
          title: 'Field-watch for character count',
          description: 'Type in the message field. The reaction watches the field value and updates a charCount display in real time.',
          schema: charCountWatcher
        }
      ]}
    />
  );
}
