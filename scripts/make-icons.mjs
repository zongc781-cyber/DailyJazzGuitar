// Draws the app icons from the brand mark (the guitar pick with a note in the top bar) and
// writes them into the repo: the browser icon (src/app/icon.svg), the icon Safari uses for
// File > Add to Dock (src/app/apple-icon.png) and the Mac app icon that scripts/mac/install.sh
// gives the "Daily Jazz Guitar" app (scripts/mac/AppIcon.icns). Run it after changing the
// artwork: `node scripts/make-icons.mjs` (it renders with Playwright's Chromium).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The mark on a 32×32 grid, as in AppShell's BrandMark.
const mark = (pick, note) => `
  <path d="M16 2.5c7 0 12.5 3 12.5 7.8 0 6.4-7.4 15.6-12.5 19.2C10.9 25.9 3.5 16.7 3.5 10.3 3.5 5.5 9 2.5 16 2.5z" fill="${pick}"/>
  <path d="M13.4 20.2V10.6l7.2-1.6v8.6" fill="none" stroke="${note}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="11.6" cy="20.3" r="2.1" fill="${note}"/>
  <circle cx="18.8" cy="17.7" r="2.1" fill="${note}"/>`;

// The app's blue, as a field, with the mark in white on it: the way the top bar shows it over a
// page's blue first screen.
const BLUE = '#1f3dff';
const shadow = `<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000" flood-opacity="0.18"/></filter></defs>`;

// A Mac app icon: a rounded square inside the standard 1024 grid, with room for its shadow.
const macIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${shadow}
  <rect x="100" y="100" width="824" height="824" rx="185" fill="${BLUE}" filter="url(#shadow)"/>
  <g transform="translate(512 518) scale(17.5) translate(-16 -16)">${mark('#ffffff', BLUE)}</g>
</svg>`;

// Safari rounds the corners of a touch icon itself, so it fills the square.
const touchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${BLUE}"/>
  <g transform="translate(90 91) scale(3.7) translate(-16 -16)">${mark('#ffffff', BLUE)}</g>
</svg>`;

// In a browser tab the mark stands on its own: a blue pick with a white note.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${mark(BLUE, '#ffffff')}
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
