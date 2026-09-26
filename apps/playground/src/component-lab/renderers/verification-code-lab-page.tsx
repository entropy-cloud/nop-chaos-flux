import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicCode = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'verification-code',
          name: 'code',
          label: 'Verification code',
          length: 6,
          description: 'Type digits: the value commits only when all 6 cells are filled; backspacing below 6 resets it to empty.',
        },
        { type: 'text', text: 'Code: ${code}' },
      ],
    },
  ],
};

const maskedCode = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'verification-code',
          name: 'maskedCode',
          label: 'Masked code (4 digits)',
          length: 4,
          masked: true,
          description: 'Masked variant: typed characters render transparent; the committed value is unaffected.',
        },
      ],
    },
  ],
};

export function VerificationCodeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="OTP verification-code field (missing-components L2.4). Type into the cells: the value commits only when every cell is filled; shortening below the full length resets the value to empty."
      scenarios={[
        {
          title: 'Six-digit code with live readout',
          description: 'Cells auto-advance; the summary re-renders from the bound form value once complete.',
          schema: basicCode,
        },
        {
          title: 'Masked four-digit code',
          description: 'Masked variant with a shorter length.',
          schema: maskedCode,
        },
      ]}
    />
  );
}
