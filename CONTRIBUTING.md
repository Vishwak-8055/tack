# Contributing

Thanks for taking a look. This is a small codebase and it's meant to stay easy to read, so the
bar for a change is mostly "does it make sense to the next person".

## Getting set up

You need Node 22 and a Postgres database (the compose file gives you one).

```bash
cp .env.example .env
npm install
npm run db:up        # Postgres on :5432
npm run db:seed      # optional demo data
npm run dev          # API on :3000, web on :5173
```

## Before you push

```bash
npm run check        # lint, typecheck, and every test
npm run format       # Prettier, if the formatting check complains
```

The API tests run against a real Postgres, never a mock. With `npm run db:up` running they need no
setup: the runner creates `tack_test` on the same server and rebuilds it from the migrations at
the start of each run. Point `TEST_DATABASE_URL` somewhere else if you prefer. The runner refuses
to touch a database whose name doesn't end in `_test`.

## Conventions

- **Where things go.** Request and response shapes, validation, and ordering logic live in
  `packages/shared` so the client and server can't drift apart. API routes are thin; the work
  happens in each module's `*.service.ts`.
- **Database changes** are a new numbered file in `apps/api/migrations`. Never edit one that has
  shipped.
- **Mutations** that change a board end with `boardChanged(...)`, which is what tells other open
  tabs to refresh.
- **Tests** go next to what they cover: API behaviour in `apps/api/test`, pure logic beside its
  module. A bug fix should come with a test that fails without it.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`, `chore:`), one logical change each.

## Pull requests

Keep them focused. Say what changed and why, and attach screenshots for anything visual.
