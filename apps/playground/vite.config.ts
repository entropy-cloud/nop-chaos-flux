import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { workspacePackageAliases } from '../../vite.workspace-alias';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases
  },
  plugins: [tailwindcss(), react()]
});
