// Copies /partials/{head,header,footer}.html into every page between markers:
//   <!-- HEAD:START --> ... <!-- HEAD:END -->
//   <!-- HEADER:START --> ... <!-- HEADER:END -->
//   <!-- FOOTER:START --> ... <!-- FOOTER:END -->
// and marks the active nav link for that page. Zero dependencies.
// Run: npm run sync  (also runs automatically in `npm run dev` and `npm run build`)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = join(import.meta.dirname, '..');
const partial = (name) => readFileSync(join(root, 'partials', `${name}.html`), 'utf8').trim();
// Cache-busting: {{v:path}} → short content hash of that file
const hash = (p) => { try { return createHash('md5').update(readFileSync(join(root, p))).digest('hex').slice(0, 8); } catch { return '0'; } };
const parts = { HEAD: partial('head'), HEADER: partial('header'), FOOTER: partial('footer') };

const pages = [];
for (const dir of ['', 'services', 'blog']) {
  for (const f of readdirSync(join(root, dir))) {
    if (f.endsWith('.html')) pages.push(join(root, dir, f));
  }
}

const sectionOf = (url) => {
  if (url === '/index.html') return 'home';
  if (url === '/about.html') return 'about';
  if (url === '/services.html' || url.startsWith('/services/')) return 'services';
  if (url === '/blog.html' || url.startsWith('/blog/')) return 'blog';
  if (url === '/contact.html') return 'contact';
  return '';
};

let changed = 0;
for (const file of pages) {
  const url = '/' + relative(root, file).split(sep).join('/');
  const section = sectionOf(url);
  const isActive = (key) => key === section || key === url;
  let html = readFileSync(file, 'utf8');
  const before = html;
  for (const [name, content] of Object.entries(parts)) {
    const re = new RegExp(`(<!-- ${name}:START[^>]*-->)[\\s\\S]*?(<!-- ${name}:END -->)`);
    if (!re.test(html)) continue;
    const filled = content
      .replace(/{{v:([^}]+)}}/g, (_, p) => hash(p))
      .replace(/\{\{active:([^}]+)\}\}/g, (_, k) => (isActive(k) ? ' is-active' : ''))
      .replace(/\{\{activeText:([^}]+)\}\}/g, (_, k) => (isActive(k) ? ' text-gold-400' : ''))
      .replace(/\{\{current:([^}]+)\}\}/g, (_, k) => (k === url ? ' aria-current="page"' : ''));
    html = html.replace(re, (_, a, b) => `${a}\n${filled}\n${b}`);
  }
  if (html !== before) { writeFileSync(file, html); changed++; }
}
console.log(`sync-partials: ${pages.length} pages scanned, ${changed} updated.`);
