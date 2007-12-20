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
    let signOnButton = document.getElementById('sync-signon-button');
    let signOutButton = document.getElementById('sync-signout-button'); 

    if(!this._ss.username || this._ss.username == "nobody@mozilla.com") {
      signOnButton.setAttribute("hidden", "false");
      signOutButton.setAttribute("hidden", "true");
    } else {
      signOnButton.setAttribute("hidden", "true");
      signOutButton.setAttribute("hidden", "false");
    }
  },

  onPaneLoad: function WeavePrefs_onPaneLoad() {
    this._checkAccountInfo();
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
 
  doSignOn: function WeavePrefs_doSignOn() {

    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let username = branch.getCharPref("browser.places.sync.username");
  
    if (!username || username == 'nobody@mozilla.com') { 
         window.openDialog('chrome://weave/content/wizard.xul', '',
		      'chrome, dialog, modal, resizable=yes', null);          
    } else {
         window.openDialog('chrome://weave/content/login.xul', '',
                      'chrome, dialog, modal, resizable=yes', null);
    }

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
