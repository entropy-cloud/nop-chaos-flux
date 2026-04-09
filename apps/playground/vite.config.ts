import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset({ target: '19' })] })
  ],
  build: {
    chunkSizeWarningLimit: 6000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('@nop-chaos/spreadsheet-core') || id.includes('@nop-chaos/spreadsheet-renderers')) {
            return 'spreadsheet';
          }
          if (id.includes('@nop-chaos/flow-designer-core') || id.includes('@nop-chaos/flow-designer-renderers')) {
            return 'flow-designer';
          }
          if (id.includes('@nop-chaos/report-designer-core') || id.includes('@nop-chaos/report-designer-renderers')) {
            return 'report-designer';
          }
          if (id.includes('@nop-chaos/word-editor-core') || id.includes('@nop-chaos/word-editor-renderers')) {
            return 'word-editor';
          }
          if (id.includes('@nop-chaos/flux-code-editor')) {
            return 'code-editor';
          }
          if (id.includes('@nop-chaos/ui')) {
            return 'ui';
          }
        }
      }
    }
  }
});
