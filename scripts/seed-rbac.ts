import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { Permission } from '../shared/permissions';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);
const TENANT_ID = process.env.TENANT_ID ?? 'default';

const PERMISSIONS = [
  { name: Permission.Users.Read, description: '讀取會員資料' },
  { name: Permission.Users.Write, description: '寫入會員資料' },
  { name: Permission.Roles.Read, description: '讀取角色' },
  { name: Permission.Roles.Write, description: '編輯角色權限' },
  { name: Permission.Permissions.Read, description: '讀取權限清單' },
  { name: Permission.LoginLogs.Read, description: '讀取登入紀錄' },
  { name: Permission.AuditLogs.Read, description: '讀取稽核紀錄' },
];

const ROLES = [
  { name: 'admin', description: '管理員' },
  { name: 'member', description: '一般會員' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    Permission.Users.Read,
    Permission.Users.Write,
    Permission.Roles.Read,
    Permission.Roles.Write,
    Permission.Permissions.Read,
    Permission.LoginLogs.Read,
    Permission.AuditLogs.Read,
  ],
  member: [Permission.Users.Read],
};

(async () => {
  const batch = db.batch();
  const base = `tenants/${TENANT_ID}`;

  for (const perm of PERMISSIONS) {
    batch.set(db.doc(`${base}/${prefixCollection('permissions')}/${perm.name}`), perm);
  }

  for (const role of ROLES) {
    batch.set(db.doc(`${base}/${prefixCollection('roles')}/${role.name}`), role);
    batch.set(db.doc(`${base}/${prefixCollection('role_permissions')}/${role.name}`), {
      permissions: ROLE_PERMISSIONS[role.name] ?? [],
    });
  }

  await batch.commit();
  console.log(`RBAC seed done for tenant: ${TENANT_ID}`);
})();
