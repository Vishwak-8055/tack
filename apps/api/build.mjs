// Bundles the API with esbuild. Dependencies from npm stay external (they're installed in the
// runtime image); the workspace package @tack/shared is bundled in, so the output is self-contained.
import { build } from 'esbuild';
import { readFileSync, rmSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@tack/'));

rmSync(new URL('./dist', import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: {
    server: 'src/server.ts',
    migrate: 'src/db/migrate-cli.ts',
    seed: 'src/scripts/seed.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  logLevel: 'info',
});
