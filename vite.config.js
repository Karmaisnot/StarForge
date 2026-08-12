import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';

function validatedProxyTarget(value) {
  if (!value) return '';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_API_PROXY_TARGET must be one valid origin.');
  }
  const loopback =
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.hostname.endsWith('.localhost');
  const allowedProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
  if (
    !allowedProtocol ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'VITE_API_PROXY_TARGET must be one HTTPS origin without a path or credentials (HTTP is allowed only on loopback).',
    );
  }
  return url.origin;
}

export function alignProxySecurityHeaders(proxyRequest, request, upstreamOrigin) {
  if (typeof request.headers.origin === 'string' && request.headers.origin) {
    proxyRequest.setHeader('Origin', upstreamOrigin);
  }
  if (typeof request.headers.referer !== 'string' || !request.headers.referer) return;
  try {
    const incoming = new URL(request.headers.referer);
    const upstream = new URL(upstreamOrigin);
    upstream.pathname = incoming.pathname;
    upstream.search = incoming.search;
    proxyRequest.setHeader('Referer', upstream.href);
  } catch {
    proxyRequest.removeHeader('Referer');
  }
}

function proxyRoute(target, { websocket = false } = {}) {
  return {
    target,
    changeOrigin: true,
    secure: target.startsWith('https:'),
    ...(websocket ? { ws: true } : {}),
    configure(proxy) {
      proxy.on('proxyReq', (proxyRequest, request) => {
        alignProxySecurityHeaders(proxyRequest, request, target);
      });
    },
  };
}

function proxyConfig(target) {
  return {
    '/api': proxyRoute(target),
    '/ws': proxyRoute(target, { websocket: true }),
  };
}

const TUNNEL_ALLOWED_HOSTS = ['.ngrok-free.app'];

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = validatedProxyTarget(String(env.VITE_API_PROXY_TARGET || '').trim());
  const dataSource = String(env.VITE_DATA_SOURCE || 'remote').trim().toLowerCase();
  const externalApiBase = String(env.VITE_API_BASE_URL || '').trim();
  const analyze = env.ANALYZE === 'true' || mode === 'analyze';

  if (command === 'build' && dataSource !== 'remote') {
    throw new Error('Deployable bundles require VITE_DATA_SOURCE=remote.');
  }
  if (command === 'build' && externalApiBase) {
    throw new Error('Deployable bundles require the same-origin /api proxy.');
  }

  return {
    plugins: [
      react(),
      ...(analyze
        ? [
            visualizer({
              filename: 'dist/bundle-report.html',
              template: 'treemap',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      host: env.VITE_DEV_HOST || '127.0.0.1',
      open: false,
      allowedHosts: [...TUNNEL_ALLOWED_HOSTS],
      ...(proxyTarget ? { proxy: proxyConfig(proxyTarget) } : {}),
    },
    preview: {
      port: 4173,
      host: env.VITE_DEV_HOST || '127.0.0.1',
      allowedHosts: [...TUNNEL_ALLOWED_HOSTS],
      ...(proxyTarget ? { proxy: proxyConfig(proxyTarget) } : {}),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
