/**
 * client-login-custom.js
 * mmoshowdown.cc - Custom Login Popup
 * 
 * Uses native PS popup styling. Events bound via jQuery delegation
 * (more reliable than Backbone events hash override).
 * Load after client-topbar.js.
 */

(function ($) {
	'use strict';

	var LOGINSERVER = '/~~showdown/action.php';

	var LoginPopup = window.LoginPopup;
	if (!LoginPopup) {
		console.warn('[login-custom] LoginPopup not found, skipping override');
		return;
	}

	function getChallstr() {
		if (app && app.user && app.user.challstr) return app.user.challstr;
		if (app && app.challstr) return app.challstr;
		return '';
	}

	function parseResponse(raw) {
		if (typeof raw !== 'string') return raw;
		var text = raw;
		if (text.charAt(0) === ']') text = text.substr(1);
		try { return JSON.parse(text); } catch (e) { return null; }
	}

	function finishLogin(name, assertion) {
		if (app && app.user && typeof app.user.finishRename === 'function') {
			app.user.finishRename(name);
		}
		app.send('/trn ' + name + ',0,' + (assertion || ''));
	}

	function toID(text) {
		return ('' + text).toLowerCase().replace(/[^a-z0-9]/g, '');
	}

	// ============================================================
	// Override initialize
	// ============================================================

	LoginPopup.prototype.initialize = function (data) {
		this._loginState = 'choose';
		this._nameData = null;
		this._errorMsg = data && data.error ? data.error : '';
		this._renderLogin();
	};

	// ============================================================
	// Render + bind events via jQuery delegation
	// ============================================================

	LoginPopup.prototype._renderLogin = function () {
		var buf = '';
		switch (this._loginState) {
		case 'choose': buf = this._renderChoose(); break;
		case 'available': buf = this._renderAvailable(); break;
		case 'registered': buf = this._renderRegistered(); break;
		case 'blocked': buf = this._renderBlocked(); break;
		case 'loading': buf = this._renderLoading(); break;
		default: buf = this._renderChoose();
		}
		this.$el.html(buf);

		// Bind events via jQuery delegation on the popup element
		var self = this;
		this.$el.off('.lc');
		this.$el.on('click.lc', 'button[name=checkName]', function (e) { e.preventDefault(); self._onCheckName(); });
		this.$el.on('click.lc', 'button[name=register]', function (e) { e.preventDefault(); self._onRegister(); });
		this.$el.on('click.lc', 'button[name=guestLogin]', function (e) { e.preventDefault(); self._onGuestLogin(); });
		this.$el.on('click.lc', 'button[name=loginSubmit]', function (e) { e.preventDefault(); self._onLoginSubmit(); });
		this.$el.on('click.lc', 'button[name=oauthLogin]', function (e) { e.preventDefault(); self._onOAuthLogin(); });
		this.$el.on('click.lc', 'button[name=backToChoose]', function (e) { e.preventDefault(); self._onBackToChoose(); });
		this.$el.on('keydown.lc', 'input[name=username]', function (e) {
			if (e.keyCode === 13) { e.preventDefault(); self._onCheckName(); }
		});
		this.$el.on('keydown.lc', 'input[name=password]', function (e) {
			if (e.keyCode === 13) {
				e.preventDefault();
				if (self._loginState === 'registered') self._onLoginSubmit();
			}
		});
		this.$el.on('keydown.lc', 'input[name=cpassword]', function (e) {
			if (e.keyCode === 13) { e.preventDefault(); self._onRegister(); }
		});

		// Focus the right input
		var self2 = this;
		setTimeout(function () {
			if (self2._loginState === 'choose') self2.$('input[name=username]').focus();
			else self2.$('input[name=password]').focus();
		}, 50);
	};

	// Override submit to prevent PS default form handling
	LoginPopup.prototype.submit = function (data) {};

	// ============================================================
	// HTML renderers
	// ============================================================

	LoginPopup.prototype._renderChoose = function () {
		var buf = '<div class="pad">';
		buf += '<h3 style="margin-top:0;font-size:14px">Choose Your Name</h3>';
		if (this._errorMsg) {
			buf += '<p class="error">' + BattleLog.escapeHTML(this._errorMsg) + '</p>';
		}
		buf += '<p><label class="label">Username:</label>';
		buf += '<input class="textbox" type="text" name="username" placeholder="Enter a username" autocomplete="off" maxlength="18" /></p>';
		buf += '<p class="buttonbar"><button type="button" name="checkName" class="button"><strong>Go</strong></button></p>';
		buf += '<p style="text-align:center;color:#888;font-size:11px;margin:12px 0 6px">&#8212; or &#8212;</p>';
		buf += '<p class="buttonbar"><button type="button" name="oauthLogin" class="button" style="width:100%"><i class="fa fa-sign-in"></i> <strong>Login with Pokemon Showdown</strong></button></p>';
		buf += '</div>';
		return buf;
	};

	LoginPopup.prototype._renderAvailable = function () {
		var name = BattleLog.escapeHTML(this._nameData.username || this._nameData.userid);
		var buf = '<div class="pad">';
		buf += '<h3 style="margin-top:0;font-size:14px">Choose Your Name</h3>';
		buf += '<p style="color:#5a5"><strong>' + name + '</strong> is available!</p>';
		if (this._errorMsg) {
			buf += '<p class="error">' + BattleLog.escapeHTML(this._errorMsg) + '</p>';
		}
		buf += '<p style="font-size:12px;color:#aaa;margin:6px 0">Register this name with a password?</p>';
		buf += '<p><label class="label">Password:</label>';
		buf += '<input class="textbox" type="password" name="password" placeholder="Choose a password" /></p>';
		buf += '<p><label class="label">Confirm Password:</label>';
		buf += '<input class="textbox" type="password" name="cpassword" placeholder="Confirm password" /></p>';
		buf += '<p class="buttonbar">';
		buf += '<button type="button" name="register" class="button"><strong>Register</strong></button> ';
		buf += '<button type="button" name="guestLogin" class="button">Not Now</button>';
		buf += '</p>';
		buf += '<p style="text-align:center"><button type="button" name="backToChoose" class="button" style="font-size:11px">Choose a different name</button></p>';
		buf += '</div>';
		return buf;
	};

	LoginPopup.prototype._renderRegistered = function () {
		var name = BattleLog.escapeHTML(this._nameData.username || this._nameData.userid);
		var buf = '<div class="pad">';
		buf += '<h3 style="margin-top:0;font-size:14px">Choose Your Name</h3>';
		buf += '<p style="color:#da5"><strong>' + name + '</strong> is a registered name.</p>';
		if (this._errorMsg) {
			buf += '<p class="error">' + BattleLog.escapeHTML(this._errorMsg) + '</p>';
		}
		buf += '<p><label class="label">Password:</label>';
		buf += '<input class="textbox" type="password" name="password" placeholder="Enter password" /></p>';
		buf += '<p class="buttonbar">';
		buf += '<button type="button" name="loginSubmit" class="button"><strong>Login</strong></button> ';
		buf += '<button type="button" name="backToChoose" class="button">Try a different name</button>';
		buf += '</p>';
		buf += '</div>';
		return buf;
	};

	LoginPopup.prototype._renderBlocked = function () {
		var buf = '<div class="pad">';
		buf += '<h3 style="margin-top:0;font-size:14px">Choose Your Name</h3>';
		buf += '<p class="error">This name is not available.</p>';
		buf += '<p class="buttonbar"><button type="button" name="backToChoose" class="button">Try a different name</button></p>';
		buf += '</div>';
		return buf;
	};

	LoginPopup.prototype._renderLoading = function () {
		return '<div class="pad"><p style="text-align:center;padding:20px;color:#888"><i class="fa fa-spinner fa-spin"></i> Loading...</p></div>';
	};

	// ============================================================
	// Actions
	// ============================================================

	LoginPopup.prototype._onBackToChoose = function () {
		this._loginState = 'choose';
		this._errorMsg = '';
		this._nameData = null;
		this._renderLogin();
	};

	LoginPopup.prototype._onCheckName = function () {
		var name = (this.$('input[name=username]').val() || '').trim();
		if (!name) {
			this._errorMsg = 'Please enter a username.';
			this._renderLogin();
			return;
		}
		var id = toID(name);
		if (id.length < 1 || id.length > 18) {
			this._errorMsg = 'Username must be 1-18 characters.';
			this._renderLogin();
			return;
		}

		this._loginState = 'loading';
		this._errorMsg = '';
		this._renderLogin();

		var self = this;
		$.ajax({
			url: LOGINSERVER,
			method: 'POST',
			data: { act: 'checkname', name: name },
			dataType: 'text',
			success: function (raw) {
				var result = parseResponse(raw);
				if (!result || result.actionerror) {
					self._loginState = 'choose';
					self._errorMsg = (result && result.actionerror) || 'Could not check name. Try again.';
					self._renderLogin();
					return;
				}
				self._nameData = result;
				if (result.blocked) self._loginState = 'blocked';
				else if (result.registered) self._loginState = 'registered';
				else self._loginState = 'available';
				self._renderLogin();
			},
			error: function () {
				self._loginState = 'choose';
				self._errorMsg = 'Could not reach the login server.';
				self._renderLogin();
			},
		});
	};

	LoginPopup.prototype._onRegister = function () {
		var password = this.$('input[name=password]').val() || '';
		var cpassword = this.$('input[name=cpassword]').val() || '';
		var name = this._nameData.username || '';
		var challstr = getChallstr();

		if (!password || password.length < 5) {
			this._errorMsg = 'Password must be at least 5 characters.';
			this._renderLogin(); return;
		}
		if (password !== cpassword) {
			this._errorMsg = 'Passwords do not match.';
			this._renderLogin(); return;
		}
		if (!challstr) {
			this._errorMsg = 'Not connected. Refresh the page.';
			this._renderLogin(); return;
		}

		this._loginState = 'loading';
		this._errorMsg = '';
		this._renderLogin();

		var self = this;
		$.ajax({
			url: LOGINSERVER,
			method: 'POST',
			data: {
				act: 'register',
				username: name,
				password: password,
				cpassword: cpassword,
				captcha: 'pikachu',
				challstr: challstr,
			},
			dataType: 'text',
			success: function (raw) {
				var result = parseResponse(raw);
				if (!result || result.actionerror) {
					self._loginState = 'available';
					self._errorMsg = (result && result.actionerror) || 'Registration failed.';
					self._renderLogin();
					return;
				}
				if (result.assertion && result.actionsuccess) {
					finishLogin(result.curuser ? result.curuser.username : name, result.assertion);
					self.close();
				} else {
					self._loginState = 'available';
					self._errorMsg = 'Registration failed.';
					self._renderLogin();
				}
			},
			error: function () {
				self._loginState = 'available';
				self._errorMsg = 'Could not reach the login server.';
				self._renderLogin();
			},
		});
	};

	LoginPopup.prototype._onGuestLogin = function () {
		var name = this._nameData ? this._nameData.username : '';
		if (!name) return;
		var challstr = getChallstr();
		if (!challstr) {
			this._errorMsg = 'Not connected. Refresh the page.';
			this._renderLogin(); return;
		}

		this._loginState = 'loading';
		this._renderLogin();

		var self = this;
		$.ajax({
			url: LOGINSERVER,
			method: 'POST',
			data: { act: 'getassertion', userid: toID(name), challstr: challstr },
			dataType: 'text',
			success: function (raw) {
				var assertion = (raw || '').trim();
				if (assertion.charAt(0) === ']') assertion = assertion.substr(1);
				assertion = assertion.trim();
				if (!assertion || assertion.startsWith(';')) {
					var errMsg = assertion.startsWith(';;') ? assertion.substr(2) : 'Could not use this name.';
					self._loginState = 'choose';
					self._errorMsg = errMsg;
					self._renderLogin();
					return;
				}
				finishLogin(name, assertion);
				self.close();
			},
			error: function () {
				self._loginState = 'choose';
				self._errorMsg = 'Could not reach the login server.';
				self._renderLogin();
			},
		});
	};

	LoginPopup.prototype._onLoginSubmit = function () {
		var password = this.$('input[name=password]').val() || '';
		var name = this._nameData.username || '';
		var challstr = getChallstr();

		if (!password) {
			this._errorMsg = 'Please enter your password.';
			this._renderLogin(); return;
		}
		if (!challstr) {
			this._errorMsg = 'Not connected. Refresh the page.';
			this._renderLogin(); return;
		}

		this._loginState = 'loading';
		this._errorMsg = '';
		this._renderLogin();

		var self = this;
		$.ajax({
			url: LOGINSERVER,
			method: 'POST',
			data: { act: 'login', name: name, pass: password, challstr: challstr },
			dataType: 'text',
			success: function (raw) {
				var result = parseResponse(raw);
				if (!result || result.actionerror) {
					self._loginState = 'registered';
					self._errorMsg = (result && result.actionerror) || 'Login failed.';
					self._renderLogin();
					return;
				}
				if (!result.actionsuccess) {
					self._loginState = 'registered';
					self._errorMsg = 'Incorrect username or password.';
					self._renderLogin();
					return;
				}
				finishLogin(result.curuser ? result.curuser.username : name, result.assertion);
				self.close();
			},
			error: function () {
				self._loginState = 'registered';
				self._errorMsg = 'Could not reach the login server.';
				self._renderLogin();
			},
		});
	};

	LoginPopup.prototype._onOAuthLogin = function () {
		this.close();
		if (window.SmogonOAuth && SmogonOAuth.login) {
			SmogonOAuth.login();
		} else {
			app.addPopupMessage('OAuth not available. Refresh and try again.');
		}
	};

	console.log('[login-custom] Custom login popup loaded');

})(jQuery);
