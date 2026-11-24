import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

import type { Plugin } from 'vite';

const rootDir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));

const isCloudRun = Boolean(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB);
const isHmrDisabled =
  process.env.DISABLE_HMR === 'true' ||
  (isCloudRun && process.env.ENABLE_HMR !== 'true');
const enableHmr = !isHmrDisabled;

const hmrProtocol =
  (process.env.HMR_PROTOCOL as 'wss' | 'ws' | undefined) ||
  (isCloudRun ? 'wss' : undefined);
const hmrClientPort = process.env.HMR_CLIENT_PORT
  ? Number(process.env.HMR_CLIENT_PORT)
  : isCloudRun
    ? 443
    : undefined;

/**
 * In Vite 8 middleware/dev mode, /@vite/client is still injected for CSS helpers even when
 * server.hmr and server.ws are `false`, and client.mjs still invokes `transport.connect(...)`
 * against port 24678. When HMR is intentionally disabled (e.g. AI Studio / Cloud Run preview),
 * neutralize only that initial WebSocket connect call so CSS dev transforms still work cleanly
 * without triggering WebSocket connection errors or unhandled rejections.
 */
function disableHmrClientWebSocketPlugin(): Plugin {
  return {
    name: 'oaa-disable-hmr-client-ws',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
      const cleanId = id.split('?')[0].replace(/\\/g, '/');
      if (
        !cleanId.endsWith('vite/dist/client/client.mjs') &&
        !cleanId.endsWith('vite/dist/client/bundledDevClient.mjs') &&
        cleanId !== '/@vite/client'
      ) {
        return null;
      }

      if (!code.includes('transport.connect(createHMRHandler(handleMessage))')) {
        return null;
      }

      return {
        code: code.replace(
          'transport.connect(createHMRHandler(handleMessage));',
          '/* HMR disabled in preview environment; skipping @vite/client WebSocket connect */'
        ),
        map: null,
      };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(enableHmr ? [] : [disableHmrClientWebSocketPlugin()]),
    ],
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
      // Disable both HMR and WS server behind Cloud Run / AI Studio reverse proxies unless
      // ENABLE_HMR=true, preventing @vite/client WebSocket connection errors in preview iframes.
      hmr: enableHmr ? { overlay: true } : false,
      ws: enableHmr
        ? {
            ...(hmrProtocol ? { protocol: hmrProtocol } : {}),
            ...(hmrClientPort ? { clientPort: hmrClientPort } : {}),
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
