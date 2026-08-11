/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_LIFF_ID: string;
  readonly VITE_LIFF_ACCESS_TOKEN?: string;
  readonly VITE_FEATURE_COUPON_ENABLED: boolean;
  readonly VITE_FEATURE_POINTS_ENABLED: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
