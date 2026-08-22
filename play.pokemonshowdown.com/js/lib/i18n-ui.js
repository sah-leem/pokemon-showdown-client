(function () {
	'use strict';

	if (typeof I18n === 'undefined') return;

	// -------------------------------------------------------
	// CSS for the language selector
	// -------------------------------------------------------
	var style = document.createElement('style');
	style.textContent = [
		'.locale-selector { position: relative; display: inline-block; vertical-align: middle; margin-right: 4px; }',
		'.locale-btn { background: rgba(255,255,255,0.1); border: none; color: #e0e7ee; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; line-height: 1; }',
		'.locale-btn:hover { background: rgba(255,255,255,0.2); }',
		'.locale-dropdown { position: absolute; top: 100%; right: 0; margin-top: 4px; background: #3a4d5f; border-radius: 6px; min-width: 130px; padding: 4px 0; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }',
		'.locale-option { padding: 6px 14px; color: #ccd6de; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }',
		'.locale-option:hover { background: rgba(255,255,255,0.08); }',
		'.locale-option.active { color: #7fb8d8; }',
		'.locale-option .check { width: 14px; text-align: center; font-size: 10px; }'
	].join('\n');
	document.head.appendChild(style);

	// -------------------------------------------------------
	// Build and inject the language selector
	// -------------------------------------------------------
	function createSelector() {
		var el = document.createElement('div');
		el.className = 'locale-selector';
		updateButton(el);
		return el;
	}

	function updateButton(container) {
		var label = I18n.labels[I18n.locale] || 'EN';
		container.innerHTML =
			'<button class="locale-btn" title="' + (I18n.t('Language')) + '">' +
			'<i class="fa fa-globe"></i> ' +
			'<span>' + label + '</span>' +
			'</button>';
	}

	function showDropdown(container) {
		// Remove any existing dropdown
		closeDropdown();

		var dropdown = document.createElement('div');
		dropdown.className = 'locale-dropdown';

		for (var code in I18n.supported) {
			var isActive = (code === I18n.locale);
			var opt = document.createElement('div');
			opt.className = 'locale-option' + (isActive ? ' active' : '');
			opt.dataset.locale = code;
			opt.innerHTML =
				'<span class="check">' + (isActive ? '✓' : '') + '</span>' +
				I18n.supported[code];
			dropdown.appendChild(opt);
		}

		container.appendChild(dropdown);
	}

	function closeDropdown() {
		var existing = document.querySelector('.locale-dropdown');
		if (existing) existing.remove();
	}

	// -------------------------------------------------------
	// Find topbar and inject
	// -------------------------------------------------------
	var selectorEl = null;

	function inject() {
		if (selectorEl && document.contains(selectorEl)) return true;

		// Try multiple selectors for the topbar right side
		var target =
			document.querySelector('.userbar') ||
			document.querySelector('.header .mainmenu') ||
			document.querySelector('.header .inner') ||
			document.querySelector('.tabbar .inner');

		if (!target) return false;

		selectorEl = createSelector();

		// Insert before the first child (leftmost in the right section) or
		// at the beginning of the target
		var username = target.querySelector('[name="openSounds"]') ||
			target.querySelector('.username') ||
			target.querySelector('button');

		if (username) {
			username.parentNode.insertBefore(selectorEl, username);
		} else {
			target.insertBefore(selectorEl, target.firstChild);
		}

		return true;
	}

	// -------------------------------------------------------
	// Event handlers (delegated)
	// -------------------------------------------------------
	document.addEventListener('click', function (e) {
		// Toggle dropdown
		var btn = e.target.closest('.locale-btn');
		if (btn) {
			e.stopPropagation();
			var container = btn.closest('.locale-selector');
			var existing = container.querySelector('.locale-dropdown');
			if (existing) {
				closeDropdown();
			} else {
				showDropdown(container);
			}
			return;
		}

		// Select locale
		var opt = e.target.closest('.locale-option');
		if (opt) {
			e.stopPropagation();
			var locale = opt.dataset.locale;
			if (locale) I18n.setLocale(locale);
			closeDropdown();
			return;
		}

		// Click elsewhere closes dropdown
		closeDropdown();
	});

	// -------------------------------------------------------
	// Re-render on locale change (step 6)
	// -------------------------------------------------------
	I18n.onChange(function () {
		// Update the selector button label
		if (selectorEl) {
			updateButton(selectorEl);
		}

		// Re-render PS rooms if available
		if (typeof app !== 'undefined' && app) {
			// Re-render topbar tabs
			if (app.topbar && app.topbar.update) {
				try { app.topbar.update(); } catch (e) {}
			}
			// Re-render current room
			if (app.curRoom) {
				if (app.curRoom.update) {
					try { app.curRoom.update(); } catch (e) {}
				}
			}
			// Re-render all open rooms (battle panels, teambuilder, etc.)
			if (app.rooms) {
				for (var id in app.rooms) {
					var room = app.rooms[id];
					if (room && room.update) {
						try { room.update(); } catch (e) {}
					}
				}
			}
		}

		// Re-inject selector in case topbar re-rendered and lost it
		setTimeout(function () {
			if (!document.contains(selectorEl)) {
				selectorEl = null;
				inject();
			}
		}, 100);
	});

	// -------------------------------------------------------
	// Injection with retry
	// The topbar might not exist yet when this script loads.
	// -------------------------------------------------------
	function tryInject() {
		if (inject()) return;
		// Retry a few times
		var attempts = 0;
		var interval = setInterval(function () {
			if (inject() || ++attempts > 20) {
				clearInterval(interval);
			}
		}, 500);
	}

	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		tryInject();
	} else {
		document.addEventListener('DOMContentLoaded', tryInject);
	}
})();
