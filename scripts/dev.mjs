// `npm run dev`: Tailwind watch + local static server + partial re-sync on change.
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd, args) => spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

run('npx', ['tailwindcss', '-i', './src/input.css', '-o', './dist/styles.css', '--watch']);
run('node', ['scripts/serve.mjs']);

let t;
watch(join(root, 'partials'), () => {
  clearTimeout(t);
  t = setTimeout(() => run('node', ['scripts/sync-partials.mjs']), 150);
});
