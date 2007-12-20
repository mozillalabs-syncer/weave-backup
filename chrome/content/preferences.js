var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function WeavePrefs() {
  this._init();
}

WeavePrefs.prototype = {

 __ss: null,
  get _ss() {
    return Weave.Service;
  },

  _init : function WeavePrefs__init() {
  },

  _checkAccountInfo: function WeavePrefs__checkAccountInfo() {
    let logingroup = document.getElementById('sync-login-group');
    let resetgroup = document.getElementById('sync-reset-group');
    if(!this._ss.username || this._ss.username == "nobody@mozilla.com") {
      logingroup.setAttribute("hidden", "true");
      resetgroup.setAttribute("hidden", "false");
    } else {
      logingroup.setAttribute("hidden", "false");
      resetgroup.setAttribute("hidden", "true");
    }
  },

  onPaneLoad: function WeavePrefs_onPaneLoad() {
    this._checkAccountInfo();

    let usernameField = document.getElementById('sync-username-field');
    let passwordField = document.getElementById('sync-password-field');

    if (this._ss.password) {
      usernameField.setAttribute("value", this._ss.username);
      passwordField.setAttribute("value", "Stored in password manager");
    } else {
      usernameField.setAttribute("value", this._ss.username);
      passwordField.setAttribute("value", "None set");
    }
  },


  openActivityLog: function WeavePrefs_openActivityLog() {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator);
    let logWindow = wm.getMostRecentWindow('Sync:Log');
    if (logWindow)
      logWindow.focus();
     else {
       var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
         getService(Ci.nsIWindowWatcher);
       ww.openWindow(null, 'chrome://weave/content/log.xul', '',
                     'chrome,centerscreen,dialog,modal,resizable=yes', null);
     }
  },
 
  openSetupWizard: function WeavePrefs_openSetupWizard() {
    window.openDialog('chrome://weave/content/wizard.xul', '',
		      'chrome, dialog, modal, resizable=yes', null);          
    this.onPaneLoad();
  },

  resetServerLock: function WeavePrefs_resetServerLock() {
    this._ss.resetLock();
  },

  resetServerData: function WeavePrefs_resetServerData() {
    this._ss.resetServer();
  },

  resetClientData: function WeavePrefs_resetClientData() {
    this._ss.resetClient();
  },

  resetLoginCredentials: function WeavePrefs_resetLoginCredentials() {
    this._ss.logout();
    this._ss.password = null;
    this._ss.passphrase = null;
    this._ss.username = null;
    this._checkAccountInfo();
  },

  resetServerURL: function WeavePrefs_resetServerURL() {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    branch.clearUserPref("browser.places.sync.serverURL");
    let serverURL = branch.getCharPref("browser.places.sync.serverURL");
    let serverField = document.getElementById('sync-server-field');
    serverField.setAttribute("value", serverURL);
    this._ss.logout();
  }
};

let gWeavePrefs = new WeavePrefs();
