import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicSignature = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-signature',
          name: 'signature',
          label: 'Signature',
          clearable: true,
          height: 160,
          description: 'Draw with mouse/touch/pen; each finished stroke updates the committed PNG data URL. Undo removes strokes one by one; clearing to zero strokes resets the value to empty.',
        },
        { type: 'text', text: 'Value: ${signature}' },
      ],
    },
  ],
};

const styledSignature = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-signature',
          name: 'styledSignature',
          label: 'Styled signature (blue pen, 180px)',
          penColor: '#1d4ed8',
          penWidth: 3,
          height: 180,
          backgroundColor: '#f8fafc',
        },
        {
          type: 'input-signature',
          name: 'lockedSignature',
          label: 'Readonly signature',
          value:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          readOnly: true,
          height: 120,
          description: 'Readonly: toolbar disabled and drawing ignored; the initial dataURL echoes onto the canvas.',
        },
      ],
    },
  ],
};

export function SignatureLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Handwritten signature canvas (missing-components L2.3). Pointer-event drawing with per-stroke undo; the committed value is the canvas PNG data URL, and an empty pad is always an empty value."
      scenarios={[
        {
          title: 'Draw, undo and clear',
          description: 'Standard signature pad with undo/clear toolbar and a live value readout.',
          schema: basicSignature,
        },
        {
          title: 'Styled and readonly',
          description: 'Custom pen/size/background and a readonly pad with an echoed initial value.',
          schema: styledSignature,
        },
      ]}
    />
  );
}
