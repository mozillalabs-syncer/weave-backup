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

    if (!Weave.Service.currentUser) {
      signOnButton.setAttribute("hidden", "false");
      signOutButton.setAttribute("hidden", "true");
      createButton.setAttribute("hidden", "false");
      syncNowButton.setAttribute("disabled", "true");
      syncUserName.setAttribute("value", "");
    } else {
      let signedInDescription =
        this._stringBundle.getFormattedString("signedIn.description",
                                              [Weave.Service.currentUser]);
      signOnButton.setAttribute("hidden", "true");
      signOutButton.setAttribute("hidden", "false");
      createButton.setAttribute("hidden", "true");
      syncNowButton.setAttribute("disabled", "false");
      syncUserName.setAttribute("value", signedInDescription);
   }
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

  doCreateAccount: function WeavePrefs_doCreateAccount() {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    let recentWindow = wm.getMostRecentWindow("navigator:browser");
    // FIXME: should be based upon baseURL
    var url = "https://services.mozilla.com";
    if (recentWindow)
      recentWindow.delayedOpenTab(url, null, null, null, null);
    else
      window.open(url);
  },

  resetLoginCredentials: function WeavePrefs_resetLoginCredentials() {
    Weave.Service.logout();
    Weave.Service.password = null;
    Weave.Service.passphrase = null;
    Weave.Service.username = null;
    this._checkAccountInfo();
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
    Weave.Service.resetLock();
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
