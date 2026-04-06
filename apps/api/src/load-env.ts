import { existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { getApiPackageRoot } from './paths';

/**
 * Load env before Nest's ConfigModule. Must resolve the real `apps/api` folder — compiled
 * code lives under `dist/src`, so `__dirname + '/..'` is not the package root.
 */
const apiRoot = getApiPackageRoot();
const repoRoot = join(apiRoot, '..', '..');

const paths = [
  join(repoRoot, '.env'),
  join(repoRoot, '.env.local'),
  join(apiRoot, '.env'),
  join(apiRoot, '.env.local'),
];

for (const p of paths) {
  if (existsSync(p)) {
    dotenv.config({ path: p, override: true });
  }
}
