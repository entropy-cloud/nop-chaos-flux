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

// Host upload env: /api/upload-ok resolves with a cdn url; /api/upload-fail
// rejects with a server message. The renderer dispatches uploadAction through
// env.fetcher (INV-1 boundary) — this is the host side of the contract.
const hostUploadEnv = {
  fetcher: async function <T>(api: any, ctx: any) {
    const body = ctx?.scope?.readOwn?.() ?? {};
    const url = api?.url;
    if (url === '/api/upload-ok') {
      const file = body.__uploadFile ?? { name: 'demo.txt', size: 12 };
      return {
        ok: true,
        status: 200,
        data: { url: `https://cdn.example.com/${file.name}`, name: file.name, size: file.size } as T,
      };
    }
    if (url === '/api/upload-fail') {
      return { ok: false, status: 500, data: { message: 'Upload rejected by host' } as T };
    }
    return { ok: true, status: 200, data: null as T };
  },
};

const hostUploadEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostUpload',
      data: { ok: undefined, fail: undefined },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-file',
          name: 'ok',
          label: 'Uploads fine',
          valueMode: 'url',
          uploadAction: { action: 'ajax', args: { url: '/api/upload-ok', method: 'post' } },
        },
        {
          type: 'input-file',
          name: 'fail',
          label: 'Upload fails',
          valueMode: 'url',
          uploadAction: { action: 'ajax', args: { url: '/api/upload-fail', method: 'post' } },
        },
        {
          type: 'text',
          testid: 'mr-upload-echo',
          text: '${submitted ? "MR-UPLOAD:" + $JSON.stringify(ui.hostUpload) : ""}',
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
        {
          title: 'Host form upload success + failure (bug 73 pattern)',
          description:
            'Upload through the env fetcher (success → value writeback) and against a rejecting endpoint (error state, value stays clean); submit echoes the committed shapes.',
          schema: hostUploadEcho,
          env: hostUploadEnv,
        },
      ]}
    />
  );
}
