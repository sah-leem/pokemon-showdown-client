#!/usr/bin/env node
/**
 * Build pokemmo dex data from raw compiled data files (not Dex.mod instances).
 * This cascades gen9 base → gen5 overlay → pokemmo overlay manually.
 */
const fs = require('fs');
const path = require('path');

const PS = '/var/lib/pokemon-showdown/pokemon-showdown';
const OUT = '/var/lib/pokemon-showdown-client/play.pokemonshowdown.com/pokemmo-data';

function loadDataFile(relPath, exportKey) {
  const full = path.join(PS, relPath);
  try {
    delete require.cache[require.resolve(full)];
    const mod = require(full);
    return mod[exportKey] || {};
  } catch (e) {
    console.log(`  (skip ${relPath}: ${e.message.split('\n')[0]})`);
    return {};
  }
}

// Base (full modern)
const basePokedex = loadDataFile('dist/data/pokedex.js', 'Pokedex');
const baseLearnsets = loadDataFile('dist/data/learnsets.js', 'Learnsets');
const baseFormatsData = loadDataFile('dist/data/formats-data.js', 'FormatsData');
const baseMoves = loadDataFile('dist/data/moves.js', 'Moves');
const baseAbilities = loadDataFile('dist/data/abilities.js', 'Abilities');
const baseItems = loadDataFile('dist/data/items.js', 'Items');
const baseTypeChart = loadDataFile('dist/data/typechart.js', 'TypeChart');

// Gen 5 overlay
const gen5Pokedex = loadDataFile('dist/data/mods/gen5/pokedex.js', 'Pokedex') || {};
const gen5FormatsData = loadDataFile('dist/data/mods/gen5/formats-data.js', 'FormatsData') || {};
const gen5TypeChart = loadDataFile('dist/data/mods/gen5/typechart.js', 'TypeChart') || {};

// Pokemmo overlay
const pokemmoPokedex = loadDataFile('dist/data/mods/pokemmo/pokedex.js', 'Pokedex') || {};
const pokemmoLearnsets = loadDataFile('dist/data/mods/pokemmo/learnsets.js', 'Learnsets') || {};
const pokemmoFormatsData = loadDataFile('dist/data/mods/pokemmo/formats-data.js', 'FormatsData') || {};
const pokemmoMoves = loadDataFile('dist/data/mods/pokemmo/moves.js', 'Moves') || {};
const pokemmoAbilities = loadDataFile('dist/data/mods/pokemmo/abilities.js', 'Abilities') || {};
const pokemmoTypeChart = loadDataFile('dist/data/mods/pokemmo/typechart.js', 'TypeChart') || {};
const pokemmoItems = loadDataFile('dist/data/mods/pokemmo/items.js', 'Items') || {};

console.log(`Loaded base: ${Object.keys(basePokedex).length} pokedex`);
console.log(`Loaded gen5: ${Object.keys(gen5Pokedex).length} overrides`);
console.log(`Loaded pokemmo: ${Object.keys(pokemmoPokedex).length} overrides`);

// Apply cascading overlays to a plain-object data table
function cascade(base, ...overlays) {
  const out = {};
  for (const id in base) out[id] = { ...base[id] };
  for (const overlay of overlays) {
    for (const id in overlay) {
      const entry = { ...overlay[id] };
      delete entry.inherit;
      if (out[id]) {
        out[id] = { ...out[id], ...entry };
      } else {
        out[id] = entry;
      }
    }
  }
  return out;
}

const mergedPokedex = cascade(basePokedex, gen5Pokedex, pokemmoPokedex);
const mergedFormatsData = cascade(baseFormatsData, gen5FormatsData, pokemmoFormatsData);
const mergedMoves = cascade(baseMoves, pokemmoMoves);
const mergedAbilities = cascade(baseAbilities, pokemmoAbilities);
const mergedTypeChart = cascade(baseTypeChart, gen5TypeChart, pokemmoTypeChart);

