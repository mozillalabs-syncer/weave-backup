var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function WeavePrefs() {
  this._log = Log4Moz.repository.getLogger("Chrome.Prefs");
  this._log.level = Log4Moz.Level["Debug"];
  Observers.add("weave:service:sync:finish", this._onSync, this);
  Weave.Utils.prefs.addObserver("", this, false);
}
WeavePrefs.prototype = {
  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle; });
    return this._stringBundle;
  },

  _checkClientInfo: function WeavePrefs__checkClientInfo() {
    let richlistbox = document.getElementById('sync-clients-list');
    let clients = Weave.Clients.getClients();

    while (richlistbox.firstChild) {
      richlistbox.removeChild(richlistbox.firstChild);
    }

    for (let guid in clients) {
      let richlistitem = document.createElement('richlistitem');
      let label = document.createElement('label');

      label.setAttribute("value", clients[guid].name + " (" + clients[guid].type + ")");

      richlistitem.appendChild(label);
      richlistbox.appendChild(richlistitem);
    }
  },

  _checkAccountInfo: function WeavePrefs__checkAccountInfo() {
    let signOnButton = document.getElementById('sync-signon-button');
    let signOutButton = document.getElementById('sync-signout-button');
    let syncNowButton = document.getElementById('sync-syncnow-button');
    let createButton = document.getElementById('sync-create-button');
    let syncUserName = document.getElementById('sync-username-field');
    let changePasswordButton = document.getElementById('change-password-button');

    if (!Weave.Service.isLoggedIn) {
      signOnButton.setAttribute("hidden", "false");
      signOutButton.setAttribute("hidden", "true");
      createButton.setAttribute("hidden", "false");
      syncNowButton.setAttribute("disabled", "true");
      syncUserName.setAttribute("value", "");
      changePasswordButton.setAttribute("hidden", "true");
    } else {
      let signedInDescription =
        this._stringBundle.getFormattedString("signedIn.description",
                                              [Weave.Service.username]);
      signOnButton.setAttribute("hidden", "true");
      signOutButton.setAttribute("hidden", "false");
      createButton.setAttribute("hidden", "true");
      syncNowButton.setAttribute("disabled", "false");
      syncUserName.setAttribute("value", signedInDescription);
      changePasswordButton.setAttribute("hidden", "true"); // FIXME: temp
   }
  },

  onPaneLoad: function WeavePrefs_onPaneLoad() {
    this._checkAccountInfo();
    this._checkClientInfo();
  },

  _onSync: function WeavePrefs__onSync(subject, data) {
    this.onPaneLoad();
  },

  openActivityLog: function WeavePrefs_openActivityLog() {
    Weave.Utils.openLog();
  },

  doSyncNow: function WeavePrefs_doSyncNow() {
    let syncNowButton = document.getElementById('sync-syncnow-button');
    syncNowButton.setAttribute("disabled", "true");
    this._startSync();
    syncNowButton.setAttribute("disabled", "false");
  },

  _startSync: function WeavePrefs__startSync() {
    Weave.Utils.openStatus();
  },

  openAdvancedPrefs: function WeavePrefs_openAdvancedPrefs() {
    Weave.Utils.openDialog("AdvancedPrefs", "advanced.xul");
  },

  doSignOn: function WeavePrefs_doSignOn() {
    Weave.Utils.openLogin();
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

    if (newPassword.value == Weave.Service.passphrase)
      this._setChangePasswordStatus("error", ["passwordSameAsPassphrase"]);
    else if (newPassword.value != newPasswordAgain.value)
      this._setChangePasswordStatus("error", ["passwordsDoNotMatch"]);
    else
      this._setChangePasswordStatus("idle");
  },

  doChangePassword: function WeavePrefs_doChangePassword() {
    let url = "https://services.mozilla.com/";
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
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
	  if (errorCodes.indexOf("passwordSameAsPassphrase") != -1)
            errorProperty = "change.password.status.passwordSameAsPassphrase";
          else if (errorCodes.indexOf("passwordsDoNotMatch") != -1)
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
    let url = "https://services.mozilla.com/";
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
  },

  resetLoginCredentials: function WeavePrefs_resetLoginCredentials() {
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("reset.login.warning.title"),
                  this._stringBundle.getString("reset.login.warning"))) {
      Weave.Service.logout();
      Weave.Service.password = null;
      Weave.Service.passphrase = null;
      Weave.Service.username = null;
      this._checkAccountInfo();
      this._checkClientInfo();
    }
  },

  resetServerURL: function WeavePrefs_resetServerURL() {
    Weave.Svc.Prefs.reset("serverURL");
    let serverURL = Weave.Svc.Prefs.get("serverURL");
    let serverField = document.getElementById('sync-server-field');
    serverField.setAttribute("value", serverURL);
    Weave.Service.logout();
  },

  resetLock: function WeavePrefs_resetLock() {
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("reset.lock.warning.title"),
                  this._stringBundle.getString("reset.lock.warning"))) {
       Weave.Service.resetLock();
    }
  },

  resetSync: function WeavePrefs_resetSync() {
    let button = document.getElementById("resetsync-button");
    button.setAttribute("disabled", "true");
    Weave.Service.resetClient(this._startSync);
    button.setAttribute("disabled", "false");
  },

  eraseLocal: function WeavePrefs_eraseLocal() {
    let button = document.getElementById("eraselocal-button");
    button.setAttribute("disabled", "true");
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("erase.local.warning.title"),
                  this._stringBundle.getString("erase.local.warning")))
      Weave.Service.wipeClient(this._startSync);
    button.setAttribute("disabled", "false");
  },

  eraseServer: function WeavePrefs_eraseServer() {
    let button = document.getElementById("eraseserver-button");
    button.setAttribute("disabled", "true");
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("erase.server.warning.title"),
                  this._stringBundle.getString("erase.server.warning")))
      Weave.Service.wipeServer(this._startSync);
    button.setAttribute("disabled", "false");
  },

  eraseRemote: function WeavePrefs_eraseRemote() {
    let button = document.getElementById("eraseremote-button");
    button.setAttribute("disabled", "true");
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("erase.remote.warning.title"),
                  this._stringBundle.getString("erase.remote.warning")))
      Weave.Service.wipeRemote(this._startSync);
    button.setAttribute("disabled", "false");
  },

  resetClient: function WeavePrefs_resetClient() {
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("reset.client.warning.title"),
                  this._stringBundle.getString("reset.client.warning")))
      Weave.Service.resetClient();
  },

  observe: function WeaveSvc__observe(subject, topic, data) {
    switch (topic) {
    case "nsPref:changed":
      switch (data) {
      case "client.name":
      case "client.type":
        gWeavePrefs.onPaneLoad();
        break;
      }
      break;
    }
  }
};

let gWeavePrefs = new WeavePrefs();
