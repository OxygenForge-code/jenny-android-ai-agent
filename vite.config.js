import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const uiRoot = resolve(import.meta.dirname, 'jenny/templates/ui');

function livaGatewayPaths() {
  return {
    name: 'liva-gateway-paths',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const url = request.url || '/';
        if (url === '/' || url.startsWith('/?')) {
          request.url = `/liva.html${url.slice(1)}`;
        } else if (url.startsWith('/html-mobile/')) {
          request.url = url.slice('/html-mobile'.length);
        }
        next();
      });
    },
  };
}

const localModelProxy = {
  '/liva-local/ollama': {
    target: 'http://127.0.0.1:11434',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/liva-local\/ollama/, ''),
  },
  '/liva-local/lmstudio': {
    target: 'http://127.0.0.1:1234',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/liva-local\/lmstudio/, ''),
  },
};

export default defineConfig({
  root: uiRoot,
  plugins: [livaGatewayPaths()],
  resolve: {
    alias: [{ find: /^\/html-mobile\//, replacement: `${uiRoot}/` }],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: localModelProxy,
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true, proxy: localModelProxy },
  build: {
    outDir: resolve(import.meta.dirname, 'dist/liva'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(uiRoot, 'liva.html') },
  },
});
