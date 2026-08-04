import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import {
  C6C3_ROWS,
  C6C3_STATUS_MAP,
  c6c3MappingRegionSchema,
  c6c3MappingRowSchema,
  registerC6c3Probe,
} from './data-c6c3-host';

const basicMapping = {
  type: 'page',
  body: [
    {
      type: 'mapping',
      testid: 'demo-mapping-lab',
      value: 'active',
      map: { active: 'Active', idle: 'Idle', archived: 'Archived' },
    },
  ],
};

export function MappingLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Value-to-display mapping renderer (display-only, no write path): value/expression lookup against the map table, defaultLabel/placeholder precedence on miss, optional item region template on hit."
      scenarios={[
        {
          title: 'Basic mapping hit value',
          description: 'Literal value resolved through the map table.',
          schema: basicMapping,
          data: {},
        },
        {
          title: 'Host mapping rows + item region (C6.3 bug 73 pattern)',
          description:
            'C6.3 Phase 3 host-mapping-row + host-mapping-region: mapping inside repeated card rows resolves each row\'s own scope value (row pollution re-verification); embedded Pick button submits the CLICKED row; item region template renders on hit and its embedded button dispatches its own action (miss does not render the region).',
          schema: c6c3MappingRowSchema,
          data: { rows: C6C3_ROWS, statusMap: C6C3_STATUS_MAP },
          onActionScopeChange: registerC6c3Probe,
        },
        {
          title: 'Host mapping item region (C6.3)',
          description:
            'C6.3 Phase 3 host-mapping-region: item region renders the template on hit with an embedded action; miss renders no region.',
          schema: c6c3MappingRegionSchema,
          data: {},
          onActionScopeChange: registerC6c3Probe,
        },
      ]}
    />
  );
}
