import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

// Path alias `@` -> `src` keeps imports flat across the layered architecture.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The project ships its own API. Keep browser calls same-origin and proxy
  // them locally in development; a deployment can override this target without
  // changing frontend code.
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:4000';

  return {
    plugins: [
      react(),
      (env.ANALYZE === 'true' || mode === 'analyze') &&
        visualizer({ filename: 'dist/bundle-report.html', gzipSize: true, brotliSize: true }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
