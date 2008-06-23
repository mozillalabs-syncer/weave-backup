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

const THROBBER = "chrome://weave/skin/sync-throbber-16x16.png";
const THROBBER_ACTIVE = "chrome://weave/skin/sync-throbber-16x16-active.apng";
const THROBBER_ERROR = "chrome://weave/skin/sync-throbber-16x16-error.png";
const CHECK = "chrome://weave/skin/cbox-check.gif";

const SERVER_TIMEOUT = 8000;

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
	  
	  if (document.getElementById('welcome-check').value == "true")
	    wizard.canAdvance = true;
	  else 
	    wizard.canAdvance = false;
      break;
    case "sync-wizard-verify":
      this._log.info("Wizard: Showing account verification page");
      
      if (document.getElementById('verify-check').value == "true")
        wizard.canAdvance = true;
      else
        wizard.canAdvance = false;
      break;

	case "sync-wizard-create1": 
	  this._log.info("Wizard: Showing username/password creation page");
	  
	  if (document.getElementById('create1-check').value == "true")
	    wizard.canAdvance = true;
	  else
	    wizard.canAdvance = false;
	  break;
	case "sync-wizard-create2": 
	  this._log.info("Wizard: Showing passphrase/email page");
	  
	  if (document.getElementById('create2-check').value == "true")
	    wizard.canAdvance = true;
	  else 
	    wizard.canAdvance = false;
	  break;
	case "sync-wizard-create3": 
	  this._log.info("Wizard: Showing captcha/license agreement page");
	  	
	  if (document.getElementById("create3-check").value == "true" && 
	      gSyncWizard.checkFinalFields()) {
	    document.getElementById("captchaInput").value = "";
	    wizard.canAdvance = true;
	  }
      else {
	    document.getElementById('captcha').addEventListener("pageshow", function() {gSyncWizard.onLoadCaptcha()}, false, true);
	    document.getElementById('captcha').setAttribute("src", REGISTER_URL);
         
	    wizard.canAdvance = false;
	  }
	  wizard.canAdvance = false;
	  break;
	
	case "sync-wizard-data": {
      
	  this._log.info("Wizard: Showing data page");
	  
	  // set default device name
	  
	  let username = Weave.Service.currentUser; 
	  let deviceName = document.getElementById('sync-instanceName-field');
	  deviceName.value = username + "'s Firefox";
	  
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
      gSyncWizard.setPrefs();

      let doReset = document.getElementById('removeBookmarks').getAttribute("checked");
      let loginStatus = document.getElementById('loginLabel'); 
	  let loginIcon = document.getElementById('loginCheck');
      loginStatus.setAttribute("disabled", "false");
      loginIcon.src = THROBBER_ACTIVE    
      
      if (doReset) {
        document.getElementById('sync-reset-row').hidden = false;
        document.getElementById('resetLabel').setAttribute("disabled", "false");
        document.getElementById('sync-reset-separator').hidden = false;
      }
      
      Weave.Service.login(function() {
              if (doReset)
                gSyncWizard.clientReset();
              else 
                gSyncWizard.initialSync();
            });
      break;
    default:
      this._log.warn("Unknown wizard page requested: " + pageId);
      break;
    }
  },


