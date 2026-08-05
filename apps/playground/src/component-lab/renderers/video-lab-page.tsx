import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { BROKEN_VIDEO_DATA_URI, c6c4MediaDialogSchema, registerC6c4Probe } from './data-c6c4-host';

const basicVideo = {
  type: 'page',
  body: [
    {
      type: 'video',
      testid: 'demo-video-lab',
      src: BROKEN_VIDEO_DATA_URI,
      controls: true,
      muted: true,
      title: 'Lab video clip',
    },
    {
      type: 'video',
      testid: 'demo-video-lab-empty',
    },
  ],
};

export function VideoLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Video media renderer: native <video> element with src/poster/autoPlay/loop/controls/muted/width/height passthrough, empty and error fallback states, title value-or-region and onLoadError."
      scenarios={[
        {
          title: 'Basic video with controls and title',
          description:
            'Native video element with muted passthrough and the title region (broken data-URI source shows the error fallback; empty variant shows the empty state).',
          schema: basicVideo,
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
