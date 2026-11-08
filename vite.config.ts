import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const rootDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

const isCloudRun = Boolean(process.env.K_SERVICE);
const isHmrDisabled = process.env.DISABLE_HMR === 'true';

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
      // HMR configuration for Cloud Run & reverse proxies:
      // When DISABLE_HMR is 'true', disable HMR to prevent WebSocket connection failures.
      // Behind Cloud Run or an HTTPS reverse proxy, connect via secure WebSocket (wss) on port 443.
      hmr: isHmrDisabled
        ? false
        : {
            protocol: (process.env.HMR_PROTOCOL as 'wss' | 'ws') || (isCloudRun ? 'wss' : undefined),
            clientPort: process.env.HMR_CLIENT_PORT
              ? Number(process.env.HMR_CLIENT_PORT)
              : (isCloudRun ? 443 : undefined),
          },
      // File watching polling fallback for containerized file systems
      watch: isHmrDisabled
        ? null
        : {
            usePolling: true,
            interval: 1000,
          },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/motion')) {
              return 'vendor-motion';
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
