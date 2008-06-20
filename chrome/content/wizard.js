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
const REGISTER_URL = "https://sm-labs01.mozilla.org:81/api/register/new/";
const CHECK_USERNAME_URL = "https://sm-labs01.mozilla.org:81/api/register/check/";
const CHECK_EMAIL_URL = "https://sm-labs01.mozilla.org:81/api/register/chkmail/";
const CAPTCHA_IMAGE_URL = "http://api.recaptcha.net/image";

function SyncWizard() {
  this._init();
}

// TODO: Get license agreement text. Add screen for current users and force acceptance to install.

SyncWizard.prototype = {
  
  __os: null,  
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
                  .getService(Ci.nsIObserverService);
    return this.__os;
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle",
                          function() { return stringBundle; });
    return this._stringBundle;
  },

  _init : function SyncWizard__init() {
    this._log = Log4Moz.Service.getLogger("Chrome.Wizard");
	
    this._log.info("Initializing setup wizard");

    this._os.addObserver(this, "weave:service:login:success", false);
    this._os.addObserver(this, "weave:service:login:error", false);
    this._os.addObserver(this, "weave:service:logout:success", false);
    this._os.addObserver(this, "weave:service:sync:start", false);
    this._os.addObserver(this, "weave:service:sync:success", false);
    this._os.addObserver(this, "weave:service:sync:error", false);
  },

  onWizardShutdown: function SyncWizard_onWizardshutdown() {
    this._log.info("Shutting down setup wizard");

    this._os.removeObserver(this, "weave:service:login:success");
    this._os.removeObserver(this, "weave:service:login:error");
    this._os.removeObserver(this, "weave:service:logout:success");
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
  },


  onPageShow: function SyncWizard_onPageShow(pageId) {
    let wizard = document.getElementById('sync-wizard');
    let status1, sync1;

    switch(pageId) {
    case "sync-wizard-welcome":
	  this._log.info("Wizard: Showing welcome page");
	  document.getElementById('sync-radio-group').selectedIndex = -1;
	  wizard.canAdvance = false;
      break;
    case "sync-wizard-verify1":
      this._log.info("Wizard: Showing account verification page");	  
      wizard.canAdvance = true;
      break;
    case "sync-wizard-verify2":
      this._log.info("Wizard: Showing passphrase verification page");
      wizard.canAdvance = true;
      break;

	case "sync-wizard-create1": 
	  this._log.info("Wizard: Showing username/password creation page");
	  if (document.getElementById("create1-check").value == "true") 
	    wizard.canAdvance = true;
	  else
	    wizard.canAdvance = false;
	  break;
	case "sync-wizard-create2": 
	  this._log.info("Wizard: Showing passphrase creation page");
	  if (document.getElementById("create2-check").value == "true") 
	    wizard.canAdvance = true;
	  else 
	    wizard.canAdvance = false;
	  break;
	case "sync-wizard-create3": 
	  this._log.info("Wizard: Showing email/captcha page");
	  	
	  if (document.getElementById("create3-check").value == "true") {
	    document.getElementById("captchaInput").value = "";
	    wizard.canAdvance = true;
	  }
      else {
	    document.getElementById('captcha').addEventListener("pageshow", function() {gSyncWizard.onLoadCaptcha()}, false, true);
	    document.getElementById('captcha').setAttribute("src", REGISTER_URL);
         
	    wizard.canAdvance = false;
	  }
	  break;
	
	case "sync-wizard-data": {
      
	  this._log.info("Wizard: Showing data page");

      let branch = Cc["@mozilla.org/preferences-service;1"].
                   getService(Ci.nsIPrefService).
		           getBranch(Weave.PREFS_BRANCH + "engine.");

      // TODO: Move this into a separate module for use in prefs and wizard
      document.getElementById('sync-wizard-bookmarks').checked = branch.getBoolPref("bookmarks");
      document.getElementById('sync-wizard-history').checked = branch.getBoolPref("history");
      document.getElementById('sync-wizard-cookies').checked = branch.getBoolPref("cookies");
      document.getElementById('sync-wizard-passwords').checked = branch.getBoolPref("passwords");
      document.getElementById('sync-wizard-tabs').checked = branch.getBoolPref("tabs");
      document.getElementById('sync-wizard-forms').checked = branch.getBoolPref("forms");
		
      wizard.canAdvance = true;
      break;
	}  
    case "sync-wizard-final":
      this._log.info("Wizard: Showing final page");
      
      // Show bookmark-reset status if user selected this option on last screen
      // TODO: resetClient() doesn't seem to be working- will add functionality later
      /*
      if (document.getElementById("removeBookmarks").getAttribute("checked")) {
        document.getElementById("sync-reset-row").setAttribute("hidden", false);
        document.getElementById("sync-reset-separator").setAttribute("hidden", false);
      }
      */
	  Weave.Service.logout();
	  let loginStatus = document.getElementById('loginLabel'); 
      loginStatus.setAttribute("disabled", "false");
      loginStatus.setAttribute("value", this._stringBundle.getString("initialLogin-progress.label"));
      Weave.Service.login(function() {gSyncWizard.setPrefs()});
      break;
    default:
      this._log.warn("Unknown wizard page requested: " + pageId);
      break;
    }
  },

  onLoadCaptcha: function SyncWizard_onLoadCaptcha() {
    
    let captchaImage = document.getElementById('captcha').contentDocument.getElementById('recaptcha_challenge_field').value;
	document.getElementById('lastCaptchaChallenge').value = captchaImage;
	document.getElementById('captchaImage').setAttribute("src", CAPTCHA_IMAGE_URL + "?c=" + captchaImage);   
  
  },

  /* checkRadioSelection() - Called oncommand for radio buttons in welcome screen. 
   *  Enables "Continue" button of wizard if one is selected, disables otherwise. 
   */

  checkRadioSelection: function SyncWizard_checkRadioSelection() {
    let wizard = document.getElementById('sync-wizard');
    let radio1 = document.getElementById('sync-curuser-radio');
    let radio2 = document.getElementById('sync-newuser-radio');
    
    if (radio1.getAttribute("selected") || radio2.getAttribute("selected")) 
      wizard.canAdvance = true;
    else 
      wizard.canAdvance = false;
  }, 
  
  /* createAccount() - Called onadvance for final account creation screen. 
   *  Posts http request to server, and checks for correct captcha response. 
   */
  
  createAccount: function SyncWizard_createAccount() {
	let httpRequest = new XMLHttpRequest();
	
	let wizard = document.getElementById('sync-wizard');
	let error = document.getElementById('create3-error');
	
	let log = this._log;
	let stringBundle = this._stringBundle;
	
	if (document.getElementById("create3-check").value == "true")
	  return true;
	
	httpRequest.open('POST', REGISTER_URL, true);

	httpRequest.onreadystatechange = function() { 
	  if (httpRequest.readyState == 4) {
	    switch (httpRequest.status) {
	      // correct captcha response: allow user to continue to next screen
	      case 201:
	        error.hidden = true;
	        if (httpRequest.responseText == "2: VERIFICATION SENT") 
	          log.info("Account created, verification email sent.");
	        else if (httpRequest.responseText == "3: CREATED") 
	          log.info("Account created, no email address given.");

		    document.getElementById("create3-check").value = "true";
		    wizard.canAdvance = true;
			wizard.advance('sync-wizard-data');
			break;
		  // incorrect captcha response: don't allow advancing and display error message
		  case 417:
		    error.hidden = false;
			error.value = stringBundle.getString("incorrectCaptcha.label");
			document.getElementById('captcha').reload();
			document.getElementById('captchaInput').value = "";
			break;
			// server error: this shouldn't happen, but... 
			// TODO: add an error message for this case
	      default:
			log.info("Error: received status " + httpRequest.status);
			break;
		}
      }
	};
	
	let uid = document.getElementById("sync-username-create-field").value;
	let password = document.getElementById("sync-password-create-field").value;
	let passphrase = document.getElementById("sync-passphrase-create-field").value;
	let mail = document.getElementById("sync-email-create-field").value;
	
	let captchaDoc = document.getElementById("captcha").contentDocument;
	let challenge = document.getElementById("lastCaptchaChallenge").value;
	let response = document.getElementById("captchaInput").value;
	
	let message = "uid=" + encodeURIComponent(uid) + 
				  "&password=" + encodeURIComponent(password) + 
				  "&mail=" + encodeURIComponent(mail) + 
				  "&recaptcha_response_field=" + encodeURIComponent(response) + 
				  "&recaptcha_challenge_field=" + encodeURIComponent(challenge);
		
	httpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	httpRequest.setRequestHeader("Content-Length", message.length);
    httpRequest.send(message);		
	
	return false;
  },
  
  /* verifyPassword() - Called onadvance from first account verification screen.
   *  Checks for empty fields and verifies login information. 
   */
  
  verifyPassword: function SyncWizard_verifyPassword() {
	let wizard = document.getElementById('sync-wizard');
	let verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');
	let error = document.getElementById('verify1-error');
    let username = document.getElementById('sync-username-field');
    let password = document.getElementById('sync-password-field');
    
    if (document.getElementById("verify1-check").value == "true") {
      return true;
 	}

	// Check for empty fields
    if (!(username && password && username.value && password.value)) {
      error.hidden = false;
      error.value = this._stringBundle.getString("requiredFields.label");
      verifyStatus.setAttribute("value", this._stringBundle.getString("verifyStatusUnverified.label"));
      return false;
    }
	
	error.hidden = true;
			
	this._log.info("Verifying username/password...");

	// Set the verifying status label and prevent advancing during verification
    verifyStatus.setAttribute("value", this._stringBundle.getString("verifyStatusVerifying.label"));
	wizard.canAdvance = false;

    this._log.info("Adding user login/password to password manager");
    Weave.Service.username = username.value;
    Weave.Service.password = password.value;
	
    Weave.Service.logout();
	
	let loginFailedText = this._stringBundle.getString("loginFailed.label");
	
	Weave.Service.login(function() {
			if (Weave.Service.currentUser) {
			  document.getElementById("verify1-check").value = "true";
			  wizard.advance("sync-wizard-verify2");
			}
			else {
			  error.setAttribute("hidden", false);
		      error.setAttribute("value", loginFailedText);
			}
		}, 
		Weave.Service.password, Weave.Service.passphrase);
	
    this._log.info("Username/password verified.");
	
	return false;
  },

  /* verifyPassphrase() - Called onadvance from second account verification screen.
   *  Checks for empty fields. Should verify passphrase. 
   */
  verifyPassphrase: function SyncWizard_verifyPassphrase() {
	let wizard = document.getElementById('sync-wizard');
	let verifyStatus = document.getElementById('sync-wizard-verifyPassphrase-status');
	let error = document.getElementById('verify2-error');
    let passphrase = document.getElementById('sync-passphrase-field');

	// Check for empty fields
    if (!(passphrase && passphrase.value)) {
		error.hidden = false;
		error.value = this._stringBundle.getString("requiredFields.label");
		verifyStatus.value = this._stringBundle.getString("verifyStatusUnverified.label");
		return false;
    }
		
	error.setAttribute("hidden", true);
		
	// TODO: Passphrase verification
			
	return true;
  },
  
  /* checkUsername() - Called onchange from username field for account creation. 
   *   Checks username availability.
   */
  checkUsername: function SyncWizard_checkUsername() {
	let wizard = document.getElementById('sync-wizard');
	let log = this._log;
	
	let httpRequest = new XMLHttpRequest();
	let usernameField = document.getElementById('sync-username-create-field');
	let url = CHECK_USERNAME_URL + usernameField.value;
		
	usernameTaken = this._stringBundle.getString("usernameTaken.label");
	usernameAvailable = this._stringBundle.getString("usernameAvailable.label");
	
	if (!(usernameField && usernameField.value)) {
	  document.getElementById('sync-wizard-verifyUsername').setAttribute("value", "");
	  wizard.canAdvance = false;
	  return false;
	}
		
    httpRequest.open('GET', url, true);

    httpRequest.onreadystatechange = function() {			
	  if (httpRequest.readyState == 4) {
	    if (httpRequest.status == 200) {
	      if (httpRequest.responseText == 0) {
	        document.getElementById('sync-wizard-verifyUsername').setAttribute("value", usernameTaken);
	        wizard.canAdvance = false;
	      }
	      else {
	        document.getElementById('sync-wizard-verifyUsername').setAttribute("value", usernameAvailable);
	        if (gSyncWizard.checkPasswordFields()) {
	          wizard.canAdvance = true;
	        }
	      }
	    } 
	    // TODO: Add error message for this case. 
	    else {
	      log.info("Error: received status " + httpRequest.status);
	    }
	  }	
	};
				
    httpRequest.send(null);		
  },

  /* checkEmail() - Called onchange from email field in account creation. 
   *  Checks validity and availability of email address. 
   */
  checkEmail: function SyncWizard_checkEmail() {
	let wizard = document.getElementById('sync-wizard');
	let log = this._log;
	
	let httpRequest = new XMLHttpRequest();
	let emailField = document.getElementById('sync-email-create-field');
	let url = CHECK_EMAIL_URL + emailField.value;
	
	let regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
	
	emailTaken = this._stringBundle.getString("emailTaken.label");
	emailInvalid = this._stringBundle.getString("emailInvalid.label");
	emailOk = this._stringBundle.getString("emailOk.label");
	
	if (!(emailField && emailField.value)) {
	  document.getElementById('sync-wizard-verifyEmail').setAttribute("value", "");
	  wizard.canAdvance = false;
	  return false;
	}
	
    if (!regex.test(emailField.value)) {
	  document.getElementById('sync-wizard-verifyEmail').setAttribute("value", emailInvalid); 
	  wizard.canAdvance = false;
	  return false;
    }
    
    httpRequest.open('GET', url, true);

    httpRequest.onreadystatechange = function() {			
	  if (httpRequest.readyState == 4) {
	    if (httpRequest.status == 200) {
	      if (httpRequest.responseText == 0) {
	        document.getElementById('sync-wizard-verifyEmail').setAttribute("value", emailTaken);
	        wizard.canAdvance = false;
	      }
	      else {
	        document.getElementById('sync-wizard-verifyEmail').setAttribute("value", emailOk);
	        if (gSyncWizard.checkFinalFields()) {
	          wizard.canAdvance = true;
	         }
	      }
	    } 
	    else {
	      log.info("Error: received status " + httpRequest.status);
	    }
	  }	
	};
				
    httpRequest.send(null);		
  },
  
  /* checkPasswordFields() - Called oninput from fields on password entry screen.
   *  Allows wizard to advance if all fields have a value.
   */
  checkPasswordFields: function SyncWizard_checkPasswordFields() {
	let wizard = document.getElementById('sync-wizard');

    let password1 = document.getElementById('sync-password-create-field');
    let password2 = document.getElementById('sync-reenter-password-field');
    
    if (!(password1 && password1.value && password2 && password2.value)) {
      wizard.canAdvance = false;
      return false;
    }
    
    wizard.canAdvance = true;
    return true;
  },
  
  /* checkPassphraseFields() - Called oninput from fields on passphrase entry screen.
   *  Allows wizard to advance if all fields have a value.
   */
  checkPassphraseFields: function SyncWizard_checkPassphraseFields() {
	let wizard = document.getElementById('sync-wizard');

    let passphrase1 = document.getElementById('sync-passphrase-create-field');
    let passphrase2 = document.getElementById('sync-reenter-passphrase-field');
    
    if (!(passphrase1 && passphrase1.value && passphrase2 && passphrase2.value)) {
      wizard.canAdvance = false;
      return false;
    }
    
    wizard.canAdvance = true;
    return true;
  },

  /* checkFinalFields() - Called oninput from fields on final account creation screen.
   *  Allows wizard to advance if all fields have a value.
   */
  checkFinalFields: function SyncWizard_checkFinalFields() {
    let wizard = document.getElementById('sync-wizard');
    
    let input = document.getElementById('captchaInput');
    
    // email is currently optional, not checking for value
    if (!(input && input.value)) {
      wizard.canAdvance = false;
      return false;
    }
    
    wizard.canAdvance = true;
    return true;
  
  },

  /* checkAccountInput() - Called onadvance from password and passphrase entry screens.
   *  Checks that password and passphrase reentry fields are the same, and that password
   *  and passphrase are different values.
   */
  checkAccountInput: function SyncWizard_checkAccountInput(field) {
    let password1 = document.getElementById("sync-password-create-field");
	let password2 = document.getElementById("sync-reenter-password-field");
	let passphrase1 = document.getElementById("sync-passphrase-create-field");
	let passphrase2 = document.getElementById("sync-reenter-passphrase-field");
  
	if (field == "password") {
	  let error = document.getElementById("create1-error");
	
	  if (!(password1 && password1.value && password2 && password2.value)) {
	    error.hidden = false;
	    error.value = this._stringBundle.getString("requiredFields.label");
	    return false;
	  }
	  if (password1.value != password2.value)  {
	    let error = document.getElementById("create1-error");
	    error.hidden = false;
	    error.value = this._stringBundle.getString("passwordsUnmatched.label");
	    return false;
	  }
      error.hidden = true;
      document.getElementById("create1-check").value = "true";
	}
	else if (field == "passphrase") {
	  let error = document.getElementById("create2-error");
		
      if (!(passphrase1 && passphrase1.value && passphrase2 && passphrase2.value)) {
        error.hidden = false;
        error.value = this._stringBundle.getString("requiredFields.label");
        return false;
      }
      if (passphrase1.value != passphrase2.value)  {
        error.hidden = false;
        error.value = this._stringBundle.getString("passphrasesUnmatched.label");
        return false;
      }
      if (password1.value == passphrase1.value) {
        error.hidden = false;
        error.value = this._stringBundle.getString("samePasswordAndPassphrase.label");
        return false;
      }
      error.hidden = true;
      document.getElementById("create2-check").value = "true";
	}
	return true;
  },
  
  /* reloadCaptch() - Called onclick from "try another image" link.
   *  Refreshes captcha image. 
   */
  reloadCaptcha: function SyncWizard_reloadCaptcha() {
  
    document.getElementById("captcha").reload();
  },  

  /* setPrefs() - Called during final screen checklist.
   *  Prefs are set on the previous screen, but committed here in case the user "Cancels".
   */
  setPrefs: function SyncWizard_setPrefs() {

	let branch = Cc["@mozilla.org/preferences-service;1"].
	             getService(Ci.nsIPrefService).
	             getBranch(Weave.PREFS_BRANCH + "engine.");
	
	let value;

    // TODO: Move this into a separate module for use in prefs and wizard
	value = document.getElementById('sync-wizard-bookmarks').checked;
	branch.setBoolPref("bookmarks", value);
	value = document.getElementById('sync-wizard-history').checked;
	branch.setBoolPref("history", value);
	value = document.getElementById('sync-wizard-cookies').checked;
	branch.setBoolPref("cookies", value);
	value = document.getElementById('sync-wizard-passwords').checked;
	branch.setBoolPref("passwords", value);
	value = document.getElementById('sync-wizard-tabs').checked;
	branch.setBoolPref("tabs", value);
	value = document.getElementById('sync-wizard-forms').checked;
	branch.setBoolPref("forms", value);

    this._log.info("Preferences set.");
    prefStatus = document.getElementById('prefsLabel');
    prefStatus.setAttribute("disabled", false);
    prefStatus.setAttribute("value", this._stringBundle.getString("initialPrefs-done.label"));
    document.getElementById('prefsCheck').setAttribute("hidden", false);
    
    // TODO: resetClient() doesn't seem to be working- will add functionality later
    /*
    if (document.getElementById("removeBookmarks").getAttribute("checked") == true) {
      resetStatus = document.getElementById("resetLabel");
      resetStatus.setAttribute("disabled", false);
      gSyncWizard.resetClient();
      resetStatus.setAttribute("value", this._stringBundle.getString("initialReset-done.label;"));
      document.getElementById('resetCheck').setAttribute("hidden", false);
    }
    */
	gSyncWizard.initialSync();
	
	return true;
  },
  
  resetClient: function SyncWizard_resetClient() {
    let p = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
    if (p.confirm(null,
                  this._stringBundle.getString("reset.client.warning.title"),
                  this._stringBundle.getString("reset.client.warning")))
      Weave.Service.resetClient();
    
  },
  
  /* initialSync() - Called during final screen checklist after successful login.
   *  Performs sync and updates status on screen.
   */
  initialSync: function SyncWizard_initialSync() {
	let wizard = document.getElementById('sync-wizard');
	let syncStatus = document.getElementById('syncLabel');
    
			
	this._log.info("Doing initial sync...");

	syncStatus.setAttribute("disabled", "false");
    syncStatus.setAttribute("value", this._stringBundle.getString("initialSync-progress.label"));

		
	Weave.Service.sync();
	
  },

  /* tryAgain() - Called onclick from "try again" link if server error happens during setup.
   *  Re-does login or login->sync depending on [what] didn't work.
   */
  tryAgain: function SyncWizard_tryAgain(what) {

    document.getElementById("login-failed").setAttribute("hidden", true);
    document.getElementById("sync-failed").setAttribute("hidden", true);

	let loginStatus = document.getElementById('loginLabel');
	let syncStatus = document.getElementById('syncLabel'); 

    if (what == "login") {
      syncStatus.setAttribute("disabled", "true");
      loginStatus.setAttribute("value", this._stringBundle.getString("initialLogin-progress.label"));
      Weave.Service.login(function() {gSyncWizard.initialSync()});
    }
    else if (what == "sync") {
      syncStatus.setAttribute("value", this._stringBundle.getString("initialSync-progress.label"));
      gSyncWizard.initialSync();
    }
  }, 
  
  observe: function(subject, topic, data) {
    if (!document) {
      this._log.warn("XXX FIXME: wizard observer called after wizard went away");
      return;
    }
    let wizard = document.getElementById('sync-wizard');
    let verifyStatus, loginStatus, syncStatus, initStatus, throbber1, throbber2, sync1;

    switch(topic) {
    case "weave:service:login:success":
      if (wizard.currentPage.pageid == "sync-wizard-verify1") {
        this._log.info("Login verified");
        verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');
        verifyStatus.setAttribute("value", this._stringBundle.getString("verifyStatusLoginVerified.label"));
        wizard.canAdvance = true;
      }
      else if (wizard.currentPage.pageid == "sync-wizard-final") {
        this._log.info("Initial login succeeded");
        loginStatus = document.getElementById('loginLabel'); 
        loginStatus.setAttribute("value", this._stringBundle.getString("initialLogin-done.label"));
        document.getElementById('loginCheck').setAttribute("hidden", false);
      }
      break;
    case "weave:service:login:error":
      if (wizard.currentPage.pageid == "sync-wizard-verify1") {
        this._log.info("Login failed");
        verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');
        verifyStatus.setAttribute("value", this._stringBundle.getString("verifyStatusLoginFailed.label"));
        wizard.canAdvance = true;
      }
      else if (wizard.currentPage.pageid == "sync-wizard-final") {
        this._log.info("Initial login failed");
        loginStatus = document.getElementById('loginLabel'); 
        loginStatus.setAttribute("value", this._stringBundle.getString("initialLogin-error.label"));
        document.getElementById("installation-ok").setAttribute("hidden", true);
        document.getElementById("login-failed").setAttribute("hidden", false);
      }
      break;
    case "weave:service:logout:success":
      this._log.info("Logged out");
      break;
    case "weave:service:sync:success":
      this._log.info("Initial Sync performed");
      syncStatus = document.getElementById('syncLabel'); 
      syncStatus.setAttribute("value", this._stringBundle.getString("initialSync-done.label"));
      document.getElementById('syncCheck').setAttribute("hidden", false);
      document.getElementById("installation-ok").setAttribute("hidden", false);
      break;
    case "weave:service:sync:error":
      this._log.info("Initial Sync failed");
      syncStatus = document.getElementById('syncLabel'); 
      syncStatus.setAttribute("value", this._stringBundle.getString("initialSync-error.label"));
      document.getElementById("installation-ok").setAttribute("hidden", true);
      document.getElementById("sync-failed").setAttribute("hidden", false);
      break;
      
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gSyncWizard = new SyncWizard();
