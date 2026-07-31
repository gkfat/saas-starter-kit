import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL('../..', import.meta.url));
  const env = loadEnv(mode, envDir, '');

  return {
    envDir,
    plugins: [vue()],
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(env.LIFF_PORT) || 3006,
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.API_BASE_URL ?? 'http://localhost:3000',
      ),
    },
  };
});
