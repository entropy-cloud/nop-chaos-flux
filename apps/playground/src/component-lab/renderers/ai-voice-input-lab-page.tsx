import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c83VoiceDegradeSchema, registerC83Probe } from './data-c8-3-host';

export function AiVoiceInputLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="AI Voice Input renderer: microphone button using the Web Speech API (user-gesture browser API, non-IO per INV-1); unsupported browsers degrade to a disabled marker button with onError('unsupported')."
      scenarios={[
        {
          title: 'Host voice input degradation path (C8.3)',
          description:
            'C8.3 Phase 3 host-voice-degrd: when the browser lacks SpeechRecognition the button renders disabled with data-unsupported and onError dispatches ${reason} = unsupported through the dispatch ctx.',
          schema: c83VoiceDegradeSchema,
          onActionScopeChange: registerC83Probe,
        },
      ]}
    />
  );
}
