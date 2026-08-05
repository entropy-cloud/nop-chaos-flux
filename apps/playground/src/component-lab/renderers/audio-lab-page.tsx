import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c4MediaDialogSchema, registerC6c4Probe } from './data-c6c4-host';

const basicAudio = {
  type: 'page',
  body: [
    {
      type: 'audio',
      testid: 'demo-audio-lab',
      src: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
      controls: true,
      title: 'Lab audio track',
    },
    {
      type: 'audio',
      testid: 'demo-audio-lab-empty',
    },
  ],
};

export function AudioLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Audio media renderer: native <audio> element with src/poster/autoPlay/loop/controls passthrough, empty and error fallback states, title value-or-region and onLoadError."
      scenarios={[
        {
          title: 'Basic audio with controls and title',
          description: 'Native audio element with a data-URI source, controls and the title region.',
          schema: basicAudio,
          data: {},
        },
        {
          title: 'Host media in dialog + error fallback (C6.4 bug 73 pattern)',
          description:
            'C6.4 Phase 3 host-media-dialog/host-media-error: audio/video inside an openDialog surface — data-URI audio loads normally, a broken video data-URI shows the error fallback and fires onLoadError.',
          schema: c6c4MediaDialogSchema,
          data: {},
          onActionScopeChange: registerC6c4Probe,
        },
      ]}
    />
  );
}
