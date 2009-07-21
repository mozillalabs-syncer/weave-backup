var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

Cu.import("resource://weave/base_records/wbo.js");
Cu.import("resource://weave/base_records/keys.js");

function WeavePrefs() {
  this._log = Log4Moz.repository.getLogger("Chrome.Prefs");
  this._log.level = Log4Moz.Level["Debug"];
  Observers.add("weave:service:sync:start", this._onSyncStart, this);
  Observers.add("weave:service:sync:finish", this._onSync, this);
  Weave.Utils.prefs.addObserver("", this, false);

  window.addEventListener("unload", Weave.Utils.bind2(this, function() {
    Observers.remove("weave:service:sync:start", this._onSyncStart, this);
    Observers.remove("weave:service:sync:finish", this._onSync, this);
    Weave.Utils.prefs.removeObserver("", this);
  }), false);
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
    let changePassphraseButton = document.getElementById('change-passphrase-button');

    if (!Weave.Service.isLoggedIn) {
      signOnButton.setAttribute("hidden", "false");
      signOutButton.setAttribute("hidden", "true");
      createButton.setAttribute("hidden", "false");
      syncNowButton.setAttribute("disabled", "true");
      syncUserName.setAttribute("value", "");
      changePasswordButton.setAttribute("hidden", "true");
      changePassphraseButton.setAttribute("hidden", "true");
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
      
      // We check if we have the crypto requirements first
      if ('rewrapPrivateKey' in Weave.Svc.Crypto)
        changePassphraseButton.setAttribute("hidden", "false");
      else
        changePassphraseButton.setAttribute("hidden", "true");
   }
  },

  _loadEnginesList: function WeavePrefs__loadEnginesList() {
    let list = document.getElementById("sync-engines-list");

    // No need to add engines if we've already added them
    if (list.itemCount > 0)
      return;

    Weave.Engines.getAll().forEach(function(engine) {
      // Only show UI if the engine is functional
      if (engine.enabled == null)
        return;

      let item = document.createElement("richlistitem");
      let check = document.createElement("checkbox");
      item.appendChild(check);
      list.appendChild(item);

      // Check the box if the engine is enabled
      check.checked = engine.enabled;

      check.flex = 1;
      check.label = engine.displayName;

      // Handle toggling of the checkbox
      check.addEventListener("command", function(event) {
        engine.enabled = check.checked;
      }, false);
    });
  },

  onPaneLoad: function WeavePrefs_onPaneLoad() {
    this._checkAccountInfo();
    this._checkClientInfo();
    this._loadEnginesList();
  },

  _onSyncStart: function WeavePrefs__onSyncStart(subject, data) {
    document.getElementById("sync-syncnow-button").
      setAttribute("disabled", "true");
    document.getElementById("eraseserver-button").
      setAttribute("disabled", "true");
  },
  _onSync: function WeavePrefs__onSync(subject, data) {
    document.getElementById("sync-syncnow-button").
      setAttribute("disabled", "false");
    document.getElementById("eraseserver-button").
      setAttribute("disabled", "false");
    this.onPaneLoad();
  },

  openActivityLog: function WeavePrefs_openActivityLog() {
    Weave.Utils.openLog();
  },

  openPassphraseDialog: function WeavePrefs_openPassphraseDialog() {
    Weave.Utils.openGenericDialog('ChangePassphrase');
  },
  
  doSyncNow: function WeavePrefs_doSyncNow() {
    Weave.Utils.openSync();
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
  
  doChangePassword: function WeavePrefs_doChangePassword() {
    let url = "https://services.mozilla.com/";
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
  },
  
  doCreateAccount: function WeavePrefs_doCreateAccount() {
    Weave.Utils.openWizard();
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

  eraseServer: function WeavePrefs_eraseServer() {
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("erase.server.warning.title"),
                  this._stringBundle.getString("erase.server.warning"))) {
      Weave.Service.wipeServer();
    }
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
