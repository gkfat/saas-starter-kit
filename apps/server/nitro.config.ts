import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineNitroConfig } from 'nitropack/config';

loadEnv({ path: resolve(import.meta.dirname, '../../.env') });

export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2024-04-03',
  preset: 'node-server',

  runtimeConfig: {
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? '',
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
    lineChannelId: process.env.LINE_CHANNEL_ID ?? '',
    lineChannelSecret: process.env.LINE_CHANNEL_SECRET ?? '',
    liffAppUrl: process.env.LIFF_APP_URL ?? 'http://localhost:3006',
    adminAppUrl: process.env.ADMIN_APP_URL ?? 'http://localhost:3005',
    liffId: process.env.VITE_LIFF_ID ?? '',
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS ?? '',
    levelBatchSecret: process.env.LEVEL_BATCH_SECRET ?? '',
    r2AccountId: process.env.R2_ACCOUNT_ID ?? '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    r2BucketName: process.env.R2_BUCKET_NAME ?? '',
    r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
    public: {
      featureFlags: {
        auditLog: process.env.FEATURE_AUDIT_LOG_ENABLED !== 'false',
        loginLog: process.env.FEATURE_LOGIN_LOG_ENABLED !== 'false',
        level: process.env.FEATURE_LEVEL_ENABLED !== 'false',
        coupon: process.env.FEATURE_COUPON_ENABLED === 'true',
        points: process.env.FEATURE_POINTS_ENABLED !== 'false',
        event: process.env.FEATURE_EVENT_ENABLED !== 'false',
      },
    },
  },
});
