/**
 * pokemmo-calc-panel.js
 * Native PS panel for displaying damage calculations during battle.
 * Supports light and dark mode via PS theme detection.
 */
(function (exports) {
	'use strict';

	// -------------------------------------------------------
	// Theme detection
	// -------------------------------------------------------

	function isDarkMode() {
		var style = document.body ? document.body.style : {};
		var bg = style.background || style.backgroundColor || '';
		// PS sets body background; dark themes use dark colors
		// Also check the storage preference
		if (window.Storage && Storage.prefs) {
			var theme = Storage.prefs('theme');
			if (theme === 'dark') return true;
			if (theme === 'light') return false;
		}
		// Fallback: check computed background luminance
		return true; // Default to dark since PS defaults dark
	}

	// -------------------------------------------------------
	// Type colors (standard Pokemon type colors)
	// -------------------------------------------------------

	var TYPE_COLORS = {
		Normal: '#a8a878', Fire: '#f08030', Water: '#6890f0',
		Electric: '#f8d030', Grass: '#78c850', Ice: '#98d8d8',
		Fighting: '#c03028', Poison: '#a040a0', Ground: '#e0c068',
		Flying: '#a890f0', Psychic: '#f85888', Bug: '#a8b820',
		Rock: '#b8a038', Ghost: '#705898', Dragon: '#7038f8',
		Dark: '#705848', Steel: '#b8b8d0',
	};

	function getTypeColor(type) {
		return TYPE_COLORS[type] || '#888';
	}

	// -------------------------------------------------------
	// CSS injection
	// -------------------------------------------------------

	var cssInjected = false;

	function injectCSS() {
		if (cssInjected) return;
		cssInjected = true;

		var css = [
			'.pokemmo-calc-panel {',
			'  font-family: Verdana, Geneva, sans-serif;',
			'  border-radius: 4px;',
			'  overflow: hidden;',
			'  position: absolute;',
			'  right: 0;',
			'  top: 0;',
			'  width: 320px;',
			'  max-height: 100%;',
			'  overflow-y: auto;',
			'  z-index: 100;',
			'  transition: transform 0.2s ease;',
			'}',

			// Dark mode
			'.pokemmo-calc-panel.dark {',
			'  background: #1a1a1a;',
			'  border: 1px solid #111;',
			'  color: #ccc;',
			'}',
			'.dark .pcp-header { background: #141414; border-bottom: 1px solid #0a0a0a; }',
			'.dark .pcp-header span { color: #999; }',
			'.dark .pcp-team-strip { background: #161616; border-bottom: 1px solid #111; }',
			'.dark .pcp-team-icon { background: #222; border: 1px solid #333; color: #888; }',
			'.dark .pcp-team-icon.active { border-color: #4488dd; background: #1a1a28; }',
			'.dark .pcp-section-label { color: #555; }',
			'.dark .pcp-poke-row { background: #1e1e1e; border: 1px solid #2a2a2a; }',
			'.dark .pcp-sprite-box { background: #141414; }',
			'.dark .pcp-poke-name { color: #ccc; }',
			'.dark .pcp-poke-meta { color: #666; }',
			'.dark .pcp-hp-bar-bg { background: #111; }',
			'.dark .pcp-moves-box { background: #1e1e1e; border: 1px solid #2a2a2a; }',
			'.dark .pcp-move-row { border-bottom: 1px solid #161616; }',
			'.dark .pcp-move-name { color: #aaa; }',
			'.dark .pcp-dmg-gray { color: #444; }',
			'.dark .pcp-dmg-yellow { color: #e6a020; }',
			'.dark .pcp-dmg-red { color: #e04040; }',
			'.dark .pcp-nhko-ohko { background: #2a1515; color: #e04040; }',
			'.dark .pcp-nhko-2hko { background: #2a2215; color: #e6a020; }',
			'.dark .pcp-nhko-safe { background: #152a15; color: #4caf50; }',
			'.dark .pcp-field-tag { background: #222; color: #555; border: 1px solid #333; }',
			'.dark .pcp-field-tag.active { color: #4488dd; border-color: #4488dd; background: #1a1a28; }',
			'.dark .pcp-boost-up { background: #152a15; color: #4caf50; }',
			'.dark .pcp-boost-down { background: #2a1515; color: #e04040; }',
			'.dark .pcp-spread-hint { color: #444; }',
			'.dark .pcp-unrevealed { color: #333; }',

			// Light mode
			'.pokemmo-calc-panel.light {',
			'  background: #f0f0f0;',
			'  border: 1px solid #d0d0d0;',
			'  color: #222;',
			'}',
			'.light .pcp-header { background: #e4e4e4; border-bottom: 1px solid #ccc; }',
			'.light .pcp-header span { color: #555; }',
			'.light .pcp-team-strip { background: #e8e8e8; border-bottom: 1px solid #d0d0d0; }',
			'.light .pcp-team-icon { background: #fff; border: 1px solid #ccc; color: #666; }',
			'.light .pcp-team-icon.active { border-color: #4488dd; background: #e8eef8; }',
			'.light .pcp-section-label { color: #888; }',
			'.light .pcp-poke-row { background: #fff; border: 1px solid #ddd; }',
			'.light .pcp-sprite-box { background: #f0f0f0; }',
			'.light .pcp-poke-name { color: #222; }',
			'.light .pcp-poke-meta { color: #888; }',
			'.light .pcp-hp-bar-bg { background: #ddd; }',
			'.light .pcp-moves-box { background: #fff; border: 1px solid #ddd; }',
			'.light .pcp-move-row { border-bottom: 1px solid #eee; }',
			'.light .pcp-move-name { color: #444; }',
			'.light .pcp-dmg-gray { color: #aaa; }',
			'.light .pcp-dmg-yellow { color: #c08010; }',
			'.light .pcp-dmg-red { color: #cc2020; }',
			'.light .pcp-nhko-ohko { background: #fce8e8; color: #cc2020; }',
			'.light .pcp-nhko-2hko { background: #fdf3e0; color: #b07010; }',
			'.light .pcp-nhko-safe { background: #e8f5e8; color: #2e8b2e; }',
			'.light .pcp-field-tag { background: #fff; color: #888; border: 1px solid #ddd; }',
			'.light .pcp-field-tag.active { color: #4488dd; border-color: #4488dd; background: #e8eef8; }',
			'.light .pcp-boost-up { background: #e8f5e8; color: #2e8b2e; }',
			'.light .pcp-boost-down { background: #fce8e8; color: #cc2020; }',
			'.light .pcp-spread-hint { color: #999; }',
			'.light .pcp-unrevealed { color: #bbb; }',

			// Shared styles
			'.pcp-header { padding: 4px 10px; display: flex; align-items: center; justify-content: space-between; }',
			'.pcp-header span { font-size: 10px; font-weight: bold; }',
			'.pcp-header .pcp-close { cursor: pointer; font-size: 14px; opacity: 0.5; }',
			'.pcp-header .pcp-close:hover { opacity: 1; }',
			'.pcp-team-strip { display: flex; gap: 2px; padding: 6px 8px; }',
			'.pcp-team-icon { width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; cursor: pointer; }',
			'.pcp-team-icon.fainted { opacity: 0.3; }',
			'.pcp-section { padding: 8px 10px; }',
			'.pcp-section-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-bottom: 6px; }',
			'.pcp-poke-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; margin-bottom: 6px; }',
			'.pcp-sprite-box { width: 40px; height: 40px; border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; }',
			'.pcp-poke-info { flex: 1; min-width: 0; }',
			'.pcp-poke-name { font-size: 11px; font-weight: bold; }',
			'.pcp-poke-meta { font-size: 9px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
			'.pcp-hp-bar-bg { height: 4px; border-radius: 2px; margin-top: 4px; }',
			'.pcp-hp-bar { height: 4px; border-radius: 2px; }',
			'.pcp-type-badge { display: inline-block; font-size: 7px; font-weight: bold; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; margin-left: 3px; }',
			'.pcp-moves-box { border-radius: 6px; overflow: hidden; margin-bottom: 6px; }',
			'.pcp-move-row { display: flex; align-items: center; padding: 4px 8px; }',
			'.pcp-move-row:last-child { border-bottom: none; }',
			'.pcp-move-name { font-size: 10px; flex: 1; }',
			'.pcp-move-dmg { font-size: 10px; font-weight: bold; text-align: right; min-width: 85px; }',
			'.pcp-nhko { font-size: 7px; padding: 1px 5px; border-radius: 3px; margin-left: 4px; font-weight: bold; }',
			'.pcp-field-row { display: flex; gap: 4px; flex-wrap: wrap; padding: 4px 0; }',
			'.pcp-field-tag { font-size: 8px; padding: 2px 5px; border-radius: 3px; cursor: pointer; }',
			'.pcp-boost { font-size: 7px; padding: 1px 4px; border-radius: 2px; display: inline-block; margin-right: 3px; margin-top: 3px; }',
			'.pcp-spread-hint { font-size: 8px; text-align: center; padding: 4px 0; cursor: pointer; }',
			'.pcp-spread-hint:hover { color: #4488dd !important; }',

			// Toggle button
			'.pcp-toggle-btn { position: absolute; right: 4px; top: 4px; z-index: 99; background: rgba(0,0,0,0.5); color: #aaa; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-family: Verdana; cursor: pointer; }',
			'.pcp-toggle-btn:hover { background: rgba(0,0,0,0.7); color: #fff; }',
		].join('\n');

		var style = document.createElement('style');
		style.textContent = css;
		document.head.appendChild(style);
	}

	// -------------------------------------------------------
	// DOM helpers
	// -------------------------------------------------------

	function el(tag, cls, text) {
		var node = document.createElement(tag);
		if (cls) node.className = cls;
		if (text) node.textContent = text;
		return node;
	}

	function getHPColor(pct) {
		if (pct > 50) return '#4caf50';
		if (pct > 25) return '#e6a020';
		return '#e04040';
	}

	function getDmgClass(pct) {
		if (pct >= 50) return 'pcp-dmg-red';
		if (pct >= 30) return 'pcp-dmg-yellow';
		return 'pcp-dmg-gray';
	}

	function getNHKOClass(nhko) {
		if (nhko <= 1) return 'pcp-nhko-ohko';
		if (nhko <= 2) return 'pcp-nhko-2hko';
		return 'pcp-nhko-safe';
	}

	function getNHKOLabel(nhko) {
		if (nhko <= 0) return '';
		if (nhko === 1) return 'OHKO';
		return nhko + 'HKO';
	}

	/**
	 * Get a Pokemon's picon sprite using PS's built-in system.
	 */
	function getPiconStyle(species) {
		if (window.Dex && Dex.getPokemonIcon) {
			// Dex.getPokemonIcon returns a full <span> element; extract the style
			var icon = Dex.getPokemonIcon(species);
			if (typeof icon === 'string') {
				var match = icon.match(/style="([^"]+)"/);
				if (match) return match[1];
			}
		}
		return '';
	}

	/**
	 * Get move type from the Dex.
	 */
	function getMoveType(moveName) {
		if (window.BattleMovedex) {
			var id = ('' + moveName).toLowerCase().replace(/[^a-z0-9]+/g, '');
			var move = BattleMovedex[id];
			if (move) return move.type || 'Normal';
		}
		return 'Normal';
	}

	/**
	 * Get Pokemon types from the Dex.
	 */
	function getPokeTypes(species) {
		if (window.BattlePokedex) {
			var id = ('' + species).toLowerCase().replace(/[^a-z0-9]+/g, '');
			var poke = BattlePokedex[id];
			if (poke && poke.types) return poke.types;
		}
		return [];
	}

	// -------------------------------------------------------
	// Panel renderer
	// -------------------------------------------------------

	var CalcPanel = {};

	/**
	 * Render a Pokemon row (sprite + name + ability/item + HP bar).
	 */
	CalcPanel.renderPokeRow = function (poke) {
		var row = el('div', 'pcp-poke-row');

		// Sprite
		var sprite = el('div', 'pcp-sprite-box');
		var piconStyle = getPiconStyle(poke.species);
		if (piconStyle) {
			var piconEl = el('span');
			piconEl.setAttribute('style', piconStyle + 'transform: scale(1.5);');
			sprite.appendChild(piconEl);
		}
		row.appendChild(sprite);

		// Info
		var info = el('div', 'pcp-poke-info');

		// Name + types
		var nameRow = el('div', 'pcp-poke-name');
		nameRow.textContent = poke.species;
		var types = getPokeTypes(poke.species);
		for (var i = 0; i < types.length; i++) {
			var badge = el('span', 'pcp-type-badge');
			badge.textContent = types[i].substring(0, 3);
			badge.style.backgroundColor = getTypeColor(types[i]);
			// Dark text for light badge colors
			if (['Electric', 'Ice', 'Steel', 'Ground', 'Normal'].indexOf(types[i]) >= 0) {
				badge.style.color = '#333';
			}
			nameRow.appendChild(badge);
		}
		info.appendChild(nameRow);

		// Meta line (ability / item / nature)
		var meta = el('div', 'pcp-poke-meta');
		var metaParts = [];
		if (poke.ability) metaParts.push(poke.ability);
		if (poke.item) {
			metaParts.push(poke.item);
		} else if (poke.itemRevealed === false) {
			metaParts.push('unknown item');
		}
		meta.textContent = metaParts.join(' / ');
		info.appendChild(meta);

		// HP bar
		var hpBg = el('div', 'pcp-hp-bar-bg');
		var hpBar = el('div', 'pcp-hp-bar');
		var hpPct = poke.hpPercent || 0;
		hpBar.style.width = hpPct + '%';
		hpBar.style.backgroundColor = getHPColor(hpPct);
		hpBg.appendChild(hpBar);
		info.appendChild(hpBg);

		// Boosts
		if (poke.boosts) {
			var boostContainer = el('div');
			var statNames = {atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva'};
			for (var stat in poke.boosts) {
				var val = poke.boosts[stat];
				if (val === 0) continue;
				var boostTag = el('span', 'pcp-boost ' + (val > 0 ? 'pcp-boost-up' : 'pcp-boost-down'));
				boostTag.textContent = (val > 0 ? '+' : '') + val + ' ' + (statNames[stat] || stat);
				boostContainer.appendChild(boostTag);
			}
			info.appendChild(boostContainer);
		}

		row.appendChild(info);
		return row;
	};

	/**
	 * Render the move list with damage ranges.
	 */
	CalcPanel.renderMoves = function (moveResults, isOpponent) {
		var box = el('div', 'pcp-moves-box');

		for (var i = 0; i < moveResults.length; i++) {
			var mr = moveResults[i];
			var row = el('div', 'pcp-move-row');

			// Move name with type badge
			var name = el('span', 'pcp-move-name');
			var moveType = getMoveType(mr.move);
			var typeBadge = el('span', 'pcp-type-badge');
			typeBadge.textContent = moveType.substring(0, 3);
			typeBadge.style.backgroundColor = getTypeColor(moveType);
			typeBadge.style.marginRight = '4px';
			if (['Electric', 'Ice', 'Steel', 'Ground', 'Normal'].indexOf(moveType) >= 0) {
				typeBadge.style.color = '#333';
			}
			name.appendChild(typeBadge);

			// Format move name from ID to display name
			var displayName = mr.move;
			if (window.BattleMovedex) {
				var id = mr.move.toLowerCase().replace(/[^a-z0-9]+/g, '');
				var moveData = BattleMovedex[id];
				if (moveData && moveData.name) displayName = moveData.name;
			}
			name.appendChild(document.createTextNode(displayName));
			row.appendChild(name);

			// Damage range
			var dmg = el('span', 'pcp-move-dmg ' + getDmgClass(mr.maxPercent));
			if (mr.minPercent > 0) {
				dmg.textContent = mr.minPercent + ' - ' + mr.maxPercent + '%';
			} else {
				dmg.textContent = '-';
			}
			row.appendChild(dmg);

			// NHKO badge
			if (mr.nhko > 0) {
				var nhko = el('span', 'pcp-nhko ' + getNHKOClass(mr.nhko));
				nhko.textContent = getNHKOLabel(mr.nhko);
				row.appendChild(nhko);
			}

			box.appendChild(row);
		}

		// Fill empty move slots for opponent
		if (isOpponent) {
			for (var j = moveResults.length; j < 4; j++) {
				var emptyRow = el('div', 'pcp-move-row');
				var emptyName = el('span', 'pcp-move-name pcp-unrevealed');
				emptyName.textContent = 'unrevealed';
				emptyRow.appendChild(emptyName);
				var emptyDmg = el('span', 'pcp-move-dmg pcp-dmg-gray');
				emptyDmg.textContent = '-';
				emptyRow.appendChild(emptyDmg);
				box.appendChild(emptyRow);
			}
		}

		return box;
	};

	/**
	 * Render the team icon strip.
	 */
	CalcPanel.renderTeamStrip = function (team, activeIndex, onSelect) {
		var strip = el('div', 'pcp-team-strip');

		for (var i = 0; i < team.length; i++) {
			(function (idx) {
				var icon = el('div', 'pcp-team-icon');
				if (idx === activeIndex) icon.className += ' active';
				if (team[idx].status === 'fnt' || team[idx].hpPercent <= 0) {
					icon.className += ' fainted';
				}

				// Use picon if available
				var piconStyle = getPiconStyle(team[idx].species);
				if (piconStyle) {
					var piconEl = el('span');
					piconEl.setAttribute('style', piconStyle);
					icon.appendChild(piconEl);
				} else {
					icon.textContent = (team[idx].species || '???').substring(0, 3).toUpperCase();
				}

				icon.addEventListener('click', function () {
					if (onSelect) onSelect(idx);
				});
				strip.appendChild(icon);
			})(i);
		}

		return strip;
	};

	/**
	 * Render the field conditions.
	 */
	CalcPanel.renderField = function (field) {
		var section = el('div', 'pcp-section');
		section.style.paddingTop = '0';
		section.appendChild(el('div', 'pcp-section-label', 'field'));

		var row = el('div', 'pcp-field-row');

		// Weather
		var weathers = ['Sun', 'Rain', 'Sand', 'Hail'];
		var weatherMap = {sun: 'Sun', sunnyday: 'Sun', rain: 'Rain', raindance: 'Rain', sand: 'Sand', sandstorm: 'Sand', hail: 'Hail'};
		var activeWeather = field.weather ? (weatherMap[field.weather.toLowerCase()] || field.weather) : '';

		for (var w = 0; w < weathers.length; w++) {
			var tag = el('span', 'pcp-field-tag' + (weathers[w] === activeWeather ? ' active' : ''));
			tag.textContent = weathers[w];
			row.appendChild(tag);
		}

		// Side conditions
		var sideConditions = [
			{key: 'stealthrock', label: 'Stealth Rock'},
			{key: 'spikes', label: 'Spikes'},
			{key: 'toxicspikes', label: 'T-Spikes'},
			{key: 'reflect', label: 'Reflect'},
			{key: 'lightscreen', label: 'Light Screen'},
			{key: 'tailwind', label: 'Tailwind'},
		];

		for (var s = 0; s < sideConditions.length; s++) {
			var sc = sideConditions[s];
			var isActiveAtk = field.attackerSide && field.attackerSide[sc.key];
			var isActiveDef = field.defenderSide && field.defenderSide[sc.key];
			if (isActiveAtk || isActiveDef) {
				var sTag = el('span', 'pcp-field-tag active');
				sTag.textContent = sc.label;
				row.appendChild(sTag);
			}
		}

		section.appendChild(row);
		return section;
	};

	// -------------------------------------------------------
	// Full panel render
	// -------------------------------------------------------

	var panels = {}; // roomid -> DOM element
	var selectedIndex = {}; // roomid -> selected team index

	/**
	 * Render or update the full calc panel for a battle room.
	 */
	CalcPanel.render = function (roomid, matchup) {
		if (!matchup) return;

		var dark = isDarkMode();
		var themeClass = dark ? 'dark' : 'light';

		var panel = panels[roomid];
		if (!panel) {
			panel = el('div', 'pokemmo-calc-panel ' + themeClass);
			panels[roomid] = panel;

			// Inject into the battle room
			var room = app.rooms[roomid];
			if (room && room.el) {
				room.el.style.position = 'relative';
				room.el.appendChild(panel);
			}
		}

		// Update theme class
		panel.className = 'pokemmo-calc-panel ' + themeClass;

		// Clear and rebuild
		panel.innerHTML = '';

		// Header
		var header = el('div', 'pcp-header');
		var title = el('span');
		title.innerHTML = 'PokeMMO Calc';
		header.appendChild(title);

		var closeBtn = el('span', 'pcp-close');
		closeBtn.innerHTML = '&times;';
		closeBtn.addEventListener('click', function () {
			panel.style.display = 'none';
		});
		header.appendChild(closeBtn);
		panel.appendChild(header);

		// Find active index
		var activeIdx = 0;
		if (selectedIndex[roomid] != null) {
			activeIdx = selectedIndex[roomid];
		} else {
			for (var i = 0; i < matchup.playerTeam.length; i++) {
				if (matchup.playerTeam[i].active) { activeIdx = i; break; }
			}
		}

		// Team strip
		var strip = CalcPanel.renderTeamStrip(matchup.playerTeam, activeIdx, function (idx) {
			selectedIndex[roomid] = idx;
			// Re-calc with selected Pokemon vs current opponent
			var selectedPoke = matchup.playerTeam[idx];
			var field = matchup.field;
			var playerMoves = exports.CalcBridge.calcMatchup(selectedPoke, matchup.opponent, field);
			var reverseField = Object.assign({}, field);
			reverseField.attackerSide = field.defenderSide;
			reverseField.defenderSide = field.attackerSide;
			var oppMoves = exports.CalcBridge.calcMatchup(matchup.opponent, selectedPoke, reverseField);

			var newMatchup = Object.assign({}, matchup, {
				player: selectedPoke,
				playerMoves: playerMoves,
				opponentMoves: oppMoves,
			});
			CalcPanel.render(roomid, newMatchup);
		});
		panel.appendChild(strip);

		// Player active section
		var playerSection = el('div', 'pcp-section');
		playerSection.appendChild(el('div', 'pcp-section-label', 'your active'));
		playerSection.appendChild(CalcPanel.renderPokeRow(matchup.player));
		playerSection.appendChild(CalcPanel.renderMoves(matchup.playerMoves, false));
		panel.appendChild(playerSection);

		// Opponent active section
		var oppSection = el('div', 'pcp-section');
		oppSection.style.paddingTop = '0';
		oppSection.appendChild(el('div', 'pcp-section-label', 'opponent active'));
		oppSection.appendChild(CalcPanel.renderPokeRow(matchup.opponent));
		oppSection.appendChild(CalcPanel.renderMoves(matchup.opponentMoves, true));

		// Spread hint
		var hint = el('div', 'pcp-spread-hint');
		var spread = exports.CalcBridge.getAssumedSpread(matchup.opponent.species);
		hint.textContent = 'assuming ' + spread.evs.hp + ' HP / ' +
			(spread.evs.spd > spread.evs.def ? spread.evs.spd + ' SpD' : spread.evs.def + ' Def') +
			' ' + spread.nature + ' (usage stats)';
		oppSection.appendChild(hint);
		panel.appendChild(oppSection);

		// Field section
		panel.appendChild(CalcPanel.renderField(matchup.field));
	};

	/**
	 * Add a toggle button to a battle room.
	 */
	CalcPanel.addToggleButton = function (roomid) {
		var room = app.rooms[roomid];
		if (!room || !room.el) return;

		// Don't add if already exists
		if (room.el.querySelector('.pcp-toggle-btn')) return;

		var btn = el('button', 'pcp-toggle-btn');
		btn.textContent = 'Calc';
		btn.addEventListener('click', function () {
			var panel = panels[roomid];
			if (panel) {
				panel.style.display = panel.style.display === 'none' ? '' : 'none';
			}
		});
		room.el.appendChild(btn);
	};

	/**
	 * Remove panel from a room.
	 */
	CalcPanel.destroy = function (roomid) {
		if (panels[roomid]) {
			panels[roomid].remove();
			delete panels[roomid];
			delete selectedIndex[roomid];
		}
	};

	// -------------------------------------------------------
	// Initialization
	// -------------------------------------------------------

	CalcPanel.init = function () {
		injectCSS();

		// Listen for bridge updates
		if (exports.CalcBridge) {
			exports.CalcBridge.onUpdate(function (roomid, matchup) {
				CalcPanel.addToggleButton(roomid);
				CalcPanel.render(roomid, matchup);
			});
		}
	};

	exports.CalcPanel = CalcPanel;
})(window);
