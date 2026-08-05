import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c4QrcodeUpdateSchema, registerC6c4Probe } from './data-c6c4-host';

const basicQrcode = {
  type: 'page',
  body: [
    {
      type: 'qrcode',
      testid: 'demo-qrcode-lab',
      value: 'https://example.com/lab',
      size: 128,
      level: 'M',
      label: 'Lab QR',
    },
    {
      type: 'qrcode',
      testid: 'demo-qrcode-lab-empty',
    },
  ],
};

export function QrcodeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="QR code renderer: canvas-based value rendering with size/level (L/M/Q/H)/foreground/background controls, label value-or-region, empty and error fallback states, and value-change canvas redraw echo."
      scenarios={[
        {
          title: 'Basic qrcode with label and empty state',
          description: 'Canvas QR for a URL plus an empty-value fallback.',
          schema: basicQrcode,
          data: {},
        },
        {
          title: 'Host qrcode value update + canvas redraw (C6.4)',
          description:
            'C6.4 Phase 3 host-qrcode-update: scope-driven value updates re-render the canvas, empty value shows the empty fallback and a valid value recovers.',
          schema: c6c4QrcodeUpdateSchema,
          data: {},
          onActionScopeChange: registerC6c4Probe,
        },
      ]}
    />
  );
}
