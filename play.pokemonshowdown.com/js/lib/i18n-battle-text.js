(function () {
	'use strict';

	if (typeof I18n === 'undefined') return;

	var origDefault = null;
	var origMoveText = {};

	function patchBattleText() {
		if (!window.BattleText || !window.BattleText['default']) return false;

		// Store original default entries
		if (!origDefault) {
			origDefault = {};
			var d = BattleText['default'];
			for (var k in d) {
				if (typeof d[k] === 'string') origDefault[k] = d[k];
			}
		}

		var d = BattleText['default'];
		var isZh = I18n.locale !== 'en' && I18n.data;

		// Patch default entries
		if (isZh && I18n.data.battleText) {
			var zh = I18n.data.battleText;
			for (var k in zh) {
				if (typeof d[k] === 'string') d[k] = zh[k];
			}
		} else if (origDefault) {
			for (var k in origDefault) d[k] = origDefault[k];
		}

		// Patch move/status/item-specific entries
		if (isZh && I18n.data.battleMoveText) {
			var mzh = I18n.data.battleMoveText;
			for (var moveKey in mzh) {
				var entry = BattleText[moveKey];
				if (!entry) continue;
				// Store originals
				if (!origMoveText[moveKey]) {
					origMoveText[moveKey] = {};
					for (var sk in entry) {
						if (typeof entry[sk] === 'string') origMoveText[moveKey][sk] = entry[sk];
					}
				}
				// Apply Chinese
				var zhMove = mzh[moveKey];
				for (var sk in zhMove) {
					if (typeof entry[sk] === 'string' || entry[sk] === undefined) {
						entry[sk] = zhMove[sk];
					}
				}
			}
		} else {
			// Restore originals
			for (var moveKey in origMoveText) {
				var entry = BattleText[moveKey];
				if (!entry) continue;
				var orig = origMoveText[moveKey];
				for (var sk in orig) entry[sk] = orig[sk];
			}
		}

		return true;
	}

	I18n.onChange(function () { patchBattleText(); });

	function tryInit() {
		if (patchBattleText()) return true;
		return false;
	}

	if (!tryInit()) {
		var attempts = 0;
		var interval = setInterval(function () {
			if (tryInit() || ++attempts > 60) clearInterval(interval);
		}, 500);
	}
})();
