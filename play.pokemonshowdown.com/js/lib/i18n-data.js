(function () {
	'use strict';

	if (typeof I18n === 'undefined') return;

	var DEX_MAP = [
		['BattlePokedex', 'pokemon'],
		['BattleMovedex', 'moves'],
		['BattleAbilities', 'abilities'],
		['BattleItems', 'items']
	];

	function applyDisplayNames() {
		var isEn = I18n.locale === 'en' || !I18n.data;
		for (var i = 0; i < DEX_MAP.length; i++) {
			var dexName = DEX_MAP[i][0];
			var dataKey = DEX_MAP[i][1];
			var dex = window[dexName];
			if (!dex) continue;
			var translations = !isEn && I18n.data[dataKey] ? I18n.data[dataKey] : null;
			for (var id in dex) {
				if (!dex[id] || typeof dex[id].name !== 'string') continue;
				dex[id].displayName = translations && translations[id] ? translations[id] : null;
			}
		}
	}

	I18n.onChange(function () {
		applyDisplayNames();
	});

	function tryInit() {
		if (window.BattlePokedex) {
			applyDisplayNames();
			return true;
		}
		return false;
	}

	if (!tryInit()) {
		var attempts = 0;
		var interval = setInterval(function () {
			if (tryInit() || ++attempts > 60) clearInterval(interval);
		}, 500);
	}
})();
