import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const target = process.env.SEED_ENV === 'prod' ? 'prod' : 'dev';

const envRoot = resolve(import.meta.dirname, 'env');
const perEnvPath = resolve(envRoot, `.env.${target}`);
const sharedPath = resolve(envRoot, '.env');

for (const path of [perEnvPath, sharedPath]) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path} — copy the matching scripts/env/*.example file first.`);
  }
}

// perEnvPath first: dotenv keeps the first value seen for a given key, so dev/prod
// values win over the shared file when both define the same key.
config({ path: [perEnvPath, sharedPath] });
