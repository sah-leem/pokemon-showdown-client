(function ($) {

	this.Topbar = Backbone.View.extend({
		events: {
			'click a': 'click',
			'click .username': 'clickUsername',
			'click button': 'dispatchClickButton',
			'dblclick button[name=openSounds]': 'toggleMute',

			'dragstart .roomtab': 'dragStartRoom',
			'dragend .roomtab': 'dragEndRoom',
			'dragenter .roomtab': 'dragEnterRoom',
			'dragover .roomtab': 'dragEnterRoom'
		},
		initialize: function () {
			// April Fool's 2016 - Digimon Showdown
			// this.$el.html('<img class="logo" src="' + Dex.resourcePrefix + 'sprites/afd/digimonshowdown.png" alt="Digimon Showdown! (beta)" width="146" height="38" style="display:block;margin:auto;margin-top:8px;" /><div class="maintabbarbottom"></div><div class="tabbar maintabbar"><div class="inner"></div></div><div class="userbar"></div>');
			this.$el.html('<img class="logo" src="pokemonshowdownbeta.png?v=2" srcset="' + 'pokemonshowdownbeta@2x.png?v=2 2x" alt="Pok&eacute;mon Showdown! (beta)" width="146" height="38" style="display:block;margin:auto;margin-top:8px;" /><div class="maintabbarbottom"></div><div class="tabbar maintabbar"><div class="inner"></div></div><div class="userbar"></div>');
			this.$tabbar = this.$('.maintabbar .inner');
			// this.$sidetabbar = this.$('.sidetabbar');
			this.$userbar = this.$('.userbar');
			this.dragging = false;
			this.updateTabbar();

			app.user.on('change', this.updateUserbar, this);
			this.updateUserbar();
		},

		// userbar
		updateUserbar: function () {
			var buf = '';
			var name = ' ' + app.user.get('name');
			var away = app.user.get('away');
			var status = app.user.get('status');
			var color = away ? 'color:#888;' : BattleLog.hashColor(app.user.get('userid'));
			if (!app.user.loaded) {
				buf = '<button disabled class="button">' + I18n.t('Loading...') + '</button>';
			} else if (app.user.get('named')) {
				buf = '<span class="username" data-name="' + BattleLog.escapeHTML(name) + '"' + (away ? ' data-away="true"' : '') + (status ? 'data-status="' + BattleLog.escapeHTML(status) + '"' : '') + ' style="' + color + '"><i class="fa fa-user" style="color:' + (away ? '#888;' : '#779EC5') + '"></i> <span class="usernametext">' + BattleLog.escapeHTML(name) + '</span></span> <button class="button" name="smogonLogout" style="font-size:12px;padding:2px 8px;color:#e07060;" title="Logout"><i class="fa fa-sign-out"></i> ' + I18n.t('Logout') + '</button>';
			} else {
				buf = '<button name="login" class="button">' + I18n.t('Choose name') + '</button>';
			}
			buf += ' <span class="locale-wrapper" style="position:relative;display:inline-block"><button class="icon button" name="openLocale" title="Language" aria-label="Language" style="width:auto;padding:0 6px;"><i class="fa fa-globe" style="margin:0 2px 0 0"></i><span class="locale-label" style="font-size:10px;vertical-align:1px;">' + (window.I18n ? I18n.labels[I18n.locale] || 'EN' : 'EN') + '</span></button></span>';
			buf += ' <button class="icon button" name="openSounds" title="Sound" aria-label="Sound"><i class="' + (Dex.prefs('mute') ? 'fa fa-volume-off' : 'fa fa-volume-up') + '"></i></button> <button class="icon button" name="openOptions" title="Options" aria-label="Options"><i class="fa fa-cog"></i></button>';
			this.$userbar.html(buf);
		},
		login: function () {
			app.addPopup(LoginPopup);
		},
			smogonLogout: function () {
				if (window.SmogonOAuth) SmogonOAuth.clearToken();
				try { localStorage.removeItem('ps-smogon-name'); } catch (e) {}
				app.user.logout();
			},
		openLocale: function () {
		var $existing = $('.locale-dropdown');
		if ($existing.length) {
			$existing.remove();
			return;
		}
		if (!window.I18n) return;
		var buf = '<div class="locale-dropdown ps-popup" style="position:absolute;top:30px;right:0;min-width:140px;padding:6px 0;z-index:10000;">';
		for (var code in I18n.supported) {
			var isActive = code === I18n.locale;
			buf += '<a class="locale-option" data-locale="' + code + '" style="display:block;padding:5px 14px;color:' + (isActive ? '#4488cc' : 'inherit') + ';font-size:10pt;font-weight:' + (isActive ? 'bold' : 'normal') + ';cursor:pointer;text-decoration:none;">';
			buf += (isActive ? '<i class="fa fa-check" style="width:16px;color:#4488cc;font-size:10px;"></i> ' : '<i style="display:inline-block;width:16px;"></i> ') + I18n.supported[code];
			buf += '</a>';
		}
		buf += '</div>';
		this.$('.locale-wrapper').append(buf);
		var self = this;
		this.$('.locale-option').on('click', function () {
			I18n.setLocale($(this).data('locale'));
			$('.locale-dropdown').remove();
		});
		setTimeout(function () {
			$(document).one('click', function () {
				$('.locale-dropdown').remove();
			});
		}, 0);
	},
	openSounds: function () {
			app.addPopup(SoundsPopup);
		},
		openOptions: function () {
			app.addPopup(OptionsPopup);
		},
		clickUsername: function (e) {
			e.preventDefault();
			e.stopPropagation();
			var name = $(e.currentTarget).data('name');
			app.addPopup(UserPopup, { name: name, sourceEl: e.currentTarget });
		},
		toggleMute: function () {
			var muted = !Dex.prefs('mute');
			Storage.prefs('mute', muted);
			BattleSound.setMute(muted);
			app.topbar.$('button[name=openSounds]').html('<i class="' + (muted ? 'fa fa-volume-off' : 'fa fa-volume-up') + '"></i>');
		},

		// tabbar
		renderRoomTab: function (room, id) {
			if (!room && id !== 'rooms') return '';
			if (!id) id = room.id;
			var buf = '<li><a class="roomtab button' + (app.curRoom === room || app.curSideRoom === room ? ' cur' : '') + (room && room.notificationClass || '') + (id === '' || id === 'rooms' ? '' : ' closable') + '" href="' + app.root + id + '"';
			if (room && room.notifications) {
				var title = '';
				for (var tag in room.notifications) {
					if (room.notifications[tag].title) title += room.notifications[tag].title + '\n';
					if (room.notifications[tag].body) title += room.notifications[tag].body + '\n';
				}
				if (title) buf += ' title="' + BattleLog.escapeHTML(title) + '"';
			}
			switch (room ? room.type : id) {
			case '':
			case 'mainmenu':
				return buf + '><i class="fa fa-home"></i> <span>' + I18n.t('Home') + '</span></a></li>';
			case 'teambuilder':
				return buf + '><i class="fa fa-pencil-square-o"></i> <span>' + I18n.t('Teambuilder') + '</span></a><button class="closebutton" name="closeRoom" value="' + 'teambuilder" aria-label="Close"><i class="fa fa-times-circle"></i></button></li>';
			case 'ladder':
				return buf + '><i class="fa fa-list-ol"></i> <span>' + I18n.t('Ladder') + '</span></a><button class="closebutton" name="closeRoom" value="' + 'ladder" aria-label="Close"><i class="fa fa-times-circle"></i></button></li>';
			case 'resources':
				return buf + '><i class="fa fa-question-circle"></i> <span>' + I18n.t('Resources') + '</span></a><button class="closebutton" name="closeRoom" value="' + 'resources" aria-label="Close"><i class="fa fa-times-circle"></i></button></li>';
			case 'battles':
				return buf + '><i class="fa fa-caret-square-o-right"></i> <span>' + I18n.t('Battles') + '</span></a><button class="closebutton" name="closeRoom" value="' + 'battles" aria-label="Close"><i class="fa fa-times-circle"></i></button></li>';
			case 'rooms':
				return buf + ' aria-label="Join chatroom"><i class="fa fa-plus" style="margin:7px auto -6px auto"></i> <span>&nbsp;</span></a></li>';
			case 'battle':
				var name = BattleLog.escapeHTML(room.title);
				var offset = id.startsWith('game-') ? 5 : 7;
				var idChunks = id.substr(offset).split('-');
				var formatid;
				if (idChunks.length <= 1) {
					if (idChunks[0] === 'uploadedreplay') formatid = 'Uploaded Replay';
				} else {
					formatid = idChunks[0];
				}
				if (!name) {
					var p1 = (room.battle && room.battle.p1 && room.battle.p1.name) || '';
					var p2 = (room.battle && room.battle.p2 && room.battle.p2.name) || '';
					if (p1 && p2) {
						name = '' + BattleLog.escapeHTML(p1) + ' v. ' + BattleLog.escapeHTML(p2);
					} else if (p1 || p2) {
						name = '' + BattleLog.escapeHTML(p1) + BattleLog.escapeHTML(p2);
					} else {
						name = I18n.t('(empty room)');
					}
				}
				return buf + ' draggable="true"><i class="text">' + BattleLog.escapeFormat(formatid) + '</i><span>' + name + '</span></a><button class="closebutton" name="closeRoom" value="' + id + '" aria-label="Close"><i class="fa fa-times-circle"></i></a></li>';
			case 'chat':
				return buf + ' draggable="true"><i class="fa fa-comment-o"></i> <span>' + (I18n.t(room.title || (id === 'lobby' ? 'Lobby' : id))) + '</span></a><button class="closebutton" name="closeRoom" value="' + id + '" aria-label="Close"><i class="fa fa-times-circle"></i></a></li>';
			case 'html':
			default:
				if (room.title && room.title.charAt(0) === '[') {
					var closeBracketIndex = room.title.indexOf(']');
					if (closeBracketIndex > 0) {
						return buf + ' draggable="true"><i class="text">' + BattleLog.escapeHTML(room.title.slice(1, closeBracketIndex)) + '</i><span>' + BattleLog.escapeHTML(room.title.slice(closeBracketIndex + 1)) + '</span></a><button class="closebutton" name="closeRoom" value="' + id + '" aria-label="Close"><i class="fa fa-times-circle"></i></a></li>';
					}
				}
				return buf + ' draggable="true"><i class="fa fa-file-text-o"></i> <span>' + (BattleLog.escapeHTML(room.title) || id) + '</span></a><button class="closebutton" name="closeRoom" value="' + id + '" aria-label="Close"><i class="fa fa-times-circle"></i></a></li>';
			}
		},
		updateTabbar: function () {
			if ($(window).width() < 420) return this.updateTabbarMini();
			this.$('.logo').show();
			this.$('.maintabbar').removeClass('minitabbar');

			var buf = '<ul>' + (
				this.renderRoomTab(app.rooms['']) +
				this.renderRoomTab(app.rooms['teambuilder']) +
				this.renderRoomTab(app.rooms['ladder']) +
				this.renderRoomTab(app.rooms['resources'])
			) + '</ul>';
			var sideBuf = '';

			var notificationCount = app.rooms[''].notifications ? 1 : 0;
			if (app.roomList.length) {
				buf += '<ul>';
				for (var i = 0; i < app.roomList.length; i++) {
					var room = app.roomList[i];
					if (room.notifications) notificationCount++;
					buf += this.renderRoomTab(room);
				}
				buf += '</ul>';
			}

			for (var i = 0; i < app.sideRoomList.length; i++) {
				var room = app.sideRoomList[i];
				if (room.notifications) notificationCount++;
				sideBuf += this.renderRoomTab(room);
			}
			if (window.nodewebkit) {
				if (nwWindow.setBadgeLabel) nwWindow.setBadgeLabel(notificationCount ? '' + notificationCount : '');
			} else {
				var $favicon = $('#dynamic-favicon');
				if (!!$favicon.data('on') !== !!notificationCount) {
					if (notificationCount) {
						$favicon.attr('href', Dex.resourcePrefix + '/favicon-notify.ico');
						$favicon.data('on', '1');
					} else {
						$favicon.attr('href', Dex.resourcePrefix + '/favicon.ico');
						$favicon.data('on', '');
					}
				}
			}
			sideBuf += this.renderRoomTab(app.rooms['rooms'], 'rooms');
			var margin = 0;
			if (sideBuf) {
				if (app.curSideRoom) {
					margin = app.curSideRoom.leftWidth - 144;
					buf += '<ul class="siderooms" style="float:none;margin-left:' + margin + 'px">' + sideBuf + '</ul>';
				} else {
					buf += '<ul>' + sideBuf + '</ul>';
				}
			}
			this.$tabbar.html(buf);
			var $lastUl = this.$tabbar.children().last();
			var $lastLi = $lastUl.children().last();
			var offset = $lastLi.offset();
			var width = $lastLi.outerWidth();
			// 166 here is the difference between the .maintabbar's right margin and the a.button's right margin.
			var overflow = offset.left + width + 166 - $(window).width();
			if (app.curSideRoom && overflow > 0) {
				margin -= overflow;
				$lastUl.css('margin-left', margin + 'px');
				offset = $lastLi.offset();
				overflow = offset.left + width + 166 - $(window).width();
			}
			if (offset.top >= 37 || overflow > 0) {
				this.$tabbar.append('<div class="overflow" aria-hidden="true"><button name="tablist" class="button" aria-label="More"><i class="fa fa-caret-down"></i></button></div>');
			}

			if (app.rooms['']) app.rooms[''].updateRightMenu();
		},
		updateTabbarMini: function () {
			this.$('.logo').hide();
			this.$('.maintabbar').addClass('minitabbar');
			var notificationClass = '';
			for (var i in app.rooms) {
				if (app.rooms[i] !== app.curRoom && app.rooms[i].notificationClass === ' notifying') notificationClass = ' notifying';
			}
			var buf = '<ul><li><a class="button minilogo' + notificationClass + '" href="' + app.root + '"><img src="' + Dex.resourcePrefix + 'favicon-256.png" width="32" height="32" alt="Pok&eacute;mon Showdown! (beta)" /><i class="fa fa-caret-down" style="display:inline-block"></i></a></li></ul>';

			buf += '<ul>' + this.renderRoomTab(app.curRoom) + '</ul>';

			this.$tabbar.html(buf);

			if (app.rooms['']) app.rooms[''].updateRightMenu();
		},
		dispatchClickButton: function (e) {
			var target = e.currentTarget;
			if (target.name) {
				app.dismissingSource = app.dismissPopups();
				app.dispatchingButton = target;
				e.preventDefault();
				e.stopImmediatePropagation();
				this[target.name](target.value, target, e);
				delete app.dismissingSource;
				delete app.dispatchingButton;
			}
		},
		click: function (e) {
			if (e.cmdKey || e.metaKey || e.ctrlKey) return;
			e.preventDefault();
			var $target = $(e.currentTarget);
			if ($target.hasClass('minilogo')) {
				app.addPopup(TabListPopup, { sourceEl: e.currentTarget });
				return;
			}
			var id = $target.attr('href');
			if (id.substr(0, app.root.length) === app.root) {
				id = id.substr(app.root.length);
			}
			if ($target.hasClass('closebutton')) {
				app.leaveRoom(id, e);
			} else {
				app.joinRoom(id);
			}
		},
		closeRoom: function (roomid, button, e) {
			app.leaveRoom(roomid, e);
		},
		tablist: function () {
			app.addPopup(TabListPopup);
		},

		// drag and drop

		roomidOf: function (room) {
			return room.id;
		},

		dragStartRoom: function (e) {
			var target = e.currentTarget;
			var dataTransfer = e.originalEvent.dataTransfer;

			var elWidth = $(e.currentTarget).outerWidth();

			dataTransfer.effectAllowed = 'all';
			// by default, Chrome displays links as a URL when dragging
			// this uses a hack to force it to drag the tab
			app.draggingOffsetX = Math.floor(elWidth / 2);
			app.draggingOffsetY = 18;
			dataTransfer.setDragImage(target, app.draggingOffsetX, app.draggingOffsetY);

			var roomRef = $(target).attr('href');
			app.draggingRoomList = app.roomList.map(this.roomidOf).concat('|').concat(app.sideRoomList.map(this.roomidOf));
			app.draggingLoc = app.draggingRoomList.indexOf(roomRef.slice(1));
			if (app.draggingLoc < 0) {
				// can't drag
				return;
			}

			app.dragging = roomRef;
			app.draggingRoom = null;
			app.$dragging = null;

			var iPipe = app.draggingRoomList.indexOf('|');
			app.draggingSideRoom = (app.draggingLoc > iPipe);

			setTimeout(function () {
				$(target).css('opacity', 0.5);
			}, 0);

			// console.log('dragstart: ' + app.dragging);
		},

		dragEnterRoom: function (e) {
			if (!app.dragging || typeof app.dragging !== 'string') return;
			var roomid = $(e.currentTarget).attr('href').slice(1);
			if (app.dragging.slice(1) === roomid) return;
			var i = app.draggingRoomList.indexOf(roomid);
			var iPipe = app.draggingRoomList.indexOf('|');
			if (iPipe < 0) return; // bug?

			if (!app.$dragging) {
				// the dragging element needs to stay in the DOM, or the dragEnd
				// event won't fire (at least when I tested in Chrome)
				app.$dragging = this.$('a.roomtab[href="' + app.dragging + '"]');
				this.$el.append(app.$dragging);
				app.$dragging.hide();
			} else if (app.draggingLastRoom === roomid) {
				if (app.draggingOffsetX > 0) {
					// dragged right, don't drag back if we're still going right
					if (e.originalEvent.pageX - app.draggingOffsetX >= -5) return;
				} else {
					// dragged left, don't drag back if we're still going left
					if (e.originalEvent.pageX + app.draggingOffsetX <= 5) return;
				}
			}

			if (roomid === 'rooms') i = app.draggingRoomList.length;
			if (i < 0) i = 0;

			var draggingRight = (i > app.draggingLoc);
			if (iPipe > app.draggingLoc && i > iPipe) draggingRight = false;
			app.draggingOffsetX = e.originalEvent.pageX * (draggingRight ? 1 : -1);
			app.draggingLastRoom = roomid;

			// remove tab from old position
			var room;
			if (app.draggingLoc < iPipe) {
				// old position is in left list
				room = app.roomList.splice(app.draggingLoc, 1)[0];
				iPipe--;
			} else {
				// old position is in right list
				room = app.sideRoomList.splice(app.draggingLoc - iPipe - 1, 1)[0];
			}
			if (app.draggingLoc < i) i--;

			// add tab to new position
			if (draggingRight) i++; // add after when dragging right
			if (i <= iPipe) {
				// insert into left list
				app.roomList.splice(i, 0, room);
			} else {
				// insert into right list
				app.sideRoomList.splice(i - iPipe - 1, 0, room);
			}

			app.draggingRoomList = app.roomList.map(this.roomidOf).concat('|').concat(app.sideRoomList.map(this.roomidOf));
			app.draggingLoc = app.draggingRoomList.indexOf(app.dragging.slice(1));

			this.updateTabbar();
			this.$('a.roomtab[href="' + app.dragging + '"]').css('opacity', 0.5);

			// console.log('dragenter: /' + roomid);
		},

		dragEndRoom: function (e) {
			if (!app.dragging) return;
			// console.log('dragend: ' + app.dragging);

			var room = app.rooms[app.dragging.slice(1)];
			var iPipe = app.draggingRoomList.indexOf('|');

			if (app.draggingLoc < iPipe && app.draggingSideRoom) {
				app.focusRoomLeft(room.id);
			} else if (app.draggingLoc > iPipe && !app.draggingSideRoom) {
				app.focusRoomRight(room.id);
			} else {
				this.updateTabbar();
			}

			if (room.type === 'chat') app.updateAutojoin();

			app.dragging = null;
			if (app.$dragging) app.$dragging.remove();
			app.draggingRoomList = null;
		}
	});

	var SoundsPopup = this.SoundsPopup = Popup.extend({
		initialize: function (data) {
			var buf = '';
			var muted = !!Dex.prefs('mute');
			buf += '<p class="effect-volume"><label class="optlabel">' + I18n.t('Effect volume:') + '</label>' + (muted ? '<em>(muted)</em>' : '<input type="range" min="0" max="100" step="1" name="effectvolume" value="' + this.getEffectVolume() + '" />') + '</p>';
			buf += '<p class="music-volume"><label class="optlabel">' + I18n.t('Music volume:') + '</label>' + (muted ? '<em>(muted)</em>' : '<input type="range" min="0" max="100" step="1" name="musicvolume" value="' + this.getMusicVolume() + '" />') + '</p>';
			buf += '<p class="notif-volume"><label class="optlabel">' + I18n.t('Notification volume:') + '</label>' + (muted ? '<em>(muted)</em>' : '<input type="range" min="0" max="100" step="1" name="notifvolume" value="' + this.getNotifVolume() + '" />') + '</p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="muted"' + (muted ? ' checked' : '') + ' /> Mute sounds</label></p>';
			this.$el.html(buf).css('min-width', 160);
		},
		events: {
			'change input[name=muted]': 'setMute',
			'change input[type=range]': 'updateVolume',
			'keyup input[type=range]': 'updateVolume',
			'input input[type=range]': 'updateVolume'
		},
		updateVolume: function (e) {
			var val = Number(e.currentTarget.value);
			switch (e.currentTarget.name) {
			case 'effectvolume':
				this.setEffectVolume(val);
				break;
			case 'musicvolume':
				this.setMusicVolume(val);
				break;
			case 'notifvolume':
				this.setNotifVolume(val);
				break;
			}
		},
		setMute: function (e) {
			var muted = !!e.currentTarget.checked;
			Storage.prefs('mute', muted);
			BattleSound.setMute(muted);

			if (!muted) {
				this.$('.effect-volume').html('<label class="optlabel">Effect volume:</label><input type="range" min="0" max="100" step="1" name="effectvolume" value="' + this.getEffectVolume() + '" />');
				this.$('.music-volume').html('<label class="optlabel">Music volume:</label><input type="range" min="0" max="100" step="1" name="musicvolume" value="' + this.getMusicVolume() + '" />');
				this.$('.notif-volume').html('<label class="optlabel">Notification volume:</label><input type="range" min="0" max="100" step="1" name="notifvolume" value="' + this.getNotifVolume() + '" />');
			} else {
				this.$('.effect-volume').html('<label class="optlabel">Effect volume:</label><em>(muted)</em>');
				this.$('.music-volume').html('<label class="optlabel">Music volume:</label><em>(muted)</em>');
				this.$('.notif-volume').html('<label class="optlabel">Notification volume:</label><em>(muted)</em>');
			}

			app.topbar.$('button[name=openSounds]').html('<i class="' + (muted ? 'fa fa-volume-off' : 'fa fa-volume-up') + '"></i>');
		},
		setEffectVolume: function (volume) {
			BattleSound.setEffectVolume(volume);
			Storage.prefs('effectvolume', volume);
		},
		getEffectVolume: function () {
			var volume = Dex.prefs('effectvolume');
			return typeof volume === 'number' ? volume : 50;
		},
		setMusicVolume: function (volume) {
			BattleSound.setBgmVolume(volume);
			Storage.prefs('musicvolume', volume);
		},
		getMusicVolume: function () {
			var volume = Dex.prefs('musicvolume');
			return typeof volume === 'number' ? volume : 50;
		},
		setNotifVolume: function (volume) {
			Storage.prefs('notifvolume', volume);
		},
		getNotifVolume: function () {
			var volume = Dex.prefs('notifvolume');
			return typeof volume === 'number' ? volume : 50;
		}
	});

	var OptionsPopup = this.OptionsPopup = Popup.extend({
		initialize: function (data) {
			app.user.on('change', this.update, this);
			app.send('/cmd userdetails ' + app.user.get('userid'));
			this.update();
		},
		events: {
			'change input[name=noanim]': 'setNoanim',
			'change input[name=nogif]': 'setNogif',
			'change input[name=bwgfx]': 'setBwgfx',
			'change input[name=nopastgens]': 'setNopastgens',
			'change select[name=tournaments]': 'setTournaments',
			'change select[name=language]': 'setLanguage',
			'change input[name=blockchallenges]': 'setBlockchallenges',
			'change input[name=blockpms]': 'setBlockpms',
			'change input[name=inchatpm]': 'setInchatpm',
			'change input[name=leavePopupRoom]': 'setLeavePopupRoom',
			'change input[name=temporarynotifications]': 'setTemporaryNotifications',
			'change input[name=refreshprompt]': 'setRefreshprompt',
			'change select[name=bg]': 'setBg',
			'change select[name=timestamps-lobby]': 'setTimestampsLobby',
			'change select[name=timestamps-pms]': 'setTimestampsPMs',
			'change select[name=onepanel]': 'setOnePanel',
			'change select[name=theme]': 'setTheme',
			'change input[name=logchat]': 'setLogChat',
			'change input[name=selfhighlight]': 'setSelfHighlight',
			'click img': 'avatars',
			'keydown input[name=statustext]': 'editstatus'
		},
		update: function () {
			var name = app.user.get('name');
			var avatar = app.user.get('avatar');
			var settings = app.user.get('settings');

			var buf = '';
			buf += '<p>' + (avatar ? '<img class="trainersprite" src="' + Dex.resolveAvatar(avatar) + '" width="40" height="40" style="vertical-align:middle;cursor:pointer" />' : '') + '<strong>' + BattleLog.escapeHTML(name) + '</strong></p>';
			buf += '<p><button class="button" name="avatars">' + I18n.t('Avatar...') + '</button></p>';
			if (!this.editingStatus) {
				buf += '<p><button class="button" name="editstatus">' + I18n.t('Status...') + '</button></p>';
			} else {
				buf += '<p><input name="statustext" />';
				buf += '<button class="button" name="editstatus"><i class="fa fa-pencil"></i></button></p>';
			}
			if (app.user.get('named')) {
				var registered = app.user.get('registered');
				if (registered && (registered.userid === app.user.get('userid'))) {
					buf += '<p><button class="button" name="changepassword">' + I18n.t('Password...') + '</button></p>';
				} else {
					buf += '<p><button class="button" name="register">' + I18n.t('Register') + '</button></p>';
				}
			}

			buf += '<hr />';
			buf += '<p><strong>' + I18n.t('Graphics') + '</strong></p>';
			var theme = Dex.prefs('theme');
			var colorSchemeQuerySupported = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').media !== 'not all';
			buf += '<p><label class="optlabel">Theme: <select name="theme" class="button"><option value="light"' + (!theme || theme === 'light' ? ' selected="selected"' : '') + '>' + I18n.t('Light') + '</option><option value="dark"' + (theme === 'dark' ? ' selected="selected"' : '') + '>' + I18n.t('Dark') + '</option>';
			if (colorSchemeQuerySupported) {
				buf += '<option value="system"' + (theme === 'system' ? ' selected="selected"' : '') + '>' + I18n.t('Match system theme') + '</option>';
			}
			buf += '</select></label></p>';
			var onePanel = !!Dex.prefs('onepanel');
			if ($(window).width() >= 660) {
				buf += '<p><label class="optlabel">Layout: <select name="onepanel" class="button"><option value=""' + (!onePanel ? ' selected="selected"' : '') + '>&#x25EB; ' + I18n.t('Left and right panels') + '</option><option value="1"' + (onePanel ? ' selected="selected"' : '') + '>&#x25FB; ' + I18n.t('Single panel') + '</option></select></label></p>';
			}
			buf += '<p><label class="optlabel">Background: <button class="button" name="background">' + I18n.t('Change background') + '</button></label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="noanim"' + (Dex.prefs('noanim') ? ' checked' : '') + ' />' + I18n.t(' Disable animations') + '</label></p>';
			if (navigator.userAgent.includes(' Chrome/64.')) {
				buf += '<p><label class="checkbox"><input type="checkbox" name="nogif"' + (Dex.prefs('nogif') ? ' checked' : '') + ' />' + I18n.t(' Disable GIFs for Chrome 64 bug') + '</label></p>';
			}
			buf += '<p><label class="checkbox"><input type="checkbox" name="bwgfx"' + (Dex.prefs('bwgfx') ? ' checked' : '') + ' />' + I18n.t(' Use 2D sprites instead of 3D models') + '</label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="nopastgens"' + (Dex.prefs('nopastgens') ? ' checked' : '') + ' />' + I18n.t(' Use modern sprites for past generations') + '</label></p>';

			buf += '<hr />';
			buf += '<p><strong>' + I18n.t('Chat') + '</strong></p>';
			if (Object.keys(settings).length) {
				buf += '<p><label class="checkbox"><input type="checkbox" name="blockpms"' + (settings.blockPMs ? ' checked' : '') + ' />' + I18n.t(' Block PMs') + '</label></p>';
				buf += '<p><label class="checkbox"><input type="checkbox" name="blockchallenges"' + (settings.blockChallenges ? ' checked' : '') + ' />' + I18n.t(' Block Challenges') + '</label></p>';
			}
			buf += '<p><label class="checkbox"><input type="checkbox" name="inchatpm"' + (Dex.prefs('inchatpm') ? ' checked' : '') + ' />' + I18n.t(' Show PMs in chat rooms') + '</label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="selfhighlight"' + (!Dex.prefs('noselfhighlight') ? ' checked' : '') + '> Highlight when your name is said in chat</label></p>';

			if (window.Notification) {
				buf += '<p><label class="checkbox"><input type="checkbox" name="temporarynotifications"' + (Dex.prefs('temporarynotifications') ? ' checked' : '') + ' />' + I18n.t(' Notifications disappear automatically') + '</label></p>';
			}
			buf += '<p><label class="checkbox"><input type="checkbox" name="leavePopupRoom"' + (Dex.prefs('leavePopupRoom') ? ' checked' : '') + ' />' + I18n.t(' Confirm before leaving a room') + '</label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="refreshprompt"' + (Dex.prefs('refreshprompt') ? ' checked' : '') + '> Confirm before refreshing</label></p>';
			var curLang = toID(Dex.prefs('serversettings').language) || 'english';
			var possibleLanguages = {
				"Deutsch": 'german',
				"English": 'english',
				"Español": 'spanish',
				"Français": 'french',
				"Italiano": 'italian',
				"Nederlands": 'dutch',
				"Português": 'portuguese',
				"Türkçe": 'turkish',
				"हिंदी": 'hindi',
				"日本語": 'japanese',
				"简体中文": 'simplifiedchinese',
				"中文": 'traditionalchinese'
			};
			buf += '<p><label class="optlabel">Language: <select name="language" class="button">';
			for (var name in possibleLanguages) {
				buf += '<option value="' + possibleLanguages[name] + '"' + (possibleLanguages[name] === curLang ? ' selected="selected"' : '') + '>' + name + '</option>';
			}
			buf += '</select></label></p>';

			var tours = Dex.prefs('tournaments') || 'notify';
			buf += '<p><label class="optlabel">Tournaments: <select name="tournaments" class="button"><option value="notify"' + (tours === 'notify' ? ' selected="selected"' : '') + '>' + I18n.t('Notifications') + '</option><option value="nonotify"' + (tours === 'nonotify' ? ' selected="selected"' : '') + '>' + I18n.t('No Notifications') + '</option><option value="hide"' + (tours === 'hide' ? ' selected="selected"' : '') + '>' + I18n.t('Hide') + '</option></select></label></p>';
			var timestamps = this.timestamps = (Dex.prefs('timestamps') || {});
			buf += '<p><label class="optlabel">Timestamps in chat rooms: <select name="timestamps-lobby" class="button"><option value="off">Off</option><option value="minutes"' + (timestamps.lobby === 'minutes' ? ' selected="selected"' : '') + '>[HH:MM]</option><option value="seconds"' + (timestamps.lobby === 'seconds' ? ' selected="selected"' : '') + '>[HH:MM:SS]</option></select></label></p>';
			buf += '<p><label class="optlabel">Timestamps in PMs: <select name="timestamps-pms" class="button"><option value="off">Off</option><option value="minutes"' + (timestamps.pms === 'minutes' ? ' selected="selected"' : '') + '>[HH:MM]</option><option value="seconds"' + (timestamps.pms === 'seconds' ? ' selected="selected"' : '') + '>[HH:MM:SS]</option></select></label></p>';
			buf += '<p><label class="optlabel">Chat preferences: <button name="formatting" class="button">' + I18n.t('Text formatting') + '</button></label></p>';

			if (window.nodewebkit) {
				buf += '<hr />';
				buf += '<p><strong>' + I18n.t('Desktop app') + '</strong></p>';
				buf += '<p><label class="optlabel"><input type="checkbox" name="logchat"' + (Dex.prefs('logchat') ? ' checked' : '') + '> ' + I18n.t('Log chat') + '</label></p>';
				buf += '<p id="openLogFolderButton"' + (Storage.dir ? '' : ' style="display:none"') + '><button name="openLogFolder">' + I18n.t('Open log folder') + '</button></p>';
			}

			buf += '<hr />';
			if (app.user.get('named')) {
				buf += '<p class="buttonbar" style="text-align:right"><button name="login" class="button"><i class="fa fa-pencil"></i> ' + I18n.t('Change name') + '</button> <button name="logout" class="button"><i class="fa fa-power-off"></i> ' + I18n.t('Log out') + '</button></p>';
			} else {
				buf += '<p class="buttonbar" style="text-align:right"><button name="login" class="button">' + I18n.t('Choose name') + '</button></p>';
			}
			this.$el.html(buf).css('min-width', 160);
		},
		openLogFolder: function () {
			Storage.revealFolder();
		},
		setLogChat: function (e) {
			var logchat = !!e.currentTarget.checked;
			if (logchat) {
				Storage.startLoggingChat();
				$('#openLogFolderButton').show();
			} else {
				Storage.stopLoggingChat();
			}
			Storage.prefs('logchat', logchat);
		},
		setNoanim: function (e) {
			var noanim = !!e.currentTarget.checked;
			Storage.prefs('noanim', noanim);
			Dex.loadSpriteData(noanim || Dex.prefs('bwgfx') ? 'bw' : 'xy');
		},
		setNogif: function (e) {
			var nogif = !!e.currentTarget.checked;
			Storage.prefs('nogif', nogif);
			Dex.loadSpriteData(nogif || Dex.prefs('bwgfx') ? 'bw' : 'xy');
		},
		setTheme: function (e) {
			var theme = e.currentTarget.value;
			Storage.prefs('theme', theme);
			if (theme === 'system') {
				if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
					theme = 'dark';
				} else {
					theme = 'light';
				}
			}
			$('html').toggleClass('dark', theme === 'dark');
		},
		setBwgfx: function (e) {
			var bwgfx = !!e.currentTarget.checked;
			Storage.prefs('bwgfx', bwgfx);
			Dex.loadSpriteData(bwgfx || Dex.prefs('noanim') ? 'bw' : 'xy');
		},
		setNopastgens: function (e) {
			var nopastgens = !!e.currentTarget.checked;
			Storage.prefs('nopastgens', nopastgens);
		},
		setTournaments: function (e) {
			var tournaments = e.currentTarget.value;
			Storage.prefs('tournaments', tournaments);
		},
		setLanguage: function (e) {
			app.user.updateSetting('language', e.currentTarget.value);
		},
		setBlockpms: function (e) {
			app.user.updateSetting('blockPMs', !!e.currentTarget.checked);
		},
		setBlockchallenges: function (e) {
			app.user.updateSetting('blockChallenges', !!e.currentTarget.checked);
		},
		setSelfHighlight: function (e) {
			var noselfhighlight = !e.currentTarget.checked;
			Storage.prefs('noselfhighlight', noselfhighlight);
		},
		setInchatpm: function (e) {
			var inchatpm = !!e.currentTarget.checked;
			Storage.prefs('inchatpm', inchatpm);
		},
		setTemporaryNotifications: function (e) {
			var temporarynotifications = !!e.currentTarget.checked;
			Storage.prefs('temporarynotifications', temporarynotifications);
		},
		setRefreshprompt: function (e) {
			var refreshprompt = !!e.currentTarget.checked;
			Storage.prefs('refreshprompt', refreshprompt);
		},
		setLeavePopupRoom: function (e) {
			var leavePopupRoom = !!e.currentTarget.checked;
			Storage.prefs('leavePopupRoom', leavePopupRoom);
		},
		background: function (e) {
			app.addPopup(CustomBackgroundPopup);
		},
		setOnePanel: function (e) {
			app.singlePanelMode = !!e.currentTarget.value;
			Storage.prefs('onepanel', !!e.currentTarget.value);
			app.updateLayout();
		},
		setTimestampsLobby: function (e) {
			this.timestamps.lobby = e.currentTarget.value;
			Storage.prefs('timestamps', this.timestamps);
		},
		setTimestampsPMs: function (e) {
			this.timestamps.pms = e.currentTarget.value;
			Storage.prefs('timestamps', this.timestamps);
		},
		avatars: function () {
			app.addPopup(AvatarsPopup);
		},
		editstatus: function (ev) {
			// from an input, key isn't enter
			// there's no event if it's a click fsr
			if (ev && ev.keyCode !== 13) return;
			if (!this.editingStatus) {
				this.editingStatus = true;
				this.update();
			} else {
				var $input = $('input[name=statustext]');
				var statusText = $input.val();
				if (!toID(statusText).length) {
					return;
				}

				app.send('/status ' + statusText);
				var $editButton = $('button[name=editstatus]');
				$editButton.text('Status updated!');
				$editButton.attr('disabled', true);
				$input.remove();

				this.editingStatus = false;
			}
		},
		formatting: function () {
			app.addPopup(FormattingPopup);
		},
		login: function () {
			app.addPopup(LoginPopup);
		},
		register: function () {
			app.addPopup(RegisterPopup);
		},
		changepassword: function () {
			app.addPopup(ChangePasswordPopup);
		},
		logout: function () {
			app.user.logout();
			this.close();
		}
	});

	var FormattingPopup = this.FormattingPopup = Popup.extend({
		events: {
			'change input': 'setOption'
		},
		initialize: function () {
			var cur = this.chatformatting = Dex.prefs('chatformatting') || {};
			var buf = '<p>Usable formatting:</p>';
			var ctrlPlus = '<kbd>' + (navigator.platform === 'MacIntel' ? 'Cmd' : 'Ctrl') + '</kbd> + ';
			buf += '<p>**<strong>bold</strong>** (' + ctrlPlus + '<kbd>B</kbd>)</p>';
			buf += '<p>__<em>italics</em>__ (' + ctrlPlus + '<kbd>I</kbd>)</p>';
			buf += '<p>``<code>code formatting</code>`` (<kbd>Ctrl</kbd> + <kbd>`</kbd>)</p>';
			buf += '<p>~~<s>strikethrough</s>~~</p>';
			buf += '<p>^^<sup>superscript</sup>^^</p>';
			buf += '<p>\\\\<sub>subscript</sub>\\\\</p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="greentext" ' + (cur.hidegreentext ? 'checked' : '') + ' /> Suppress <span class="greentext">&gt;' + ['meme arrows', 'greentext', 'quote formatting'][Math.floor(Math.random() * 3)] + '</span></label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="me" ' + (cur.hideme ? 'checked' : '') + ' /> Suppress <code>/me</code> <em>action formatting</em></label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="spoiler" ' + (cur.hidespoiler ? 'checked' : '') + ' /> Auto-show spoilers: <span class="spoiler">these things</span></label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="links" ' + (cur.hidelinks ? 'checked' : '') + ' /> Make [[clickable links]] unclickable</label></p>';
			buf += '<p><label class="checkbox"><input type="checkbox" name="interstice"' + (cur.hideinterstice ? 'checked' : '') + ' /> Don\'t warn for untrusted links</label></p>';
			buf += '<p><button name="close" class="button">Done</button></p>';
			this.$el.html(buf);
		},
		setOption: function (e) {
			var name = $(e.currentTarget).prop('name');
			this.chatformatting['hide' + name] = !!e.currentTarget.checked;
			Storage.prefs('chatformatting', this.chatformatting);
		}
	});

	var AvatarsPopup = this.AvatarsPopup = Popup.extend({
		type: 'semimodal',
		initialize: function () {
			var cur = +app.user.get('avatar');
			var buf = '';
			buf += '<p>Choose an avatar or <button name="close" class="button">' + I18n.t('Cancel') + '</button></p>';

			buf += '<div class="avatarlist">';
			for (var i = 1; i <= 293; i++) {
				if (i === 162 || i === 168) continue;
				var offset = '-' + (((i - 1) % 16) * 80 + 1) + 'px -' + (Math.floor((i - 1) / 16) * 80 + 1) + 'px';
				buf += '<button name="setAvatar" value="' + i + '" style="background-position:' + offset + '" class="option pixelated' + (i === cur ? ' cur' : '') + '" title="/avatar ' + i + '"></button>';
			}
			buf += '</div><div style="clear:left"></div>';

			buf += '<p><button name="close" class="button">Cancel</button></p>';
			this.$el.html(buf).css('max-width', 780);
		},
		setAvatar: function (avatar) {
			// Replace avatar number with name before sending it to the server, only the client knows what to do with the numbers
			if (window.BattleAvatarNumbers && Object.prototype.hasOwnProperty.call(window.BattleAvatarNumbers, avatar)) {
				avatar = window.BattleAvatarNumbers[avatar];
			}
			app.send('/avatar ' + avatar);
			app.send('/cmd userdetails ' + app.user.get('userid'));
			Storage.prefs('avatar', avatar);
			this.close();
		}
	});

	var TabListPopup = this.TabListPopup = Popup.extend({
		type: 'semimodal',
		renderRooms: function (rooms) {
			var buf = '';
			for (var i = 0; i < rooms.length; i++) buf += app.topbar.renderRoomTab(rooms[i]);
			return buf;
		},
		initialize: function () {
			var curId = (app.curRoom ? app.curRoom.id : '');
			var curSideId = (app.curSideRoom ? app.curSideRoom.id : '');

			var buf = '<ul>' + this.renderRooms([app.rooms[''], app.rooms['teambuilder'], app.rooms['ladder']]) + '</ul>';
			if (app.roomList.length) buf += this.renderRooms(app.roomList);
			var sideBuf = this.renderRooms(app.sideRoomList);
			sideBuf += '<li><a class="button' + (curId === 'rooms' || curSideId === 'rooms' ? ' cur' : '') + '" href="' + app.root + 'rooms"><i class="fa fa-plus"></i> <span>&nbsp;</span></a></li>';
			if (sideBuf) {
				buf += '<ul>' + sideBuf + '</ul>';
			}
			this.$el.addClass('tablist').html(buf);
		},
		events: {
			'click a': 'click'
		},
		closeRoom: function (roomid, button, e) {
			app.leaveRoom(roomid);
			this.initialize();
		},
		click: function (e) {
			if (e.cmdKey || e.metaKey || e.ctrlKey) return;
			e.preventDefault();
			var $target = $(e.currentTarget);
			var id = $target.attr('href');
			if (id.substr(0, app.root.length) === app.root) {
				id = id.substr(app.root.length);
			}
			if ($target.hasClass('closebutton')) {
				app.leaveRoom(id);
				this.initialize();
			} else {
				this.close();
				app.focusRoom(id);
			}
		}
	});

	var CustomBackgroundPopup = this.CustomBackgroundPopup = Popup.extend({
		events: {
			'change input[name=bgfile]': 'setBgFile'
		},
		initialize: function () {
			var buf = '';
			var cur = Storage.bg.id;
			buf += '<p><strong>Default</strong></p>';
			buf += '<div class="bglist">';

			buf += '<button name="setBg" value="" class="option' + (!cur ? ' cur' : '') + '"><strong style="background:#888888;color:white;padding:16px 18px;display:block;font-size:12pt">' + (location.host === Config.routes.client ? 'Random' : 'Default') + '</strong></button>';

			buf += '</div><div style="clear:left"></div>';
			buf += '<p><strong>Official</strong></p>';
			buf += '<div class="bglist">';

			buf += '<button name="setBg" value="absol" class="option' + (cur === 'absol' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-absol.jpg) center/cover no-repeat"></span>Absol</button>';
			buf += '<button name="setBg" value="celebi" class="option' + (cur === 'celebi' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-celebi.jpg) center/cover no-repeat"></span>Celebi</button>';
			buf += '<button name="setBg" value="heatrotom" class="option' + (cur === 'heatrotom' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-heatrotom.jpg) center/cover no-repeat"></span>Heat Rotom</button>';
			buf += '<button name="setBg" value="jirachi" class="option' + (cur === 'jirachi' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-jirachi.jpg) center/cover no-repeat"></span>Jirachi</button>';
			buf += '<button name="setBg" value="manaphy" class="option' + (cur === 'manaphy' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-manaphy.jpg) center/cover no-repeat"></span>Manaphy</button>';
			buf += '<button name="setBg" value="oshawott" class="option' + (cur === 'oshawott' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-oshawott.jpg) center/cover no-repeat"></span>Oshawott</button>';
			buf += '<button name="setBg" value="popplio" class="option' + (cur === 'popplio' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-popplio.jpg) center/cover no-repeat"></span>Popplio</button>';
			buf += '<button name="setBg" value="smoochum" class="option' + (cur === 'smoochum' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-smoochum.jpg) center/cover no-repeat"></span>Smoochum</button>';
			buf += '<button name="setBg" value="victini" class="option' + (cur === 'victini' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-victini.jpg) center/cover no-repeat"></span>Victini</button>';
			buf += '<button name="setBg" value="washrotom" class="option' + (cur === 'washrotom' ? ' cur' : '') + '"><span class="bg" style="background:url(/fx/client-bg-washrotom.jpg) center/cover no-repeat"></span>Wash Rotom</button>';

			buf += '</div><div style="clear:left"></div>';
			buf += '<p><strong>Custom</strong></p>';
			buf += '<p>Drag and drop an image to PS (the background settings don\'t need to be open), or upload:</p>';
			buf += '<p><input type="file" accept="image/*" name="bgfile"></p>';
			buf += '<p class="bgstatus"></p>';

			buf += '<p><button name="close" class="button"><strong>Done</strong></button></p>';

			// April Fool's 2016 - background change disabling
			// buf = '<p>Sorry, the background chooser is experiencing technical difficulties. Please try again tomorrow!</p><p><button name="close"><strong>Done</strong></button></p>';

			this.$el.css('max-width', 448).html(buf);
			this.$el.html(buf);
		},
		setBg: function (bgid) {
			var bgUrl = (bgid === 'solidblue' ? '#344b6c' : Dex.resourcePrefix + 'fx/client-bg-' + bgid + '.jpg');
			Storage.bg.set(bgUrl, bgid);
			this.$('.cur').removeClass('cur');
			this.$('button[value="' + bgid + '"]').addClass('cur');
		},
		setBgFile: function (e) {
			$('.bgstatus').text('Changing background image...');
			var file = e.currentTarget.files[0];
			CustomBackgroundPopup.readFile(file, this);
		}
	});
	CustomBackgroundPopup.readFile = function (file, popup) {
		var reader = new FileReader();
		reader.onload = function (e) {
			if (String(e.target.result).length > 4200000) {
				if (popup) {
					$('.bgstatus').html('<strong style="background:red;color:white;padding:1px 4px;border-radius:4px;display:block">Image is too large and can\'t be saved. It should be under 3.5MB or so.</strong>');
				} else {
					app.addPopupMessage("Image is too large and can't be saved. It should be under 3.5MB or so.");
				}
			} else if (popup) {
				$('.bgstatus').html('Saved');
				popup.$('.cur').removeClass('cur');
				Storage.bg.set(e.target.result, 'custom');
			} else {
				app.addPopup(ConfirmBackgroundPopup, { bgUrl: e.target.result });
			}
		};
		reader.readAsDataURL(file);
	};

	var ConfirmBackgroundPopup = this.ConfirmBackgroundPopup = Popup.extend({
		initialize: function (data) {
			var buf = '<br>';
			buf += '<p><img src="' + data.bgUrl + '" style="display:block;margin:auto;max-width:90%;max-height:500px"></p>';
			buf += '<p class="buttonbar"><button name="setBg" value="' + data.bgUrl + '" class="button"><strong>Change background</strong></button> ';
			buf += '<button name="close" class="button">Cancel</button></p>';

			this.$el.css('max-width', 485).html(buf);
			this.$el.html(buf);
		},
		setBg: function (bgUrl) {
			this.close();
			Storage.bg.set(bgUrl, 'custom');
		}
	});

        var LoginPopup = this.LoginPopup = Popup.extend({
                type: 'semimodal',
                initialize: function (data) {
                        var buf = '<form>';

                        if (data.error) {
                                buf += '<p class="error">' + BattleLog.escapeHTML(data.error) + '</p>';
                        } else if (data.reason) {
                                buf += '<p>' + BattleLog.parseMessage(data.reason) + '</p>';
                        }

                        buf += '<h3 style="margin-top:0; font-size:14px">Choose a name</h3>';
                        buf += '<p><label class="label"><input class="textbox autofocus" type="text" name="username" /></label></p>';
                        buf += '<p style="color:#888;font-size:11px">Just pick a name. You can register a password later to keep it.</p>';
                        buf += '<p class="buttonbar"><button type="submit" class="button"><strong>' + I18n.t('Choose name') + '</strong></button></p>';
                        buf += '<p style="text-align:center;color:#555;font-size:8pt;margin:8px 0"><span style="display:inline-block;width:35%;height:1px;background:#34373b;vertical-align:middle;margin-right:8px"></span>or<span style="display:inline-block;width:35%;height:1px;background:#34373b;vertical-align:middle;margin-left:8px"></span></p>';
                        buf += '<h3 style="font-size:14px">Log in with Showdown</h3>';
                        buf += '<p style="color:#888;font-size:11px">Use your Showdown account for saved teams and display name.</p>';
                        buf += '<p class="buttonbar"><button type="button" name="smogonOAuth" class="button"><i class="fa fa-sign-in"></i> <strong>' + I18n.t('Login with Showdown') + '</strong></button> <button type="button" name="close" class="button">Cancel</button></p>';
                        buf += '</form>';

                        this.$el.html(buf);
		},
		events: {
                        'click button[name=smogonOAuth]': 'smogonOAuth'
                },
                smogonOAuth: function () {
                        this.close();
                        if (window.SmogonOAuth) SmogonOAuth.login();
                },
		updateColor: function (e) {
			var name = e.currentTarget.value;
			var preview = this.$('.preview');
			var css = BattleLog.hashColor(toUserid(name)).slice(6, -1);
			preview.css('color', css);
		},
		force: function () {
			var sourceEl = this.sourceEl;
			this.close();
			app.addPopup(LoginPopup, {
				force: true,
				sourceEl: sourceEl,
				sourcePopup: app.popups[app.popups.length - 1]
			});
		},
		submit: function (data) {
			if (!$.trim(data.username)) return;
			var self = this;
			var userid = toUserid(data.username);
			// check if name is registered on Smogon before allowing guest login
			$.get('https://play.pokemonshowdown.com/action.php', {
				act: 'getassertion',
				userid: userid,
				challstr: app.user.challstr
			}, function (assertion) {
				if (assertion === ';') {
					// name is registered on Smogon - block impersonation
					self.$('p.error').remove();
					self.$('form').prepend('<p class="error">' + I18n.t('This name is registered on Showdown. Use Login with Showdown below instead.') + '</p>');
					return;
				}
				self.close();
				app.user.rename(data.username);
			}, 'text').fail(function () {
				// if Smogon check fails, allow through (don't block on network errors)
				self.close();
				app.user.rename(data.username);
			});
		}
	});

	window.LoginPopup = LoginPopup;
	var ChangePasswordPopup = this.ChangePasswordPopup = Popup.extend({
		type: 'semimodal',
		initialize: function (data) {
			var buf = '<form>';
			if (data.error) {
				buf += '<p class="error">' + data.error + '</p>';
			} else {
				buf += '<p>Change your password:</p>';
			}
			buf += '<p><label class="label">Username: <strong><input type="text" name="username" value="' + BattleLog.escapeHTML(app.user.get('name')) + '" style="color:inherit;background:transparent;border:0;font:inherit;font-size:inherit;display:block" readonly autocomplete="username" /></strong></label></p>';
			buf += '<p><label class="label">Old password: <input class="textbox autofocus" type="password" name="oldpassword" autocomplete="current-password" /></label></p>';
			buf += '<p><label class="label">New password: <input class="textbox" type="password" name="password" autocomplete="new-password" /></label></p>';
			buf += '<p><label class="label">New password (confirm): <input class="textbox" type="password" name="cpassword" autocomplete="new-password" /></label></p>';
			buf += '<p class="buttonbar"><button type="submit" class="button"><strong>Change password</strong></button> <button type="button" name="close" class="button">Cancel</button></p></form>';
			this.$el.html(buf);
		},
		submit: function (data) {
			$.post(app.user.getActionPHP(), {
				act: 'changepassword',
				oldpassword: data.oldpassword,
				password: data.password,
				cpassword: data.cpassword
			}, Storage.safeJSON(function (data) {
				if (!data) data = {};
				if (data.actionsuccess) {
					app.addPopupMessage("Your password was successfully changed.");
				} else {
					app.addPopup(ChangePasswordPopup, {
						error: data.actionerror
					});
				}
			}), 'text');
		}
	});

	var RegisterPopup = this.RegisterPopup = Popup.extend({
		type: 'semimodal',
		initialize: function (data) {
			var buf = '<form>';
			if (data.error) {
				buf += '<p class="error">' + data.error + '</p>';
			} else if (data.reason) {
				buf += '<p>' + data.reason + '</p>';
			} else {
				buf += '<p>Register your account:</p>';
			}
			buf += '<p><label class="label">Username: <strong><input type="text" name="name" value="' + BattleLog.escapeHTML(data.name || app.user.get('name')) + '" style="color:inherit;background:transparent;border:0;font:inherit;font-size:inherit;display:block" readonly autocomplete="username" /></strong></label></p>';
			buf += '<p><label class="label">Password: <input class="textbox autofocus" type="password" name="password" autocomplete="new-password" /></label></p>';
			buf += '<p><label class="label">Password (confirm): <input class="textbox" type="password" name="cpassword" autocomplete="new-password" /></label></p>';
			buf += '<p><label class="label"><img src="' + Dex.resourcePrefix + 'sprites/gen5ani/pikachu.gif" alt="An Electric-type mouse that is the mascot of the Pok\u00E9mon franchise." /></label></p>';
			buf += '<p><label class="label">What is this pokemon? <input class="textbox" type="text" name="captcha" value="' + BattleLog.escapeHTML(data.captcha) + '" /></label></p>';
			buf += '<p class="buttonbar"><button type="submit" class="button"><strong>Register</strong></button> <button type="button" name="close" class="button">Cancel</button></p></form>';
			this.$el.html(buf);
		},
		submit: function (data) {
			var name = data.name;
			var captcha = data.captcha;
			$.post(app.user.getActionPHP(), {
				act: 'register',
				username: name,
				password: data.password,
				cpassword: data.cpassword,
				captcha: captcha,
				challstr: app.user.challstr
			}, Storage.safeJSON(function (data) {
				if (!data) data = {};
				var token = data.assertion;
				if (data.curuser && data.curuser.loggedin) {
					app.user.set('registered', data.curuser);
					var name = data.curuser.username;
					app.send('/trn ' + name + ',1,' + token);
					app.addPopupMessage("You have been successfully registered.");
				} else {
					app.addPopup(RegisterPopup, {
						name: name,
						captcha: captcha,
						error: data.actionerror
					});
				}
			}), 'text');
		}
	});

	this.LoginPasswordPopup = Popup.extend({
		type: 'semimodal',
		showPassword: function () {
			var $button = this.$('button[name=showPassword]');
			var $password = this.$('input[name=password]');
			if ($password.attr('type') === "password") {
				$password.attr('type', 'text');
				$button.attr('aria-label', "Hide password");
				$button.html('<i class="fa fa-eye-slash"></i>');
			} else {
				$password.attr('type', 'password');
				$button.attr('aria-label', "Show password");
				$button.html('<i class="fa fa-eye"></i>');
			}
		},
		initialize: function (data) {
			var buf = '<form>';

			if (data.error) {
				buf += '<p class="error">' + BattleLog.escapeHTML(data.error) + '</p>';
				if (data.error.indexOf(' forced you to change ') >= 0) {
					buf += '<p>Keep in mind these rules:</p>';
					buf += '<ol>';
					buf += '<li>Usernames may not be derogatory or insulting in nature, to an individual or group (insulting yourself is okay as long as it\'s not too serious).</li>';
					buf += '<li>Usernames may not reference sexual activity, directly or indirectly.</li>';
					buf += '<li>Usernames may not impersonate a recognized user (a user with %, @, #, or & next to their name).</li>';
					buf += '</ol>';
				}
			} else if (data.reason) {
				buf += '<p>' + BattleLog.escapeHTML(data.reason) + '</p>';
			} else {
				buf += '<p class="error">The name you chose is registered.</p>';
			}

			buf += '<p>If this is your account:</p>';
			buf += '<p><label class="label">Username: <strong><input type="text" name="username" value="' + BattleLog.escapeHTML(data.username) + '" style="color:inherit;background:transparent;border:0;font:inherit;font-size:inherit;display:block" readonly autocomplete="username" /></strong></label></p>';
			if (data.special === '@gmail') {
				buf += '<div id="g_id_onload" data-client_id="912270888098-jjnre816lsuhc5clj3vbcn4o2q7p4qvk.apps.googleusercontent.com" data-context="signin" data-ux_mode="popup" data-callback="gapiCallback" data-auto_prompt="false"></div>';
				buf += '<div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="filled_blue" data-text="continue_with" data-size="large" data-logo_alignment="left" data-auto_select="true" data-itp_support="true" style="width:fit-content;margin:0 auto">[loading Google log-in button]</div>';
				buf += '<p class="buttonbar"><button name="close" class="button">Cancel</button></p>';
			} else {
				buf += '<p><label class="label">Password: <input class="textbox autofocus" type="password" name="password" autocomplete="current-password" style="width:173px"><button type="button" name="showPassword" aria-label="Show password" style="float:right;margin:-21px 0 10px;padding: 2px 6px" class="button"><i class="fa fa-eye"></i></button></label></p>';
				buf += '<p class="buttonbar"><button type="submit" class="button"><strong>Log in</strong></button> <button type="button" name="close" class="button">Cancel</button></p>';
			}

			buf += '<p class="or">or</p>';
			buf += '<p>If this is someone else\'s account:</p>';
			buf += '<p class="buttonbar"><button type="button" name="login" class="button">Choose another name</button></p>';

			buf += '</form>';
			this.$el.html(buf);

			if (data.special === '@gmail') {
				var self = this;
				window.gapiCallback = function (response) {
					app.user.passwordRename(data.username, response.credential, data.special);
					self.close();
				};

				var script = document.createElement('script');
				script.async = true;
				script.src = 'https://accounts.google.com/gsi/client';
				document.getElementsByTagName('head')[0].appendChild(script);
			}
		},
		login: function () {
			this.close();
			app.addPopup(LoginPopup);
		},
		submit: function (data) {
			this.close();
			app.user.passwordRename(data.username, data.password);
		}
	});

}).call(this, jQuery);

