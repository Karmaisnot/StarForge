import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

// Path alias `@` -> `src` keeps imports flat across the layered architecture.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
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
    },
  };
});
