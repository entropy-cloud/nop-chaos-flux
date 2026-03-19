import { fileURLToPath, URL } from 'node:url';

export const workspacePackageAliases = {
  '@nop-chaos/amis-schema': fileURLToPath(new URL('./packages/amis-schema/src/index.ts', import.meta.url)),
  '@nop-chaos/amis-formula': fileURLToPath(new URL('./packages/amis-formula/src/index.ts', import.meta.url)),
  '@nop-chaos/amis-runtime': fileURLToPath(new URL('./packages/amis-runtime/src/index.ts', import.meta.url)),
  '@nop-chaos/amis-react': fileURLToPath(new URL('./packages/amis-react/src/index.tsx', import.meta.url)),
  '@nop-chaos/amis-renderers-basic': fileURLToPath(new URL('./packages/amis-renderers-basic/src/index.tsx', import.meta.url)),
  '@nop-chaos/amis-renderers-form': fileURLToPath(new URL('./packages/amis-renderers-form/src/index.tsx', import.meta.url)),
  '@nop-chaos/amis-renderers-data': fileURLToPath(new URL('./packages/amis-renderers-data/src/index.tsx', import.meta.url))
};