// i18n: re-render on locale change
if (window.I18n) {
	I18n.onChange(function () {
		if (app && app.topbar) {
			app.topbar.updateUserbar();
			app.topbar.updateTabbar();
		}
		// re-render mainmenu buttons
		if (app && app.rooms && app.rooms['']) {
			var mm = app.rooms[''];
			var $m = mm.$('.mainmenu');
			if ($m.length) {
				$m.find('.mainmenu1.big').html('<strong>' + I18n.t('Battle!') + '</strong><br /><small>' + I18n.t('Find a random opponent') + '</small>');
				$m.find('.mainmenu2').text(I18n.t('Teambuilder'));
				$m.find('.mainmenu3').text(I18n.t('Ladder'));
				$m.find('.mainmenu4').each(function () {
					var val = $(this).attr('value') || $(this).attr('name');
					if (val === '/smogtours') $(this).text(I18n.t('Tournaments'));
					else if (val === '/join view-changelog') $(this).text(I18n.t('Changelog'));
					else if (val === 'battles') $(this).text(I18n.t('Watch a battle'));
				});
				$m.find('.mainmenu5').text(I18n.t('Find a user'));
				$m.find('.mainmenu6').text(I18n.t('Friends'));
				$m.find('.mainmenu7').text(I18n.t('Info & Resources'));
			}
			var $r = mm.$('.rightmenu');
			if ($r.length) {
				$r.find('.mainmenu1').text(I18n.t('Join chat'));
			}
			// re-render labels
			var $labels = mm.$('.label');
			$labels.each(function () {
				var t = $(this).text().trim();
				if (t === 'Format:' || t === I18n.t('Format:')) $(this).text(I18n.t('Format:'));
				if (t === 'Team:' || t === I18n.t('Team:')) $(this).text(I18n.t('Team:'));
			});
			mm.$('abbr[title*="spectator"]').text(I18n.t("Don't allow spectators"));
		}
		// re-render other open rooms
		if (app && app.rooms) {
			for (var id in app.rooms) {
				if (id === '') continue;
				var room = app.rooms[id];
				if (room && room.update) {
					try { room.update(); } catch (e) {}
				}
			}
		}
	});
}
