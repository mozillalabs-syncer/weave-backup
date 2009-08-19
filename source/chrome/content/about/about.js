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
  _curBubble: null,

  init: function init() {
    About._log = Log4Moz.repository.getLogger("About:Weave");
    About._log.info("Loading About:Weave");

    About._localizePage();
    About.hideQuota();
    if (Weave.Service.isLoggedIn)
      About.showBubble("signedin");
    else
      About.showBubble("signin");

    [['login:start', About.onLoginStart],
     ['login:finish', About.onLoginFinish],
     ['login:error', About.onLoginError],
     ['logout:finish', About.onLogout],
     ['sync:start', About.onSyncStart],
     ['sync:finish', About.onSyncFinish],
     ['sync:error', About.onSyncError]]
     .forEach(function(i) Observers.add("weave:service:" + i[0], i[1]));
  },

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
  _localizeFormElt: function _localizeFormElt(element) {
    $(element)
      .data('default', (About.str(About._l10nId(element), null, $(element).val())));
    if ($(element)[0].type == "password")
      $(element).data('type', 'password');
    About.resetField(element);
  },
  _localizeElt: function _localizeElt(element) {
    let str = About.str(About._l10nId(element));
    if (typeof(str) != 'undefined')
      $(element).html(str);
  },
  _localizePage: function _localizePage() {
    // localize forms, set default values for input boxes, setup callbacks
    $('input[type=text],input[type=password]')
      .each(function() { $(this)
                           .focus(function() About.clearField(this))
                           .blur(function() About.resetField(this)); });
    $('input')
      .each(function() About._localizeFormElt(this));

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
  // Getters
  //
  get isNewUser() {
    return !Weave.Service.username &&
      Weave.Svc.Prefs.get("serverURL") == 'https://auth.services.mozilla.com/';
  },

  //
  // Show/hide helpers for various UI pieces
  //

  // Quota meter inside the cloud
  setQuota: function setQuota(percent) {
    $('#quotaBar').show();
    $('#quotaBar').text(percent + "%");
    $('#quotaBar').css("MozBoxShadow",
      "inset rgba(141, 178, 198, 0.4) " + (percent*183/100) + "px 0px 0px, " +
      "inset rgba(141, 178, 198, 0.9) 0px 0px 6px, " +
      "inset rgba(82, 105, 118, 1) 0px 0px 1px, " +
      "rgba(255, 255, 255, 1) 0px 0px 20px");

  },
  hideQuota: function hideQuota() {
    $('#quotaBar').hide();
  },

  // Bubble dialog
  // Will automatically call About.onBubble_<name>()
  showBubble: function showBubble(name) {
    if (About._curBubble)
      About._curBubble.hide();

    $('#bubble').show();
    About._curBubble = $("#" + name).show();

    if (About["onBubble_" + name])
      About["onBubble_" + name]();
  },
  hideBubble: function hideBubble() {
    $('#bubble').hide();
  },

  //
  // Weave event handlers
  //

  onLoginStart: function onLoginStart() {
    $('#status img')[0].src = 'images/sync_active.png';
  },
  onLoginFinish: function onLoginFinish() {
    $('#status img')[0].src = 'images/sync_idle.png';
    // if login was not associated with an about:weave action,
    // automatically show the signed in bubble
    if (!About._waitingForLogin)
      About.showBubble('signedin');
    else
      About._waitingForLogin = false;
  },
  onLoginError: function onLoginError() {
    $('#status img')[0].src = 'images/sync_disconnected_user.png';
  },
  onLogout: function onLogout() {
    $('#status img')[0].src = 'images/sync_disconnected_user.png';
    // if logout was not associated with an about:weave action,
    // automatically show the sign in bubble
    if (!About._waitingForLogout)
      About.showBubble('signin');
    else
      About._waitingForLogout = false;
  },
  onSyncStart: function onSyncStart() {
    $('#status img')[0].src = 'images/sync_active.png';
  },
  onSyncFinish: function onSyncFinish() {
    $('#status img')[0].src = 'images/sync_idle.png';
  },
  onSyncError: function onSyncError() {
    $('#status img')[0].src = 'images/sync_idle.png';
  },


  //
  // Bubble dialogs
  //

  //
  // Signed in page
  //
  onBubble_signedin: function onBubble_signedin() {
    $('#signedin-text')
      .html(About.str('signedin-text', [Weave.Service.username]));
    About.onSigninInput(); // update next button if everything is prefilled
  },

  //
  // Signin bubble page
  //
  onBubble_signin: function() {
    let user = Weave.Service.username;
    let server = Weave.Svc.Prefs.get("serverURL");
    if (About.isNewUser)
      $('#signin-newacct').css('display', '');
    else {
      $('#status img')[0].src = 'images/sync_disconnected_user.png';
      $('#signin-newacct').css('display', 'none');
      $('#signin-username').val(user);
      $('#signin-password').val(Weave.Service.password)[0].type = 'password';
      $('#signin-passphrase').val(Weave.Service.passphrase)[0].type = 'password';
    }
    $('#signin-help').fancybox()[0].href = About.str('signin-help-url');
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
      Weave.Service.username = user;
      Weave.Service.password = pass;
      Weave.Service.passphrase = passph;

    } else {
      //?
    }
    return ret;
  },

  //
  // New account bubble page
  //
  onBubble_newacct: function onBubble_newacct() {
    $('#newacct-tos-link')
      .fancybox()[0].href = About.str('newacct-tos-url');
    $('#newacct-tos-checkbox')[0].checked = false;
    $('#recaptcha_image')
      .css('width', '').css('height', '');
    $('#recaptcha-zoom')
      .fancybox({frameWidth: 300, frameHeight: 56})[0]
      .href = '#recaptcha_image';
//    $('#newacct-username').focus(); - fixme
  },
  onNewacctUsernameInput: function onNewacctUsernameInput() {
    if (About._newacct_username_timer)
      window.clearTimeout(About._newacct_username_timer);
    About._newacct_username_timer = window.setTimeout(About._checkUsername, 750);
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
    if (About._newacct_pass_timer)
      window.clearTimeout(About._newacct_pass_timer);
    About._newacct_pass_timer = window.setTimeout(About._checkPass, 750);
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
                                          $('#recaptcha_challenge_field').val(),
                                          $('#recaptcha_response_field').val());
    if (ret.status == 200) {
      $('#signin-username').val($('#newacct-username').val());
      $('#signin-password').val($('#newacct-password').val());
      $('#signin-passphrase').val($('#newacct-passphrase').val());
      About.signIn(true);
      About.showBubble("willsync");

    } else {
      this._log.warn("Account creation error: " + ret.error);
      alert("Could not create account: " + ret.error);
    }
  }
};

$(function() About.init());
