import { adminDb } from '../shared/firebase-admin';

export default defineNitroPlugin(async () => {
  try {
    await adminDb().doc('_health/ping').get();
    console.log(
      JSON.stringify({
        severity: 'INFO',
        message: 'Firebase Firestore connection OK',
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        severity: 'CRITICAL',
        message: `Firebase Firestore health check failed — app startup aborted: ${error instanceof Error ? error.message : String(error)}`,
      }),
    );
    process.exit(1);
  }
});
