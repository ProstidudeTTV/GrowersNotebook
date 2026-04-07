# Growers Notebook

## Dev (Windows / machines without `pnpm` on PATH)

Dependencies are managed with **pnpm** (see `pnpm-workspace.yaml`), but you do **not** need `pnpm` on your PATH to run the apps.

From the repo root (`GrowersNotebook`):

```bash
npm run install:all
npm run dev
```

- **`npm run install:all`** runs `npx pnpm@9.15.9 install` (downloads pnpm temporarily).
- **`npm run dev`** runs [`scripts/dev.cjs`](scripts/dev.cjs): **Next.js** (default port **3000**) and **Nest** (default port **3001**) in parallel.

Production build without global pnpm: **`npm run build`** ([`scripts/build.cjs`](scripts/build.cjs)).

### Optional: install pnpm globally

```bash
npm install -g pnpm@9.15.9
pnpm install
pnpm dev
```

(`pnpm dev` still uses Turborepo if you prefer; `npm run dev` avoids the “package manager binary not found” Turbo issue when `pnpm` is not global.)

### Env

- Web: `apps/web/.env.local` — see `env.example`.
- API: `apps/api/.env` — `DATABASE_URL`, `SUPABASE_JWT_SECRET` (see `apps/api/.env.example`).

See also `ROADMAP.md`.
