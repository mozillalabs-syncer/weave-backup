var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function WeavePrefs() {
  this._init();
}

WeavePrefs.prototype = {
  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle });
    return this._stringBundle;
  },

  _init : function WeavePrefs__init() {
  },

  _checkAccountInfo: function WeavePrefs__checkAccountInfo() {
    let signOnButton = document.getElementById('sync-signon-button');
    let signOutButton = document.getElementById('sync-signout-button');
    let syncNowButton = document.getElementById('sync-syncnow-button');
    let createButton = document.getElementById('sync-create-button');
    let syncUserName = document.getElementById('sync-username-field');
    let changePasswordForm =
      document.getElementById('sync-change-password-form');

    if (!Weave.Service.isLoggedIn) {
      signOnButton.setAttribute("hidden", "false");
      signOutButton.setAttribute("hidden", "true");
      createButton.setAttribute("hidden", "false");
      syncNowButton.setAttribute("disabled", "true");
      syncUserName.setAttribute("value", "");
      changePasswordForm.hidden = true;
    } else {
      let signedInDescription =
        this._stringBundle.getFormattedString("signedIn.description",
                                              [Weave.Service.username]);
      signOnButton.setAttribute("hidden", "true");
      signOutButton.setAttribute("hidden", "false");
      createButton.setAttribute("hidden", "true");
      syncNowButton.setAttribute("disabled", "false");
      syncUserName.setAttribute("value", signedInDescription);
      changePasswordForm.hidden = false;
   }
   
   if(Weave.DAV.locked)
     syncNowButton.setAttribute("disabled", "true");
  },

  onPaneLoad: function WeavePrefs_onPaneLoad() {
    this._checkAccountInfo();
  },

  openActivityLog: function WeavePrefs_openActivityLog() {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator);
    let logWindow = wm.getMostRecentWindow('Weave:Log');
    if (logWindow)
      logWindow.focus();
     else {
       var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
         getService(Ci.nsIWindowWatcher);
       ww.openWindow(null, 'chrome://weave/content/log.xul', '',
                     'chrome,centerscreen,dialog,modal,resizable=yes', null);
     }
  },

  doSyncNow: function WeavePrefs_doSyncNow() {
    let syncNowButton = document.getElementById('sync-syncnow-button');
    syncNowButton.setAttribute("disabled", "true");
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator);
    let window = wm.getMostRecentWindow("Sync:Status");
    if (window)
      window.focus();
     else {
       var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
         getService(Ci.nsIWindowWatcher);
       let options = 'chrome,centerscreen,dialog,modal,resizable=yes';
       ww.activeWindow.openDialog("chrome://weave/content/status.xul", '', options, null);
     }
    syncNowButton.setAttribute("disabled", "false");
  },

  openAdvancedPrefs: function WeavePrefs_openAdvancedPrefs() {
         window.openDialog('chrome://weave/content/advanced.xul', '',
                      'chrome, dialog, modal, resizable=yes, ', null);
  },

  doSignOn: function WeavePrefs_doSignOn() {

    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let username = branch.getCharPref("extensions.weave.username");

    if (!username || username == 'nobody') {
         window.openDialog('chrome://weave/content/wizard.xul', '',
		      'chrome, dialog, modal, resizable=yes', null);
    } else {
         window.openDialog('chrome://weave/content/login.xul', '',
                      'chrome, dialog, modal, resizable=yes', null);
    }

    this.onPaneLoad();
  },

  doSignOut: function WeavePrefs_doSignOut() {
    Weave.Service.logout();
    this._checkAccountInfo();
  },

  doToggleShowPasswords: function WeavePrefs_doToggleShowPasswords(event) {
    let passwordFields = ["oldPassword", "newPassword", "newPasswordAgain"].
			   map(function(v) document.getElementById(v));
    for each (let field in passwordFields) {
      if (event.target.checked)
	field.removeAttribute("type");
      else
	field.setAttribute("type", "password");
    }
  },

  /**
   * Make sure the new password fields contain identical values.
   *
   * Note: we don't validate the passwords unless both of them have been
   * entered.  Otherwise it would be annoying to users who enter one and are
   * told they don't match before they've had a chance to enter the other.
   *
   * Note: we also do this in doChangePassword before submitting the form,
   * but there we display the error even if one of the values is empty, so
   * we don't submit the form unless the data is valid.
   */
  validateNewPasswords: function WeavePrefs_validateNewPasswords() {
    let newPassword = document.getElementById("newPassword");
    let newPasswordAgain = document.getElementById("newPasswordAgain");

    // Don't annoy the user until they've entered something into both fields.
    if (!newPassword.value || !newPasswordAgain.value)
      return;

    if (newPassword.value != newPasswordAgain.value)
      this._setChangePasswordStatus("error", ["passwordsDoNotMatch"]);
    else
      this._setChangePasswordStatus("idle");
  },

  doChangePassword: function WeavePrefs_doChangePassword() {
    let username = Weave.Service.username;
    let oldPassword = document.getElementById("oldPassword");
    let newPassword = document.getElementById("newPassword");
    let newPasswordAgain = document.getElementById("newPasswordAgain");
    let changePasswordButton = document.getElementById("changePasswordButton");

    // Validate the form.
    let errorCodes = [];
    if (!newPassword.value)
      errorCodes.push("-11");
    if (!oldPassword.value)
      errorCodes.push("-8");
    if (newPassword.value != newPasswordAgain.value)
      errorCodes.push("passwordsDoNotMatch");

    if (errorCodes.length > 0) {
      this._setChangePasswordStatus("error", errorCodes);
      return;
    }

    let url = Weave.Utils.prefs.getCharPref("serverURL") +
	      "api/register/chpwd/";

    let data = "uid=" + encodeURIComponent(username) + 
               "&password=" + encodeURIComponent(oldPassword.value) +
	       "&new=" + encodeURIComponent(newPassword.value);

    let self = this;
    let callback = function(event) { self.onChangePassword(event) };

    this._setChangePasswordStatus("active");

    let request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.onload = request.onerror = callback;
    request.setRequestHeader("Content-Type",
			     "application/x-www-form-urlencoded");
    request.send(data);
  },

  _setChangePasswordStatus:
  function WeavePrefs__setChangePasswordStatus(status, errorCodes) {
    let statusBox = document.getElementById("changePasswordStatus");
    let description = document.getElementById("changePasswordDescription");

    // A list of fields in the form.  We use this array to disable the fields
    // while we're in the process of changing the password, so the user doesn't
    // think they can make a change once the process is underway.
    let fields = ["oldPassword", "newPassword", "newPasswordAgain",
		  "changePasswordButton"].
		   map(function(v) document.getElementById(v));

    // Set the status attribute to update the icon (which gets set via CSS).
    statusBox.setAttribute("status", status);

    if (status == "active") {
      // Disable the form fields so the user doesn't think they can change
      // them in the middle of the process.
      for each (let field in fields)
	field.disabled = true;

      description.value =
	this._stringBundle.getString("change.password.status.active");
    }
    else {
      // Reenable the form fields so the user can use the form (again).
      for each (let field in fields)
	field.disabled = false;

      switch(status) {
	case "success":
	  description.value =
	    this._stringBundle.getString("change.password.status.success");
	  break;

	case "error":
	  let errorProperty;

	  // We only have space to show one error message, so we check the codes
	  // in order of importance and show the most important one.
	  if (errorCodes.indexOf("passwordsDoNotMatch") != -1)
	    errorProperty = "change.password.status.passwordsDoNotMatch";
	  else if (errorCodes.indexOf("-12") != -1)
	    errorProperty = "change.password.status.badOldPassword";
	  else if (errorCodes.indexOf("-11") != -1)
	    errorProperty = "change.password.status.noNewPassword";
	  else if (errorCodes.indexOf("-8") != -1)
	    errorProperty = "change.password.status.noOldPassword";
	  else
	    errorProperty = "change.password.status.error";

	  description.value = this._stringBundle.getString(errorProperty);

	  break;

	case "idle":
	default:
	  description.value = description.getAttribute("idlevalue");
	  break;
      }
    }
  },

  onChangePassword: function WeavePrefs_onChangePassword(event) {
    let request = event.target;

    switch(request.status) {
      case 200:
	this._setChangePasswordStatus("success");
	Weave.Service.password = document.getElementById("newPassword").value;
	break;
      default:
	this._setChangePasswordStatus("error", request.responseText);
	break;
    }
  },

  doCreateAccount: function WeavePrefs_doCreateAccount() {
    window.openDialog('chrome://weave/content/wizard.xul', '',
                      'chrome,centerscreen,dialog,resizable=yes', null);
  },

  resetLoginCredentials: function WeavePrefs_resetLoginCredentials() {
    let p = Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService);
    if (p.confirm(null,
                  this._stringBundle.getString("reset.login.warning.title"),
                  this._stringBundle.getString("reset.login.warning"))) {
      Weave.Service.logout();
      Weave.Service.password = null;
      Weave.Service.passphrase = null;
      Weave.Service.username = null;
      this._checkAccountInfo();
    }
  },

  resetServerURL: function WeavePrefs_resetServerURL() {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    branch.clearUserPref("extensions.weave.serverURL");
    let serverURL = branch.getCharPref("extensions.weave.serverURL");
    let serverField = document.getElementById('sync-server-field');
    serverField.setAttribute("value", serverURL);
    Weave.Service.logout();
  },

  resetLock: function WeavePrefs_resetLock() {
    let p = Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService);
    if (p.confirm(null,
                  this._stringBundle.getString("reset.lock.warning.title"),
                  this._stringBundle.getString("reset.lock.warning"))) {
       Weave.Service.resetLock();
    }
  },

  resetServer: function WeavePrefs_resetServer() {
    let p = Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService);
    if (p.confirm(null,
                  this._stringBundle.getString("reset.server.warning.title"),
                  this._stringBundle.getString("reset.server.warning")))
      Weave.Service.serverWipe();
  },

  resetClient: function WeavePrefs_resetClient() {
    let p = Cc["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Ci.nsIPromptService);
    if (p.confirm(null,
                  this._stringBundle.getString("reset.client.warning.title"),
                  this._stringBundle.getString("reset.client.warning")))
      Weave.Service.resetClient();
  }
};

let gWeavePrefs = new WeavePrefs();
