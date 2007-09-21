function Sync() {
  this._init();
}
Sync.prototype = {
  __ss: null,
  get _ss() {
    if (!this.__ss)
      this.__ss = Cc["@mozilla.org/places/sync-service;1"].
        getService(Ci.nsIBookmarksSyncService);
    return this.__ss;
  },

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  _init: function Sync__init() {
    this._os.addObserver(this, "bookmarks-sync:login", false);
  },

  _onLogin: function Sync__onLogin() {
    LOG("Login successful");

    let status1 = document.getElementById("sync-menu-status");
    if(status1) {
      status1.setAttribute("value",  this._ss.currentUser + " signed in");
      status1.setAttribute("hidden", "false");
    }

    let throbber1 = document.getElementById("sync-throbber-online");
    let throbber2 = document.getElementById("sync-throbber-offline");
    if (throbber1)
      throbber1.setAttribute("hidden","false");
    if (throbber2)
      throbber2.setAttribute("hidden", "true");

    let loginitem = document.getElementById("sync-loginitem");
    let logoutitem = document.getElementById("sync-logoutitem");
    if(loginitem && logoutitem) {
      loginitem.setAttribute("hidden", "true");
      logoutitem.setAttribute("hidden", "false");
      logoutitem.setAttribute("label", "Sign Out (" +
                              this._ss.currentUser + ")");
    }

    let syncnowitem = document.getElementById("sync-syncnowitem");
    if (syncnowitem)
      syncnowitem.setAttribute("disabled", "false");
  },

  _onLogout: function Sync__onLogout() {
    let throbber1 = document.getElementById("sync-throbber-online");
    let throbber2 = document.getElementById("sync-throbber-offline");
    if (throbber1)
      throbber1.setAttribute("hidden","true");
    if (throbber2)
      throbber2.setAttribute("hidden", "false");

    let status1 = document.getElementById("sync-menu-status");
    if (status1)
      status1.setAttribute("hidden", "true");

    this.doCancelSync();

    let loginitem = document.getElementById("sync-loginitem");
    let logoutitem = document.getElementById("sync-logoutitem");
    if(loginitem && logoutitem) {
      loginitem.setAttribute("hidden", "false");
      logoutitem.setAttribute("hidden", "true");
    }

    let syncnowitem = document.getElementById("sync-syncnowitem");
    if (syncnowitem)
      syncnowitem.setAttribute("disabled", "true");

    let cancelsyncitem = document.getElementById("sync-cancelsyncitem");
    if (cancelsyncitem)
      cancelsyncitem.setAttribute("disabled", "true");

    alert("You've been logged out.");
  },

  startUp: function Sync_startUp(event) {
  },

  doLogin: function Sync_doLogin(event) {
    this._ss.login();
  },

  doLogout: function Sync_doLogout(event) {
    this._ss.logout();
  },

  doSync: function Sync_doSync(event) {
    this._ss.sync();
  },

  doCancelSync: function Sync_doCancelSync(event) {
    LOG("cancel sync unimplemented");
  },

  doOpenPrefs: function Sync_doOpenPrefs(event) {
    LOG("open prefs unimplemented");
  },

  doOpenActivityLog: function Sync_doOpenActivityLog(event) {
    window.openDialog('chrome://sync/content/log.xul', '',
                      'chrome, dialog, modal, resizable=yes', null).focus();
  },

  doOpenPopup: function Sync_doPopup(event) { 
    var pref = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefBranch);
    var lastSync = pref.getCharPref("extensions.sync.lastsync");
    if(lastSync) {
      var lastsyncitem = document.getElementById("sync-lastsyncitem");
      if(lastsyncitem) {
        var syncDate = new Date(parseInt(lastSync));
        lastsyncitem.setAttribute("label", "Last Sync: " +
                                  syncDate.toLocaleString());
        lastsyncitem.setAttribute("hidden", "false");
      }
    }
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    switch(topic) {
    case "bookmarks-sync:login":
      this._onLogin();
      break;
    case "bookmarks-sync:login-error":
      this._onLoginError();
      break;
    }
  }
};

function LOG(aText) {
  dump(aText + "\n");
  var consoleService = Cc["@mozilla.org/consoleservice;1"].
                       getService(Ci.nsIConsoleService);
  consoleService.logStringMessage(aText);
}

let gSync = new Sync();

/*
FIXME: needs cleanup/merging!

var saved_status;
function syncUISetup() {
  var throbber1 = document.getElementById("sync-throbber-online");
  if(throbber1) {
    throbber1.setAttribute("hidden","true");
  }
  var throbber2 = document.getElementById("sync-throbber-active");
  if(throbber2) {
    throbber2.setAttribute("hidden", "false");
  }
  var status1 = document.getElementById("sync-menu-status");
  if(status1) {
    saved_status = status1.getAttribute("value");
    status1.setAttribute("value", "Synchronizing...");
  }	
}

function syncUICallback() {
 var pref = Components.classes["@mozilla.org/preferences-service;1"].
   getService(Components.interfaces.nsIPrefBranch);
  var endTime = new Date().getTime();
  pref.setCharPref("extensions.sync.lastsync", endTime);
  var status1 = document.getElementById("sync-menu-status");
  if(status1) {
	status1.setAttribute("value", saved_status);
  }	
  var throbber1 = document.getElementById("sync-throbber-online");
  if(throbber1) {
	  throbber1.setAttribute("hidden", "false");
  }
  var throbber2 = document.getElementById("sync-throbber-active");
  if(throbber2) {
	  throbber2.setAttribute("hidden", "true");
  }
}
*/

window.addEventListener("load", function(e) { gSync.startUp(e); }, false);
