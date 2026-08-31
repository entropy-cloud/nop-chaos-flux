import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const successResult = {
  type: 'page',
  body: [
    {
      type: 'result',
      testid: 'lab-result-success',
      status: 'success',
      title: 'Operation complete',
      description: 'The record has been archived. You can restore it from the audit log.',
      actions: [
        { type: 'button', label: 'Back to list' },
        { type: 'button', label: 'View record' },
      ],
    },
  ],
};

const statusGallery = {
  type: 'page',
  body: [
    { type: 'result', status: 'info', title: 'Scheduled', description: 'The job is queued.' },
    { type: 'result', status: 'warning', title: 'Unsaved changes', description: 'Review before leaving.' },
    { type: 'result', status: 'error', title: 'Submission failed', description: 'The endpoint rejected the payload.' },
  ],
};

const customIconResult = {
  type: 'page',
  body: [
    {
      type: 'result',
      status: 'success',
      icon: 'package-check',
      title: 'Deployed',
      description: 'Build 4821 is live in production.',
    },
  ],
};

export function ResultLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Operation-final-state page block: status semantics (success/error/warning/info) with the default icon and semantic color, title/description, and an actions region."
      scenarios={[
        {
          title: 'Success result with actions',
          description: 'status maps to the icon and semantic color; actions host the follow-up buttons.',
          schema: successResult,
        },
        {
          title: 'Status gallery',
          description: 'info / warning / error variants share the same content structure.',
          schema: statusGallery,
        },
        {
          title: 'Custom icon override',
          description: 'icon names a lucide icon that replaces the status default.',
          schema: customIconResult,
        },
      ]}
    />
  );
}
