var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function SyncPane() {
  this._init();
}

SyncPane.prototype = {

 __ss: null,
  get _ss() {
    if (!this.__ss)
      this.__ss = Cc["@mozilla.org/places/sync-service;1"].
        getService(Ci.IBookmarksSyncService);
    return this.__ss;
  },

  _init : function SyncPane__init() {
  },

  onPaneLoad: function SyncPane_onPaneLoad()
  {
    let branch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    let serverURL = branch.getCharPref("browser.places.sync.serverURL");
    let username = branch.getCharPref("browser.places.sync.username");

    let logingroup = document.getElementById('sync-login-group');
    let resetgroup = document.getElementById('sync-reset-group');
 
    if(!username || username == "nobody@mozilla.com") {
      logingroup.setAttribute("hidden", "true");
      resetgroup.setAttribute("hidden", "false");
      return; // XXX
    } else {
      logingroup.setAttribute("hidden", "false");
      resetgroup.setAttribute("hidden", "true");
    }

    let uri = makeURI(serverURL);
    let lm = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
    let logins = lm.findLogins({}, uri.hostPort, null, 'services.mozilla.com');
    let username_field = document.getElementById('sync-username-field');
    let password_field = document.getElementById('sync-password-field');
    if(logins.length) {  
       username_field.setAttribute("value", logins[0].username);
       password_field.setAttribute("value", "Stored in password manager");
    } else {
       username_field.setAttribute("value", username);
       password_field.setAttribute("value", "None set");
    }
  },


  openActivityLog: function SyncPane_openActivityLog()
  {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator);
    let logWindow = wm.getMostRecentWindow('Sync:Log');
    if (logWindow)
      logWindow.focus();
     else {
       var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
         getService(Ci.nsIWindowWatcher);
       ww.openWindow(null, 'chrome://sync/content/log.xul', '',
                     'chrome,centerscreen,dialog,modal,resizable=yes', null);
     }
  },
 
  openSetupWizard: function SyncPane_openSetupWizard()
  {
    window.openDialog('chrome://sync/content/wizard.xul', '', 'chrome, dialog, modal, resizable=yes', null);          

    let branch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    let username = branch.getCharPref("browser.places.sync.username");
    let logingroup = document.getElementById('sync-login-group');
    let resetgroup = document.getElementById('sync-reset-group');
 
    if(!username || username == "nobody@mozilla.com") {
      logingroup.setAttribute("hidden", "true");
      resetgroup.setAttribute("hidden", "false");
      return; // XXX
    } else {
      logingroup.setAttribute("hidden", "false");
      resetgroup.setAttribute("hidden", "true");
    }

    this.onPaneLoad();
  },

  resetServerLock: function SyncPane_resetServerLock()
  {
    this._ss.resetLock();
  },

  resetServerData: function SyncPane_resetServerData()
  {
    this._ss.resetServer();
  },

  resetLoginCredentials: function SyncPane_resetLoginCredentials()
  {
    let branch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    let serverURL = branch.getCharPref("browser.places.sync.serverURL");
    let username = branch.getCharPref("browser.places.sync.username");
    let uri = makeURI(serverURL);
    let lm = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
    let logins = lm.findLogins({}, uri.hostPort, null, 'services.mozilla.com');

    for(let i = 0; i < logins.length; i++) {
      if(logins[i].username == username) {
        lm.removeLogin(logins[i]);
      }
    }

    branch.clearUserPref("browser.places.sync.username");
    
    let logingroup = document.getElementById('sync-login-group');
    let resetgroup = document.getElementById('sync-reset-group');
    logingroup.setAttribute("hidden", "true");
    resetgroup.setAttribute("hidden", "false");

    this._ss.logout();
  },

  resetServerURL: function SyncPane_resetServerURL()
  {
    let branch = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
    branch.clearUserPref("browser.places.sync.serverURL");

    let serverURL = branch.getCharPref("browser.places.sync.serverURL");
    let server_field = document.getElementById('sync-server-field');
    server_field.setAttribute("value", serverURL);

    this._ss.logout();
  }
};

let gSyncPane = new SyncPane();

function makeURI(uriString) {
  var ioservice = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
  return ioservice.newURI(uriString, null, null);
}


