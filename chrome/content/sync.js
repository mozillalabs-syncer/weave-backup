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

const MODE_RDONLY   = 0x01;
const MODE_WRONLY   = 0x02;
const MODE_CREATE   = 0x08;
const MODE_APPEND   = 0x10;
const MODE_TRUNCATE = 0x20;

const PERMS_FILE      = 0644;
const PERMS_DIRECTORY = 0755;

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
    let throbberOff = document.getElementById("sync-throbber-offline");
    let throbberIdle = document.getElementById("sync-throbber-online");
    let throbberSync = document.getElementById("sync-throbber-active");
    let throbberError = document.getElementById("sync-throbber-error");

    function hide(elt, hidden) {
      if (elt)
        elt.setAttribute("hidden", hidden);
    }

    switch (status) {
    case "offline":
      hide(throbberOff, "false");
      hide(throbberIdle, "true");
      hide(throbberSync, "true");
      hide(throbberError, "true");
      break;
    case "idle":
      hide(throbberOff, "true");
      hide(throbberIdle, "false");
      hide(throbberSync, "true");
      hide(throbberError, "true");
      break;
    case "active":
      hide(throbberOff, "true");
      hide(throbberIdle, "true");
      hide(throbberSync, "false");
      hide(throbberError, "true");
      break;
    case "error":
    default:
      hide(throbberOff, "true");
      hide(throbberIdle, "true");
      hide(throbberSync, "true");
      hide(throbberError, "false");
      break;
    }
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
      logoutitem.setAttribute("label", "Sign Out");
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
    let lastSync = new Date(). getTime();
    branch.setCharPref("extensions.weave.lastsync", lastSync);

    let lastsyncitem = document.getElementById("sync-lastsyncitem");
    if(lastsyncitem)
      lastsyncitem.setAttribute("label", "Last Sync: " + lastSync.toLocaleString());
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

    let lastVersion = branch.getCharPref("extensions.weave.lastVersion");
    if (lastVersion == "firstRun") {
      let url = this._baseURL +
	"/foo/" + this._locale + "/firstrun?version=" + WEAVE_VERSION;
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
    let pref = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let lastSync = pref.getCharPref("extensions.weave.lastsync");
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

