export const APPS = ['server', 'admin', 'liff'] as const;
export type AppName = (typeof APPS)[number];

const APP_PATH_PREFIX: Record<AppName, string> = {
  server: 'apps/server/',
  admin: 'apps/admin/',
  liff: 'apps/liff/',
};

const SHARED_PATH_PREFIXES = ['packages/shared/', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'];

/**
 * A change under packages/shared (or the workspace lockfile/manifest) affects
 * all three apps; a change under apps/<name>/ affects only that app.
 */
export function detectAffectedApps(changedFiles: string[]): AppName[] {
  const affectsAllApps = changedFiles.some((file) =>
    SHARED_PATH_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );

  if (affectsAllApps) {
    return [...APPS];
  }

  return APPS.filter((app) => changedFiles.some((file) => file.startsWith(APP_PATH_PREFIX[app])));
}

async function main() {
  const { execSync } = await import('node:child_process');
  const baseRef = process.argv[2];

  if (!baseRef) {
    console.error('Usage: tsx scripts/detect-affected-apps.ts <base-ref>');
    process.exit(1);
  }

  const diffOutput = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf-8' });
  const changedFiles = diffOutput.split('\n').filter(Boolean);
  const affected = detectAffectedApps(changedFiles);

  console.log(JSON.stringify(affected));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
