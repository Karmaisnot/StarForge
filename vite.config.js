import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

// Path alias `@` -> `src` keeps imports flat across the layered architecture.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Proxy only when a development API target is deliberately configured. The
  // production app calls its tenant origin directly; silently falling back to
  // the old bundled server would mask a deployment configuration mistake.
  const apiTarget = env.VITE_API_PROXY_TARGET;

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
      proxy: apiTarget
        ? {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
