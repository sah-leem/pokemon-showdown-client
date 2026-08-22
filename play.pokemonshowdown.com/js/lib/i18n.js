(function () {
	'use strict';

	var SUPPORTED_LOCALES = {
		en: 'English',
		zh: '\u7b80\u4f53\u4e2d\u6587'
	};

	var LOCALE_LABELS = {
		en: 'EN',
		zh: '\u4e2d'
	};

	var I18n = {
		locale: 'en',
		supported: SUPPORTED_LOCALES,
		labels: LOCALE_LABELS,
		data: {},
		_listeners: [],
		_loaded: {},

		init: function () {
			var saved = localStorage.getItem('pokemon-showdown-locale');
			if (saved && saved !== 'en' && SUPPORTED_LOCALES[saved]) {
				this.setLocale(saved);
			}
		},

		setLocale: function (locale) {
			if (!SUPPORTED_LOCALES[locale]) return;
			this.locale = locale;
			localStorage.setItem('pokemon-showdown-locale', locale);

			if (locale === 'en') {
				this.data = {};
				this._notify();
				return;
			}

			if (this._loaded[locale]) {
				this.data = this._loaded[locale];
				this._notify();
				return;
			}

			var self = this;
			var script = document.createElement('script');
			script.src = '/locales/' + locale + '.js?v=' + (window.LOCALES_VERSION || '1');
			script.onload = function () {
				self._notify();
			};
			script.onerror = function () {
				console.error('[i18n] Failed to load locale: ' + locale);
				self.locale = 'en';
				self.data = {};
				localStorage.setItem('pokemon-showdown-locale', 'en');
			};
			document.head.appendChild(script);
		},

		// Called by locale JS files to register their data
		registerLocale: function (locale, data) {
			this._loaded[locale] = data;
			if (this.locale === locale) {
				this.data = data;
			}
		},

		// -------------------------------------------------------
		// Translation methods
		// -------------------------------------------------------

		// UI string translation
		// Keys are readable English fallbacks: t('Home') -> '主页' or 'Home'
		t: function (key, replacements) {
			var str;
			if (this.locale !== 'en' && this.data.ui) {
				str = this.data.ui[key];
			}
			if (!str) str = key;
			return this._interpolate(str, replacements);
		},

		// Pokemon species name
		pokemon: function (id) {
			if (this.locale !== 'en' && this.data.pokemon && this.data.pokemon[id]) {
				return this.data.pokemon[id];
			}
			return (window.BattlePokedex && BattlePokedex[id] && BattlePokedex[id].name) || id;
		},

		// Move name
		move: function (id) {
			if (this.locale !== 'en' && this.data.moves && this.data.moves[id]) {
				return this.data.moves[id];
			}
			return (window.BattleMovedex && BattleMovedex[id] && BattleMovedex[id].name) || id;
		},

		// Ability name
		ability: function (id) {
			if (this.locale !== 'en' && this.data.abilities && this.data.abilities[id]) {
				return this.data.abilities[id];
			}
			return (window.BattleAbilities && BattleAbilities[id] && BattleAbilities[id].name) || id;
		},

		// Item name
		item: function (id) {
			if (this.locale !== 'en' && this.data.items && this.data.items[id]) {
				return this.data.items[id];
			}
			return (window.BattleItems && BattleItems[id] && BattleItems[id].name) || id;
		},

		// Type name
		type: function (name) {
			if (this.locale !== 'en' && this.data.types && this.data.types[name]) {
				return this.data.types[name];
			}
			return name;
		},

		// Nature name
		nature: function (name) {
			if (this.locale !== 'en' && this.data.natures && this.data.natures[name]) {
				return this.data.natures[name];
			}
			return name;
		},

		// Stat name
		stat: function (name) {
			if (this.locale !== 'en' && this.data.stats && this.data.stats[name]) {
				return this.data.stats[name];
			}
			return name;
		},

		// Battle text template
		// Returns null if no translation exists (caller falls through to English)
		battleText: function (key, replacements) {
			if (this.locale === 'en' || !this.data.battle) return null;
			var str = this.data.battle[key];
			if (!str) return null;
			return this._interpolate(str, replacements);
		},

		// Format name/description
		format: function (id) {
			if (this.locale !== 'en' && this.data.formats && this.data.formats[id]) {
				return this.data.formats[id];
			}
			return null;
		},

		// -------------------------------------------------------
		// Listener system for re-rendering on locale change
		// -------------------------------------------------------

		onChange: function (fn) {
			this._listeners.push(fn);
			return fn;
		},

		offChange: function (fn) {
			var idx = this._listeners.indexOf(fn);
			if (idx !== -1) this._listeners.splice(idx, 1);
		},

		_notify: function () {
			for (var i = 0; i < this._listeners.length; i++) {
				try {
					this._listeners[i](this.locale);
				} catch (e) {
					console.error('[i18n] Listener error:', e);
				}
			}
		},

		_interpolate: function (str, replacements) {
			if (!replacements) return str;
			for (var k in replacements) {
				str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), replacements[k]);
			}
			return str;
		}
	};

	window.I18n = I18n;
	I18n.init();
})();
