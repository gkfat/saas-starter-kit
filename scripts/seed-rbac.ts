import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import { prefixCollection } from '../server/shared/firestore-prefix';
import { type Permission, PermissionMeta } from '../shared/permissions';
import { type Role, RoleMeta, RolePermissions } from '../shared/roles';

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

const PERMISSIONS = (Object.entries(PermissionMeta) as [Permission, string][]).map(
  ([name, description]) => ({ name, description }),
);

const ROLES = (Object.entries(RoleMeta) as [Role, string][]).map(([name, description]) => ({
  name,
  description,
}));

(async () => {
  const batch = db.batch();

  for (const perm of PERMISSIONS) {
    batch.set(db.doc(`${prefixCollection('permissions')}/${perm.name}`), perm);
  }

  for (const role of ROLES) {
    batch.set(db.doc(`${prefixCollection('roles')}/${role.name}`), role);
    batch.set(db.doc(`${prefixCollection('role_permissions')}/${role.name}`), {
      permissions: RolePermissions[role.name as Role] ?? [],
    });
  }

  await batch.commit();
  console.log('RBAC seed done.');
})();
