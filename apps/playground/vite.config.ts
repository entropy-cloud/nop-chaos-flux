import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: workspacePackageAliases,
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset({ target: '19' })] }),
    mode === 'analyze'
      ? visualizer({
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          open: false,
        })
      : undefined,
  ].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Workspace packages resolve to absolute source paths via
          // vite.workspace-alias (package-name substring matching never hits —
          // the vendor chunks silently collapsed into the entry chunk). Match
          // the resolved package directory instead.
          if (/[\\/]packages[\\/]spreadsheet-(core|renderers)[\\/]/.test(id)) {
            return 'spreadsheet';
          }
          if (/[\\/]packages[\\/]flow-designer-(core|renderers)[\\/]/.test(id)) {
            return 'flow-designer';
          }
          if (/[\\/]packages[\\/]report-designer-(core|renderers)[\\/]/.test(id)) {
            return 'report-designer';
          }
          if (/[\\/]packages[\\/]word-editor-(core|renderers)[\\/]/.test(id)) {
            return 'word-editor';
          }
          if (/[\\/]packages[\\/]flux-code-editor[\\/]/.test(id)) {
            return 'code-editor';
          }
          if (/[\\/]packages[\\/]ui[\\/]/.test(id)) {
            return 'ui';
          }
        },
      },
    },
  },
}));
