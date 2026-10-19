import { defineConfig, type PluginOption } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: workspacePackageAliases,
  },
  // plan 2476（item 22）：xlang 在线调试 e2e——dev 代理至 D1 mock 服务器
  // （tests/e2e/xlang-debug-mock-server.mjs，playwright webServer 拉起；无 mock 服务器时
  // 仅这两个路径不可用，其余 dev 功能不受影响）
  server: {
    proxy: {
      '/ws/xlang-debugger': {
        target: 'ws://127.0.0.1:4180',
        ws: true,
      },
      '/r/nop-xlang-debug': {
        target: 'http://127.0.0.1:4180',
        changeOrigin: true,
      },
    },
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
  ].filter(Boolean) as PluginOption[],
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
