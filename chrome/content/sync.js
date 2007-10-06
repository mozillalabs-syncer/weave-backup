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
    this._ss.notice("Login successful");

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

  startUp: function Sync_startUp(event) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let autoconnect = branch.getBoolPref("browser.places.sync.autoconnect");
    let username = branch.getCharPref("browser.places.sync.username");
    if(autoconnect && username && username != 'nobody@mozilla.com')
      this._ss.login();
  },

  doLoginPopup : function Sync_doLoginPopup(event) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
  },
  
  doLogin: function Sync_doLogin(event) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let username = branch.getCharPref("browser.places.sync.username");
    if(!username || username == 'nobody@mozilla.com') {
		this.doOpenSetupWizard();
        return;
    }

    this._ss.login();
  },
  
  doOpenSetupWizard : function Sync_doOpenSetupWizard(event) {
      window.openDialog('chrome://sync/content/wizard.xul', '',
        'chrome, dialog, modal, resizable=yes', null);  	
  },

  doLogout: function Sync_doLogout(event) {
    this._ss.logout();
  },

  doSync: function Sync_doSync(event) {
    this._ss.sync();
  },

  doCancelSync: function Sync_doCancelSync(event) {
    this._ss.notice("cancel sync unimplemented");
  },

  doOpenPrefs: function Sync_doOpenPrefs(event) {
    openPreferences("sync-prefpane");
  },

  onOpenPrefs : function Sync_onOpenPrefs(event) {
    // XXX called when prefpane opens, setup password and login states
  },

  doOpenActivityLog: function Sync_doOpenActivityLog(event) {
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

  doPopup: function Sync_doPopup(event) {
    let pref = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let lastSync = pref.getCharPref("browser.places.sync.lastsync");
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
    
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    let lastSync = new Date(). getTime();
    branch.setCharPref("browser.places.sync.lastsync", lastSync);

    let lastsyncitem = document.getElementById("sync-lastsyncitem");
    if(lastsyncitem)
      lastsyncitem.setAttribute("label", "Last Sync: " + lastSync.toLocaleString());
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

let gSync = new Sync();
window.addEventListener("load", function(e) { gSync.startUp(e); }, false);