// Learnsets: pokemmo overlay is complete-replacement, not merge
const mergedLearnsets = { ...baseLearnsets, ...pokemmoLearnsets };

// --- Filter to gen 1-5 + remove junk forms ---
// Bad forme names (Species.forme field) — non-gen1-5 or non-pokemmo variants.
// Checked against the forme attribute of each Species entry, not against the id itself.
const BAD_FORMES = new Set([
  'Mega', 'Mega-X', 'Mega-Y', 'Mega-Z',
  'Gmax', 'Eternamax', 'Primal',
  'Alola', 'Galar', 'Hisui', 'Paldea', 'Paldea-Combat', 'Paldea-Blaze', 'Paldea-Aqua',
  'Galar-Zen',
  'Crowned', 'Unbound', 'Ash', 'Bloodmoon',
  'Starter', 'Totem', 'School', 'Busted',
  'Gulping', 'Gorging', 'Noice', 'Hangry', 'Dada',
  'Rapid-Strike', 'Single-Strike', 'Rapid-Strike-Gmax', 'Single-Strike-Gmax',
  'Stellar', 'Tera', 'Original',
  'Ten-Percent', 'Complete', 'Fifty-Percent',
  'Blade',
]);

// Exact ID blacklist for forms that don't fit a clean pattern
const BAD_IDS = new Set([
  // Cosplay Pikachu
  'pikachucosplay', 'pikachurockstar', 'pikachubelle', 'pikachupopstar',
  'pikachuphd', 'pikachulibre',
  // Cap Pikachu (event formes)
  'pikachuoriginal', 'pikachuhoenn', 'pikachusinnoh', 'pikachuunova',
  'pikachukalos', 'pikachualola', 'pikachupartner', 'pikachuworld',
  // Spiky-eared Pichu (event)
  'pichuspikyeared',
  // Origin formes (banned in pokemmo legendary formats)
  'dialgaorigin', 'palkiaorigin', 'giratinaorigin',
  // Totem Pokemon (gen 7, all)
  'raticatealolatotem', 'marowakalolatotem',
  'mimikyutotem', 'mimikyubustedtotem',
  'kommoototem', 'lurantistotem', 'salazzletotem',
  'togedemarutotem', 'araquanidtotem', 'ribombeetotem',
  'vikavolttotem',
]);

function isBadForm(id, species) {
  if (id.startsWith('pokestar')) return true;
  if (id === 'missingno') return true;
  if (BAD_IDS.has(id)) return true;
  if (species && species.forme) {
    if (BAD_FORMES.has(species.forme)) return true;
    // Catch compound formes that contain a bad keyword
    const f = species.forme;
    if (f.includes('Totem') || f.includes('Cosplay') || f.includes('Cap') ||
        f.includes('Cosplay')) return true;
    // Alola/Galar/Hisui compound (e.g. "Alola-Totem")
    if (f.includes('Alola') || f.includes('Galar') || f.includes('Hisui') || f.includes('Paldea')) return true;
  }
  return false;
}

const pokedex = {};
const learnsets = {};
const formatsData = {};

for (const id in mergedPokedex) {
  const s = mergedPokedex[id];
  if (typeof s.num !== 'number' || s.num < 1 || s.num > 649) continue;
  if (isBadForm(id, s)) continue;
  if (s.isNonstandard && s.isNonstandard !== 'Past') continue;
  pokedex[id] = s;
  if (mergedLearnsets[id]) learnsets[id] = mergedLearnsets[id];
  const fd = mergedFormatsData[id] || {};
  formatsData[id] = fd;
  // Inline tier into pokedex for code that reads template.tier
  if (fd.tier) pokedex[id].tier = fd.tier;
}

