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
 * The Original Code is Bookmarks Sync.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
 *  Chris Beard <cbeard@mozilla.com>
 *  Maria Emerson <memerson@mozilla.com>
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

const SYNC_NS_ERROR_LOGIN_ALREADY_EXISTS = 2153185310;

const REGISTER_STATUS    = "0.3/api/register/regopen/";
const CHECK_USERNAME_URL = "0.3/api/register/checkuser/";
const CHECK_EMAIL_URL    = "0.3/api/register/checkmail/";
const REGISTER_URL       = "0.3/api/register/new";
const CAPTCHA_URL        = "0.3/api/register/captcha/";
const CAPTCHA_IMAGE_URL  = "http://api.recaptcha.net/image";

const PROGRESS_COLOR     = "black";
const ERROR_COLOR        = "red";
const SERVER_ERROR_COLOR = "black";
const SUCCESS_COLOR      = "blue";

const SERVER_TIMEOUT = 15000;

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function $(id) {
  if (id[0] == '.')
    return document.getElementsByClassName(id);
  return document.getElementById(id);
}

WeaveWiz = {
  registrationClosed: false,

  init: function WeaveWiz_init() {
    WeaveWiz._log = Log4Moz.repository.getLogger("Chrome.Wizard");
    WeaveWiz._log.info("Initializing setup wizard");

    WeaveWiz._serverURL = Weave.Svc.Prefs.get("tmpServerURL");

    if (Weave.Service.isLoggedIn)
      Weave.Service.logout();

    Observers.add("weave:service:login:finish", WeaveWiz.onLogin);
    Observers.add("weave:service:login:error", WeaveWiz.onLoginError);
    Observers.add("weave:service:logout:finish", WeaveWiz.onLogout);
    Observers.add("weave:service:verify-login:finish", WeaveWiz.onVerifyLogin);
    Observers.add("weave:service:verify-login:error", WeaveWiz.onVerifyLoginError);
    Observers.add("weave:service:verify-passphrase:finish", WeaveWiz.onVerifyPassphrase);
    Observers.add("weave:service:verify-passphrase:error", WeaveWiz.onVerifyPassphraseError);
    Observers.add("weave:service:sync:start", WeaveWiz.onSyncStart);
    Observers.add("weave:service:sync:finish", WeaveWiz.onSyncFinish);
    Observers.add("weave:service:sync:error", WeaveWiz.onSyncError);

    // Initial background request to check if registration is open or closed.
    // WeaveWiz.checkRegistrationStatus();
  },

  onWizardShutdown: function WeaveWiz_onWizardshutdown() {
    WeaveWiz._log.info("Closing setup wizard");

    Observers.remove("weave:service:login:finish", WeaveWiz.onLogin);
    Observers.remove("weave:service:login:error", WeaveWiz.onLoginError);
    Observers.remove("weave:service:logout:finish", WeaveWiz.onLogout);
    Observers.remove("weave:service:verify-login:finish", WeaveWiz.onVerifyLogin);
    Observers.remove("weave:service:verify-login:error", WeaveWiz.onVerifyLoginError);
    Observers.remove("weave:service:verify-passphrase:finish", WeaveWiz.onVerifyPassphrase);
    Observers.remove("weave:service:verify-passphrase:error", WeaveWiz.onVerifyPassphraseError);
    Observers.remove("weave:service:sync:start", WeaveWiz.onSyncStart);
    Observers.remove("weave:service:sync:finish", WeaveWiz.onSyncFinish);
    Observers.remove("weave:service:sync:error", WeaveWiz.onSyncError);
  },

  // XXX unused
  _lazyDOM: function WeaveWiz__lazyDOM(obj) {
    for (let prop in obj) {
      let thing = obj[prop];
      if (typeof(thing) == "object")
        Weave_lazyDOM(thing);
      else
        Weave.Utils.lazy2(obj, prop, function() document.getElementById(thing));
    }
  },

  /////INTRO SCREEN/////

  onShowIntro: function WeaveWiz_onShowIntro() {
    WeaveWiz._log.debug("Showing intro page");
    $('tos_radio').value = "false";
    $('weave-setup-wizard').canAdvance = false;
  },

  onChangeTermsRadio: function WeaveWiz_onChangeEULARadio() {
    $('weave-setup-wizard').canAdvance = ($('tos_radio').value == "true");
  },

  onFinishIntro: function WeaveWiz_onFinishIntro() {
    return ($('tos_radio').value == "true");
  },

  /////WELCOME SCREEN/////

  onShowWelcome: function WeaveWiz_onShowWelcome() {
    WeaveWiz._log.debug("Showing welcome page");
    $('weave-setup-wizard').canAdvance = false;
  },

  onFinishWelcome: function WeaveWiz_onFinishWelcome() {
    return true;
  },

  // Called by buttons on account type screen. Advances to the specified page.
  advanceTo: function WeaveWiz_advanceTo(pageid) {
    WeaveWiz._log.debug("Jumping to " + pageid);
    $('weave-setup-wizard').canAdvance = true;
    $('weave-setup-wizard').advance(pageid);
  },

  /////ACCOUNT VERIFICATION/////

  onShowVerify: function WeaveWiz_onShowVerify() {
    WeaveWiz._log.debug("Showing verify page");
    this._path = "verify";
    $('weave-setup-wizard').canAdvance = WeaveWiz._verifyCheck;
  },

  onFinishVerify: function WeaveWiz_onFinishVerify() {
    if (WeaveWiz.checkVerificationFields()) {
      WeaveWiz.saveLoginInfo();
      return true;
    }
    return false;
  },

  // Called oninput from all fields, and onadvance from verification page.
  // Checks that all fields have values and that the login and passphrase were verified
  checkVerificationFields: function WeaveWiz_checkVerify() {
    WeaveWiz._log.trace("Checking verification fields");

    $('weave-setup-wizard').canAdvance = false;
    WeaveWiz._verifyCheck = false;

    if (!($('username').value && $('password').value && $('passphrase').value))
      return false;

    // Make sure the login has been verified
    // user could quickly enter an incorrect password and advance if malicious:)
    // to prevent this, add a call to Weave.Service.login(), but this is redundant for now
    if (WeaveWiz._loginCheck && WeaveWiz._passphraseCheck) {
      $('weave-setup-wizard').canAdvance = true;
      WeaveWiz._verifyCheck = true;
      return true;
    }

    return false;
  },

  // Called when username or password field is changed.
  // Asychronously tests the login on the server.
  verifyLogin: function WeaveWiz_verifyLogin() {
    WeaveWiz._log.debug("Verifying login");

    let progress = $('strings').getString("verify-progress.label");

    // Don't allow advancing until we verify the account.
    $('weave-setup-wizard').canAdvance = false;
    WeaveWiz._loginCheck = false;

    // Check for empty username or password fields
    if (!$('username').value || !$('password').value) {
      $('account-error-icon').hidden = true;
      $('account-error-label').value = "";
      return;
    }

    // Ok to verify, set the status and throbber
    $('account-error-icon').hidden = false;
    $('account-error-link').hidden = true;
    $('account-error-label').hidden = false;
    $('account-error-label').value = progress;
    $('account-error-label').style.color = PROGRESS_COLOR;

    // The observer will handle success and failure notifications
    // checkVerificationFields() will take care of allowing advance if this works
    WeaveWiz._log.debug("Verifying username/password...");
    Weave.Service.verifyLogin(null, $('username').value, $('password').value);

    // In case the server is hanging...
    setTimeout(function() {
      if (loginVerified.value == "false") {
        WeaveWiz._log.info("Server timeout (username/password verification)");
	$('account-error-icon').hidden = true;
	$('account-error-label').value = $('strings').getString("serverTimeoutError.label");
	$('account-error-label').style.color = SERVER_ERROR_COLOR;
      }
    }, SERVER_TIMEOUT);
  },

  // Called when passphrase field changes.
  // Eventually this should actually verify that the passphrase works. :-)
  verifyPassphrase : function WeaveWiz_verifyPassphrase() {
    WeaveWiz._log.debug("Verifying passphrase");

    // FIXME: disabling passphrase check for now
    $('weave-setup-wizard').canAdvance = true;
    WeaveWiz._passphraseCheck = true;
    return;

    // Don't allow advancing until we verify the account.
    $('weave-setup-wizard').canAdvance = false;
    WeaveWiz._passphraseCheck = false;

    // Check for empty passphrase field
    if (!$('passphrase').value) {
      $('passphrase-error-icon').hidden = true;
      $('passphrase-error-label').value = "";
      return;
    }

    let progress = $('strings').getString("passphrase-progress.label");

    // Ok to verify, set the status and throbber
    $('passphrase-error-icon').hidden = false;
    $('passphrase-error-link').hidden  = true;
    $('passphrase-error-label').hidden = false;
    $('passphrase-error-label').value  = progress;
    $('passphrase-error-label').style.color = PROGRESS_COLOR;

    // The observer will handle success and failure notifications
    // checkVerificationFields() will take care of allowing advance if this works
    WeaveWiz._log.debug("Verifying passphrase...");
    Weave.Service.verifyPassphrase(null, $('username').value,
                                   $('password').value, $('passphrase').value);

    // In case the server is hanging...
    let strings = $('strings');
    setTimeout(function() {
            if (statusLabel.value == progress) {
	      WeaveWiz._log.info("Server timeout (passphrase verification)");
	      $('passphrase-error-icon').hidden = true;
              $('passphrase-error-label').value = strings.getString("serverTimeoutError.label");
	      $('passphrase-error-label').style.color = SERVER_ERROR_COLOR;
            }
	  }, SERVER_TIMEOUT);
  },

  // Called on Wizard load to see if registration is closed.
  // Sets boolean on WeaveWiz.registrationClosed.
  checkRegistrationStatus: function WeaveWiz_checkRegistrationStatus() {
    WeaveWiz._log.debug("Checking registration status");

    let res = new Weave.Resource(WeaveWiz._serverURL + REGISTER_STATUS);
    res.authenticator = new Weave.NoOpAuthenticator();
    res.get(
      function(data) {
        if (res.lastChannel.responseStatus == 200) {
          if (data == 0) {
            WeaveWiz._log.info("Registration closed");
            WeaveWiz.registrationClosed = true;
          } else {
            WeaveWiz._log.info("Registration open");
            WeaveWiz.registrationClosed = false;
          }
        } else {
          WeaveWiz._log.info("Error getting registration status:" +
                             res.lastChannel.responseStatus);
        }
      });
  },

  /////ACCOUNT CREATION - USERNAME, PASSWORD, PASSPHRASE/////

  // Check to see if registration is closed, and if so display a friendly message
  // to the would be user and then push them back to the registration menu.
  onShowCreate1: function WeaveWiz_onShowCreate1() {
    WeaveWiz._log.debug("Showing creation page step 1");
    this._path = "create";
    if (WeaveWiz.registrationClosed) {
      let p = Cc["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Ci.nsIPromptService);
      p.alert(null,$('strings').getString("registration-closed.title"),
              $('strings').getString("registration-closed.label"));
      $('weave-setup-wizard').goTo("sync-wizard-welcome");
    }
    $('weave-setup-wizard').canAdvance = WeaveWiz._createCheck;
  },

  onFinishCreate1: function WeaveWiz_onFinishCreate1() {
    return WeaveWiz.checkCreationFields();
  },

  onShowCreate2: function WeaveWiz_onShowCreate2() {
    WeaveWiz._log.debug("Showing creation page step 2");
    $('weave-setup-wizard').canAdvance = WeaveWiz._createCheck2;
  },

  onFinishCreate2: function WeaveWiz_onFinishCreate2() {
    return WeaveWiz.checkPassphraseFields();
  },

  onShowCreate3: function WeaveWiz_onShowCreate3() {
    WeaveWiz._log.debug("Showing creation page step 3");
    $('weave-setup-wizard').canAdvance = WeaveWiz._createCheck3;
    if (!WeaveWiz._createCheck3) {
      $('captcha').addEventListener(
        "pageshow", function() {WeaveWiz.onLoadCaptcha()}, false, true);
      $('captcha').setAttribute("src", WeaveWiz._serverURL + CAPTCHA_URL);
    }
  },

  onFinishCreate3: function WeaveWiz_onFinishCreate3() {
    return WeaveWiz.createAccount();
  },

  // Called oncommand from username field for account creation.
  // Checks username availability.
  checkUsername: function WeaveWiz_checkUsername() {
    WeaveWiz._log.debug("Checking username");

    let username = $('username-create-field').value;
    let statusLabel = $('username-create-error-label');
    let statusLink = $('username-create-error-link');
    let statusIcon = $('username-create-error-icon');

    // Status messages
    let usernameTaken = $('strings').getFormattedString("createUsername-error.label", [username]);
    let usernameAvailable = $('strings').getFormattedString("createUsername-success.label", [username]);
    let checkingUsername = $('strings').getString("createUsername-progress.label");
    let serverError = $('strings').getString("serverError.label");
    let serverTimeoutError = $('strings').getString("serverTimeoutError.label");

    // Don't check if they haven't entered something
    if (!username) {
      statusIcon.hidden = true;
      statusLink.hidden = true;
      statusLabel.value = "";
      $('weave-setup-wizard').canAdvance = false;
      return false;
    }

    // Show progress
    statusIcon.hidden = false;
    statusLink.hidden = true;
    statusLabel.hidden = false;
    statusLabel.value = checkingUsername;
    statusLabel.style.color = PROGRESS_COLOR;

    let res = new Weave.Resource(WeaveWiz._serverURL +
                                 CHECK_USERNAME_URL + username);
    res.authenticator = new Weave.NoOpAuthenticator();
    res.get(
      function(data) {
        if (res.lastChannel.responseStatus == 200) {
          statusIcon.hidden = true;
          statusLink.hidden = true;

          if (data == 1) {
            statusLabel.value = usernameTaken;
            statusLabel.style.color = ERROR_COLOR;
            $('weave-setup-wizard').canAdvance = false;
            WeaveWiz._createCheck = false;
            WeaveWiz._usernameVerified = false;
          } else {
            statusLabel.value = usernameAvailable;
            statusLabel.style.color = SUCCESS_COLOR;
            WeaveWiz._usernameVerified = true;
          }
        } else {
          WeaveWiz._log.info("Error: received status " +
                             res.lastChannel.responseStatus);
          statusIcon.hidden = true;
          statusLink.hidden = false;
          // TODO: add more descriptive server errors in this case, we know what the status was
          statusLabel.value = serverError;
          statusLabel.style.color = SERVER_ERROR_COLOR;
          $('weave-setup-wizard').canAdvance = false;
          WeaveWiz._usernameVerified = false;
          WeaveWiz._createCheck = false;
        }
      });

    // In case the server is hanging...
    setTimeout(function() {
            if (statusLabel.value == checkingUsername) {
              WeaveWiz._log.info("Server timeout (username check)");
              statusIcon.hidden = true;
              statusLink.hidden = false;
              statusLabel.value = serverTimeoutError;
              statusLabel.style.color = SERVER_ERROR;
            }
      }, SERVER_TIMEOUT);

    return false;
  },

  // Called oncommand from email field in account creation.
  // Checks validity and availability of email address.
  checkEmail: function WeaveWiz_checkEmail() {
    WeaveWiz._log.debug("Checking email");

    let email = $('email-create-field').value;
    let statusLabel = $('email-error-label');
    let statusLink = $('email-error-link');
    let statusIcon = $('email-error-icon');

    let regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    // Status messages
    let checkingEmail = $('strings').getString("email-progress.label");
    let emailTaken = $('strings').getFormattedString("email-unavailable.label", [email]);
    let emailOk = $('strings').getFormattedString("email-success.label", [email]);
    let emailInvalid = $('strings').getString("email-invalid.label");
    let serverError = $('strings').getString("serverError.label");
    let serverTimeoutError = $('strings').getString("serverTimeoutError.label");

    // Don't check if they haven't entered anything
    if (!email) {
      statusIcon.hidden = true;
      statusLink.hidden = true;
      statusLabel.value = "";
      WeaveWiz._emailVerified = false;
      $('weave-setup-wizard').canAdvance = false;
      return false;
    }

    if (!regex.test(email)) {
      statusIcon.hidden = true;
      statusLink.hidden = true;
      statusLabel.value = emailInvalid;
      statusLabel.style.color = ERROR_COLOR;
      WeaveWiz._emailVerified = false;
      $('weave-setup-wizard').canAdvance = false;
      return false;
    }

/*
    // Show progress...
    statusIcon.hidden = false;
    statusLink.hidden = true;
    statusLabel.value = checkingEmail;
    statusLabel.style.color = PROGRESS_COLOR;

    let res = new Weave.Resource(WeaveWiz._serverURL + CHECK_EMAIL_URL + email);
    res.authenticator = new Weave.NoOpAuthenticator();
    res.get(
      function(data) {
        if (res.lastChannel.responseStatus == 200) {
          statusIcon.hidden = true;
          statusLink.hidden = true;

          if (data == 0) {
            statusLabel.value = emailTaken;
            statusLabel.style.color = ERROR_COLOR;
            $('weave-setup-wizard').canAdvance = false;
            WeaveWiz._emailVerified = false;

          } else {
            statusLabel.value = emailOk;
            statusLabel.style.color = SUCCESS_COLOR;
            WeaveWiz._emailVerified = true;
	  }

	} else {
	  WeaveWiz._log.info("Error: received status " +
                             res.lastChannel.responseStatus);
	  statusIcon.hidden = true;
	  statusLink.hidden = false;
	  statusLabel.value = serverError;
	  statusLabel.style.color = SERVER_ERROR_COLOR;
	}
      });
*/
    // If the server is hanging...
    //setTimeout(
    //  function() {
    //    if (!WeaveWiz._emailVerified) {
    //      WeaveWiz._log.info("Server timeout (email verification)");
    //      statusIcon.hidden = true;
    //      statusLink.hidden = false;
    //      statusLabel.value = serverTimeoutError;
    //      statusLabel.style.color = SERVER_ERROR_COLOR;
    //    }
    //  }, SERVER_TIMEOUT);

    return false;
  },

  // Called oncommand from password and passphrase entry/reentry fields.
  //  Checks that password and passphrase reentry fields are the same, and that password
  //  and passphrase are different values.
  checkAccountInput: function WeaveWiz_checkAccountInput(field) {
    WeaveWiz._log.debug("Checking account input");

    let username = $('username-create-field').value;
    let password1 = $('password-create-field').value;
    let password2 = $('reenter-password-field').value;
    let passphrase1 = $('passphrase-create-field').value;
    let passphrase2 = $('reenter-passphrase-field').value;

    if (field == "password") {
      // if the second password hasn't been entered yet, don't check
      if (!password2) {
        WeaveWiz._passwordVerified = false;
        return false;
      }

      // check that the two passwords are the same
      if (password1 != password2)  {
        $('password-match-error').value =
          $('strings').getString("passwordsUnmatched.label");
        $('password-match-error').style.color = ERROR_COLOR;
        $('weave-setup-wizard').canAdvance = false;
        WeaveWiz._passwordVerified = false;
        return false;
      }

      // check that the username and password are not the same
      if (password1 == username) {
        $('password-match-error').value =
          $('strings').getString("samePasswordAndUsername.label");
        $('password-match-error').style.color = ERROR_COLOR;
        $('weave-setup-wizard').canAdvance = false;
        WeaveWiz._passwordVerified = false;
        return false;
      }

      WeaveWiz._passwordVerified = true;
      $('password-match-error').value = "";

    } else if (field == "passphrase") {
      // If the second passphrase hasn't been entered yet, don't check
      if (!passphrase2) {
        WeaveWiz._passphraseCheck = false;
        return false;
      }

      // check that the two passphrases are the same
      if (passphrase1 != passphrase2)  {
        $('passphrase-match-error').value = $('strings').getString("passphrasesUnmatched.label");
        $('passphrase-match-error').style.color = ERROR_COLOR;
        $('weave-setup-wizard').canAdvance = false;
        WeaveWiz._passphraseCheck = false;
        return false;
      }

      // check that they haven't entered the same password and passphrase
      // TODO: check for this in the password case as well for the devious user case
      if (passphrase1 == password1) {
	$('passphrase-match-error').value = $('strings').getString("samePasswordAndPassphrase.label");
	$('passphrase-match-error').style.color = ERROR_COLOR;
	$('weave-setup-wizard').canAdvance = false;
        WeaveWiz._passphraseCheck = false;
	return false;
      }

      WeaveWiz._passphraseCheck = true;
      $('passphrase-match-error').value = "";
    }
    $('weave-setup-wizard').canAdvance = true;
    return true;
  },

  // Called oninput from password entry fields.
  // Allows the wizard to continue if password fields have values and if an
  // available username has been chosen.
  checkCreationFields: function WeaveWiz_checkUserPasswordFields() {
    WeaveWiz._log.trace("Checking creation fields");

    let username = $('username-create-field').value;
    let password1 = $('password-create-field').value;
    let password2 = $('reenter-password-field').value;
    let email = $('email-create-field').value;

    // check for empty fields
    if (!(username && password1 && password2 && email)) {
      $('weave-setup-wizard').canAdvance = false;
      return false;
    }

    // check that everything has been verified
    if (/*WeaveWiz._usernameVerified &&
        WeaveWiz._emailVerified && */
        WeaveWiz._passwordVerified) {
      $('weave-setup-wizard').canAdvance = true;
      WeaveWiz._createCheck = true;
      return true;
    }

    $('weave-setup-wizard').canAdvance = false;
    WeaveWiz._createCheck = false;
    return false;
  },

  // Called oninput from fields on passphrase / email entry screen.
  // Allows wizard to advance if all fields have a value.
  checkPassphraseFields: function WeaveWiz_checkPassphraseFields() {
    WeaveWiz._log.trace("Checking passphrase fields");

    let passphrase1 = $('passphrase-create-field').value;
    let passphrase2 = $('reenter-passphrase-field').value;

    // check for empty fields
    if (!(passphrase1 && passphrase2)) {
      $('weave-setup-wizard').canAdvance = false;
      return false;
    }

    // check that everything has been verified
    if (WeaveWiz._passphraseCheck) {
      $('weave-setup-wizard').canAdvance = true;
      WeaveWiz._createCheck2 = true;
      return true;
    }

    $('weave-setup-wizard').canAdvance = false;
    WeaveWiz._createCheck2 = false;
    return false;
  },


  // Called oninput from fields on final account creation screen.
  // Allows wizard to advance if all fields have a value.
  checkCaptchaField: function WeaveWiz_checkCaptchaField() {
    WeaveWiz._log.trace("Checking captcha field");
    if (!$('captcha-input').value) {
      $('weave-setup-wizard').canAdvance = false;
      return false;
    }
    $('weave-setup-wizard').canAdvance = true;
    return true;
  },

  // Called onclick from "try another image" link.
  // Refreshes captcha image.
  reloadCaptcha: function WeaveWiz_reloadCaptcha() {
    WeaveWiz._log.debug("Reloading captcha");
    $('captcha').reload();
  },

  onLoadCaptcha: function WeaveWiz_onLoadCaptcha() {
    WeaveWiz._log.debug("Captcha loaded");
    let captchaImage = $('captcha').
      contentDocument.getElementById('recaptcha_challenge_field').value;
    $('lastCaptchaChallenge').value = captchaImage;
    $('captcha-image').setAttribute("src", CAPTCHA_IMAGE_URL + "?c=" + captchaImage);
  },


  // Called onadvance for final account creation screen.
  // Posts http request to server, and checks for correct captcha response.
  createAccount: function WeaveWiz_createAccount() {
    WeaveWiz._log.debug("Creating account");

    let statusLabel = $('account-creation-status-label');
    let statusLink = $('account-creation-status-link');
    let statusIcon = $('account-creation-status-icon');

    let captchaError = $('captcha-error');
    let captchaImage = $('captcha').
      contentDocument.getElementById('recaptcha_challenge_field').value;
    let username = $('username-create-field').value;
    let created = $('strings').getFormattedString("create-success.label", [username]);
    let serverError = $('strings').getString("serverError.label");
    let progress = $('strings').getString("create-progress.label");
    let uidTaken = $('strings').getString("create-uid-inuse.label");
    let uidMissing = $('strings').getString("create-uid-missing.label");
    let uidInvalid = $('strings').getString("create-uid-invalid.label");
    let emailInvalid = $('strings').getString("create-mail-invalid.label");
    let emailTaken = $('strings').getString("create-mail-inuse.label");
    let captchaMissing = $('strings').getString("create-captcha-missing.label");
    let passwordMissing = $('strings').getString("create-password-missing.label");
    let incorrectCaptcha = $('strings').getString("incorrectCaptcha.label");

    if (WeaveWiz._createCheck3)
      return true;

    // tell the user the server is working...
    statusIcon.hidden = false;
    statusLink.hidden = true;
    statusLabel.hidden = false;
    statusLabel.value = progress;
    statusLabel.style.color = PROGRESS_COLOR;

    // hide the captcha error message in case that was the problem
    captchaError.value = "";

    let onComplete = function(status) {
      switch (status) {
      case 200:
      case 201:
        // CREATED
	captchaError.value = "";
	statusIcon.hidden = true;
	statusLink.hidden = true;
	statusLabel.value = created;
	statusLabel.style.color = SUCCESS_COLOR;

        WeaveWiz.saveLoginInfo();

        WeaveWiz._createCheck3 = true;
	$('weave-setup-wizard').canAdvance = true;
	$('weave-setup-wizard').advance('sync-wizard-data');
        break;

      case 400:
	statusIcon.hidden = true;
	statusLink.hidden = true;
        statusLabel.style.color = ERROR_COLOR;

        let response = data;
        if (response.match("0") && !response.match("-10"))
          statusLabel.value = uidTaken;
        else if (response.match("-2"))
        statusLabel.value = uidMissing;
        else if (response.match("-3"))
        statusLabel.value = uidInvalid;
        else if (response.match("-4"))
        statusLabel.value = emailInvalid;
        else if (response.match("-5"))
        statusLabel.value = emailTaken;
        else if (response.match("-7")) {
          captchaError.value = captchaMissing;
          captchaError.style.color = ERROR_COLOR;
	  statusLabel.hidden = true;
	} else if (response.match("-8"))
        statusLabel.value = passwordMissing;
	else
	  statusLabel.value = serverError;

        WeaveWiz._createCheck3 = false;
	$('weave-setup-wizard').canAdvance = false;
        break;

      case 417:
	captchaError.value = incorrectCaptcha;
	captchaError.style.color = ERROR_COLOR;
	$('captcha').reload();
	$('captcha-input').value = "";
	statusIcon.hidden = true;
	statusLink.hidden = true;
	statusLabel.hidden = true;
        WeaveWiz._createCheck3 = false;
	$('weave-setup-wizard').canAdvance = false;
	break;

      default:
	statusIcon.hidden = true;
	statusLink.hidden = false;
	statusLabel.value = serverError;
	statusLabel.style.color = SERVER_ERROR_COLOR;

        WeaveWiz._createCheck3 = false;
	$('weave-setup-wizard').canAdvance = false;
	break;
      }
    };

    Weave.Service.createAccount(onComplete,
                                $('username-create-field').value,
                                $('password-create-field').value,
                                $('email-create-field').value,
                                $('lastCaptchaChallenge').value,
                                $('captcha-input').value);

    return false;
  },

  saveLoginInfo: function WeaveWiz_saveLoginInfo() {
    WeaveWiz._log.debug("Saving username, password, passphrase in login manager");

    // Setting the Weave.Service properties results in this data being
    // saved in the Firefox login manager
    Weave.Svc.Prefs.set("autoconnect", true);
    if (WeaveWiz._path == "verify") {
      Weave.Service.username = $('username').value;
      Weave.Service.password = $('password').value;
      Weave.Service.passphrase = $('passphrase').value;
    } else {
      Weave.Service.username = $('username-create-field').value;
      Weave.Service.password = $('password-create-field').value;
      Weave.Service.passphrase = $('passphrase-create-field').value;
    }
    return true;
  },

  /////INSTALLATION, FINAL SYNC/////

  // FIXME: Code duplication between here and pref pane
  onShowData: function WeaveWiz_onShowData() {
    WeaveWiz._log.debug("Showing data page");
    $('device-name-field').value = Weave.Clients.clientName;
    $('device-type-field').value = Weave.Clients.clientType;
    $('sync-bookmarks').checked = Weave.Svc.Prefs.get("engine.bookmarks");
    $('sync-history').checked = Weave.Svc.Prefs.get("engine.history");
    $('sync-tabs').checked = Weave.Svc.Prefs.get("engine.tabs");
    $('sync-passwords').checked = Weave.Svc.Prefs.get("engine.passwords");
    $('weave-setup-wizard').canAdvance = true;
  },

  onFinishData: function WeaveWiz_onFinishData() {
    WeaveWiz._log.debug("Saving data prefs");
    Weave.Clients.clientName = $('device-name-field').value;
    Weave.Clients.clientType = $('device-type-field').value;
    Weave.Svc.Prefs.set("engine.bookmarks", $('sync-bookmarks').checked);
    Weave.Svc.Prefs.set("engine.history", $('sync-history').checked);
    Weave.Svc.Prefs.set("engine.tabs", $('sync-tabs').checked);
    Weave.Svc.Prefs.set("engine.passwords", $('sync-passwords').checked);
    return true;
  },

  onShowFinal: function WeaveWiz_onShowFinal() {
    WeaveWiz._log.debug("Showing final page");

    // don't do anything if the sync has already happened
    if (WeaveWiz._syncSuccess) {
      $('weave-setup-wizard').canAdvance = true;
      return true;
    }

    WeaveWiz._log.debug("Completing installation");

    $('weave-setup-wizard').canAdvance = false;

    // account status
    let username = (WeaveWiz._path == "verify")?
      $('username').value : $('username-create-field').value;
    $('final-account-details').value =
      $('strings').getFormattedString("final-account-value.label", [username]);

    // preferences
    let prefs = "";
    for each (let type in ["bookmarks", "history", "tabs", "passwords"]) {
      if ($('sync-' + type).checked)
        prefs += $('strings').getString(type + ".label") + ", ";
    }
    $('final-pref-details').value = prefs.substring(0, prefs.length-2);

    // explain sync
    let syncDetails = $('final-sync-details');
    syncDetails.value = $('strings').getString("final-sync-value.label");

    $('final-status-label').style.color = PROGRESS_COLOR;
    $('final-status-icon').hidden = false;
    $('final-status-link').hidden = true;

    // set prefs
    $('final-status-label').value =
      $('strings').getString("initialPrefs-progress.label");
    $('final-pref-status').style.color = SUCCESS_COLOR;

    // login and perform initial sync
    $('final-status-label').value =
      $('strings').getString("initialLogin-progress.label");
    $('final-status-icon').hidden = false;

    Weave.Service.login(
      function() {
        WeaveWiz._log.info("Initial login finished");
        $('final-account-status').style.color = SUCCESS_COLOR;
        $('final-status-label').value =
          $('strings').getString("initialSync-progress.label");
        Weave.Service.sync(
          function() {
            WeaveWiz._log.info("Initial sync finished");
            $('final-sync-status').style.color = SUCCESS_COLOR;
            $('final-status-label').value =
              $('strings').getString("installation-complete.label");
            $('final-status-link').hidden = true;
            $('final-status-icon').hidden = true;
            WeaveWiz._syncSuccess = true;
            $('weave-setup-wizard').canAdvance = true;
            $('weave-setup-wizard').advance('sync-wizard-thankyou');
          }, true);
      });

//          $('final-account-status').style.color = ERROR_COLOR;
//          $('final-status-label').value =
//            $('strings').getString("initialLogin-error.label");
//          $('final-status-label').style.color = SERVER_ERROR_COLOR;
//          $('final-status-icon').hidden = true;
//          $('final-status-link').hidden = false;

    // don't let them advance- only sync:finish will advance
  },

  onFinishFinal: function WeaveWiz_onFinishFinal() {
    return false;
  },

  // Called from completeInstallation().
  // Sets page values and does a sync.
  initialSync: function WeaveWiz_initialSync() {
    WeaveWiz._log.debug("initialSync()");
    $('final-status-label').value = $('strings').getString("initialSync-progress.label");
    $('final-status-icon').hidden = false;
    $('final-status-link').hidden = true;
    Weave.Utils.openStatus();
  },

  onLogin: function WeaveWiz_onLogin(subject, data) {
    WeaveWiz._log.info("Initial login succeeded");
  },

  onLoginError: function WeaveWiz_onLoginError(subject, data) {
    WeaveWiz._log.info("Initial login failed");
  },

  onLogout: function WeaveWiz_onLogout(subject, data) {
    WeaveWiz._log.info("Logged out");
  },

  onVerifyLogin: function WeaveWiz_onVerifyLogin(subject, data) {
    WeaveWiz._log.info("Login verify succeeded");

    WeaveWiz._loginCheck = true;
    $('account-error-icon').hidden = true;
    $('account-error-link').hidden = true;
    $('account-error-label').value = $('strings').getString("verify-success.label");
    $('account-error-label').style.color = SUCCESS_COLOR;

    // If the passphrase hasn't been verified, try doing so now.
    // Its check may have been deferred until we had a valid login.

    if (!WeaveWiz._passphraseCheck) {
      WeaveWiz._log.info("Checking passphrase after login verify");
      WeaveWiz.verifyPassphrase();
    }
  },

  onVerifyLoginError: function WeaveWiz_onVerifyLoginError(subject, data) {
    WeaveWiz._log.info("Login verify failed");
    WeaveWiz._loginCheck = false;
    $('account-error-icon').hidden = true;
    $('account-error-link').hidden = true;
    $('account-error-label').value = $('strings').getString("verify-error.label");
    $('account-error-label').style.color = ERROR_COLOR;
    $('weave-setup-wizard').canAdvance = false;
  },

  onVerifyPassphrase: function WeaveWiz_onVerifyPassphrase(subject, data) {
    WeaveWiz._log.info("Passphrase verify succeeded");
    WeaveWiz._passphraseCheck = true;
    $('passphrase-error-icon').hidden = true;
    $('passphrase-error-link').hidden = true;
    $('passphrase-error-label').value = $('strings').getString("passphrase-success.label");
    $('passphrase-error-label').style.color = SUCCESS_COLOR;
  },

  onVerifyPassphraseError: function WeaveWiz_onVerifyPassphraseError(subject, data) {
    WeaveWiz._log.info("Passphrase verify failed");
    WeaveWiz._passphraseCheck = false;
    $('passphrase-error-icon').hidden = true;
    $('passphrase-error-link').hidden = true;
    $('passphrase-error-label').value = $('strings').getString("passphrase-error.label");
    $('passphrase-error-label').style.color = ERROR_COLOR;
    $('weave-setup-wizard').canAdvance = false;
  },

  onSyncStart: function WeaveWiz_onSyncStart(subject, data) {
  },

  onSyncFinish: function WeaveWiz_onSyncFinish(subject, data) {
  },

  onSyncError: function WeaveWiz_onSyncError(subject, data) {
    WeaveWiz._log.info("Initial Sync failed");
    $('final-sync-status').style.color = ERROR_COLOR;
    $('final-status-label').value = $('strings').getString("initialSync-error.label");
    $('final-status-label').style.color = SERVER_ERROR_COLOR;
    $('final-status-link').hidden = false;
    $('final-status-icon').hidden = true;

    //this will allow them to run completeInstallation() again (try again)
    WeaveWiz._installationStarted = false;
  }
};
WeaveWiz.init();
