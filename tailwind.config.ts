import type { Config } from 'tailwindcss';
import { nopTailwindPreset } from './packages/tailwind-preset/src';

const config: Config = {
  presets: [nopTailwindPreset],
  content: [
    './apps/playground/index.html',
    './apps/playground/src/**/*.{ts,tsx,json}',
    './apps/mall-mobile/index.html',
    './apps/mall-mobile/src/**/*.{ts,tsx,json}',
    './packages/ui/src/**/*.{ts,tsx}',
    './packages/flux-react/src/**/*.{ts,tsx}',
    './packages/flux-renderers-basic/src/**/*.{ts,tsx}',
    './packages/flux-renderers-form/src/**/*.{ts,tsx}',
    './packages/flux-renderers-data/src/**/*.{ts,tsx}',
    './packages/flow-designer-renderers/src/**/*.{ts,tsx}',
    './packages/report-designer-renderers/src/**/*.{ts,tsx}',
    './packages/spreadsheet-renderers/src/**/*.{ts,tsx}',
    './tailwind-safelist.txt',
  ],
};

export default config;