// Strip cross-gen references from evos/otherFormes/formeOrder/prevo
// so the dex doesn't try to render gen 6+ entries we filtered out.
function toId(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, ''); }
for (const id in pokedex) {
  const s = pokedex[id];
  if (Array.isArray(s.evos)) {
    s.evos = s.evos.filter(n => pokedex[toId(n)]);
    if (!s.evos.length) delete s.evos;
  }
  if (Array.isArray(s.otherFormes)) {
    s.otherFormes = s.otherFormes.filter(n => pokedex[toId(n)]);
    if (!s.otherFormes.length) delete s.otherFormes;
  }
  if (Array.isArray(s.formeOrder)) {
    s.formeOrder = s.formeOrder.filter(n => pokedex[toId(n)]);
    if (!s.formeOrder.length) delete s.formeOrder;
  }
  if (s.prevo && !pokedex[toId(s.prevo)]) delete s.prevo;
}

const moves = {};
for (const id in mergedMoves) {
  const m = mergedMoves[id];
  if (m.gen && m.gen > 5) continue;
  if (m.isNonstandard && m.isNonstandard !== 'Past') continue;
  moves[id] = m;
}
const abilities = {};
for (const id in mergedAbilities) {
  const a = mergedAbilities[id];
  if (a.gen && a.gen > 5) continue;
  if (a.isNonstandard && a.isNonstandard !== 'Past') continue;
  abilities[id] = a;
}
const mergedItems = cascade(baseItems, pokemmoItems);
const items = {};
for (const id in mergedItems) {
  const it = mergedItems[id];
  if (it.gen && it.gen > 5) continue;
  if (it.isNonstandard && it.isNonstandard !== 'Past') continue;
  items[id] = it;
}


// PokeMMO item display name overrides
const itemRenames = {
  assaultvest: "Assault Gear",
  clearamulet: "Pure Amulet",
  covertcloak: "Covert Mantle",
  weaknesspolicy: "Type Policy",
  heavydutyboots: "Reinforced Boots",
  luminousmoss: "Glowing Moss",
};
for (const id in itemRenames) {
  if (items[id]) items[id] = { ...items[id], name: itemRenames[id] };
}

// --- Search index ---
const searchIndex = [];
for (const id in pokedex) searchIndex.push([id, 'pokemon']);
for (const id in moves) searchIndex.push([id, 'move']);
for (const id in abilities) searchIndex.push([id, 'ability']);
for (const id in items) searchIndex.push([id, 'item']);
for (const id in mergedTypeChart) searchIndex.push([id.toLowerCase(), 'type']);
searchIndex.sort((a, b) => a[0].localeCompare(b[0]));
const searchIndexOffset = searchIndex.map(() => '');

// --- Teambuilder table by pokemmo tier ---
const tierBuckets = { 'Uber': [], 'OU': [], 'UU': [], 'NU': [], 'UT': [], 'Illegal': [] };
const sortedIds = Object.keys(pokedex).sort((a, b) => pokedex[a].num - pokedex[b].num);
for (const id of sortedIds) {
  const t = (formatsData[id] && formatsData[id].tier) || 'UT';
  const bucket = tierBuckets[t] ? t : 'UT';
  tierBuckets[bucket].push(id);
}
const tierOrder = ['Uber', 'OU', 'UU', 'NU', 'UT', 'Illegal'];
const tiersArray = [];
for (const t of tierOrder) {
  if (!tierBuckets[t].length) continue;
  tiersArray.push(['header', t]);
  for (const id of tierBuckets[t]) tiersArray.push(id);
}
// Empty stubs for battle-dex.js's gen cascade (lines 1088-1097).
// Our BattlePokedex already has final pokemmo data, so these are all no-ops.
const emptyModStub = {
  overrideSpeciesData: {},
  overrideLearnsets: {},
  overrideTier: {},
  overrideMoveData: {},
  overrideAbilityData: {},
  overrideItemDesc: {},
  formatSlices: {},
  items: [],
  learnsets: {},
  zuBans: {},
  monotypeBans: {},
  nonstandardMoves: [],
  tiers: [],
};

