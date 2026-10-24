// Draws the app icons from the Journal mark (src/components/shell/mark.json: the "j" of the site's
// titles, Instrument Sans at weight 500, whose dot is Petaluma's note head, on a square tile) and
// writes them into the repo: the browser icon (src/app/icon.svg), the icon Safari uses for
// File > Add to Dock (src/app/apple-icon.png) and the Mac app icon that scripts/mac/install.sh
// gives the Journal app (scripts/mac/AppIcon.icns). Run it after changing the mark:
// `node scripts/make-icons.mjs` (it renders with Playwright's Chromium).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARK = JSON.parse(readFileSync(join(root, 'src/components/shell/mark.json'), 'utf8'));

// White on the app's blue, as a page's first screen sets its title.
const BLUE = '#1f3dff';
const glyph = (scale, x = 0, y = 0) => `<g transform="translate(${x} ${y}) scale(${scale})" fill="#ffffff"><path d="${MARK.j}"/><path d="${MARK.head}"/></g>`;
const shadow = `<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.18"/></filter></defs>`;

// A Mac app icon: a rounded square inside the standard 1024 grid, with room for its shadow.
const macIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${shadow}
  <rect x="100" y="100" width="824" height="824" rx="185" fill="${BLUE}" filter="url(#shadow)"/>
  ${glyph(824 / MARK.size, 100, 100)}
</svg>`;

// Safari rounds the corners of a touch icon itself, so it fills the square.
const touchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${BLUE}"/>
  ${glyph(180 / MARK.size)}
</svg>`;

// In a browser tab the tile keeps its rounded corners.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${((32 * MARK.radius) / MARK.size).toFixed(2)}" fill="${BLUE}"/>
  ${glyph(32 / MARK.size)}
</svg>
`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  return page.screenshot({ omitBackground: true });
}

// An .icns file is a list of PNG images, each under a type code that fixes its pixel size: the
// same set that Apple's iconutil writes for a standard iconset.
const ICNS_TYPES = [
  ['icp4', 16],
  ['icp5', 32],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
  ['ic11', 32],
  ['ic12', 64],
  ['ic13', 256],
  ['ic14', 512],
];
const rendered = new Map();
const entries = [];
for (const [type, size] of ICNS_TYPES) {
  if (!rendered.has(size)) rendered.set(size, await png(macIcon, size));
  const data = rendered.get(size);
  const header = Buffer.alloc(8);
  header.write(type, 0, 'latin1');
  header.writeUInt32BE(data.length + 8, 4);
  entries.push(header, data);
}
const body = Buffer.concat(entries);
const header = Buffer.alloc(8);
header.write('icns', 0, 'latin1');
header.writeUInt32BE(body.length + 8, 4);

writeFileSync(join(root, 'scripts/mac/AppIcon.icns'), Buffer.concat([header, body]));
writeFileSync(join(root, 'src/app/apple-icon.png'), await png(touchIcon, 180));
writeFileSync(join(root, 'src/app/icon.svg'), favicon);
await browser.close();
console.log('wrote scripts/mac/AppIcon.icns, src/app/apple-icon.png and src/app/icon.svg');
