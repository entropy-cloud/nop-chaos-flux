import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases
  },
  plugins: [react()]
});
