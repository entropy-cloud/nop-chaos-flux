import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';
import { SpreadsheetPageRenderer } from './page-renderer.js';
export const spreadsheetRendererDefinitions = [
    {
        type: 'spreadsheet-page',
        component: SpreadsheetPageRenderer,
        regions: ['toolbar', 'body', 'dialogs'],
        fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }],
    },
];
export function registerSpreadsheetRenderers(registry) {
    return registerRendererDefinitions(registry, spreadsheetRendererDefinitions);
}
//# sourceMappingURL=renderers.js.map