import { resolve } from 'path';

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',

  devServer: {
    port: 3005,
  },

  nitro: {
    alias: {
      '~/shared': resolve('./shared'),
    },
  },

  modules: ['@nuxt/eslint', '@pinia/nuxt', '@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    lazy: false,
    langDir: 'locales',
    restructureDir: 'i18n',
    defaultLocale: 'zh-TW',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: false,
      storageKey: 'i18n_locale',
    },
  },

  build: {
    transpile: ['vuetify'],
  },

  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.css'],

  vite: {
    define: {
      'process.env.DEBUG': false,
    },
  },

  typescript: {
    strict: true,
  },

  runtimeConfig: {
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    public: {
      appVersion: process.env.APP_VERSION ?? '0.0.0',
      firebaseApiKey: process.env.VITE_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.VITE_FIREBASE_APP_ID,
      featureFlags: {
        auditLog: process.env.FEATURE_AUDIT_LOG_ENABLED !== 'false',
        loginLog: process.env.FEATURE_LOGIN_LOG_ENABLED !== 'false',
      },
    },
  },
});
