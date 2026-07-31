import { describe, expect, it } from 'vitest';
import { detectAffectedApps } from './detect-affected-apps';

describe('detectAffectedApps', () => {
  it('returns only liff when the change is limited to apps/liff', () => {
    expect(detectAffectedApps(['apps/liff/src/main.ts', 'apps/liff/package.json'])).toEqual([
      'liff',
    ]);
  });

  it('returns only server when the change is limited to apps/server', () => {
    expect(detectAffectedApps(['apps/server/server/api/auth/login.post.ts'])).toEqual(['server']);
  });

  it('returns server and admin when both are touched', () => {
    expect(
      detectAffectedApps(['apps/server/server/middleware/00.cors.ts', 'apps/admin/app.vue']),
    ).toEqual(['server', 'admin']);
  });

  it('returns all apps when packages/shared changes', () => {
    expect(detectAffectedApps(['packages/shared/roles.ts'])).toEqual(['server', 'admin', 'liff']);
  });

  it('returns all apps when the workspace lockfile changes', () => {
    expect(detectAffectedApps(['pnpm-lock.yaml'])).toEqual(['server', 'admin', 'liff']);
  });

  it('returns an empty list when no app or shared path is touched', () => {
    expect(detectAffectedApps(['README.md', 'docs/setup/deploy.md'])).toEqual([]);
  });
});
