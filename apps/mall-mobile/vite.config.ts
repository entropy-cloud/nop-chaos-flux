import { defineConfig, type Plugin } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { workspacePackageAliases } from '../../vite.workspace-alias';

// Dev-only placeholder image middleware: /mock-img/<seed>.svg — deterministic
// gradient SVGs so MALL_MOCK UX walkthroughs need no external image host and no
// comma-bearing data URLs (the gallery field is comma-separated).
function mockImagePlugin(): Plugin {
  return {
    name: 'mall-mock-images',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /^\/mock-img\/([\w-]+)\.svg$/.exec(req.url ?? '');
        if (!match) return next();
        const seed = match[1];
        const palettes = [
          ['#ffd8c2', '#ff8a65'],
          ['#c2e3ff', '#65a7ff'],
          ['#d9f2e3', '#5fc98e'],
          ['#ffe9c2', '#ffb84d'],
          ['#ecd9ff', '#a86bff'],
        ];
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
        const [a, b] = palettes[h % palettes.length];
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='600' height='600' fill='url(#g)'/><text x='300' y='310' font-family='sans-serif' font-size='40' fill='rgba(255,255,255,.85)' text-anchor='middle'>${seed}</text></svg>`;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(svg);
      });
    },
  };
}

const BACKEND_TARGET = process.env.MALL_BACKEND_ORIGIN ?? 'http://localhost:8080';

export default defineConfig({
  resolve: {
    alias: workspacePackageAliases,
  },
  plugins: [
    mockImagePlugin(),
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
