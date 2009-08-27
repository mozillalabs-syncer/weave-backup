/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Weave.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://weave/ext/Observers.js");

let About = {
  init: function init() {
    About._log = Log4Moz.repository.getLogger("About:Weave");
    About._log.info("Loading About:Weave");

    About.refreshClientType();
    About.hideQuota();
    About._localizePage();

    [['login:start', About.onLoginStart],
     ['login:finish', About.onLoginFinish],
     ['login:error', About.onLoginError],
     ['logout:finish', About.onLogout],
     ['sync:start', About.onSyncStart],
     ['sync:finish', About.onSyncFinish],
     ['sync:error', About.onSyncError]]
     .forEach(function(i) Observers.add("weave:service:" + i[0], i[1]));

    // Make the '+' icons underneath each element more visible on mouseover
    $('#device,#status,#cloud')
      .hover(function() $(this).find('.plus-toggle').css('opacity', 1),
             function() $(this).find('.plus-toggle').css('opacity', ''));

    // FIXME: service doesn't have a getter to tell us if it's
    // syncing, so we co-opt the locked getter
    if (Weave.Service.isLoggedIn) {
      if (Weave.Service.locked)
        About.setStatus('sync');
      else
        About.setStatus('idle');
    } else {
      About.setStatus('offline');
      About.showBubble('signin');
    }
  },

  //
  // Localization
  //

  // Returns the localized string for a name (generally an element id)
  str: function str(id, extra, defaultStr) {
    try {
      return Weave.Str.about.get(id, extra);
    } catch (e) {
      return defaultStr;
    }
  },

  _l10nId: function _l10nId(element) {
    return $(element)[0].id || $(element)[0].className.split(' ')[0];
  },
  _localizeHelpTitle: function _localizeHelpTitle(item) {
    // ignore items we don't have a localized string for
    let str = About.str($(item)[0].id);
    if (!str)
      return;
    $(item).find('.help-item-title')
      .data('default', About.str($(item)[0].id))
      .html($(item).find('.help-item-title').data('default'));
  },
  _localizeFormElt: function _localizeFormElt(element) {
    $(element)
      .data('default', (About.str(About._l10nId(element), null, $(element).val())));
    if ($(element)[0].type == "password")
      $(element).data('type', 'password')[0].type = "text";
    $(element).val($(element).data('default'));
  },
  _localizeElt: function _localizeElt(element) {
    let str = About.str(About._l10nId(element));
    if (typeof(str) != 'undefined')
      $(element).html(str);
  },
  _localizePage: function _localizePage() {
    // localize forms, set default values for input boxes, setup callbacks
    $('input[type=text]:not(.no-field-helper)')
      .add('input[type=password]:not(.no-field-helper)')
      .each(function() { $(this)
                           .focus(function() About.clearField(this))
                           .blur(function() About.resetField(this)); });
    $('input')
      .each(function() About._localizeFormElt(this));

    // Localize help item titles
    $('.help-item')
      .each(function() About._localizeHelpTitle(this));

    // localize other html elts
    $('.localized,h1,p,a,label')
      .each(function() About._localizeElt(this));
  },

  // Helpers so you can easily have e.g. [username   ]
  // and clear it when you tap/click inside
  clearField: function clearField(elt) {
    if ($(elt).val() == $(elt).data("default")) {
      $(elt).val('');
      if ($(elt).data('type') == 'password')
        $(elt)[0].type = "password";
    }
  },
  resetField: function clearField(elt) {
    if ($(elt).val() == '') {
      $(elt).val($(elt).data("default"));
      if ($(elt)[0].type == "password")
        $(elt)[0].type = "text";
    }
  },

  //
  // Timers
  //
  _timers: null,
  clearTimer: function clearTimer(name) {
    if (!About._timers)
      About._timers = {};
    if (About._timers[name])
      window.clearTimeout(About._timers[name]);
  },
  setTimer: function setTimer(name, callback, ms) {
    About.clearTimer(name);
    About._timers[name] = window.setTimeout(callback, ms);
  },

  //
  // Getters
  //
  get isNewUser() {
    return !Weave.Service.username;
  },

  //
  // Weave event handlers
  //

  onLoginStart: function onLoginStart() {
    About.setStatus('signing-in');
  },
  onLoginFinish: function onLoginFinish() {
    About.setStatus('idle');
    if (!About._waitingForLogin)
      About.hideBubble();
    else
      About._waitingForLogin = false;
  },
  onLoginError: function onLoginError() {
    About.setStatus('offline');
    // fixme?
  },
  onLogout: function onLogout() {
    About.setStatus('offline');
    if (!About._waitingForLogout)
      About.showBubble('signin');
    else
      About._waitingForLogout = false;
  },
  onSyncStart: function onSyncStart() {
    About.setStatus('sync');
  },
  onSyncFinish: function onSyncFinish() {
    About.setStatus('idle');
  },
  onSyncError: function onSyncError() {
    About.setStatus('idle');
    // fixme?
  },

  //
  // Show/hide helpers for various UI pieces
  //

  // Quota meter inside the cloud
  setQuota: function setQuota(percent) {
    $('#quota-bar').show();
    $('#quota-bar').text(percent + "%");
    $('#quota-bar').css("MozBoxShadow",
      "inset rgba(141, 178, 198, 0.4) " + (percent*183/100) + "px 0px 0px, " +
      "inset rgba(141, 178, 198, 0.9) 0px 0px 6px, " +
      "inset rgba(82, 105, 118, 1) 0px 0px 1px, " +
      "rgba(255, 255, 255, 1) 0px 0px 20px");

  },
  hideQuota: function hideQuota() {
    $('#quota-bar').hide();
  },

  // Device type
  set clientType(type) {
    // we only have images for desktop and mobile atm
    if (Weave.Clients.clientType != "mobile")
      type = "desktop";
    $('#device > img')
      .attr('src', 'images/' + type + '_device.png');
  },
  refreshClientType: function refreshClientType() {
    About.clientType = Weave.Clients.clientType;
  },

  // Bubble dialog
  // Will automatically call About.onBubble_<name>() when shown
  _curBubble: null,
  get curBubble() {
    if (About._curBubble)
      return About._curBubble[0].id;
    return '';
  },
  toggleBubble: function toggleBubble(name) {
    if (About.curBubble == name) {
      About.hideBubble();
      if (!Weave.Service.isLoggedIn)
        About.showBubble('signin');
    } else {
      About.showBubble(name);
    }
  },
  showBubble: function showBubble(name) {
    if (About._curBubble)
      About._curBubble.hide();
    About.closeHelp();

    About._curBubble = $("#" + name).show();
    if (About._curBubble.find('.bubble-arrow').length == 0)
      About._curBubble.prepend('<div class="bubble-arrow"></div>');

    if (About["onBubble_" + name])
      About["onBubble_" + name]();
  },
  hideBubble: function hideBubble() {
    $('.bubble-center,.bubble-left,.bubble-right').hide();
    About._curBubble = null;
  },

  setStatus: function setStatus(status) {
    let user = '<a href="#" onclick="return About.onUsernameClick();">'
      + Weave.Service.username + '</a>';
    switch (status) {
    case "offline":
      $('#status-arrow img')[0].src = 'images/sync_disconnected_user.png';
      $('#status-1').html(About.str('status-offline'));
      $('#status-2').html(About.str('status-offline-2'));
      break;
    case "signing-in":
      $('#status-arrow img')[0].src = 'images/sync_active.png';
      $('#status-1').html(About.str('status-signing-in'));
      $('#status-2').html(About.str('status-signing-in-2'));
      break;
    case "idle":
      $('#status-arrow img')[0].src = 'images/sync_idle.png';
      $('#status-1').html(About.str('status-idle', [user]));
      $('#status-2').html(About.str('status-idle-2'));
      break;
    case "sync":
      $('#status img')[0].src = 'images/sync_active.png';
      $('#status-1').html(About.str('status-sync', [user]));
      $('#status-2').html(About.str('status-sync-2'));
      break;
    }
  },

  //
  // Help drawer
  //

  _setupHelpLinks: function _setupHelpLinks() {
    if (About.__setupHelpLinks)
      return;
    About.__setupHelpLinks = true;
    $('.help-item-title').each(
      function() {
        $(this).wrapInner('<a href="#" onclick="return About.onHelp(\'' +
                          this.parentNode.id + '\');"></a>');
      });
  },

  _setupHelpMe: function _setupHelpMe() {
    if (About.__setupHelpMe)
      return;
    About.__setupHelpMe = true;
    let faq = '<a href="http://wiki.mozilla.org/Labs/Weave/FAQ">'
      + About.str('help-helpme-faq') + '</a>';
    let forum = '<a href="http://groups.google.com/group/mozilla-labs-weave">'
      + About.str('help-helpme-forum') + '</a>';
    $('#help-helpme-1').html(About.str('help-helpme-1', [faq, forum]));
  },

  onHelp: function onHelp(helpid) {
    $('.help-item-content').hide();
    $('#' + helpid + " > .help-item-content").show();
    return false;
  },

  toggleHelp: function toggleHelp() {
    if (!About._curBubble)
      return;
    if (About._curBubble.find('.bubble-help').data('open'))
      About.closeHelp();
    else
      About.openHelp();
  },
  openHelp: function openHelp() {
    if (!About._curBubble)
      return;

    About._setupHelpLinks();
    About._setupHelpMe();

    // note: we move the help tab (icon that sticks out to open the drawer)
    //       into the drawer because it's absolutely positioned and want it to
    //       stay "attached" to the drawer
    // note2: the help-helpme item is special, it's a pointer to the faq and
    //        forum, and we want it always available
    About._curBubble.find('.bubble-help')
      .prepend($(About._curBubble.find('.help-tab')))
      .append($('#help-helpme'))
      .show()
      .data('open', true);

    // hide any previously open help items
    $('.help-item-content').hide();

    // hook for further customizing help drawers
    if (About["onHelp_" + About.curBubble])
      About["onHelp_" + About.curBubble]();
  },
  closeHelp: function closeHelp() {
    if (!About._curBubble)
      return;

    // note: we move the help tab to the main bubble because we hide the help
    // drawer, and want the tab to remain visible
    About._curBubble.find('.bubble-help')
      .hide()
      .data('open', false)
      .find('.help-tab')
      .appendTo(About._curBubble);
  },

  //
  // Bubble dialogs
  //

  //
  // Signed in page
  //
  onBubble_signedin: function onBubble_signedin() {
    $('#signedin-title').html(Weave.Service.username);
  },
  onUsernameClick: function onUsernameClick() {
    if (About.curBubble == 'signedin')
      About.hideBubble();
    else
      About.showBubble('signedin');
    return false;
  },

  //
  // Signin bubble page
  //
  onBubble_signin: function() {
    let user = Weave.Service.username;
    let server = Weave.Svc.Prefs.get("serverURL");
    if (About.isNewUser) {
      $('#signin-newacct')[0].disabled = "";
      About.resetLogin();
    } else {
      $('#status img')[0].src = 'images/sync_disconnected_user.png';
      $('#signin-newacct')[0].disabled = "true";
      $('#signin-username').val(user);
      let pass = Weave.Service.password;
      if (pass)
        $('#signin-password').val(pass)[0].type = 'password';
      let passph = Weave.Service.passphrase;
      if (passph)
        $('#signin-passphrase').val(passph)[0].type = 'password';
      About.onSigninInput(); // enable next button
    }
  },
  resetLogin: function resetLogin() {
    Weave.Service.username = '';
    ['signin-username', 'signin-password', 'signin-passphrase'].forEach(
      function(item) {
        $(item).val('');
        About.resetField(item);
      });
  },
  _hasInput: function _hasInput(elt) {
    let def = $(elt).data('default');
    return $(elt).val() && $(elt).val() != def;
  },
  onSigninInput: function onSigninInput() {
    if (About._hasInput('#signin-username') &&
        About._hasInput('#signin-password') &&
        About._hasInput('#signin-passphrase'))
      $('#signin .buttons .next')[0].disabled = false;
    else
      $('#signin .buttons .next')[0].disabled = true;
  },
  signIn: function signIn(noRedirect) {
    About._waitingForLogin = noRedirect;
    let user = $('#signin-username').val();
    let pass = $('#signin-password').val();
    let passph = $('#signin-passphrase').val();

    let ret = Weave.Service.login(user, pass, passph);

    // Save login settings if successful
    if (Weave.Service.isLoggedIn) {
      try {
        Weave.Service.username = user;
        Weave.Service.password = pass;
        Weave.Service.passphrase = passph;
      } catch (e) { /* storing passwords may fail if master password is declined */ }

    } else {
      alert("Couldn't sign in!"); //FIXME
    }
    return ret;
  },
  forgotPassword: function forgotPassword() {
    alert("Sorry, this functionality is not implemented yet!"); //FIXME
  },
  forgotPassphrase: function forgotPassphrase() {
    alert("Sorry, this functionality is not implemented yet!"); //FIXME
  },
  changePassword: function changePassword() {
    alert("Sorry, this functionality is not implemented yet!"); //FIXME
  },
  changePassphrase: function changePassphrase() {
    alert("Sorry, this functionality is not implemented yet!"); //FIXME
  },

  //
  // New account bubble page
  //
  onBubble_newacct: function onBubble_newacct() {
    About.resetNewacct();

    let url = Weave.Svc.Prefs.get('termsURL')
      .replace('%LOCALE%', Weave.Svc.GPrefs.get('general.useragent.locale'));
    let link = '<a>' + About.str('newacct-tos') + '</a>';

    $('#newacct-tos-label')
      .html(About.str('newacct-tos-label', [link]))
      .find('a')
      .attr('href', url)
      .attr('class', 'iframe')
      .fancybox();
    $('#newacct-tos > input').attr('checked', false);

    $('#captcha-zoom')
      .fancybox({frameWidth: 300, frameHeight: 56})[0]
      .href = '#captcha-image';
    About.loadCaptcha();

//    $('#newacct-username').focus(); - fixme
  },
  resetNewacct: function resetNewacct() {
    Weave.Service.username = '';
    ['newacct-username', 'newacct-password', 'newacct-passphrase',
     'newacct-email', 'captcha-response'].forEach(
      function(item) {
        $(item).val('');
        About.resetField(item);
      });
    $('newacct-tos-checkbox').attr('checked', false);
  },
  loadCaptcha: function loadCaptcha() {
    $('#captcha-iframe')
      .attr('src', Weave.Service.miscURL + "1/captcha_html");
  },
  onCaptchaLoaded: function onCaptchaLoaded() {
    let img = $('#captcha-iframe')[0]
      .contentDocument.getElementById('recaptcha_image').firstChild;
    let challenge = $('#captcha-iframe')[0]
      .contentDocument.getElementById('recaptcha_challenge_field').value;
    $('#captcha-image').empty().append(img);
    $('#captcha-challenge').val(challenge);
  },
  onNewacctUsernameInput: function onNewacctUsernameInput() {
    About.setTimer("newacct-username", About._checkUsername, 750);
  },
  _checkUsername: function _checkUsername() {
    if (!About._hasInput('#newacct-username'))
      return;
    if (Weave.Service.checkUsername($('#newacct-username').val()) == "available")
      $('#newacct-username').removeClass('error').addClass('ok');
    else
      $('#newacct-username').removeClass('ok').addClass('error');

    // update next button now that we've determined if the username is taken
    About.onNewacctInput();
  },
  onNewacctPassInput: function onNewacctPassInput() {
    About.setTimer("newacct-pass", About._checkPass, 750);
  },
  _checkPass: function _checkPass() {
    if (!About._hasInput('#newacct-password') ||
        !About._hasInput('#newacct-passphrase'))
      return;
    if ($('#newacct-password').val() == $('#newacct-passphrase').val())
      $('#newacct-password,#newacct-passphrase')
        .removeClass('ok').addClass('error');
    else
      $('#newacct-password,#newacct-passphrase')
        .removeClass('error').addClass('ok');
    About.onNewacctInput(); // update next button
  },
  onNewacctInput: function onSigninInput() {
    if (About._hasInput('#newacct-username') &&
        About._hasInput('#newacct-password') &&
        About._hasInput('#newacct-passphrase') &&
        About._hasInput('#newacct-email') &&
        $('#newacct-username').hasClass('ok') &&
        $('#newacct-password').hasClass('ok') &&
        $('#newacct-passphrase').hasClass('ok') &&
        $('#newacct-tos-checkbox')[0].checked)
      $('#newacct .buttons .next')[0].disabled = false;
    else
      $('#newacct .buttons .next')[0].disabled = true;
  },
  toggleCaptchaAudio: function toggleCaptchaAudio() {
    if ($('#newacct-captcha').data('audio')) {
      Recaptcha.switch_type('image');
      $('#newacct-captcha').data('audio', false);
    } else {
      Recaptcha.switch_type('audio');
      $('#newacct-captcha').data('audio', true);
    }
  },
  onNewacctNext: function onNewacctNext() {
    let ret = Weave.Service.createAccount($('#newacct-username').val(),
                                          $('#newacct-password').val(),
                                          $('#newacct-email').val(),
                                          $('#captcha-challenge').val(),
                                          $('#captcha-response').val());
    if (ret == null) {
      $('#signin-username').val($('#newacct-username').val());
      $('#signin-password').val($('#newacct-password').val())[0].type = "password";
      $('#signin-passphrase').val($('#newacct-passphrase').val())[0].type = "password";
      About.signIn(true);
      About.showBubble("willsync");

    } else {
      this._log.warn("Account creation error: " + ret);
      About.loadCaptcha();
      alert("Could not create account: " + ret);
    }
  },

  //
  // Temporary bubble after sign-up (timed)
  //
  onBubble_willsync: function onBubble_willsync() {
    About._willsyncCount = 10;
    About.setTimer("willsync", About._willsyncTick, 0);
  },
  _willsyncTick: function _willsyncTick() {
    $('#willsync-1')
      .html(About.str('willsync-1', [About._willsyncCount]));
    if (About._willsyncCount-- > 0)
      About.setTimer("willsync", About._willsyncTick, 1000);
    else
      About._willsync_go();
  },
  _willsync_go: function _willsync_go() {
    About.hideBubble();
    Weave.Service.sync();
  },
  willsyncSettings: function willsyncSettings() {
    About.clearTimer("willsync");
    About.showBubble("setup");
  },

  //
  // Device configuration (what to sync, etc)
  //
  onBubble_setup: function onBubble_setup() {
    $('#choose-data-list').empty();

    Weave.Engines.getAll().forEach(
      function(engine) {
        // null engines are not functional at all, skip
        if (engine.enabled == null)
          return;
        $(document.createElement("input"))
          .attr('type', 'checkbox')
          .attr('checked', engine.enabled)
          .click(function() { engine.enabled = this.checked;
                              return true; })
          .appendTo('#choose-data-list')
          .wrap('<li><label></label></li>')
          .after(engine.displayName);
      }, false);
  },

  syncNow: function syncNow() {
    About.hideBubble();
    Weave.Service.sync();
  },

  //
  // Device information (name, etc)
  //
  onBubble_clientinfo: function onBubble_clientinfo() {
    $('#clientinfo-name').val(Weave.Clients.clientName);
  },
  onNameChange: function onNameChange() {
    Weave.Clients.clientName = $('#clientinfo-name').val();
  },
  setDeviceType: function setDeviceType(type) {
    Weave.Clients.clientType = type;
    About.clientType = type;
  },

  //
  // Cloud information (data synced, etc)
  //
  onBubble_cloudinfo: function onBubble_cloudinfo() {
  }
};

$(function() About.init());
