import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { workspacePackageAliases } from '../../vite.workspace-alias';

// 所有 use-sync-external-store/* 路径（含 /shim/index.js、/shim/with-selector.js）
// 重定向到本包的 ESM stub。npm 包的 shim 是 CJS，在浏览器 ESM 下会抛
// "does not provide an export named 'useSyncExternalStore'" 或 require('react')。
// stub 用 React 19 原生 useSyncExternalStore + flux-react 的 WithSelector 实现。
const useSyncESMShim = fileURLToPath(
  new URL('./src/use-sync-external-store-shim.ts', import.meta.url),
);

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
    alias: [
      { find: /^use-sync-external-store(\/.*)?$/, replacement: useSyncESMShim },
      ...Object.entries(workspacePackageAliases).map(([find, replacement]) => ({
        find,
        replacement,
      })),
    ],
  },
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    minify: false,
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
