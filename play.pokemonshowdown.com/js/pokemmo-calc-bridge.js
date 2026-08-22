/**
 * pokemmo-calc-bridge.js
 * Bridge between Pokemon Showdown battle state and PokeMMO calc engine.
 * Reads battle.myPokemon[], battle.sides[], battle field state,
 * and converts everything into the format the calc engine expects.
 */
(function (exports) {
	'use strict';

	var CalcBridge = {};

	// -------------------------------------------------------
	// Helpers
	// -------------------------------------------------------

	function toID(str) {
		return ('' + str).toLowerCase().replace(/[^a-z0-9]+/g, '');
	}

	function clamp(n, lo, hi) {
		return Math.max(lo, Math.min(hi, n));
	}

	/**
	 * Detect which player key (p1 / p2) belongs to the local user.
	 * Checks myPokemon ident prefix first, then falls back to room.side.
	 */
	function detectPlayerKey(battle) {
		if (battle.myPokemon && battle.myPokemon.length) {
			var ident = battle.myPokemon[0].ident || '';
			if (ident.startsWith('p1')) return 'p1';
			if (ident.startsWith('p2')) return 'p2';
		}
		if (battle.mySide) return battle.mySide.sideid || 'p1';
		return 'p1';
	}

	/**
	 * Parse a condition string like "248/354" or "0 fnt" into {hp, maxhp}.
	 */
	function parseCondition(cond) {
		if (!cond) return {hp: 0, maxhp: 100};
		var parts = cond.split(' ')[0].split('/');
		if (parts.length === 2) {
			return {hp: parseInt(parts[0], 10), maxhp: parseInt(parts[1], 10)};
		}
		return {hp: 0, maxhp: 100};
	}

	/**
	 * Guess a nature from the server stats object.
	 * Compares actual stats to what they would be at neutral nature.
	 * Falls back to 'Serious' (neutral) if ambiguous.
	 */
	function guessNature(species, stats, level) {
		// For now, return a neutral nature.
		// TODO: compare stats to base stats to infer nature
		return 'Serious';
	}

	/**
	 * Convert a PS species string to a clean name.
	 * Handles forme suffixes like "Rotom-Wash".
	 */
	function cleanSpecies(details) {
		if (!details) return '';
		// details format: "Garchomp, L50, M" or "Rotom-Wash, L50"
		return details.split(',')[0].trim();
	}

	// -------------------------------------------------------
	// Extract your team's Pokemon (full data from server)
	// -------------------------------------------------------

	/**
	 * Convert a ServerPokemon (myPokemon entry) to a calc-ready object.
	 * ServerPokemon has full stats, moves, ability, item.
	 */
	CalcBridge.extractPlayerPokemon = function (serverPoke, battle) {
		var species = cleanSpecies(serverPoke.details);
		var cond = parseCondition(serverPoke.condition);
		var level = 50; // PokeMMO level cap

		// Parse level from details if present
		var detailParts = (serverPoke.details || '').split(', ');
		for (var i = 0; i < detailParts.length; i++) {
			if (detailParts[i].charAt(0) === 'L') {
				level = parseInt(detailParts[i].slice(1), 10) || 50;
			}
		}

		// Find the active battle Pokemon for boosts/volatiles
		var activePoke = null;
		if (serverPoke.active && battle) {
			var playerKey = detectPlayerKey(battle);
			var side = battle[playerKey];
			if (side && side.active && side.active[0]) {
				activePoke = side.active[0];
			}
		}

		return {
			name: species,
			species: species,
			level: level,
			hp: cond.hp,
			maxhp: cond.maxhp,
			hpPercent: cond.maxhp > 0 ? Math.round(cond.hp / cond.maxhp * 100) : 0,
			status: serverPoke.condition.includes('fnt') ? 'fnt' :
				(serverPoke.condition.split(' ')[1] || ''),
			active: !!serverPoke.active,
			ability: serverPoke.ability || serverPoke.baseAbility || '',
			item: serverPoke.item || '',
			stats: serverPoke.stats || {},
			moves: (serverPoke.moves || []).slice(),
			boosts: activePoke ? Object.assign({}, activePoke.boosts) : {},
			volatiles: activePoke ? Object.keys(activePoke.volatiles || {}) : [],
			gender: serverPoke.details.includes(', M') ? 'M' :
				serverPoke.details.includes(', F') ? 'F' : 'N',
		};
	};

	/**
	 * Get all player Pokemon as calc-ready objects.
	 */
	CalcBridge.getPlayerTeam = function (battle) {
		if (!battle || !battle.myPokemon) return [];
		var team = [];
		for (var i = 0; i < battle.myPokemon.length; i++) {
			team.push(CalcBridge.extractPlayerPokemon(battle.myPokemon[i], battle));
		}
		return team;
	};

	// -------------------------------------------------------
	// Extract opponent Pokemon (limited revealed data)
	// -------------------------------------------------------

	/**
	 * Convert a client-side Pokemon (opponent's) to a calc-ready object.
	 * We only know what's been revealed during battle.
	 */
	CalcBridge.extractOpponentPokemon = function (pokemon) {
		if (!pokemon) return null;

		var species = pokemon.speciesForme || pokemon.name || '';
		var knownMoves = [];

		// moveTrack stores moves the opponent has used: [[moveName, timesUsed], ...]
		if (pokemon.moveTrack) {
			for (var i = 0; i < pokemon.moveTrack.length; i++) {
				knownMoves.push(pokemon.moveTrack[i][0]);
			}
		}

		return {
			name: species,
			species: species,
			level: pokemon.level || 50,
			hp: pokemon.hp || 0,
			maxhp: pokemon.maxhp || 100,
			hpPercent: pokemon.maxhp > 0 ? Math.round(pokemon.hp / pokemon.maxhp * 100) : 0,
			status: pokemon.status || '',
			active: !pokemon.fainted && pokemon.hp > 0,
			ability: pokemon.ability || '',
			baseAbility: pokemon.baseAbility || '',
			item: pokemon.item || '',
			stats: {}, // Unknown - calc will use base stats + assumed spread
			moves: knownMoves,
			boosts: pokemon.boosts ? Object.assign({}, pokemon.boosts) : {},
			volatiles: pokemon.volatiles ? Object.keys(pokemon.volatiles) : [],
			gender: pokemon.gender || 'N',
			// Flags for the panel
			abilityRevealed: !!pokemon.ability,
			itemRevealed: !!pokemon.item,
			fainted: pokemon.fainted || pokemon.hp <= 0,
		};
	};

	/**
	 * Get all opponent Pokemon as calc-ready objects.
	 */
	CalcBridge.getOpponentTeam = function (battle) {
		if (!battle) return [];
		var playerKey = detectPlayerKey(battle);
		var oppKey = playerKey === 'p1' ? 'p2' : 'p1';
		var oppSide = battle[oppKey];
		if (!oppSide || !oppSide.pokemon) return [];

		var team = [];
		for (var i = 0; i < oppSide.pokemon.length; i++) {
			var poke = CalcBridge.extractOpponentPokemon(oppSide.pokemon[i]);
			if (poke) team.push(poke);
		}
		return team;
	};

	// -------------------------------------------------------
	// Extract field conditions
	// -------------------------------------------------------

	CalcBridge.extractField = function (battle) {
		if (!battle) return {};

		var playerKey = detectPlayerKey(battle);
		var oppKey = playerKey === 'p1' ? 'p2' : 'p1';
		var playerSide = battle[playerKey];
		var oppSide = battle[oppKey];

		// Side conditions (Reflect, Light Screen, Spikes, etc.)
		function getSideConditions(side) {
			if (!side || !side.sideConditions) return {};
			var conds = {};
			for (var key in side.sideConditions) {
				var cond = side.sideConditions[key];
				conds[key] = {
					active: true,
					layers: cond[1] || 1, // Spikes/Toxic Spikes layers
				};
			}
			return conds;
		}

		return {
			weather: battle.weather || '',
			weatherTurns: battle.weatherTimeLeft || 0,
			terrain: battle.terrain || '',
			terrainTurns: battle.terrainTimeLeft || 0,
			pseudoWeather: battle.pseudoWeather ? Object.keys(battle.pseudoWeather) : [],
			attackerSide: getSideConditions(playerSide),
			defenderSide: getSideConditions(oppSide),
		};
	};

	// -------------------------------------------------------
	// Assumed spreads for opponent Pokemon
	// -------------------------------------------------------

	/**
	 * Default EV spreads to assume for unknown opponents.
	 * In the future, this will pull from usage stats.
	 */
	CalcBridge.defaultSpread = {
		nature: 'Serious',
		evs: {hp: 252, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
		ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
	};

	/**
	 * Get assumed spread for an opponent Pokemon.
	 * TODO: Pull from usage stats data at /opt/usage-stats/
	 */
	CalcBridge.getAssumedSpread = function (species, format) {
		// Placeholder - returns a generic defensive spread
		// Will be replaced with usage stats lookup
		return Object.assign({}, CalcBridge.defaultSpread);
	};

	// -------------------------------------------------------
	// Build calc engine input objects
	// -------------------------------------------------------

	/**
	 * Build a calc-engine Pokemon object from bridge data.
	 * This is what gets passed to calculate().
	 */
	CalcBridge.buildCalcPokemon = function (pokeData, options) {
		options = options || {};
		var gen = options.gen || 5;
		var Calc = exports.PokeMMOCalc;
		if (!Calc) return null;

		var Gen = Calc.Generations.get(gen);
		var config = {
			name: pokeData.species,
			level: pokeData.level || 50,
			ability: pokeData.ability || undefined,
			item: pokeData.item || undefined,
			status: pokeData.status || undefined,
			curHP: pokeData.hp,
			boosts: pokeData.boosts || {},
		};

		// If we have exact stats (player Pokemon), use them
		if (pokeData.stats && Object.keys(pokeData.stats).length > 0) {
			// The server gives us computed stats - we can back-calculate EVs
			// For now, pass nature + EVs if known
			config.nature = options.nature || 'Serious';
			config.evs = options.evs || {hp: 252, atk: 252, def: 0, spa: 252, spd: 0, spe: 252};
			config.ivs = options.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
		} else {
			// Opponent - use assumed spread
			var spread = CalcBridge.getAssumedSpread(pokeData.species);
			config.nature = spread.nature;
			config.evs = spread.evs;
			config.ivs = spread.ivs;
		}

		return new Calc.Pokemon(Gen, pokeData.species, config);
	};

	/**
	 * Build a calc-engine Field object.
	 */
	CalcBridge.buildCalcField = function (fieldData, options) {
		var Calc = exports.PokeMMOCalc;
		if (!Calc) return null;

		return new Calc.Field({
			weather: fieldData.weather || undefined,
			terrain: fieldData.terrain || undefined,
			attackerSide: {
				isReflect: !!(fieldData.attackerSide && fieldData.attackerSide.reflect),
				isLightScreen: !!(fieldData.attackerSide && fieldData.attackerSide.lightscreen),
				spikes: fieldData.attackerSide && fieldData.attackerSide.spikes
					? fieldData.attackerSide.spikes.layers : 0,
				isStealthRock: !!(fieldData.attackerSide && fieldData.attackerSide.stealthrock),
				isToxicSpikes: fieldData.attackerSide && fieldData.attackerSide.toxicspikes
					? fieldData.attackerSide.toxicspikes.layers : 0,
				isTailwind: !!(fieldData.attackerSide && fieldData.attackerSide.tailwind),
			},
			defenderSide: {
				isReflect: !!(fieldData.defenderSide && fieldData.defenderSide.reflect),
				isLightScreen: !!(fieldData.defenderSide && fieldData.defenderSide.lightscreen),
				spikes: fieldData.defenderSide && fieldData.defenderSide.spikes
					? fieldData.defenderSide.spikes.layers : 0,
				isStealthRock: !!(fieldData.defenderSide && fieldData.defenderSide.stealthrock),
				isToxicSpikes: fieldData.defenderSide && fieldData.defenderSide.toxicspikes
					? fieldData.defenderSide.toxicspikes.layers : 0,
				isTailwind: !!(fieldData.defenderSide && fieldData.defenderSide.tailwind),
			},
		});
	};

	/**
	 * Build a calc-engine Move object.
	 */
	CalcBridge.buildCalcMove = function (moveName, options) {
		var Calc = exports.PokeMMOCalc;
		if (!Calc) return null;

		var gen = options && options.gen || 5;
		var Gen = Calc.Generations.get(gen);
		return new Calc.Move(Gen, moveName);
	};

	// -------------------------------------------------------
	// Run damage calculations
	// -------------------------------------------------------

	/**
	 * Calculate damage for all of attacker's moves against defender.
	 * Returns an array of {move, result, minPercent, maxPercent, nhko} objects.
	 */
	CalcBridge.calcMatchup = function (attackerData, defenderData, fieldData) {
		var Calc = exports.PokeMMOCalc;
		if (!Calc) return [];

		var gen = 5;
		var Gen = Calc.Generations.get(gen);
		var attacker = CalcBridge.buildCalcPokemon(attackerData);
		var defender = CalcBridge.buildCalcPokemon(defenderData);
		var field = CalcBridge.buildCalcField(fieldData || {});

		if (!attacker || !defender || !field) return [];

		var results = [];
		var moves = attackerData.moves || [];

		for (var i = 0; i < moves.length; i++) {
			var moveName = moves[i];
			try {
				var move = new Calc.Move(Gen, moveName);
				var result = Calc.calculate(Gen, attacker, defender, move, field);

				var range = result.range();
				var defHP = defender.maxHP();
				var minPct = defHP > 0 ? (range[0] / defHP * 100) : 0;
				var maxPct = defHP > 0 ? (range[1] / defHP * 100) : 0;

				// Determine NHKO
				var nhko = 0;
				if (maxPct >= 100) nhko = 1;
				else if (minPct > 0) nhko = Math.ceil(100 / minPct);

				results.push({
					move: moveName,
					result: result,
					minDmg: range[0],
					maxDmg: range[1],
					minPercent: Math.round(minPct * 10) / 10,
					maxPercent: Math.round(maxPct * 10) / 10,
					nhko: nhko,
					desc: result.desc(),
				});
			} catch (e) {
				// Move not found or calc error - skip gracefully
				results.push({
					move: moveName,
					result: null,
					minDmg: 0, maxDmg: 0,
					minPercent: 0, maxPercent: 0,
					nhko: 0,
					desc: '',
					error: e.message,
				});
			}
		}

		return results;
	};

	// -------------------------------------------------------
	// Full matchup: your active vs opponent active
	// -------------------------------------------------------

	/**
	 * Get the complete calc state for the current battle turn.
	 * Returns {player, opponent, playerMoves, opponentMoves, field}.
	 */
	CalcBridge.getMatchup = function (battle) {
		if (!battle) return null;

		var playerTeam = CalcBridge.getPlayerTeam(battle);
		var opponentTeam = CalcBridge.getOpponentTeam(battle);
		var field = CalcBridge.extractField(battle);

		// Find active Pokemon
		var playerActive = null;
		for (var i = 0; i < playerTeam.length; i++) {
			if (playerTeam[i].active) { playerActive = playerTeam[i]; break; }
		}

		var opponentActive = null;
		// Use PS's active array to find the actual active opponent
		var oppKey2 = detectPlayerKey(battle) === 'p1' ? 'p2' : 'p1';
		var oppSide2 = battle[oppKey2];
		if (oppSide2 && oppSide2.active && oppSide2.active[0] && !oppSide2.active[0].fainted) {
			opponentActive = CalcBridge.extractOpponentPokemon(oppSide2.active[0]);
		} else {
			// Fallback: first non-fainted in team list
			for (var j = 0; j < opponentTeam.length; j++) {
				var opp = opponentTeam[j];
				if (!opp.fainted && opp.hpPercent > 0) {
					opponentActive = opp;
					break;
				}
			}
		}

		if (!playerActive || !opponentActive) return null;

		// Calculate both directions
		var playerMoves = CalcBridge.calcMatchup(playerActive, opponentActive, field);

		// Reverse field sides for opponent calcs
		var reverseField = Object.assign({}, field);
		reverseField.attackerSide = field.defenderSide;
		reverseField.defenderSide = field.attackerSide;
		var opponentMoves = CalcBridge.calcMatchup(opponentActive, playerActive, reverseField);

		return {
			player: playerActive,
			opponent: opponentActive,
			playerTeam: playerTeam,
			opponentTeam: opponentTeam,
			playerMoves: playerMoves,
			opponentMoves: opponentMoves,
			field: field,
		};
	};

	// -------------------------------------------------------
	// Room lifecycle hooks
	// -------------------------------------------------------

	var hookedRooms = {};
	var onMatchupUpdate = null;

	/**
	 * Register a callback for matchup updates.
	 */
	CalcBridge.onUpdate = function (callback) {
		onMatchupUpdate = callback;
	};

	/**
	 * Hook into a battle room to track state changes.
	 */
	CalcBridge.hookRoom = function (room) {
		if (!room || !room.battle || hookedRooms[room.id]) return;
		hookedRooms[room.id] = true;
		console.log('[PokeMMO Calc] Hooked room:', room.id);

		var battle = room.battle;

		// Patch battle.scene.log to detect state changes
		var origReceive = room.receive;
		room.receive = function (data) {
			origReceive.call(this, data);
			// Debounce updates - fire after a batch of messages
			clearTimeout(room._calcUpdateTimer);
			room._calcUpdateTimer = setTimeout(function () {
				if (onMatchupUpdate) {
					var matchup = CalcBridge.getMatchup(battle);
					if (matchup) {
						console.log('[PokeMMO Calc] Matchup:', matchup.player.species, 'vs', matchup.opponent.species);
						onMatchupUpdate(room.id, matchup);
					}
				}
			}, 100);
		};
	};

	/**
	 * Unhook from a battle room.
	 */
	CalcBridge.unhookRoom = function (roomid) {
		delete hookedRooms[roomid];
	};

	/**
	 * Initialize the bridge - watch for new battle rooms.
	 */
	CalcBridge.init = function () {
		if (!window.app) return;

		// Watch for room changes
		var origJoin = app.joinRoom;
		app.joinRoom = function (roomid, type) {
			var result = origJoin.apply(this, arguments);
			// Defer so the room is fully initialized
			setTimeout(function () {
				var room = app.rooms[roomid];
				if (room && room.battle) {
					CalcBridge.hookRoom(room);
				}
			}, 500);
			return result;
		};

		// Hook any existing battle rooms
		for (var roomid in app.rooms) {
			var room = app.rooms[roomid];
			if (room && room.battle) {
				CalcBridge.hookRoom(room);
			}
		}
	};

	/**
	 * Scan app.rooms for unhooked battle rooms.
	 * Called by init poller to catch server-created rooms.
	 */
	CalcBridge.scanForRooms = function () {
		if (!window.app || !app.rooms) return;
		for (var roomid in app.rooms) {
			var room = app.rooms[roomid];
			if (room && room.battle && !hookedRooms[roomid]) {
				CalcBridge.hookRoom(room);
			}
		}
	};

	exports.CalcBridge = CalcBridge;
})(window);
