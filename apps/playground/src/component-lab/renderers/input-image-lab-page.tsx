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
      ]}
    />
  );
}
