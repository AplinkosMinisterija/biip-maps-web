import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default () => {
  const env = loadEnv('all', process.cwd());

  return defineConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/proxy/alis': {
          target: env.VITE_ALIS_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/alis/, ''),
        },
        '/proxy/gyvunai': {
          target: env.VITE_GYVUNAI_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/gyvunai/, ''),
        },
        '/proxy/medziokle': {
          target: env.VITE_MEDZIOKLE_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/medziokle/, ''),
        },
        '/proxy/rusys': {
          target: env.VITE_RUSYS_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/rusys/, ''),
        },
        '/proxy/uetk': {
          target: env.VITE_UETK_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/uetk/, ''),
        },
        '/proxy/zuvinimas': {
          target: env.VITE_ZUVINIMAS_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/zuvinimas/, ''),
        },
        '/proxy/zvejyba': {
          target: env.VITE_ZVEJYBA_API_HOST,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy\/zvejyba/, ''),
        },
      },
    },
    envPrefix: 'VUE_APP',
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo: any) => {
            let extType = assetInfo.name.split('.').at(1);
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'img';
            }
            return `assets/${extType}/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
    },
  });
};
