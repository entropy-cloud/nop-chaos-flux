import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c82AttachDialogSchema, c82AttachSafetySchema, registerC82Probe } from './data-c8-2-host';

export function AiAttachmentsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Attachments renderer: multimodal uploader/preview with dialog hosting (bug 73 pattern) and the URL/file-name safety gate."
      scenarios={[
        {
          title: 'Host attachments in dialog + validation (C8.2 bug 73 pattern)',
          description:
            'C8.2 Phase 3 host-attach-dialog: an ai-attachments inside an openDialog surface — real file pick renders the thumbnail in the dialog, remove works, and an over-limit file fires onError (real-browser dialog hosting).',
          schema: c82AttachDialogSchema,
          onActionScopeChange: registerC82Probe,
        },
        {
          title: 'Host attachment URL / file-name safety (C8.2)',
          description:
            'C8.2 Phase 3 host-attach-safety: a controlled value with a javascript: URL renders only as an <img> (never an anchor) and a malicious file name renders as escaped text.',
          schema: c82AttachSafetySchema,
          onActionScopeChange: registerC82Probe,
        },
      ]}
    />
  );
}
