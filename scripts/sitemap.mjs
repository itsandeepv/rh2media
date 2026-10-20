// Generates /sitemap.xml from every page in the project (except 404). Zero dependencies.
// Run: npm run sitemap  (also runs in `npm run build`)
// EDIT: set your live domain here (no trailing slash).
const SITE_URL = 'https://www.rh2media.com';

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const urls = [];
for (const dir of ['', 'services', 'blog']) {
  for (const f of readdirSync(join(root, dir)).sort()) {
    if (!f.endsWith('.html') || f === '404.html') continue;
    const path = dir ? `/${dir}/${f}` : `/${f}`;
    const loc = path === '/index.html' ? '/' : path;
    const lastmod = statSync(join(root, dir, f)).mtime.toISOString().slice(0, 10);
    const priority = loc === '/' ? '1.0' : /^\/(services|contact|about)/.test(loc) ? '0.8' : '0.6';
    urls.push(`  <url><loc>${SITE_URL}${loc}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority></url>`);
  }
}
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`sitemap: ${urls.length} URLs`);
