import { existsSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Resolved package root for `apps/api` (where `nest-cli.json` and `.env` live).
 * Emits live under `dist/src`, so a plain `join(__dirname, '..')` points at `dist/`, not here.
 */
export function getApiPackageRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 14; i++) {
    if (existsSync(join(dir, 'nest-cli.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    `Could not find nest-cli.json (API package root) starting from ${__dirname}`,
  );
}
