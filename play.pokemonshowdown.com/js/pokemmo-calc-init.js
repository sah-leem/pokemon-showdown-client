/**
 * pokemmo-calc-init.js
 * Initializes the PokeMMO calc panel system.
 * Load this after pokemmo-calc-engine.js, pokemmo-calc-bridge.js,
 * and pokemmo-calc-panel.js.
 */
(function () {
	'use strict';

	function init() {
		if (!window.app) {
			setTimeout(init, 500);
			return;
		}

		if (!window.PokeMMOCalc) {
			console.warn('[PokeMMO Calc] Engine not loaded.');
		}

		if (window.CalcBridge) {
			window.CalcBridge.init();
		}

		if (window.CalcPanel) {
			window.CalcPanel.init();
		}

		console.log('[PokeMMO Calc] Panel initialized.');

		// Poll for new battle rooms every 2s.
		// joinRoom patch misses server-created rooms (ladder, challenges).
		if (window.CalcBridge && window.CalcBridge.scanForRooms) {
			setInterval(function () {
				window.CalcBridge.scanForRooms();
			}, 2000);
			console.log('[PokeMMO Calc] Room scanner active.');
		}
	}

	if (document.readyState === 'complete') {
		init();
	} else {
		window.addEventListener('load', init);
	}
})();