/////WELCOME SCREEN/////

  /* checkWelcome() - Called oncommand for radio buttons in welcome screen. And 
   *  oninput for device name field.
   *  Enables "Continue" button of wizard if a radio button is selected and the 
   *  user has entered a device name. 
   */

  checkWelcome: function SyncWizard_checkWelcome() {
    let wizard = document.getElementById('sync-wizard');
    let radio1 = document.getElementById('sync-curuser-radio');
    let radio2 = document.getElementById('sync-newuser-radio');
    
    if (radio1.getAttribute("selected") || radio2.getAttribute("selected")) {
      wizard.canAdvance = true;
      document.getElementById('welcome-check').value = "true";
    }
    else {
      wizard.canAdvance = false;
      document.getElementById('welcome-check').value = "false";
    }
  }, 
  
  selectRadio: function SyncWizard_selectRadio(selectId) {
    
    let group = document.getElementById('sync-radio-group');
    let selected = document.getElementById(selectId);
    
    group.selectedItem = selected;
    
    gSyncWizard.checkWelcome();
  },

  /* setNextPage() - Called by welcome screen to determine path.
   *  Sets the next attribute of the page corresponding to "pageid" 
   *  to the page corresponding to "nextid".
   */
  setNextPage: function SyncWizard_setNextPage(pageid, nextid) {
    let wizard = document.getElementById('sync-wizard');
    let page = wizard.getPageById(pageid);
    
    page.setAttribute("next", nextid);
    
  }, 
  
  /* setTitles() - Called by welcome screen to set upcoming page titles.
   */
  setTitles: function SyncWizard_setTitles(type) {
    let wizard = document.getElementById('sync-wizard');
    let dataPage = wizard.getPageById('sync-wizard-data');
    let finalPage = wizard.getPageById('sync-wizard-final');
    
    if (type == "verify") {
      dataPage.setAttribute("label", this._stringBundle.getString("data-verify.title"));
      finalPage.setAttribute("label", this._stringBundle.getString("final-verify.title"));
    }
    else if (type == "create") {
      dataPage.setAttribute("label", this._stringBundle.getString("data-create.title"));
      finalPage.setAttribute("label", this._stringBundle.getString("final-create.title"));
    }
    
  }, 
  
  /////ACCOUNT VERIFICATION/////
  
  /* checkVerify() - Called onadvance from account verification screen and onInput 
   *  from other fields. Checks that all fields have a value.
   */
  checkVerify: function SyncWizard_checkVerify() {
	let wizard = document.getElementById('sync-wizard');
	let statusLabel = document.getElementById('sync-wizard-verifyPassword-status');
    let username = document.getElementById('sync-username-field');
    let password = document.getElementById('sync-password-field');
    let passphrase = document.getElementById('sync-passphrase-field');
    let loginVerified = this._stringBundle.getString("verifyStatusLoginVerified.label");
   
    wizard.canAdvance = false;
    
    if (!(username && username.value && password && password.value &&
          passphrase && passphrase.value)) {
      wizard.canAdvance = false;
      document.getElementById('verify-check').value = "false";
      return false;
    }
	if (statusLabel.value == loginVerified) {
	  wizard.canAdvance = true;
      document.getElementById('verify-check').value = "true";
	  return true; 
	}
    
    wizard.canAdvance = true;
    return true;
  },

  /* verifyPassword() - Called onadvance from first account verification screen.
   *  Checks for empty fields and verifies login information. 
   */
  verifyPassword: function SyncWizard_verifyPassword(fromUsername) {
	let wizard = document.getElementById('sync-wizard');
	let stringBundle = this._stringBundle;
	let statusLabel = document.getElementById('sync-wizard-verifyPassword-status');
	let statusIcon = document.getElementById('sync-wizard-verifyPassword-icon');
	let serverError = document.getElementById('sync-wizard-verify-serverError');
    let username = document.getElementById('sync-username-field');
    let password = document.getElementById('sync-password-field');
    
	// Check for empty fields
    if (!(username && password && username.value && password.value)) {
      statusIcon.src = THROBBER;
      statusLabel.setAttribute("value", stringBundle.getString("verifyStatusUnverified.label"));
      return false;
    }
				
    // this was called from the username field. if the password hasn't been entered yet, 
    // don't check with the server yet
	if (fromUsername == "true" && !password.value) {
	  return false;
	}
	this._log.info("Verifying username/password...");

	// Set the status and throbber
	statusIcon.src = "chrome://weave/skin/sync-throbber-16x16-active.apng";
    statusLabel.value = stringBundle.getString("verifyStatusVerifying.label");

    Weave.Service.logout();
		
    // TODO: Determine what failed.
	Weave.Service.login(function() {
            //check currentUser here?
          }, Weave.Service.password, Weave.Service.passphrase);
      	
    // Only wait a certain amount of time for the server
    setTimeout(function() {
              if (!Weave.Service.currentUser) {
                statusIcon.src = "chrome://weave/skin/sync-throbber-16x16-error.png";
                statusLabel.value = stringBundle.getString("verifyStatusUnverified.label");
                serverError.hidden = false;
              }
            }, SERVER_TIMEOUT);
	return false;
  },
  
  
  /////ACCOUNT CREATION - USERNAME, PASSWORD, PASSPHRASE/////

  /* checkUsername() - Called onchange from username field for account creation. 
   *   Checks username availability. 
   */
  checkUsername: function SyncWizard_checkUsername() {
	let wizard = document.getElementById('sync-wizard');
	let log = this._log;
	let stringBundle = this._stringBundle;
	
	let httpRequest = new XMLHttpRequest();
	let usernameField = document.getElementById('sync-username-create-field');
	let serverError = document.getElementById('sync-wizard-create1-serverError');
	let url = CHECK_USERNAME_URL + usernameField.value;
		
    let statusLabel = document.getElementById('sync-wizard-verifyUsername');
    let statusIcon = document.getElementById('sync-wizard-verifyUsername-icon');
	let usernameTaken = this._stringBundle.getString("usernameTaken.label");
	let usernameAvailable = this._stringBundle.getString("usernameAvailable.label");
	let checkingUsername = this._stringBundle.getString("checkingUsername.label");
	let unverified = this._stringBundle.getString("usernameUnverified.label");

	if (!(usernameField && usernameField.value)) {
	  wizard.canAdvance = false;
	  return false;
	}
	
	statusIcon.src = THROBBER_ACTIVE;
	statusLabel.value = checkingUsername;
	
    httpRequest.open('GET', url, true);

    httpRequest.onreadystatechange = function() {			
	  if (httpRequest.readyState == 4) {
	    if (httpRequest.status == 200) {
	      if (httpRequest.responseText == 0) {
            statusIcon.src = THROBBER_ERROR;
	        statusLabel.value = usernameTaken;
	        wizard.canAdvance = false;
            document.getElementById('create1-check').value = "false";
	      }
	      else {
            statusIcon.src = THROBBER;
	        statusLabel.value = usernameAvailable;
	        // check that password fields are correct 
	        // will also take care of advancing
	        gSyncWizard.checkAccountInput("password");
	      }
	      serverError.setAttribute("hidden", true);
	    } 
	    else {
	      log.info("Error: received status " + httpRequest.status);
	      serverError.setAttribute("hidden", false);
          statusIcon.src = THROBBER_ERROR;
          statusLabel.value = usernameTaken;
	      wizard.canAdvance = false;
          document.getElementById('create1-check').value = "false";
	    }
	  }	
	};
				
    httpRequest.send(null);	

      	
    // Only wait a certain amount of time for the server
    setTimeout(function() {
              if (statusLabel.value == checkingUsername) {
                statusIcon.src = THROBBER_ERROR;
                statusLabel.value = unverified;
                serverError.hidden = false;
              }
            }, SERVER_TIMEOUT);
    
    return true;
  },

  /* checkUserPasswordFields() - Called oninput from password entry fields.
   *  Allows the wizard to continue if password fields have values and if an 
   *  available username has been chosen.
   */
  checkUserPasswordFields: function SyncWizard_checkUserPasswordFields() {
	let wizard = document.getElementById('sync-wizard');
    let usernameField = document.getElementById('sync-username-create-field');
    let usernameStatus = document.getElementById('sync-wizard-verifyUsername');
    let availableStatus = this._stringBundle.getString("usernameAvailable.label");
    let password1 = document.getElementById("sync-password-create-field");
	let password2 = document.getElementById("sync-reenter-password-field");
    let email = document.getElementById('sync-email-create-field');
	let emailLabel = document.getElementById('sync-wizard-verifyEmail');
	let emailOk = this._stringBundle.getString("emailOk.label");
		
	if (!(usernameField && usernameField.value &&
	      password1 && password1.value && password2 && password2.value && 
	      email && email.value)) {
	  wizard.canAdvance = false;
      document.getElementById('create1-check').value = "false";
	  return false;
    }
	if (email.value && emailLabel.value == emailOk) {
      wizard.canAdvance = true;
      document.getElementById('create1-check').value = "true";
      return true;
    }

	if (usernameStatus.value == availableStatus) {
	  wizard.canAdvance = true;
      document.getElementById('create1-check').value = "true";
	  return true; 
	}
    return false;
  },

  /* checkPassphraseEmailFields() - Called oninput from fields on passphrase / email entry screen.
   *  Allows wizard to advance if all fields have a value.
   */
  checkPassphraseEmailFields: function SyncWizard_checkPassphraseFields() {
	let wizard = document.getElementById('sync-wizard');

    let passphrase1 = document.getElementById('sync-passphrase-create-field');
    let passphrase2 = document.getElementById('sync-reenter-passphrase-field');
    
    if (!(passphrase1 && passphrase1.value && passphrase2 && passphrase2.value)) {
      wizard.canAdvance = false;
      document.getElementById('create2-check').value = "false";
      return false;
    }
    
    wizard.canAdvance = true;
    return true;
  },

  /* checkAccountInput() - Called onadvance from password and passphrase entry screens.
   *  Checks that password and passphrase reentry fields are the same, and that password
   *  and passphrase are different values. Checks that all fields have values.
   */
  checkAccountInput: function SyncWizard_checkAccountInput(field) {
	let wizard = document.getElementById('sync-wizard');
    let username = document.getElementById("sync-username-create-field");
    let password1 = document.getElementById("sync-password-create-field");
	let password2 = document.getElementById("sync-reenter-password-field");
	let passphrase1 = document.getElementById("sync-passphrase-create-field");
	let passphrase2 = document.getElementById("sync-reenter-passphrase-field");
  
	if (field == "password") {
	  let passwordMatchError = document.getElementById("sync-password-match-error");
	
      if (password1.value != password2.value)  {
	    passwordMatchError.hidden = false;
	    wizard.canAdvance = false;
        document.getElementById('create1-check').value = "false";
	    return false;
	  }
	  else 
	    passwordMatchError.hidden = true;

      if(!gSyncWizard.checkUserPasswordFields())
        return false;
      
      wizard.canAdvance = true;
      document.getElementById('create1-check').value = "true";
	}
	else if (field == "passphrase") {
	  let passphraseError = document.getElementById("sync-passphrase-error");
	  
      if (!(passphrase1 && passphrase1.value && passphrase2 && passphrase2.value)) {
        wizard.canAdvance = false;
        document.getElementById('create2-check').value = "false";
        return false;
      }
      if (passphrase1.value != passphrase2.value)  {
        passphraseError.value = this._stringBundle.getString("passphrasesUnmatched.label");
        wizard.canAdvance = false;
        document.getElementById('create2-check').value = "false";
        return false;
      }
      if (passphrase1.value == password1.value) {
        passphraseError.value = this._stringBundle.getString("samePasswordAndPassphrase.label");
        wizard.canAdvance = false;
        document.getElementById('create2-check').value = "false";
        return false;
      }
      
      passphraseError.value = "";
      wizard.canAdvance = true;
      document.getElementById('create2-check').value = "true";
	}
      
    return true;
  },
  
  
  
  onLoadCaptcha: function SyncWizard_onLoadCaptcha() {
    
    let captchaImage = document.getElementById('captcha').contentDocument.getElementById('recaptcha_challenge_field').value;
	document.getElementById('lastCaptchaChallenge').value = captchaImage;
	document.getElementById('captchaImage').setAttribute("src", CAPTCHA_IMAGE_URL + "?c=" + captchaImage);   
  
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

  
  /* checkEmail() - Called onchange from email field in account creation. 
   *  Checks validity and availability of email address. 
   */
  checkEmail: function SyncWizard_checkEmail() {
	let wizard = document.getElementById('sync-wizard');
	let log = this._log;
	
	let httpRequest = new XMLHttpRequest();
	let emailField = document.getElementById('sync-email-create-field');
	let emailLabel = document.getElementById('sync-wizard-verifyEmail');
	let emailIcon = document.getElementById('sync-wizard-verifyEmail-icon');
	let serverError = document.getElementById('sync-wizard-create2-serverError');
	
	let url = CHECK_EMAIL_URL + emailField.value;
	
	let regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
	
	let emailUnverified = this._stringBundle.getString("emailUnverified.label");
	let emailTaken = this._stringBundle.getString("emailTaken.label");
	let emailInvalid = this._stringBundle.getString("emailInvalid.label");
	let emailOk = this._stringBundle.getString("emailOk.label");
	let checkingEmail = this._stringBundle.getString("checkingEmail.label");
	
	if (!(emailField && emailField.value)) {
	  emailIcon = THROBBER;
	  emailLabel.value = emailUnverified;
	  wizard.canAdvance = true;
      document.getElementById('create1-check').value = "true";
	  return true;
	}
	
    if (!regex.test(emailField.value)) {
      emailIcon = THROBBER_ERROR;
	  emailLabel.value = emailInvalid; 
	  wizard.canAdvance = false;
      document.getElementById('create1-check').value = "false";
	  return false;
    }
    
    emailLabel.value = checkingEmail;
    emailIcon.src = THROBBER_ACTIVE;
    
    httpRequest.open('GET', url, true);

    httpRequest.onreadystatechange = function() {			
	  if (httpRequest.readyState == 4) {
	    if (httpRequest.status == 200) {
	      if (httpRequest.responseText == 0) {
	        emailLabel.value = emailTaken;
	        emailIcon.src = THROBBER_ERROR;
	        wizard.canAdvance = false;
            document.getElementById('create1-check').value = "false";
	      }
	      else {
	        emailLabel.value = emailOk;
	        emailIcon.src = THROBBER;
	        
	        // check that password fields are correct 
	        // will also take care of advancing
	        gSyncWizard.checkAccountInput("password");
	      }
	      serverError.hidden = true;
	    } 
	    else {
	      log.info("Error: received status " + httpRequest.status);
	      emailLabel.value = emailUnverified;
	      emailIcon.src = THROBBER_ERROR;
	      serverError.hidden = false;
	    }
	  }	
	};
				
    httpRequest.send(null);		

    // Only wait a certain amount of time for the server
    setTimeout(function() {
              if (emailLabel.value == checkingEmail) {
                emailIcon.src = THROBBER_ERROR;
                emailLabel.value = unverified;
                serverError.hidden = false;
              }
            }, SERVER_TIMEOUT);

    return true;    
  },
  

  /* checkFinalFields() - Called oninput from fields on final account creation screen.
   *  Allows wizard to advance if all fields have a value.
   */
  checkFinalFields: function SyncWizard_checkFinalFields() {
    let wizard = document.getElementById('sync-wizard');
    
    let input = document.getElementById('captchaInput');
    let agree = document.getElementById('terms-checkbox');
    
    if ((!(input && input.value)) || !agree.checked) {
      wizard.canAdvance = false;
      return false;
    }
    
    wizard.canAdvance = true;
    return true;
  
  },


  
  /* reloadCaptcha() - Called onclick from "try another image" link.
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
    let prefStatus = document.getElementById('prefsLabel');
    let prefIcon = document.getElementById('prefsCheck');
    prefStatus.setAttribute("disabled", false);
    prefIcon.src = THROBBER_ACTIVE;
    
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
    prefIcon.src = CHECK;
    
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
	//gSyncWizard.initialSync();
	
	return true;
  },
  
  resetClient: function SyncWizard_resetClient() {
    let p = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
    if (p.confirm(null,
                  this._stringBundle.getString("reset.client.warning.title"),
                  this._stringBundle.getString("reset.client.warning")))
      Weave.Service.resetClient(function() {
              alert("finished");
            });
    
  },
  
  /* initialSync() - Called during final screen checklist after successful login.
   *  Performs sync and updates status on screen.
   */
  initialSync: function SyncWizard_initialSync() {
	let wizard = document.getElementById('sync-wizard');
	let syncStatus = document.getElementById('syncLabel');
	let syncIcon = document.getElementById('syncCheck');
    
	this._log.info("Doing initial sync...");
	
    syncIcon.src = THROBBER_ACTIVE;
	syncStatus.setAttribute("disabled", "false");

	Weave.Service.sync();
	
  },

  /* tryAgain() - Called onclick from "try again" link if server error happens during setup.
   *  Re-does login or login->sync depending on [what] didn't work.
   */
  tryAgain: function SyncWizard_tryAgain(what) {

    document.getElementById("login-failed").setAttribute("hidden", true);
    document.getElementById("sync-failed").setAttribute("hidden", true);

	let loginStatus = document.getElementById('loginLabel');
	let loginIcon = document.getElementById('loginCheck');
	let syncStatus = document.getElementById('syncLabel'); 
	let syncIcon = document.getElementById('syncCheck');

    switch (what) {
      case "login":
        syncStatus.setAttribute("disabled", "true");
        loginIcon.src = THROBBER_ACTIVE;
        Weave.Service.login(function() {gSyncWizard.initialSync()});
        break;
      case "sync":
        syncIcon.src = THROBBER_ACTIVE;
        gSyncWizard.initialSync();
        break;
    }
  }, 
  
  observe: function(subject, topic, data) {
    if (!document) {
      this._log.warn("XXX FIXME: wizard observer called after wizard went away");
      return;
    }
    let wizard = document.getElementById('sync-wizard');
    let verifyIcon, verifyStatus, loginStatus, syncStatus, initStatus, throbber1, throbber2, sync1;

    switch(topic) {
    case "weave:service:login:success":
      if (wizard.currentPage.pageid == "sync-wizard-verify") {
        this._log.info("Login verified");
        
        verifyIcon = document.getElementById('sync-wizard-verifyPassword-icon');
        verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');        
        verifyIcon.src = "chrome://weave/skin/sync-throbber-16x16.png";
        verifyStatus.value = this._stringBundle.getString("verifyStatusLoginVerified.label");
        
        // check that the other fields are completed
        // this will take care advancing
        gSyncWizard.checkVerify();
	    document.getElementById('sync-wizard-verify-serverError').hidden = true;
      }
      else if (wizard.currentPage.pageid == "sync-wizard-final") {
        this._log.info("Initial login succeeded");
        document.getElementById('loginCheck').src = CHECK;
      }
      break;
    case "weave:service:login:error":
      if (wizard.currentPage.pageid == "sync-wizard-verify") {
        this._log.info("Login failed");

        verifyIcon = document.getElementById('sync-wizard-verifyPassword-icon');
        verifyStatus = document.getElementById('sync-wizard-verifyPassword-status');        
        verifyIcon.src = "chrome://weave/skin/sync-throbber-16x16-error.png";
        verifyStatus.value = this._stringBundle.getString("verifyStatusLoginFailed.label");

        wizard.canAdvance = false;
	    document.getElementById('sync-wizard-verify-serverError').hidden = true;
      }
      else if (wizard.currentPage.pageid == "sync-wizard-final") {
        this._log.info("Initial login failed");
        document.getElementById("installation-ok").setAttribute("hidden", true);
        document.getElementById("login-failed").setAttribute("hidden", false);
        document.getElementById('loginCheck').src = THROBBER_ERROR;
      }
      break;
    case "weave:service:logout:success":
      this._log.info("Logged out");
      break;
    case "weave:service:sync:success":
      this._log.info("Initial Sync performed");
      document.getElementById('syncCheck').src = CHECK;
      document.getElementById("installation-ok").setAttribute("hidden", false);
      break;
    case "weave:service:sync:error":
      this._log.info("Initial Sync failed");
      syncStatus = document.getElementById('syncLabel'); 
      syncStatus.setAttribute("value", this._stringBundle.getString("initialSync-error.label"));
      document.getElementById("installation-ok").setAttribute("hidden", true);
      document.getElementById("sync-failed").setAttribute("hidden", false);
      document.getElementById('syncCheck').src = THROBBER_ERROR;
      break;
      
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gSyncWizard = new SyncWizard();
