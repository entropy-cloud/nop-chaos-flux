import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicDialog = {
  type: 'page',
  body: [
    { type: 'text', text: 'Click the button to open a simple informational dialog.' },
    {
      type: 'button',
      label: 'Open Dialog',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Example Dialog',
          body: [
            { type: 'text', text: 'This is the dialog body content.' },
            { type: 'text', text: 'Dialogs support body and actions regions.' },
          ],
          actions: [{ type: 'button', label: 'Close', onClick: { action: 'closeSurface' } }],
        },
      },
    },
  ],
};

const formDialog = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Edit Contact',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Edit Contact',
          body: [
            {
              type: 'form',
              onSubmitSuccess: [
                { action: 'setValue', args: { path: 'submitted', value: true } },
                { action: 'closeSurface' },
              ],
              body: [
                { type: 'input-text', name: 'name', label: 'Full Name', required: true },
                { type: 'input-email', name: 'email', label: 'Email', required: true },
                {
                  type: 'text',
                  text: '${submitted ? "Submitted name: " + name : "Submitted name: (none)"}',
                },
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Confirm',
                  onClick: { action: 'submitForm' },
                },
                {
                  type: 'button',
                  label: 'Cancel',
                  variant: 'outline',
                  onClick: { action: 'closeSurface' },
                },
              ],
            },
          ],
        },
      },
    },
  ],
};

export function DialogLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Modal dialog with body and actions regions. Triggered via the dialog action from any onClick handler."
      scenarios={[
        {
          title: 'Informational dialog',
          description:
            'Click "Open Dialog" to see a basic dialog with text body and a close button.',
          schema: basicDialog,
        },
        {
          title: 'Dialog with form fields and writeback',
          description:
            'Click "Edit Contact" to open a dialog with a form. Confirming writes the local form field back to the parent scope.',
          schema: formDialog,
        },
      ]}
    />
  );
}
