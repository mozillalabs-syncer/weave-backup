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
    this._os.addObserver(this, "bookmarks-sync:logout", false);
	this._os.addObserver(this, "bookmarks-sync:start", false);
	this._os.addObserver(this, "bookmarks-sync:end", false);
  },

  _onLogin: function Sync__onLogin() {
    LOG("Login successful");

    let status1 = document.getElementById("sync-menu-status");
    if(status1) {
      status1.setAttribute("value",  this._ss.currentUser);
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
      logoutitem.setAttribute("label", "Sign Out");
    }

    let syncnowitem = document.getElementById("sync-syncnowitem");
    if (syncnowitem)
      syncnowitem.setAttribute("disabled", "false");
  },

  _onLogout: function Sync__onLogout() {
    let throbber1 = document.getElementById("sync-throbber-online");
    let throbber2 = document.getElementById("sync-throbber-offline");
    let throbber3 = document.getElementById("sync-trhobber-active");
    if (throbber1)
      throbber1.setAttribute("hidden","true");
    if (throbber2)
      throbber2.setAttribute("hidden", "false");
	if (throbber3)
	  throbber3.setAttribute("hidden", "true");

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
  },

  _addUserLogin: function Sync__addUserLogin(username, password) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    branch.setCharPref("browser.places.sync.username", username);

    let serverURL = branch.getCharPref("browser.places.sync.serverURL");
    let ioservice = Cc["@mozilla.org/network/io-service;1"].
                    getService(Ci.nsIIOService);
    let uri = ioservice.newURI(serverURL, null, null);

    // fixme: make a request and get the realm
    let nsLoginInfo = new Components.Constructor(
      "@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");
    let login = new nsLoginInfo(uri.hostPort, null,
                                'Use your ldap username/password - dotmoz',
                                username, password, null, null);
    let pm = Cc["@mozilla.org/login-manager;1"]. getService(Ci.nsILoginManager);
    pm.addLogin(login);
  },

  startUp: function Sync_startUp(event) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let autoconnect = branch.getBoolPref("extensions.sync.autoconnect");

    // XXX need to make sure we have a username/password
    if(autoconnect)
      this._ss.login();
  },

  doLoginPopup : function Sync_doLoginPopup(event) {
  	let branch = Cc["@mozilla.org/preferences-service;1"].
	  getService(Ci.nsIPrefBranch);
  },
  
  doLogin: function Sync_doLogin(event) {
    // xxx hack: uncomment and edit once to set your password - need ui
    // this._addUserLogin('username@mozilla.com', 'password');
    window.openDialog('chrome://sync/content/login.xul', '',
                      'chrome, dialog, modal, resizable=yes', null).focus();
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
    openPreferences("sync-prefpane");
  },

  onOpenPrefs : function Sync_onOpenPrefs(event) {
  },

  doOpenActivityLog: function Sync_doOpenActivityLog(event) {
    window.openDialog('chrome://sync/content/log.xul', '',
                      'chrome, dialog, modal, resizable=yes', null).focus();
  },

  doPopup: function Sync_doPopup(event) {
    let pref = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let lastSync = pref.getCharPref("extensions.sync.lastsync");
    if(lastSync) {
      let lastsyncitem = document.getElementById("sync-lastsyncitem");
      if(lastsyncitem) {
        let syncDate = new Date(parseInt(lastSync));
        lastsyncitem.setAttribute("label", "Last Sync: " +
                                  syncDate.toLocaleString());
        lastsyncitem.setAttribute("hidden", "false");
      }
    }
  },

  _onSyncStart: function Sync_onSyncStart() {
    let throbber1 = document.getElementById("sync-throbber-online");
    let throbber2 = document.getElementById("sync-throbber-active");
    if(throbber1) 
      throbber1.setAttribute("hidden","true");
    if(throbber2) 
      throbber2.setAttribute("hidden", "false");
	  
	let cancelitem = document.getElementById("sync-cancelsyncitem");
	if(cancelitem)
	  cancelitem.setAttribute("active", "true");
	  
	let syncitem = document.getElementById("sync-syncnowitem");
	if(syncitem)
	  syncitem.setAttribute("active", "false");
  },

  _onSyncEnd: function Sync_onSyncEnd() {
    let throbber1 = document.getElementById("sync-throbber-online");
    let throbber2 = document.getElementById("sync-throbber-active");
    if(throbber1) 
      throbber1.setAttribute("hidden","false");
    if(throbber2) 
      throbber2.setAttribute("hidden", "true");

	let cancelitem = document.getElementById("sync-cancelsyncitem");
	if(cancelitem)
	  cancelitem.setAttribute("active", "false");
	  
	let syncitem = document.getElementById("sync-syncnowitem");
	if(syncitem)
	  syncitem.setAttribute("active", "true");
  },
  
  // nsIObserver
  observe: function(subject, topic, data) {
    switch(topic) {
    case "bookmarks-sync:login":
      this._onLogin();
      break;
    case "bookmarks-sync:logout":
      this._onLogout();
      break;
    case "bookmarks-sync:login-error":
      this._onLoginError();
      break;
	case "bookmarks-sync:start":
	  this._onSyncStart();
	  break;
	case "bookmarks-sync:end":
	  this._onSyncEnd();
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

window.addEventListener("load", function(e) { gSync.startUp(e); }, false);
