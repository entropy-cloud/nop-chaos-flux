import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { workspacePackageAliases } from '../../vite.workspace-alias';

const hostOwnedExternal = [
  /^react(\/.*)?$/,
  /^react-dom(\/.*)?$/,
  /^zustand(\/.*)?$/,
  /^lucide-react(\/.*)?$/,
  /^recharts(\/.*)?$/,
  /^i18next(\/.*)?$/,
  /^react-i18next(\/.*)?$/,
  /^@nop-chaos\/ui(\/.*)?$/,
];

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases,
  },
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: './src/index.tsx',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: hostOwnedExternal,
      output: {
        codeSplitting: false,
      },
    },
  },
});
