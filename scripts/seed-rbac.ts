import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);
const TENANT_ID = 'default';

const PERMISSIONS = [
  { name: 'users:read', description: '讀取會員資料' },
  { name: 'users:write', description: '寫入會員資料' },
  { name: 'admin:access', description: '進入後台' },
];

const ROLES = [
  { name: 'admin', description: '管理員' },
  { name: 'member', description: '一般會員' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['users:read', 'users:write', 'admin:access'],
  member: ['users:read'],
};

(async () => {
  const batch = db.batch();
  const base = `tenants/${TENANT_ID}`;

  for (const perm of PERMISSIONS) {
    batch.set(db.doc(`${base}/permissions/${perm.name}`), perm);
  }

  for (const role of ROLES) {
    batch.set(db.doc(`${base}/roles/${role.name}`), role);
    batch.set(db.doc(`${base}/role_permissions/${role.name}`), {
      permissions: ROLE_PERMISSIONS[role.name] ?? [],
    });
  }

  await batch.commit();
  console.log(`RBAC seed done for tenant: ${TENANT_ID}`);
})();
