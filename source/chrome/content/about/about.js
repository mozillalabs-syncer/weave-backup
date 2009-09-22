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

// Make sure this is the only instance of the page
Weave.Utils.ensureOneOpen(window);

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://weave/ext/Observers.js");
Cu.import("resource://weave/ext/Preferences.js");
Cu.import("resource://weave/constants.js");

let About = {
  init: function init() {
    About._log = Log4Moz.repository.getLogger("About:Weave");
    About._log.trace("Loading About:Weave");

    About.refreshClientType();
    About.hideQuota();
    About._localizePage();
    About._installEnterHandlers();
    About.setStatus("offline");

    if (About.setupComplete) {
      About._installObservers();
      if (Weave.Service.isLoggedIn) {
        // FIXME: service doesn't have a getter to tell us if it's syncing, so we
        // co-opt the locked getter
        if (Weave.Service.locked)
          About.setStatus("sync");
        else
          About.setStatus("idle");
      } else {
        About.showBubble("signin");
      }
    } else {
      // try to continue where the user left off last time
      if (!Weave.Service.username)
        About.showBubble("welcome");
      else if (!Weave.Service.password)
        About.showBubble("signin");
      else if (!Weave.Service.passphrase)
        About.showBubble("newacct2");
      else
        About.showBubble("data");
    }
  },

  _installObservers: function() {
    [['login:start', About.onLoginStart],
     ['login:finish', About.onLoginFinish],
     ['login:error', About.onLoginError],
     ['logout:finish', About.onLogout],
     ['sync:start', About.onSyncStart],
     ['sync:finish', About.onSyncFinish],
     ['sync:error', About.onSyncError]]
     .forEach(function(i) Observers.add("weave:service:" + i[0], i[1]));
  },

  _installEnterHandlers: function _installEnterHandlers() {
    $("input[type=text], input[type=password]").keydown(function(event) {
      // Only listen for enter presses
      if (event.keyCode != 13)
        return;

      // Trigger a click for an enabled "next" button
      $(this).closest(".bubble").find(".buttons .next:not(:disabled)").click();
    });
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
  get setupComplete() {
    return Weave.Svc.Prefs.get("setupComplete");
  },
  set setupComplete(val) {
    Weave.Svc.Prefs.set("setupComplete", val);
  },

  //
  // Weave event handlers
  //

  onLoginStart: function onLoginStart() {
    About.setStatus('signing-in');
  },
  onLoginFinish: function onLoginFinish() {
    About.setStatus('idle');

    // Save login settings on success
    Weave.Service.persistLogin();

    // Nothing left to do, so just hide the form
    About.hideBubble();
  },
  onLoginError: function onLoginError() {
    About.setStatus('offline');
  },
  onLogout: function onLogout() {
    About.setStatus('offline');
    About.showBubble('signin');
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

  // Top menus
  toggleMenu: function toggleMenu(name) {
    if ($(About._curMenu)[0].id == name)
      About.hideMenu();
    else
      About.showMenu(name);
  },
  hideMenu: function hideMenu() {
    if (About._curMenu) {
      $(About._curMenu)
        .find('.menu-dropdown').hide().end()
        .toggleClass('open');
      About._curMenu = null;
    }
  },
  showMenu: function showMenu(name) {
    if ($('#' + name).hasClass('disabled'))
      return;
    About.hideMenu();
    About._curMenu = $('#' + name)
      .toggleClass('open')
      .find('.menu-dropdown').show().end();
  },

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
    if (About.curBubble == name)
      About.hideBubble();
    else
      About.showBubble(name);
  },
  toggleMiddleBubble: function toggleMiddleBubble() {
    if (Weave.Service.isLoggedIn)
      About.toggleBubble('signedin'); // FIXME
    else
      About.toggleBubble('signin');
  },
  showBubble: function showBubble(name) {
    About._log.trace("Showing bubble " + name);
    if (About._curBubble)
      About._curBubble.hide();
    About.closeHelp();

    About._curBubble = $("#" + name).css('display', 'inline-block');
    if (About._curBubble.attr('class').match(/-(left|center|right)$/)
        && About._curBubble.find('.bubble-arrow').length == 0)
      About._curBubble.prepend('<div class="bubble-arrow"></div>');

    if (About["onBubble_" + name])
      About["onBubble_" + name]();

    return false; // so it can be used from link onclick handlers
  },
  hideBubble: function hideBubble() {
    $('.bubble, .bubble-center,.bubble-left,.bubble-right').hide();
    About._curBubble = null;
  },

  setStatus: function setStatus(status) {
    switch (status) {
    case "offline":
      $('#status-arrow img')[0].src = 'images/sync_disconnected_user.png';
      $('#status-1').html(About.str('status-offline'));
      $('#user-menu .title').html(About.str('user-menu-offline'));
      $('#user-menu').addClass('disabled');
      break;
    case "signing-in":
      $('#status-arrow img')[0].src = 'images/sync_active.png';
      $('#status-1').html(About.str('status-signing-in'));
      $('#user-menu .title').html(About.str('user-menu-signing-in'));
      $('#user-menu').addClass('disabled');
      break;
    case "idle":
      $('#status-arrow img')[0].src = 'images/sync_idle.png';
      $('#status-1').html(About.str('status-idle'));
      $('#user-menu .title').html(About.str('user-menu-online', [Weave.Service.username]));
      $('#user-menu').attr('class', '');
      break;
    case "sync":
      $('#status img')[0].src = 'images/sync_active.png';
      $('#status-1').html(About.str('status-sync'));
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

  _hasInput: function _hasInput(elt) {
    let def = $(elt).data('default');
    return $(elt).val() && $(elt).val() != def;
  },
  doWrappedFor: function doWrappedFor(bubble, func /*, args */) {
    let buttons = bubble + " .buttons ";
    let next = $(buttons + ".next");
    let throbber = $(buttons + ".throbber");

    // While calling the func, disable the next button and show the throbber
    next.attr("disabled", true);
    throbber.show();
    let ret = Weave.Service[func].apply(Weave.Service, Array.slice(arguments, 2));
    next.removeAttr("disabled");
    throbber.hide();
    return ret;
  },

  //
  // Bubble dialogs
  //

  //
  // My Account
  //
  onBubble_myacct: function() {
    $('#myacct-set-pw, #myacct-set-pp').hide();
    $('#myacct-username').html(Weave.Service.username);
    $('#myacct-password')
      .width('')
      .val(Weave.Service.password)[0].type = "password";
    $('#myacct-passphrase')
      .width('')
      .val(Weave.Service.passphrase)[0].type = "password";
  },
  _myacctAddButton: function(field, button) {
    if ($(button).css('display') != 'none')
      return;
    // * 1 forces it to be a number
    let px = function(id, prop) $(id).css(prop).replace('px', '') * 1;
    $(button).show();
    $(field).width($(field).width()
                   - (px(field, 'margin-left') + px(field, 'margin-right')
                      + $(button).outerWidth(true)) + 'px');
  },
  onMyacctPasswordFocus: function() {
    About._myacctAddButton('#myacct-password', '#myacct-set-pw');
  },
  onMyacctPassphraseFocus: function() {
    About._myacctAddButton('#myacct-passphrase', '#myacct-set-pp');
  },
  setPassword: function() {
    $('#myacct .buttons .throbber').show();
    Weave.Service.changePassword($('#myacct-password'));
    $('#myacct-set-pw, #myacct .buttons .throbber').hide();
    $('#myacct-password').width('');
  },
  setPassphrase: function() {
    $('#myacct .buttons .throbber').show();
    Weave.Service.changePassphrase($('#myacct-passphrase'));
    $('#myacct-set-pp, #myacct .buttons .throbber').hide();
    $('#myacct-passphrase').width('');
  },

  //
  // Forgot passphrase
  //
  forgotPasswordOk: function() {
    $('#forgot-pw .buttons .throbber').show();
    let ok = Weave.Service.requestPasswordReset($('#forgot-pw-box').val());
    $('#forgot-pw .buttons .throbber').hide();
    if (ok)
      About.showBubble('forgot-pw2');
    else {
      alert("Couldn't send email, perhaps that account doesn't exist!");
      About.showBubble('signin'); // fixme
    }
  },

  //
  // Forgot passphrase
  //
  forgotPassphraseOk: function() {
    About._newPassphrase = $('#forgot-pp-box').val();
    $('#forgot-pp-box').val('');
    About.showBubble('signin');
  },

  //
  // Signin bubble page
  //
  onBubble_signin: function() {
    // next/sign in button gets disabled until onSigninInput() enables it
    $('#signin .buttons .next').attr('disabled', true);

    if (About._ppChange)
      return; // passphrase changes trigger this form multiple times

    About._log.trace("Pre-filling sign-in form");

    let user = Weave.Service.username || "";
    let pass = Weave.Service.password || "";
    let passph = Weave.Service.passphrase || "";

    // Previously logged in user, so show "sign in"
    if (About.setupComplete) {
      if (!user)
        pass = passph = "";
      $("#signin .buttons .next").val("sign in"); // fixme: l10n
      $("#signin .buttons .prev").hide();
    }
    // We need to setup data or create account
    else {
      $("#signin .buttons .next").val("next"); // fixme: l10n
      $("#signin .buttons .prev").show();
      user = pass = passph = "";
    }

    if (About._newPassphrase) {
      passph = About._newPassphrase;
      delete About._newPassphrase;
      About._ppChange = true;
      $('#signin-passphrase, #signin-forgot-links > :last').hide();
      $('#signin-new-passphrase').css('display', 'inline-block');
    } else {
      $('#signin-passphrase, #signin-forgot-links > :last').show();
      $('#signin-new-passphrase').hide();
    }

    $("#signin-username").val(user);
    $('#signin-password').val(pass)[0].type = 'password';
    $('#signin-passphrase').val(passph)[0].type = 'password';

    About.onSigninInput(); // enable next button
    $('#signin-username').focus();
  },
  onSigninInput: function onSigninInput() {
    if (About._hasInput('#signin-username') &&
        About._hasInput('#signin-password') &&
        About._hasInput('#signin-passphrase'))
      $('#signin .buttons .next')[0].disabled = false;
    else
      $('#signin .buttons .next')[0].disabled = true;
  },
  signIn: function signIn() {
    let ok;
    if (About._ppChange) {
      delete About._ppChange;
      Weave.Service.username = $("#signin-username").val();
      Weave.Service.password = $("#signin-password").val();
      Weave.Service.passphrase = $("#signin-passphrase").val();
      // this does a login and a sync
      ok = Weave.Service.resetPassphrase($("#signin-passphrase").val());
    } else {
      ok = About.doWrappedFor("#signin", "login", $("#signin-username").val(),
                              $("#signin-password").val(),
                              $("#signin-passphrase").val());
    }

    // note: observer handles if (ok && About.setupComplete)
    if (ok && !About.setupComplete) {
      $('#data .buttons .next')[0]
        .onclick = function() About.showBubble('syncdir');
      About.showBubble("data");

    } else if (!ok) {
      alert("Couldn't sign in: " + Weave.Utils.getErrorString(
              Weave.Service.status.login)); //FIXME
    }
  },

  //
  // New account bubble page
  //
  onBubble_newacct: function onBubble_newacct() {
    About.resetNewacct();

    let url = Weave.Svc.Prefs.get('termsURL')
      .replace('%LOCALE%', Preferences.get('general.useragent.locale'));
    let link = '<a>' + About.str('newacct-tos') + '</a>';

    $('#newacct-tos-label')
      .html(About.str('newacct-tos-label', [link]))
      .find('a')
      .attr('href', url)
      .attr('class', 'iframe')
      .fancybox();
    $('#newacct-tos-checkbox').attr('checked', false);

    $('#captcha-zoom')
      .fancybox({frameWidth: 300, frameHeight: 56})[0]
      .href = '#captcha-image';
    About.loadCaptcha();

    $('#newacct-username').focus();
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
      .attr("src", Weave.Service.miscAPI + "captcha_html");
  },
  onCaptchaLoaded: function onCaptchaLoaded() {
    // Don't do anything on the default empty iframe page load
    let frameDoc = $("#captcha-iframe")[0].contentDocument;
    if (frameDoc.location.href == "about:blank")
      return;

    let img = frameDoc.getElementById("recaptcha_image").firstChild;
    let challenge = frameDoc.getElementById("recaptcha_challenge_field").value;
    $('#captcha-image').empty().append(img);
    $('#captcha-challenge').val(challenge);
  },
  onNewacctUsernameInput: function onNewacctUsernameInput() {
    About.setTimer("newacct-username", About._checkUsername, 2000);
  },
  onNewacctUsernameBlur: function onNewacctUsernameInput() {
    About.setTimer("newacct-username", About._checkUsername, 0);
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
    About.setTimer("newacct-pass", About._checkPass, 2000);
  },
  onNewacctPassBlur: function onNewacctPassInput() {
    About.setTimer("newacct-pass", About._checkPass, 0);
  },
  _checkPass: function _checkPass() {
    if (!About._hasInput('#newacct-password'))
      return;
    About.onNewacctInput(); // update next button
  },
  onNewacctInput: function onSigninInput() {
    if (About._hasInput('#newacct-username') &&
        About._hasInput('#newacct-password') &&
        About._hasInput('#newacct-email') &&
        About._hasInput('#captcha-response') &&
        $('#newacct-tos-checkbox')[0].checked &&
        $('#newacct .error').length == 0)
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
    let user = $("#newacct-username").val();
    let pass = $("#newacct-password").val();
    let failure = About.doWrappedFor("#newacct", "createAccount", user, pass,
      $("#newacct-email").val(), $("#captcha-challenge").val(),
      $("#captcha-response").val());

    // User created successfully, so save the user/pass and move on
    if (failure == null) {
      Weave.Service.username = user;
      Weave.Service.password = pass;
      Weave.Service.persistLogin();
      About.showBubble("newacct2");
    } else {
      this._log.warn("Account creation error: " + failure);
      About.loadCaptcha();
      alert("Could not create account: " + failure);
    }
  },

  //
  // New account part 2: passphrase
  //
  onBubble_newacct2: function() {
    $('#newacct2 > .buttons > .next')[0].disabled = true;
    $('#newacct2 p')
      .css('width', $('#newacct2 > ul').css('width'));
  },
  onNewacct2Input: function() {
    About.setTimer("newacct2", About._checkPassph, 100);
  },
  onNewacct2Blur: function() {
    About.setTimer("newacct2", About._checkPassph, 0);
  },
  _checkPassph: function _checkPass() {
    if (About._hasInput('#newacct2-passphrase'))
      $('#newacct2 .buttons .next')[0].disabled = false;
    else
      $('#newacct2 .buttons .next')[0].disabled = true;
  },
  onNewacct2Next: function() {
    // Now that we have a passphrase, try logging in
    Weave.Service.passphrase = $('#newacct2-passphrase').val();
    let failure = About.doWrappedFor("#newacct2", "login");
    if (failure == null) {
      About.showBubble("data");
    }
  },

  //
  // Data types setup
  //
  _dataOrder: ["bookmarks", "history", "tabs", "passwords", "prefs"],

  onBubble_data: function() {
    function _addRow(count) {
      if (!(count % UI_DATA_TYPES_PER_ROW)) {
        $('#data .data-types')
          .append('<tr></tr>');
      }
      return $('#data .data-types > tbody > tr:last-child');
    }

    $('#data .data-types')
      .empty();

    let count = 0;
    let row = _addRow();
    let engines = Weave.Engines.getAll();

    for each (let name in About._dataOrder) {
      for each (let engine in engines) {
        if (engine.name == name) {
          row = _addRow(count++);
          row.append(About._makeDataCell(engine));
        }
      }
    }
    for each (let engine in engines) {
      if (About._dataOrder.indexOf(engine.name) >= 0)
        continue;
      row = _addRow(count++);
      row.append(About._makeDataCell(engine));
    }
  },
  _makeDataCell: function(engine) {
    return '<td><table><tr>'
      + '<td><h3>' + engine.displayName + '</h3></td>'
      + '<td>' + About._makeToggle(engine.name, engine.enabled) + '</td>'
      + '</tr></table>'
      + '<p>' + engine.description + '</p>'
      + '</td>';
  },
 // fixme: l10n
  _makeToggle: function(name, on) {
    let ret = '<label class="toggle">';
    ret += '<input type="checkbox" onclick="About.toggleData(\'' + name + '\');" ';
    ret += on? 'checked="checked"/>' : '/>';
    ret += '<span class="toggle-left">on</span>';
    ret += '<span class="toggle-right">off</span>';
    ret += '</label>';
    return ret;
  },
  toggleData: function(name) {
    About._log.debug("Toggling engine: " + name);
    let engine = Weave.Engines.get(name);
    engine.enabled = !engine.enabled;
  },

  //
  // Sync direction (merge / clobber)
  //
  onSyncdirNext: function() {
    $('#syncdir .buttons .throbber').show();

    if ($('#syncdir input:radio')[1].checked)
      Weave.Service.wipeClient();
    else if ($('#syncdir input:radio')[2].checked)
      Weave.Service.wipeRemote();
    // else we proceed as normal (merge)

    $('#syncdir .buttons .throbber').hide();

    About.showBubble('finished');
  },

  //
  // All done!
  //
  onBubble_finished: function() {
    About.setupComplete = true;
    About._installObservers();
    About.setStatus('idle');
    Weave.Service.syncOnIdle();
  },

  //
  // Temporary bubble after sign-up (timed)
  //
  // fixme: unused
  onBubble_willsync: function onBubble_willsync() {
    About._willsyncCount = 5;
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
    Weave.Service.syncOnIdle();
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
    Weave.Utils.openSync();
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
  },

  wipeServer: function wipeServer() {
    let title = About.str("erase-title");
    let mesg = About.str("erase-warning");
    if (Weave.Svc.Prompt.confirm(null, title, mesg))
      Weave.Service.wipeServer();
  }
};

$(function() About.init());
