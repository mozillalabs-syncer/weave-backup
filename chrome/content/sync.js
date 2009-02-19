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
 *  Dan Mosedale <dmose@mozilla.org>
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

var Cc = Components.classes;
var Ci = Components.interfaces;

function WeaveWindow() {
  this._log = Log4Moz.repository.getLogger("Chrome.Window");

  this._os.addObserver(this, "weave:service:login:start", false);
  this._os.addObserver(this, "weave:service:login:success", false);
  this._os.addObserver(this, "weave:service:login:error", false);
  this._os.addObserver(this, "weave:service:logout:success", false);
  this._os.addObserver(this, "weave:service:sync:start", false);
  this._os.addObserver(this, "weave:service:sync:success", false);
  this._os.addObserver(this, "weave:service:sync:error", false);
  this._os.addObserver(this, "weave:notification:added", false);
  this._os.addObserver(this, "weave:notification:removed", false);

  if (Weave.Svc.Prefs.get("ui.syncnow"))
    document.getElementById("sync-syncnowitem").setAttribute("hidden", false);

  if (Weave.Svc.Prefs.get("lastversion") == "firstrun") {
    let url = "http://services.mozilla.com/firstrun/?version=" +
      Weave.WEAVE_VERSION;
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
    Weave.Svc.Prefs.set("lastversion", Weave.WEAVE_VERSION);

  } else if (Weave.Svc.Prefs.get("lastversion") != Weave.WEAVE_VERSION) {
    let url = "http://services.mozilla.com/updated/?version=" +
      Weave.WEAVE_VERSION;
    setTimeout(function() { window.openUILinkIn(url, "tab"); }, 500);
    Weave.Svc.Prefs.set("lastversion", Weave.WEAVE_VERSION);
  }

  // TODO: This is a fix for the general case of bug 436936.  It will
  // not support marginal cases such as when a new browser window is
  // opened in the middle of signing-in or syncing.
  if (Weave.Service.isLoggedIn)
    this._onLogin();

  Weave.Service.onWindowOpened();
}
WeaveWindow.prototype = {
  get _isTopBrowserWindow() {
    // TODO: This code is mostly just a workaround that ensures that only one
    // browser window ever performs any actions that are meant to only
    // be performed once in response to a weave event.  Ideally, such code
    // should not be handled by browser windows, but instead by e.g. actual
    // singleton services.
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    return (win == window);
  },

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle",
                          function() { return stringBundle; });
    return this._stringBundle;
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
         options = 'chrome, centerscreen, dialog, resizable=yes';
       ww.activeWindow.openDialog(uri, '', options, null);
     }
  },

  _openDialog: function Sync__openDialog(type, uri) {
    this._openWindow(type, uri, 'chrome,centerscreen,dialog,modal,resizable=no');
  },

  _setStatus: function Sync__setStatus(status) {
    document.getElementById("sync-menu-button").setAttribute("status", status);

    let label;
    if (status == "offline")
      label = this._stringBundle.getString("status.offline");
    else {
      if (!Weave.Service.username) {
        this._log.error("status is " + status + ", but username not set");
        // Fall back to a generic string.
        label = this._stringBundle.getString("status." + status);
      }
      else
        label = Weave.Service.username;
    }
    document.getElementById("sync-menu-status").setAttribute("value", label);
  },

  _onLoginStart: function Sync__onLoginStart() {
    this._log.info("Logging in...");
    this._setStatus("active");
  },

  _onLoginError: function Sync__onLoginError() {
    this._log.info("Login Error");
    this._setStatus("offline");

    let title = this._stringBundle.getString("error.login.title");
    let reason = this._stringBundle.getString("error.login.reason.unknown");
    let description =
      this._stringBundle.getFormattedString("error.login.description", [reason]);
    let notification = new Weave.Notification(title, description, null,
					      Weave.Notifications.PRIORITY_WARNING);
    Weave.Notifications.replaceTitle(notification);
  },

  _onLogin: function Sync__onLogin() {
    this._log.info("Login successful");
    this._setStatus("idle");

    this._userLogin = false;

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

  _onLogout: function Sync__onLogout() {
    this._setStatus("offline");

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

  _onGetPassword: function Sync_onGetPassword(identity) {
    let self = yield;
    this._log.info("getting password...");
    self.done();
  },

  _onGetPassphrase: function Sync_onGetPassphrase(identity) {
    let self = yield;
    this._log.info("getting passphrase...");
//    this._openWindow('Sync:Login', 'chrome://weave/content/login.xul');
    self.done();
  },

  _onSyncStart: function Sync_onSyncStart() {
    this._setStatus("active");

    let syncitem = document.getElementById("sync-syncnowitem");
    if(syncitem)
      syncitem.setAttribute("disabled", "true");

    let logoutitem = document.getElementById("sync-logoutitem");
    if(logoutitem)
      logoutitem.setAttribute("disabled", "true");
  },

  _onSyncEnd: function Sync_onSyncEnd(status) {
    this._setStatus("idle");

    if (!status) {
      let title = this._stringBundle.getString("error.sync.title");
      let description = this._stringBundle.getString("error.sync.description");
      let tryAgainButton =
        new Weave.NotificationButton(
          this._stringBundle.getString("error.sync.tryAgainButton.label"),
          this._stringBundle.getString("error.sync.tryAgainButton.accesskey"),
          function() { gWeaveWin.doSync(); return true; }
        );
      let notification =
        new Weave.Notification(
          title,
          description,
          null,
          Weave.Notifications.PRIORITY_WARNING,
          [tryAgainButton]
        );
      Weave.Notifications.replaceTitle(notification);
    }

    let syncitem = document.getElementById("sync-syncnowitem");
    if (syncitem)
      syncitem.setAttribute("disabled", "false");

    let logoutitem = document.getElementById("sync-logoutitem");
    if(logoutitem)
      logoutitem.setAttribute("disabled", "false");

    this._updateLastSyncItem();
  },

  shutDown: function Sync_shutDown(event) {
    this._os.removeObserver(this, "weave:service:login:start");
    this._os.removeObserver(this, "weave:service:login:success");
    this._os.removeObserver(this, "weave:service:login:error");
    this._os.removeObserver(this, "weave:service:logout:success");
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
    this._os.removeObserver(this, "weave:notification:added");
    this._os.removeObserver(this, "weave:notification:removed");
  },

  doLoginPopup : function Sync_doLoginPopup(event) {
    this._openDialog('Sync:Login', 'chrome://weave/content/login.xul');
  },

  doLogin: function Sync_doLogin(event) {
    if (Weave.Service.isLoggedIn)
      return;

    /* XXX tmp disabled for 0.3
    let username = Weave.Svc.Prefs.get("username");
    let server = Weave.Svc.Prefs.get("serverURL");
    if (false && (!username || username == 'nobody') &&
        server == 'https://services.mozilla.com/') {
      this.doOpenSetupWizard();
      return;
    }
     */

    this.doLoginPopup();
  },

  doOpenSetupWizard : function Sync_doOpenSetupWizard(event) {
      window.openDialog('chrome://weave/content/wizard.xul', '',
        'chrome,centerscreen,dialog,resizable=yes', null);
  },

  doLogout: function Sync_doLogout(event) {
    Weave.Service.logout();
  },

  doSync: function Sync_doSync(event) {
    this._openDialog('Sync:Status', 'chrome://weave/content/status.xul');
  },

  doShare: function Sync_doShare(event) {
    this._openDialog('Sync:Share', 'chrome://weave/content/share.xul');
  },

  doCancelSync: function Sync_doCancelSync(event) {
    this._log.error("cancel sync unimplemented");
  },

  doOpenPrefs: function Sync_doOpenPrefs(event) {
    try {
      openPreferences("sync-prefpane");  // firefox
    } catch (ex) {
      openOptionsDialog("sync-prefpane");  // thunderbird
    }
  },

  onOpenPrefs : function Sync_onOpenPrefs(event) {
    // XXX called when prefpane opens, setup password and login states
  },

  doOpenActivityLog: function Sync_doOpenActivityLog(event) {
    this._openWindow('Weave:Log', 'chrome://weave/content/log.xul');
  },

  doPopup: function Sync_doPopup(event) {
    this._updateLastSyncItem();
  },

  _onNotificationAdded: function Sync__onNotificationAdded() {
    document.getElementById("sync-notifications-button").hidden = false;
  },

  _onNotificationRemoved: function Sync__onNotificationRemoved() {
    if (Weave.Notifications.notifications.length == 0)
      document.getElementById("sync-notifications-button").hidden = true;
  },

  _updateLastSyncItem: function Sync__updateLastSyncItem() {
    let lastSync = Weave.Svc.Prefs.get("lastsync");
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
      this._onLogout();
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
    case "weave:notification:added":
      this._onNotificationAdded();
      break;
    case "weave:notification:removed":
      this._onNotificationRemoved();
      break;
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gWeaveWin;

window.addEventListener("load", function(e) { gWeaveWin = new WeaveWindow(); }, false);
window.addEventListener("unload", function(e) { gWeaveWin.shutDown(e); }, false);
