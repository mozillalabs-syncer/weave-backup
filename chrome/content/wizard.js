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
const CAPTCHA_URL = "https://sm-labs01.mozilla.org:81/register/new/";
const REGISTER_URL = "https://sm-labs01.mozilla.org:81/register/check/";

function SyncWizard() {
  this._init();
}

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
	  wizard.canAdvance = true;
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
	  wizard.canAdvance = false;
	  break;
	case "sync-wizard-create2": 
	  this._log.info("Wizard: Showing passphrase creation page");
	  wizard.canAdvance = true;
	  break;
	case "sync-wizard-create3": 
	  this._log.info("Wizard: Showing email/captcha page");
	  // FIXME: recaptcha doesn't refresh on pageload
	  document.getElementById('captcha').setAttribute("src", CAPTCHA_URL);
	  // TODO: Get terms
	  wizard.canAdvance = true;
	  break;
	
	case "sync-wizard-data": {
	  this._log.info("Wizard: Showing data page");

      let branch = Cc["@mozilla.org/preferences-service;1"].
                   getService(Ci.nsIPrefService).
		           getBranch(Weave.PREFS_BRANCH + "engine.");
		
		// FIXME: this should work, but error on getBoolPref()
		//let branch = Weave.PREFS_BRANCH + "engine.";
      document.getElementById('sync-wizard-bookmarks').checked = branch.getBoolPref("bookmarks");
      document.getElementById('sync-wizard-history').checked = branch.getBoolPref("history");
      document.getElementById('sync-wizard-cookies').checked = branch.getBoolPref("cookies");
      document.getElementById('sync-wizard-passwords').checked = branch.getBoolPref("passwords");
      document.getElementById('sync-wizard-forms').checked = branch.getBoolPref("forms");
		
      wizard.canAdvance = true;
      break;
	}  
    case "sync-wizard-final":
      this._log.info("Wizard: Showing final page");
      break;
    default:
      this._log.warn("Unknown wizard page requested: " + pageId);
      break;
    }
  },
  
  verifyPassword: function SyncWizard_verifyPassword() {
	let wizard = document.getElementById('sync-wizard');
	let verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');
	let error = document.getElementById('verify1-error');
    let username = document.getElementById('sync-username-field');
    let password = document.getElementById('sync-password-field');

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
	
	// FIXME: use of goTo() causes problems with 'back'
	Weave.Service.login(function() {
			if (Weave.Service.currentUser) {
				wizard.goTo("sync-wizard-verify2");
			}
			else {
				error.setAttribute("hidden", "false");
				error.setAttribute("value", loginFailedText);
				wizard.goTo("sync-wizard-verify1");
			}
		}, 
		Weave.Service.password, Weave.Service.passphrase);
	
    this._log.info("Username/password verified.");
	
	return false;
  },

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
		
	error.setAttribute("hidden", "true");
		
	// Need to verify passphrase
			
	return true;
  },
  
  checkUsername: function SyncWizard_checkUsername() {
	let wizard = document.getElementById('sync-wizard');
	
	let httpRequest = new XMLHttpRequest();
	let url = REGISTER_URL + document.getElementById('sync-username-create-field').value;
		
	usernameTaken = this._stringBundle.getString("usernameTaken.label");
	usernameAvailable = this._stringBundle.getString("usernameAvailable.label");
		
    httpRequest.onreadystatechange = function() {			
	  if (httpRequest.readyState == 4) {
	    if (httpRequest.status == 200) {
	      if (httpRequest.responseText == 0) {
	        document.getElementById('sync-wizard-verifyUsername').setAttribute("value", usernameTaken);
	        wizard.canAdvance = false;
	      }
	      else {
	        document.getElementById('sync-wizard-verifyUsername').setAttribute("value", usernameAvailable);
	        wizard.canAdvance = true;
	      }
	    } 
	    else {
	      this._log.info("Error: received status " + httpRequest.status);
	    }
	  }	
	};
				
    httpRequest.open('GET', url, true);
    httpRequest.send(null);		
  },

  getCaptcha: function SyncWizard_getCaptcha() {
    
    document.getElementById('captcha').setAttribute("src", CAPTCHA_URL);
  },
  
  createAccount: function SyncWizard_createAccount() {
	let httpRequest = new XMLHttpRequest();
	
	let wizard = document.getElementById('sync-wizard');
	let error = document.getElementById('create3-error');
	
	let log = this._log;
	let stringBundle = this._stringBundle;
	
	httpRequest.onreadystatechange = function() { 
	  if (httpRequest.readyState == 4) {
	    switch (httpRequest.status) {
	      case 201:
	        error.hidden = true;
	        if (httpRequest.responseText == "2: VERIFICATION SENT") {
	          log.info("Account created, verification email sent.");
	        }
	        else if (httpRequest.responseText == "3: CREATED") {
	          log.info("Account created, no email address given.");
			}
			// FIXME: use of goTo() causes problems with 'back'
			wizard.goTo('sync-wizard-data');
			break;
			case 400:
			  error.hidden = false;
			  switch (httpRequest.responseText) {
			    case "-2: MISSING UID":
			      log.info("Account not created: missing username.");
				  break;	
				case "-3: INVALID UID":
				  log.info("Account not created: invalid username.");
				  break;
				case "-4: INVALID EMAIL":
				  log.info("Account not created: invalid email.");
				  error.value = stringBundle.getString("invalidEmail.label");
				  break;
				case "-5: EMAIL ALREADY EXISTS":
				  log.info("Account not created: email already exists.");
				  error.value = stringBundle.getString("emailAlreadyExists.label");
				  break;
				case "-6: MISSING CAPTCHA CHALLENGE":
				  log.info("Account not created: missing Captcha challenge field.");
				  break;
				case "-7: MISSING CAPTCHA RESPONSE":
				  log.info("Account not created: missing Captcha response field.");
				  error.value = stringBundle.getString("missingCaptchaResponse.label");
				  break;
				case "-8: MISSING PASSWORD":
				  log.info("Account not created: missing password.");
				  break;
				case "-9: INTERNAL ERROR":
				  log.info("Account not created: internal error.");
				  error.value = stringBundle.getString("internalError.label");
				  break;
				case "-10: QUOTA EXCEEDED":
				  log.info("Account not created: over 200,000 accounts.");
				  break;
				default:
				  log.info("Unknown server error: " + httpRequest.responseText);
				  break;
				}
				break;
			case 417:
			  error.hidden = false;
			  error.value = stringBundle.getString("incorrectCaptcha.label");
			  // FIXME: captcha doesn't refresh on error
			  document.getElementById('captcha').setAttribute("src", CAPTCHA_URL);
			  break;
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
	let response = captchaDoc.getElementById("recaptcha_response_field").value;
	let challenge = captchaDoc.getElementById("recaptcha_challenge_field").value;
	
	
	let message = "uid=" + encodeURIComponent(uid) + 
				  "&password=" + encodeURIComponent(password) + 
				  "&mail=" + encodeURIComponent(mail) + 
				  "&recaptcha_response_field=" + encodeURIComponent(response) + 
				  "&recaptcha_challenge_field=" + encodeURIComponent(challenge);
	
	httpRequest.open('POST', REGISTER_URL, true);
	
	httpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	httpRequest.setRequestHeader("Content-Length", message.length);
	httpRequest.send(message);		
	
	// if successful, goto data page
	return true;
  },
    
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
	}
	return true;
  },
  
  
  setPrefs: function SyncWizard_setPrefs() {

	let branch = Cc["@mozilla.org/preferences-service;1"].
	             getService(Ci.nsIPrefService).
	             getBranch(Weave.PREFS_BRANCH + "engine.");
	// FIXME: this should work, but error on setBoolPref()
	//let branch = Weave.PREFS_BRANCH + "engine.";
	
	let value;
	
	value = document.getElementById('sync-wizard-bookmarks').checked;
	branch.setBoolPref("bookmarks", value);
	value = document.getElementById('sync-wizard-history').checked;
	branch.setBoolPref("history", value);
	value = document.getElementById('sync-wizard-cookies').checked;
	branch.setBoolPref("cookies", value);
	value = document.getElementById('sync-wizard-passwords').checked;
	branch.setBoolPref("passwords", value);
	value = document.getElementById('sync-wizard-forms').checked;
	branch.setBoolPref("forms", value);
	
	return true;
  },
  

  observe: function(subject, topic, data) {
    if (!document) {
      this._log.warn("XXX FIXME: wizard observer called after wizard went away");
      return;
    }
    let wizard = document.getElementById('sync-wizard');
    let verifyStatus, initStatus, throbber1, throbber2, sync1;

    switch(topic) {
    case "weave:service:login:success":
      this._log.info("Login verified");
      verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');
      verifyStatus.setAttribute("value",
        this._stringBundle.getString("verifyStatusLoginVerified.label"));
      wizard.canAdvance = true;
      break;
    case "weave:service:login:error":
      this._log.info("Login failed");
      verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');
      verifyStatus.setAttribute("value",
        this._stringBundle.getString("verifyStatusLoginFailed.label"));
      wizard.canAdvance = true;
      break;
    case "weave:service:logout:success":
      this._log.info("Logged out");
      break;
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gSyncWizard = new SyncWizard();