// Convert pokemmo learnsets to compact teambuilder format
const compactLearnsets = {};
for (const id in learnsets) {
  const entry = learnsets[id];
  if (!entry || !entry.learnset) continue;
  const compact = {};
  for (const move in entry.learnset) {
    const sources = entry.learnset[move];
    const gens = new Set();
    for (const src of sources) {
      gens.add(src.charAt(0));
    }
    compact[move] = [...gens].sort().join('');
  }
  compactLearnsets[id] = compact;
}
const teambuilderTable = {
  tiers: tiersArray,
  formatSlices: {}, items: [], learnsets: {}, overrideTier: {}, zuBans: {}, monotypeBans: {},
  gen1: { ...emptyModStub },
  gen2: { ...emptyModStub },
  gen3: { ...emptyModStub },
  gen4: { ...emptyModStub },
  gen5: { ...emptyModStub },
  gen6: { ...emptyModStub },
  gen7: { ...emptyModStub },
  gen8: { ...emptyModStub },
  gen9: { ...emptyModStub },
  pokemmo: { ...emptyModStub, learnsets: compactLearnsets },
  gen5pokemmo: { ...emptyModStub, tiers: tiersArray },
};

// --- Write ---
function write(file, globalName, obj, jsonParse) {
  const body = jsonParse
    ? `JSON.parse(${JSON.stringify(JSON.stringify(obj))})`
    : JSON.stringify(obj);
  const out = `exports.${globalName} = ${body};\n`;
  fs.writeFileSync(path.join(OUT, file), out);
  const count = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
  console.log(`Wrote ${file}: ${count} entries, ${out.length} bytes`);
}

// rename egg groups to pokemmo names
const eggGroupMap = {
  'Amorphous': 'Chaos', 'Grass': 'Plant', 'Human-Like': 'Humanoid',
  'Undiscovered': 'Cannot Breed', 'Water 1': 'Water A', 'Water 2': 'Water B', 'Water 3': 'Water C'
};
for (const id in pokedex) {
  if (pokedex[id].eggGroups) {
    pokedex[id].eggGroups = pokedex[id].eggGroups.map(g => eggGroupMap[g] || g);
  }
}

// add move descriptions from text data
const movesText = loadDataFile('dist/data/text/moves.js', 'MovesText');
for (const id in moves) {
  const text = movesText[id];
  if (text) {
    moves[id].desc = text.desc || '';
    moves[id].shortDesc = text.shortDesc || '';
  }
}

// add ability descriptions
const abilitiesText = loadDataFile('dist/data/text/abilities.js', 'AbilitiesText');
for (const id in abilities) {
  const text = abilitiesText[id];
  if (text) {
    abilities[id].desc = text.desc || '';
    abilities[id].shortDesc = text.shortDesc || '';
  }
}

// add item descriptions
const itemsText = loadDataFile('dist/data/text/items.js', 'ItemsText');
for (const id in items) {
  const text = itemsText[id];
  if (text) {
    items[id].desc = text.desc || '';
    items[id].shortDesc = text.shortDesc || '';
  }
}

write('pokedex.js', 'BattlePokedex', pokedex);
write('learnsets.js', 'BattleLearnsets', learnsets);
write('formats-data.js', 'BattleFormatsData', formatsData);
write('moves.js', 'BattleMovedex', moves);
write('abilities.js', 'BattleAbilities', abilities);
write('items.js', 'BattleItems', items);
write('typechart.js', 'BattleTypeChart', mergedTypeChart);
write('teambuilder-tables.js', 'BattleTeambuilderTable', teambuilderTable, true);

// search-index.js needs both globals in one file
const siBody = `exports.BattleSearchIndex = ${JSON.stringify(searchIndex)};\nexports.BattleSearchIndexOffset = ${JSON.stringify(searchIndexOffset)};\n`;
fs.writeFileSync(path.join(OUT, 'search-index.js'), siBody);
console.log(`Wrote search-index.js: ${searchIndex.length} entries, ${siBody.length} bytes`);

console.log('\nTier counts:');
for (const t of tierOrder) console.log(`  ${t}: ${tierBuckets[t].length}`);
console.log('Done.');
