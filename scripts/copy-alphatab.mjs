// Copies alphaTab's browser build, Bravura font and SoundFont from node_modules into
// public/vendor/alphatab/<version>/, so the browser loads them as static, long-cached files. The
// version is the one pinned in package.json, and the copy is regenerated on every install (it is
// not committed). src/generated/alphatab.json tells the app where the files are.
//
// The score is drawn in Petaluma, Steinberg's handwritten music font after the Real Book. It is
// copied beside alphaTab with its licence and the SMuFL metrics alphaTab reads (anchors and
// bounding boxes; the alternates, ligatures and optional glyphs are left out).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
let pkgDir;
try {
  // package.json is not in alphaTab's exports map, so resolve the main entry (dist/alphaTab.js).
  pkgDir = dirname(dirname(require.resolve('@coderline/alphatab')));
} catch {
  console.warn('copy-alphatab: @coderline/alphatab is not installed yet, skipping');
  process.exit(0);
}
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const dist = join(pkgDir, 'dist');
const vendor = join(root, 'public', 'vendor', 'alphatab');
const out = join(vendor, version);

rmSync(vendor, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// The ES module build loads its worker and audio worklet from files next to itself. The
// published entry points import the unminified core, so the copies are re-pointed at the
// minified core (the same code, half the download).
const MIN = {
  'alphaTab.core.mjs': 'alphaTab.core.min.mjs',
  'alphaTab.worker.mjs': 'alphaTab.worker.min.mjs',
  'alphaTab.worklet.mjs': 'alphaTab.worklet.min.mjs',
};
cpSync(join(dist, 'alphaTab.core.min.mjs'), join(out, 'alphaTab.core.min.mjs'));
for (const f of ['alphaTab.min.mjs', 'alphaTab.worker.min.mjs', 'alphaTab.worklet.min.mjs']) {
  let code = readFileSync(join(dist, f), 'utf8');
  for (const [from, to] of Object.entries(MIN)) code = code.replaceAll(`./${from}`, `./${to}`);
  writeFileSync(join(out, f), code);
}
mkdirSync(join(out, 'font'));
for (const f of ['Bravura.woff2', 'Bravura.woff', 'Bravura.otf', 'Bravura-OFL.txt']) cpSync(join(dist, 'font', f), join(out, 'font', f));
mkdirSync(join(out, 'soundfont'));
for (const f of ['sonivox.sf3', 'sonivox.sf2', 'LICENSE', 'README.md']) cpSync(join(dist, 'soundfont', f), join(out, 'soundfont', f));
cpSync(join(pkgDir, 'LICENSE'), join(out, 'LICENSE'));

const petalumaDir = dirname(require.resolve('@vexflow-fonts/petaluma/metadata.json'));
const petaluma = JSON.parse(readFileSync(join(petalumaDir, 'package.json'), 'utf8')).version;
const musicFont = `petaluma-${petaluma}`;
mkdirSync(join(out, musicFont));
for (const f of ['petaluma.woff2', 'LICENSE.txt']) cpSync(join(petalumaDir, f), join(out, musicFont, f));
const smufl = JSON.parse(readFileSync(join(petalumaDir, 'metadata.json'), 'utf8'));
const optional = new Set(Object.keys(smufl.optionalGlyphs ?? {}));
const ANCHORS = ['stemDownNW', 'stemDownSW', 'stemUpSE', 'stemUpNW', 'repeatOffset'];
const glyphsWithAnchors = {};
for (const [name, anchors] of Object.entries(smufl.glyphsWithAnchors)) {
  const kept = Object.fromEntries(ANCHORS.filter((a) => anchors[a]).map((a) => [a, anchors[a]]));
  if (!optional.has(name) && Object.keys(kept).length) glyphsWithAnchors[name] = kept;
}
const glyphBBoxes = {};
for (const [name, { bBoxNE, bBoxSW }] of Object.entries(smufl.glyphBBoxes)) if (!optional.has(name)) glyphBBoxes[name] = { bBoxNE, bBoxSW };
const metrics = { fontName: smufl.fontName, fontVersion: smufl.fontVersion, engravingDefaults: smufl.engravingDefaults, glyphsWithAnchors, glyphBBoxes };
writeFileSync(join(out, musicFont, 'metadata.json'), JSON.stringify(metrics));

mkdirSync(join(root, 'src', 'generated'), { recursive: true });
writeFileSync(
  join(root, 'src', 'generated', 'alphatab.json'),
  JSON.stringify({ version, base: `/vendor/alphatab/${version}/`, musicFont: `/vendor/alphatab/${version}/${musicFont}/` }, null, 2) + '\n',
);
console.log(`copy-alphatab: alphaTab ${version} and Petaluma ${petaluma} copied to public/vendor/alphatab/${version}`);
