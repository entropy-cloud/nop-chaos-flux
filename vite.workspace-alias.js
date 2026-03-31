"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspacePackageAliases = void 0;
var node_url_1 = require("node:url");
exports.workspacePackageAliases = {
    '@nop-chaos/flux-core': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-core/src/index.ts', import.meta.url)),
    '@nop-chaos/flux-formula': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-formula/src/index.ts', import.meta.url)),
    '@nop-chaos/nop-debugger': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/nop-debugger/src/index.tsx', import.meta.url)),
    '@nop-chaos/flux-runtime': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-runtime/src/index.ts', import.meta.url)),
    '@nop-chaos/flux-react': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-react/src/index.tsx', import.meta.url)),
    '@nop-chaos/flux-renderers-basic': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-renderers-basic/src/index.tsx', import.meta.url)),
    '@nop-chaos/flux-renderers-form': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-renderers-form/src/index.tsx', import.meta.url)),
    '@nop-chaos/flux-renderers-data': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flux-renderers-data/src/index.tsx', import.meta.url)),
    '@nop-chaos/ui/styles.css': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/ui/src/styles/index.css', import.meta.url)),
    '@nop-chaos/ui/base.css': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/ui/src/styles/base.css', import.meta.url)),
    '@nop-chaos/ui': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/ui/src/index.ts', import.meta.url)),
    '@nop-chaos/spreadsheet-core': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/spreadsheet-core/src/index.ts', import.meta.url)),
    '@nop-chaos/spreadsheet-renderers': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/spreadsheet-renderers/src/index.ts', import.meta.url)),
    '@nop-chaos/report-designer-core': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/report-designer-core/src/index.ts', import.meta.url)),
    '@nop-chaos/report-designer-renderers': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/report-designer-renderers/src/index.ts', import.meta.url)),
    '@nop-chaos/flow-designer-core': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flow-designer-core/src/index.ts', import.meta.url)),
    '@nop-chaos/flow-designer-renderers': (0, node_url_1.fileURLToPath)(new node_url_1.URL('./packages/flow-designer-renderers/src/index.tsx', import.meta.url))
};
