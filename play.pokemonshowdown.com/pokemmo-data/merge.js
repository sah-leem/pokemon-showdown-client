#!/usr/bin/env node
/**
 * Merge pokemmo mod overlays (.ts) onto the client's base data (.js)
 * Outputs three standalone .js files the dex can load directly.
 */
const fs = require('fs');
const path = require('path');

const CLIENT_DATA = '/var/lib/pokemon-showdown-client/play.pokemonshowdown.com/data';
const OVERLAY_DIR = '/var/lib/pokemon-showdown-client/play.pokemonshowdown.com/pokemmo-data';

// --- Load base data from client ---
function loadBase(file, globalName) {
  const src = fs.readFileSync(path.join(CLIENT_DATA, file), 'utf8');
  const sandbox = { exports: {} };
  new Function('exports', src)(sandbox.exports);
  return sandbox.exports[globalName];
}

const basePokedex = loadBase('pokedex.js', 'BattlePokedex');
const baseLearnsets = loadBase('learnsets.js', 'BattleLearnsets');
const baseFormats = loadBase('formats-data.js', 'BattleFormatsData');

console.log(`Base loaded: ${Object.keys(basePokedex).length} pokedex, ${Object.keys(baseLearnsets).length} learnsets, ${Object.keys(baseFormats).length} formats`);

// --- Parse overlay .ts files ---
// These are Showdown-style object literals. Strip TS header/footer, eval as JS.
function parseOverlay(file, exportName) {
  let src = fs.readFileSync(path.join(OVERLAY_DIR, file), 'utf8');
  // Remove "export const Foo: Type = " prefix -> leave bare object literal
  src = src.replace(/^export const \w+[^=]*=\s*/m, '');
  // Remove trailing semicolon
  src = src.trim().replace(/;$/, '');
  return eval('(' + src + ')');
}

const overlayPokedex = parseOverlay('pokedex.ts', 'Pokedex');
const overlayLearnsets = parseOverlay('learnsets.ts', 'Learnsets');
const overlayFormats = parseOverlay('formats-data.ts', 'FormatsData');

console.log(`Overlay loaded: ${Object.keys(overlayPokedex).length} pokedex, ${Object.keys(overlayLearnsets).length} learnsets, ${Object.keys(overlayFormats).length} formats`);

// --- Merge overlay onto base ---
// Pokedex: shallow merge per-entry (overlay keys win, but keep base fields not overridden)
const mergedPokedex = { ...basePokedex };
for (const id in overlayPokedex) {
  const overlay = { ...overlayPokedex[id] };
  delete overlay.inherit; // strip mod-only flag
  mergedPokedex[id] = { ...(basePokedex[id] || {}), ...overlay };
}

// Learnsets: REPLACE wholesale for any pokemon in overlay (your mod has full learnsets)
const mergedLearnsets = { ...baseLearnsets };
for (const id in overlayLearnsets) {
  const overlay = { ...overlayLearnsets[id] };
  delete overlay.inherit;
  mergedLearnsets[id] = overlay;
}

// Formats-data: shallow merge per-entry
const mergedFormats = { ...baseFormats };
for (const id in overlayFormats) {
  const overlay = { ...overlayFormats[id] };
  delete overlay.inherit;
  mergedFormats[id] = { ...(baseFormats[id] || {}), ...overlay };
}

// --- Write output files in same format as client's data/*.js ---
function write(file, globalName, obj) {
  const out = `exports.${globalName} = ${JSON.stringify(obj)};\n`;
  fs.writeFileSync(path.join(OVERLAY_DIR, file), out);
  console.log(`Wrote ${file} (${Object.keys(obj).length} entries, ${out.length} bytes)`);
}

write('pokedex.js', 'BattlePokedex', mergedPokedex);
write('learnsets.js', 'BattleLearnsets', mergedLearnsets);
write('formats-data.js', 'BattleFormatsData', mergedFormats);

console.log('Done.');
