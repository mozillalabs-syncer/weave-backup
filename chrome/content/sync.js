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
  this._log = Log4Moz.Service.getLogger("Chrome.Window");

  this._log.info("Initializing Weave UI");

  this._os.addObserver(this, "weave:service:login:start", false);
  this._os.addObserver(this, "weave:service:login:success", false);
  this._os.addObserver(this, "weave:service:login:error", false);
  this._os.addObserver(this, "weave:service:logout:success", false);
  this._os.addObserver(this, "weave:service:sync:start", false);
  this._os.addObserver(this, "weave:service:sync:success", false);
  this._os.addObserver(this, "weave:service:sync:error", false);
  this._os.addObserver(this, "weave:store:tabs:virtual:created", false);
  this._os.addObserver(this, "weave:store:tabs:virtual:removed", false);

  if (Weave.Utils.prefs.getBoolPref("ui.syncnow"))
    document.getElementById("sync-syncnowitem").setAttribute("hidden", false);

  if (Weave.Utils.prefs.getCharPref("lastversion") == "firstrun") {
    let url = "http://sm-labs01.mozilla.org/projects/weave/firstrun/?version=" +
                Weave.WEAVE_VERSION;
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
  }

  if (Weave.Utils.prefs.getCharPref("lastversion") != Weave.WEAVE_VERSION) {
    let url = "http://sm-labs01.mozilla.org/projects/weave/updated/?version=" +
                Weave.WEAVE_VERSION;
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
  }

  Weave.Utils.prefs.setCharPref("lastversion", Weave.WEAVE_VERSION);
  Weave.Service.onWindowOpened();

  this._updateSyncTabsButton();
}
Sync.prototype = {
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
    this.__defineGetter__("_stringBundle",
                          function() { return stringBundle; });
    return this._stringBundle;
  },

  get _sessionStore() {
    let sessionStore = Cc["@mozilla.org/browser/sessionstore;1"].
		       getService(Ci.nsISessionStore);
    this.__defineGetter__("_sessionStore", function() sessionStore);
    return this._sessionStore;
  },

  get _json() {
    let json = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
    this.__defineGetter__("_json", function() json);
    return this._json;
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
       if (!options)
         options = 'chrome,centerscreen,dialog,modal,resizable=yes';
       ww.activeWindow.openDialog(uri, '', options, null);
     }
  },

  _setThrobber: function Sync__setThrobber(status) {
    document.getElementById("sync-menu-button").setAttribute("status", status);
    document.getElementById("sync-menu").setAttribute("status", status);
    let label = this._stringBundle.getString("status." + status);
    document.getElementById("sync-menu-status").setAttribute("value", label);
  },

  _onLoginStart: function Sync__onLoginStart() {
    this._log.info("Logging in...");
    this._log.info("User string: " + navigator.userAgent);
    this._log.info("Weave version: " + Weave.WEAVE_VERSION);
    this._setThrobber("active");
  },

  _onLoginError: function Sync__onLoginError() {
    this._setThrobber("error");
    this._openWindow('Sync:Login', 'chrome://weave/content/login.xul');
  },

  _onLogin: function Sync__onLogin() {
    this._log.info("Login successful");

    this._userLogin = false;

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

    this._prefSvc.setCharPref("extensions.weave.lastsync",
                              new Date().getTime());
    this._updateLastSyncItem();
  },

  shutDown: function Sync_shutDown(event) {
    this._log.info("Sync window closed");

    this._os.removeObserver(this, "weave:service:login:start");
    this._os.removeObserver(this, "weave:service:login:success");
    this._os.removeObserver(this, "weave:service:login:error");
    this._os.removeObserver(this, "weave:service:logout:success");
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
    this._os.removeObserver(this, "weave:store:tabs:virtual:created");
    this._os.removeObserver(this, "weave:store:tabs:virtual:removed");
  },

  doLoginPopup : function Sync_doLoginPopup(event) {
    this._openWindow('Sync:Login', 'chrome://weave/content/login.xul');
  },

  doLogin: function Sync_doLogin(event) {
    if (Weave.Service.currentUser)
      return; // already logged in

    let username = this._prefSvc.getCharPref("extensions.weave.username");

    if (!username || username == 'nobody@mozilla.com') {
      this.doOpenSetupWizard();
      return;
    }

//    this._userLogin = true;
//    Weave.Service.login();
    this.doLoginPopup();
  },

  doOpenSetupWizard : function Sync_doOpenSetupWizard(event) {
      window.openDialog('chrome://weave/content/wizard.xul', '',
        'chrome, dialog, resizable=yes', null);
  },

  doLogout: function Sync_doLogout(event) {
    Weave.Service.logout();
  },

  doSync: function Sync_doSync(event) {
    Weave.Service.sync();
  },

  doShare: function Sync_doShare(event) {
    this._openWindow('Sync:Share', 'chrome://weave/content/share.xul');
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
                     'chrome, centerscreen, dialog, resizable=yes');
  },

  doPopup: function Sync_doPopup(event) {
    this._updateLastSyncItem();
  },

  _getSortedVirtualTabs: function Sync__getSortedVirtualTabs() {
    let virtualTabs = Weave.Engines.get("tabs").store.virtualTabs;

    // Convert the hash of virtual tabs indexed by ID into an array
    // of virtual tabs whose ID is stored in an ID property.
    virtualTabs =
      [(virtualTabs[id].id = id) && virtualTabs[id] for (id in virtualTabs)];

    // Sort virtual tabs by their position in their windows.
    // Note: we don't actually group by window first, so all first tabs
    // will appear first in the list, followed by all second tabs, and so on.
    // FIXME: group by window, even though we aren't opening them up that way,
    // so the list better resembles the pattern the user remembers.
    virtualTabs.sort(function(a, b) a.position > b.position ?  1 :
                                    a.position < b.position ? -1 : 0);

    return virtualTabs;
  },

  doInitTabsMenu: function Sync_doInitTabsMenu() {
    let menu = document.getElementById("sync-tabs-menu");
    let virtualTabs = this._getSortedVirtualTabs();

    while (menu.itemCount > 1)
      menu.removeItemAt(menu.itemCount - 1);

    for each (let virtualTab in virtualTabs) {
      let currentEntry = virtualTab.state.entries[virtualTab.state.index - 1];
      if (!currentEntry || !currentEntry.url) {
        this._log.warn("doInitTabsMenu: no current entry or no URL, can't " +
                       "identify " + this._json.encode(virtualTab));
        continue;
      }

      let label = currentEntry.title ? currentEntry.title : currentEntry.url;
      let menuitem = menu.appendItem(label, virtualTab.id);
      // Make a tooltip that contains either or both of the title and URL.
      menuitem.tooltipText =
        [currentEntry.title, currentEntry.url].filter(function(v) v).join("\n");
    }

    document.getElementById("sync-no-tabs-menu-item").hidden = (menu.itemCount > 1);
  },

  onCommandTabsMenu: function Sync_onCommandTabsMenu(event) {
    let tabID = event.target.value;
    let virtualTabs = Weave.Engines.get("tabs").store.virtualTabs;
    let virtualTab = virtualTabs[tabID];

    let tab = gBrowser.addTab("about:blank");
    this._sessionStore.setTabState(tab, this._json.encode(virtualTab.state));
    gBrowser.selectedTab = tab;
    delete virtualTabs[tabID];
  },

  _onVirtualTabCreated: function Sync__onVirtualTabCreated() {
    this._updateSyncTabsButton();
    // FIXME: do more to alert the user about new undisposed virtual tabs?
  },

  _onVirtualTabRemoved: function Sync__onVirtualTabRemoved() {
    this._updateSyncTabsButton();
  },

  _updateSyncTabsButton: function Sync__updateSyncTabsButton() {
    let virtualTabs = Weave.Engines.get("tabs").store.virtualTabs;

    // As long as there is at least one virtual tab that hasn't previously been
    // disposed of by the user, show the button for opening the sync tabs panel.
    for (id in virtualTabs) {
      if (!virtualTabs[id]._disposed) {
        document.getElementById("sync-tabs-button").hidden = false;
        return;
      }
    }

    // Otherwise, hide the button.
    document.getElementById("sync-tabs-button").hidden = true;
  },

  doInitTabsPanel: function Sync_doInitTabsPanel() {
    let list = document.getElementById("sync-tabs-list");

    let virtualTabs = this._getSortedVirtualTabs();

    // Remove virtual tabs that have previously been disposed of by the user.
    virtualTabs = virtualTabs.filter(function(v) !v._disposed);

    while (list.hasChildNodes())
      list.removeChild(list.lastChild);

    for each (let virtualTab in virtualTabs) {
      let currentEntry = virtualTab.state.entries[virtualTab.state.index - 1];
      if (!currentEntry || !currentEntry.url) {
        this._log.warn("doInitTabsPanel: no current entry or no URL, can't " +
                       "identify " + this._json.encode(virtualTab));
        continue;
      }

      let label = currentEntry.title ? currentEntry.title : currentEntry.url;
      let listitem = list.appendItem(label, virtualTab.id);
      listitem.setAttribute("type", "checkbox");
      // Make a tooltip that contains either or both of the title and URL.
      listitem.tooltipText =
        [currentEntry.title, currentEntry.url].filter(function(v) v).join("\n");
    }
  },

  doCloseTabsPanel: function Sync_doCloseTabsPanel() {
    document.getElementById("sync-tabs-panel").hidePopup();
  },

  doSyncTabs: function Sync_doSyncTabs() {
    let list = document.getElementById("sync-tabs-list");
    let virtualTabs = Weave.Engines.get("tabs").store.virtualTabs;

    for (let i = 0; i < list.childNodes.length; i++) {
      let listitem = list.childNodes[i];
      let virtualTab = virtualTabs[listitem.value];
      if (listitem.checked) {
        let tab = gBrowser.addTab("about:blank");
        this._sessionStore.setTabState(tab, this._json.encode(virtualTab.state));
        delete virtualTabs[listitem.value];
      }
      else {
        // Mark the tab disposed of by the user so we don't show it the next
        // time the user opens the sync tabs panel.  Note: this flag does not
        // get synced to the server, so disposal happens on each client
        // separately, which means the user will still be prompted about this
        // tab when syncing to a third client.
        virtualTab._disposed = true;
      }
    }

    Weave.Engines.get("tabs").store.virtualTabs = virtualTabs;
    this.doCloseTabsPanel();
    document.getElementById("sync-tabs-button").hidden = true;
  },

  _updateLastSyncItem: function Sync__updateLastSyncItem() {
    let lastSync = this._prefSvc.getCharPref("extensions.weave.lastsync");
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
    case "weave:service:login:start":
      this._onLoginStart();
      break;
    case "weave:service:login:success":
      this._onLogin();
      break;
    case "weave:service:login:error":
      this._onLoginError();
      break;
    case "weave:service:logout:success":
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
    case "weave:store:tabs:virtual:created":
      this._onVirtualTabCreated();
      break;
    case "weave:store:tabs:virtual:removed":
      this._onVirtualTabRemoved();
      break;
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gSync;

window.addEventListener("load", function(e) { gSync = new Sync(); }, false);
window.addEventListener("unload", function(e) { gSync.shutDown(e); }, false);

