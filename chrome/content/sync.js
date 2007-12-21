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

function Sync() {
  this._init();
}
Sync.prototype = {
  __ss: null,
  get _ss() {
    return Weave.Service;
  },

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  __prefSvc: null,
  get _prefSvc() {
    if (!this.__prefSvc) {
      this.__prefSvc = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefBranch);
      this.__prefSvc.QueryInterface(Ci.nsIPrefBranch2);
    }
    return this.__prefSvc;
  },

  _getPref: function(prefName, defaultValue) {
    let prefSvc = this._prefSvc;

    try {
      switch (prefSvc.getPrefType(prefName)) {
        case Ci.nsIPrefBranch.PREF_STRING:
          return prefSvc.getCharPref(prefName);
        case Ci.nsIPrefBranch.PREF_INT:
          return prefSvc.getIntPref(prefName);
        case Ci.nsIPrefBranch.PREF_BOOL:
          return prefSvc.getBoolPref(prefName);
      }
    }
    catch (ex) {}

    return defaultValue;
  },

  get _baseURL() {
    return this._getPref("extensions.weave.serverURL");
  },

  get _locale() {
    switch (this._getPref("general.useragent.locale", "en-US")) {
      case 'ja':
      case 'ja-JP-mac':
        return "ja";
    }

    return "en-US";
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle });
    return this._stringBundle;
  },

  _log: null,

  _init: function Sync__init() {
    this._log = Log4Moz.Service.getLogger("Chrome.Window");
  },

  _openWindow: function Sync__openWindow(type, uri, options) {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator);
    let window = wm.getMostRecentWindow(type);
    if (window)
      window.focus();
     else {
       var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
         getService(Ci.nsIWindowWatcher);
       if (options === null)
         options = 'chrome,centerscreen,dialog,modal,resizable=yes';
       ww.openWindow(null, uri, '', options, null);
     }
  },

  _setThrobber: function Sync__setThrobber(status) {
    document.getElementById("sync-menu-button").setAttribute("status", status);
    document.getElementById("sync-menu").setAttribute("status", status);
  },

  _onLogin: function Sync__onLogin() {
    this._log.info("Login successful");

    this._userLogin = false;

    let status1 = document.getElementById("sync-menu-status");
    if(status1) {
      status1.setAttribute("value",  this._ss.currentUser);
      status1.setAttribute("hidden", "false");
    }

    this._setThrobber("idle");

    let loginitem = document.getElementById("sync-loginitem");
    let logoutitem = document.getElementById("sync-logoutitem");
    if(loginitem && logoutitem) {
      loginitem.setAttribute("hidden", "true");
      logoutitem.setAttribute("hidden", "false");
    }

    let syncnowitem = document.getElementById("sync-syncnowitem");
    if (syncnowitem)
      syncnowitem.setAttribute("disabled", "false");
  },

  _onLogout: function Sync__onLogout(status) {
    if (status)
      this._setThrobber("offline");
    else
      this._setThrobber("error");

    let status1 = document.getElementById("sync-menu-status");
    if (status1)
      status1.setAttribute("hidden", "true");

    let loginitem = document.getElementById("sync-loginitem");
    let logoutitem = document.getElementById("sync-logoutitem");
    if(loginitem && logoutitem) {
      loginitem.setAttribute("hidden", "false");
      logoutitem.setAttribute("hidden", "true");
    }

    let syncnowitem = document.getElementById("sync-syncnowitem");
    if (syncnowitem)
      syncnowitem.setAttribute("disabled", "true");
  },

  _onSvcUnlock: function Sync__onSvcUnlock() {
    if (this._userLogin)
      this._openWindow('Sync:Login', 'chrome://weave/content/login.xul',
                       'chrome,centerscreen,dialog,modal,resizable=no');
    this._userLogin = false;
  },

  _onSyncStart: function Sync_onSyncStart() {
    this._setThrobber("active");
	  
    let syncitem = document.getElementById("sync-syncnowitem");
    if(syncitem)
      syncitem.setAttribute("active", "false");
  },

  _onSyncEnd: function Sync_onSyncEnd(status) {
    if (status)
      this._setThrobber("idle");
    else
      this._setThrobber("error");
	  
    let syncitem = document.getElementById("sync-syncnowitem");
    if(syncitem)
      syncitem.setAttribute("active", "true");
    
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    branch.setCharPref("extensions.weave.lastsync", new Date().getTime());
    this._updateLastSyncItem();
  },

  startUp: function Sync_startUp(event) {
    this._log.info("Sync window opened");

    this._os.addObserver(this, "weave:service-unlock:success", false);
    this._os.addObserver(this, "weave:service-lock:success", false);
    this._os.addObserver(this, "weave:service-lock:error", false);
    this._os.addObserver(this, "weave:service-login:success", false);
    this._os.addObserver(this, "weave:service-login:error", false);
    this._os.addObserver(this, "weave:service-logout:success", false);
    this._os.addObserver(this, "weave:service:sync:start", false);
    this._os.addObserver(this, "weave:service:sync:success", false);
    this._os.addObserver(this, "weave:service:sync:error", false);

    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);

    if (branch.getCharPref("extensions.weave.lastversion") == "firstrun") {
      let url = this._baseURL +
	"addon/" + this._locale + "/firstrun/?version=" + WEAVE_VERSION;
      setTimeout(function() { window.openUILinkIn(url, "tab") }, 500);
      this._prefSvc.setCharPref("extensions.weave.lastversion", WEAVE_VERSION);
      return;
    }

    if (branch.getCharPref("extensions.weave.lastversion") != WEAVE_VERSION) {
      let url = this._baseURL +
	"addon/" + this._locale + "/updated/?version=" + WEAVE_VERSION;
      setTimeout(function() { window.openUILinkIn(url, "tab") }, 500);
      this._prefSvc.setCharPref("extensions.weave.lastversion", WEAVE_VERSION);
      return;
    }

    let autoconnect = branch.getBoolPref("extensions.weave.autoconnect");
    if(autoconnect &&
       this._ss.username && this._ss.username != 'nobody@mozilla.com')
      this._ss.login(null, null);
  },

  shutDown: function Sync_shutDown(event) {
    this._log.info("Sync window closed");

    this._os.removeObserver(this, "weave:service-unlock:success");
    this._os.removeObserver(this, "weave:service-lock:success");
    this._os.removeObserver(this, "weave:service-lock:error");
    this._os.removeObserver(this, "weave:service-login:success");
    this._os.removeObserver(this, "weave:service-login:error");
    this._os.removeObserver(this, "weave:service-logout:success");
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
  },

  doLoginPopup : function Sync_doLoginPopup(event) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
  },
  
  doLogin: function Sync_doLogin(event) {
    if (this._ss.currentUser)
      return; // already logged in

    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let username = branch.getCharPref("extensions.weave.username");

    if (!username || username == 'nobody@mozilla.com') {
      this.doOpenSetupWizard();
      return;
    }

    this._userLogin = true;
    this._ss.login(null, null);
  },
  
  doOpenSetupWizard : function Sync_doOpenSetupWizard(event) {
      window.openDialog('chrome://weave/content/wizard.xul', '',
        'chrome, dialog, modal, resizable=yes', null);  	
  },

  doLogout: function Sync_doLogout(event) {
    this._ss.logout();
  },

  doSync: function Sync_doSync(event) {
    this._ss.sync();
  },

  doCancelSync: function Sync_doCancelSync(event) {
    this._log.error("cancel sync unimplemented");
  },

  doOpenPrefs: function Sync_doOpenPrefs(event) {
    openPreferences("sync-prefpane");
  },

  onOpenPrefs : function Sync_onOpenPrefs(event) {
    // XXX called when prefpane opens, setup password and login states
  },

  doOpenActivityLog: function Sync_doOpenActivityLog(event) {
    this._openWindow('Weave:Log', 'chrome://weave/content/log.xul',
                     'chrome,centerscreen,dialog,modal,resizable=yes');
  },

  doPopup: function Sync_doPopup(event) {
    this._updateLastSyncItem();
  },

  _updateLastSyncItem: function Sync__updateLastSyncItem() {
    let pref = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);

    let lastSync = pref.getCharPref("extensions.weave.lastsync");
    if (!lastSync)
      return;

    let lastSyncItem = document.getElementById("sync-lastsyncitem");
    if (!lastSyncItem)
      return;

    let lastSyncDate = new Date(parseInt(lastSync)).toLocaleString();
    let lastSyncLabel =
      this._stringBundle.getFormattedString("lastSync.label", [lastSyncDate]);
    lastSyncItem.setAttribute("label", lastSyncLabel);
    lastSyncItem.setAttribute("hidden", "false");
  },

  onMenuPopupHiding: function Sync_onMenuPopupHiding() {
    var menuPopup = document.getElementById('sync-menu-popup');
    var menu = document.getElementById('sync-menu');

    // If the menu popup isn't on the Tools > Sync menu, then move the popup
    // back onto that menu so the popup appears when the user selects the menu.
    // We'll move the popup back to the menu button when the user clicks on
    // the menu button.
    if (menuPopup.parentNode != menu)
      menu.appendChild(menuPopup);
  },

  onMenuButtonMouseDown: function Sync_onMenuButtonMouseDown() {
    var menuPopup = document.getElementById('sync-menu-popup');
    var menuButton = document.getElementById("sync-menu-button");

    // If the menu popup isn't on the menu button, then move the popup onto
    // the button so the popup appears when the user clicks the button.  We'll
    // move the popup back to the Tools > Sync menu when the popup hides.
    if (menuPopup.parentNode != menuButton)
      menuButton.appendChild(menuPopup);
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    switch(topic) {
    case "weave:service-unlock:success":
      this._onSvcUnlock();
      break;
    case "weave:service-lock:success":
      break;
    case "weave:service-lock:error":
      this._onLogout(false);
      break;
    case "weave:service-login:success":
      this._onLogin();
      break;
    case "weave:service-login:error":
      break;
    case "weave:service-logout:success":
      this._onLogout(true);
      break;
    case "weave:service:sync:start":
      this._onSyncStart();
      break;
    case "weave:service:sync:success":
      this._onSyncEnd(true);
      break;
    case "weave:service:sync:error":
      this._onSyncEnd(false);
      break;
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gSync = new Sync();

window.addEventListener("load", function(e) { gSync.startUp(e); }, false);
window.addEventListener("unload", function(e) { gSync.shutDown(e); }, false);

