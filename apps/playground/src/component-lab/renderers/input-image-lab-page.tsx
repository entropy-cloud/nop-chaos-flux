import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const thumbnail = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'imageForm',
      data: { image: undefined },
      body: [
        {
          type: 'input-image',
          name: 'image',
          label: 'Avatar',
          accept: 'image/*',
          previewMode: 'thumbnail',
          uploadAction: { action: 'ajax', args: { url: '/api/upload-image', method: 'post' } },
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostImageEnv = {
  fetcher: async function <T>(api: any, ctx: any) {
    const body = ctx?.scope?.readOwn?.() ?? {};
    const url = api?.url;
    if (url === '/api/image-ok') {
      const file = body.__uploadFile ?? { name: 'demo.png', size: 12 };
      return {
        ok: true,
        status: 200,
        data: { url: `https://cdn.example.com/${file.name}`, name: file.name, size: file.size } as T,
      };
    }
    if (url === '/api/image-fail') {
      return { ok: false, status: 500, data: { message: 'Image upload rejected' } as T };
    }
    return { ok: true, status: 200, data: null as T };
  },
};

const hostImageEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostImage',
      data: { ok: undefined, fail: undefined },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-image',
          name: 'ok',
          label: 'Uploads fine',
          previewMode: 'thumbnail',
          uploadAction: { action: 'ajax', args: { url: '/api/image-ok', method: 'post' } },
        },
        {
          type: 'input-image',
          name: 'fail',
          label: 'Upload fails',
          previewMode: 'thumbnail',
          uploadAction: { action: 'ajax', args: { url: '/api/image-fail', method: 'post' } },
        },
        {
          type: 'text',
          testid: 'mr-image-echo',
          text: '${submitted ? "MR-IMAGE:" + $JSON.stringify(ui.hostImage) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputImageLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Image upload field built on the input-file baseline plus a thumbnail preview shell and a reserved crop extension point (workbench not implemented in v1)."
      scenarios={[
        {
          title: 'thumbnail preview',
          description: 'Renders the uploaded image as a thumbnail; crop is a reserved extension point.',
          schema: thumbnail,
        },
        {
          title: 'Host form image upload success + failure (bug 73 pattern)',
          description:
            'Image upload writes back the url and renders the thumbnail; the failing endpoint shows an error state without polluting the value; submit echoes the committed shapes.',
          schema: hostImageEcho,
          env: hostImageEnv,
        },
      ]}
    />
  );
}
