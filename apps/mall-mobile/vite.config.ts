import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { workspacePackageAliases } from '../../vite.workspace-alias';

const BACKEND_TARGET = process.env.MALL_BACKEND_ORIGIN ?? 'http://localhost:8080';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases,
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset({ target: '19' })] }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '/r': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('@nop-chaos/ui')) {
            return 'ui';
          }
        },
      },
    },
  },
});
