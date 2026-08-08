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
      // Vite blocks unrecognized Host headers by default (DNS rebinding protection).
      // Tunnels (ngrok / Cloudflare) forward requests with their own hostname, so allow
      // these for local LIFF testing through a tunnel; dev-only, never applies to prod builds.
      allowedHosts: ['.ngrok-free.app', 'liff-dev.hahaglassesking.com'],
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        env.API_BASE_URL ?? 'http://localhost:3000',
      ),
    },
  };
});
