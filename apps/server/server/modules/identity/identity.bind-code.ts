import { randomInt } from 'crypto';
import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';

const CODE_TTL_MINUTES = 5;
const MAX_GENERATE_ATTEMPTS = 5;

export type LineBindCode = {
  code: string;
  userId: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

function bindCodeRef(code: string) {
  return adminDb().doc(`${prefixCollection('line_bind_codes')}/${code}`);
}

function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function generateLineBindCode(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt += 1) {
    const code = generateSixDigitCode();
    const ref = bindCodeRef(code);
    const existing = await ref.get();
    if (existing.exists) continue;

    await ref.set({
      code,
      userId,
      expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString(),
    });
    return code;
  }

  throw new Error('無法產生綁定驗證碼，請重試');
}

export async function findLineBindCode(code: string): Promise<LineBindCode | null> {
  const doc = await bindCodeRef(code).get();
  if (!doc.exists) return null;
  return doc.data() as LineBindCode;
}

export async function validateLineBindCode(code: string): Promise<LineBindCode> {
  const record = await findLineBindCode(code);
  if (!record || record.usedAt || new Date(record.expiresAt).getTime() < Date.now()) {
    throw Object.assign(new Error('驗證碼無效或已過期'), { code: 'invalid-bind-code' });
  }
  return record;
}

export async function markLineBindCodeUsed(code: string): Promise<void> {
  await bindCodeRef(code).update({ usedAt: new Date().toISOString() });
}
