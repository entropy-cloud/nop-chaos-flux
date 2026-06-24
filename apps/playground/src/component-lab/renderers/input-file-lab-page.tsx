import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const singleUrl = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'fileForm',
      data: { file: undefined },
      body: [
        {
          type: 'input-file',
          name: 'file',
          label: 'Attachment',
          valueMode: 'url',
          accept: '.pdf,.doc,.docx',
          uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const multiple = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'filesForm',
      data: { files: [] },
      body: [
        {
          type: 'input-file',
          name: 'files',
          label: 'Attachments',
          multiple: true,
          maxFiles: 3,
          valueMode: 'array',
          uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputFileLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="File upload field. The renderer dispatches a host uploadAction (request sink) and writes the bridged result back; pending→result/error state machine; valueMode url/object/array. Connect a fetcher to /api/upload to exercise the upload."
      scenarios={[
        {
          title: 'single (valueMode url)',
          description: 'Stores the uploaded url string; pending/error states surface inline.',
          schema: singleUrl,
        },
        {
          title: 'multiple (valueMode array, maxFiles 3)',
          description: 'Accumulates uploads into an array, capped at maxFiles.',
          schema: multiple,
        },
      ]}
    />
  );
}
