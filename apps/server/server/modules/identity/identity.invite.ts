import { randomBytes } from 'crypto';
import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';

const TOKEN_TTL_HOURS = 24;

export type LineInvite = {
  token: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

function inviteRef(token: string) {
  return adminDb().doc(`${prefixCollection('line_bind_invites')}/${token}`);
}

export async function generateLineInviteToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await inviteRef(token).set({
    token,
    userId,
    expiresAt,
    usedAt: null,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export async function findLineInvite(token: string): Promise<LineInvite | null> {
  const doc = await inviteRef(token).get();
  if (!doc.exists) return null;
  return doc.data() as LineInvite;
}

export async function validateLineInvite(token: string): Promise<LineInvite> {
  const invite = await findLineInvite(token);
  if (!invite || invite.usedAt || new Date(invite.expiresAt).getTime() < Date.now()) {
    throw Object.assign(new Error('邀請連結無效或已過期'), { code: 'invalid-invite' });
  }
  return invite;
}

export async function markLineInviteUsed(token: string): Promise<void> {
  await inviteRef(token).update({ usedAt: new Date().toISOString() });
}
