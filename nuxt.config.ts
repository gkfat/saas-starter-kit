export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2024-04-03',

  modules: ['@nuxt/eslint'],

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
    superadminEmail: process.env.SUPERADMIN_EMAIL,
    superadminUid: process.env.SUPERADMIN_UID,
    public: {
      firebaseApiKey: process.env.VITE_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.VITE_FIREBASE_APP_ID,
    },
  },
});
