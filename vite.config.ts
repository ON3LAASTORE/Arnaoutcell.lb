import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const rootDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

const isCloudRun = Boolean(process.env.K_SERVICE);
const isHmrDisabled = process.env.DISABLE_HMR === 'true';
const enableHmr = !isHmrDisabled && (!isCloudRun || process.env.ENABLE_HMR === 'true');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      // Disable HMR behind Cloud Run reverse proxies unless ENABLE_HMR=true,
      // preventing @vite/client WebSocket connection errors in preview iframes.
      hmr: enableHmr
        ? {
            protocol: (process.env.HMR_PROTOCOL as 'wss' | 'ws') || (isCloudRun ? 'wss' : undefined),
            clientPort: process.env.HMR_CLIENT_PORT
              ? Number(process.env.HMR_CLIENT_PORT)
              : (isCloudRun ? 443 : undefined),
          }
        : false,
      watch: enableHmr
        ? {
            usePolling: true,
            interval: 1000,
          }
        : null,
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true,
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/motion')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/gsap')) {
              return 'vendor-gsap';
            }
            if (id.includes('node_modules/jsqr')) {
              return 'vendor-qr';
            }
            if (id.includes('node_modules/@google/genai')) {
              return 'vendor-genai';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
          },
        },
      },
      chunkSizeWarningLimit: 900,
    },
  };
});
