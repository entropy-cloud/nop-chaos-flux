import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'Click the button below to open the dialog.'
    },
    {
      type: 'button',
      label: 'Open Dialog',
      onClick: {
        action: 'dialog',
        dialog: {
          type: 'dialog',
          title: 'Example Dialog',
          body: [
            { type: 'text', text: 'This is the dialog body content.' },
            { type: 'text', text: 'Dialogs support body and actions regions.' }
          ],
          actions: [
            { type: 'button', label: 'Close', onClick: { action: 'closeDialog' } }
          ]
        }
      }
    }
  ]
};

export function DialogLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Modal dialog with body and actions regions. Triggered via the dialog action."
      notes="Click 'Open Dialog' to see the dialog renderer in action."
    />
  );
}
