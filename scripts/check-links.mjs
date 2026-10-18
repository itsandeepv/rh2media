// Checks every internal link, asset and #anchor across all pages. Zero dependencies.
// Run: npm run check:links
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';

const root = join(import.meta.dirname, '..');
const pages = [];
for (const dir of ['', 'services', 'blog']) for (const f of readdirSync(join(root, dir))) if (f.endsWith('.html')) pages.push(dir ? `/${dir}/${f}` : `/${f}`);

const html = Object.fromEntries(pages.map((p) => [p, readFileSync(join(root, p), 'utf8')]));
const ids = (src) => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
let broken = 0;
for (const p of pages) {
  const src = html[p].replace(/<template[\s\S]*?<\/template>/g, '');
  for (const [, attr, raw] of src.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(raw) || raw === '#') continue;
    const [beforeHash, hash] = raw.split('#');
    const pathPart = beforeHash.split('?')[0];
    let target = pathPart ? (pathPart.startsWith('/') ? pathPart : posix.join(posix.dirname(p), pathPart)) : p;
    if (target.endsWith('/')) target += 'index.html';
    if (!existsSync(join(root, target))) { console.log(`✗ ${p}: ${attr}="${raw}" → missing file`); broken++; continue; }
    if (hash && target.endsWith('.html') && !ids(html[target] ?? '').has(hash) && !hash.startsWith('i-')) {
      console.log(`✗ ${p}: ${attr}="${raw}" → missing #${hash}`); broken++;
    }
  }
}
console.log(broken ? `\n${broken} broken link(s) across ${pages.length} pages.` : `✓ All internal links OK across ${pages.length} pages.`);
process.exit(broken ? 1 : 0);
