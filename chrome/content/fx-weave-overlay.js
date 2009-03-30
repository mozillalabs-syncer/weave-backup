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
 * The Original Code is Bookmarks sync code.
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

function FxWeaveGlue() {
  this._log = Log4Moz.repository.getLogger("Chrome.Window");
  this._log.info("Initializing Firefox Weave embedding");

  try {
    Cu.import("resource://weave/engines/bookmarks.js");
    Weave.Engines.register(new BookmarksEngine());

    Cu.import("resource://weave/engines/history.js");
    Weave.Engines.register(new HistoryEngine());

    Cu.import("resource://weave/engines/passwords.js");
    Weave.Engines.register(new PasswordEngine());

    Cu.import("resource://weave/engines/tabs.js");
    Weave.Engines.register(new TabEngine());

  } catch (e) {
    dump("Could not initialize engine: " + (e.message? e.message : e) + "\n");
    this._log.error("Could not initialize engine: " + (e.message? e.message : e));
  }

  return;
}
FxWeaveGlue.prototype = {

  doInitTabsMenu: function FxWeaveGlue__doInitTabsMenu() {
    let menu = document.getElementById("sync-tabs-menu");

    // Clear out old menu contents
    while (menu.itemCount > 1)
      menu.removeItemAt(menu.itemCount - 1);

    let faviconSvc = Cc["@mozilla.org/browser/favicon-service;1"]
      .getService(Ci.nsIFaviconService);
    let engine = Weave.Engines.get("tabs");
    if (!engine) {
      // Tab sync disabled
      return;
    }
    let remoteClients = engine.getAllClients();
    let clientId, tabId;

    for (clientId in remoteClients) {
      let remoteClient = remoteClients[clientId];
      let label = "Tabs from " + remoteClient.getClientName() + ":";
      let menuitem = menu.appendItem(label);
      menuitem.setAttribute( "disabled", true );
      let allTabs = remoteClient.getAllTabs();
      for (tabId = 0; tabId < allTabs.length; tabId++) {
        let tab = allTabs[tabId];
        // Skip tabs with empty history, e.g. just-opened tabs
        if (tab.urlHistory.length == 0) {
          continue;
        }
        let currUrl = tab.urlHistory[0];
        // Skip tabs that match an already-open URL
        if ( engine.locallyOpenTabMatchesURL(currUrl) ) {
          continue;
        }
        menuitem = menu.appendItem("  " + (tab.title? tab.title : tab.urlHistory[0]));
	/* Store index of client within clients list AND index of tab within
	 * client, separated by comma, in value of menu item, so that we
	 * can retrive the correct tab when it is chosen. */
        menuitem.value = clientId + "," + tabId;
        // Add site's favicon to menu:
        menuitem.class = "menuitem-iconic";
        menuitem.image = faviconSvc.getFaviconImageForPage(
                           Weave.Utils.makeURI(currUrl)).spec;
      }
    }
    document.getElementById("sync-no-tabs-menu-item").hidden =
      (menu.itemCount > 1);
  },

  onCommandTabsMenu: function FxWeaveGlue_onCommandTabsMenu(event) {
    let ss = Cc["@mozilla.org/browser/sessionstore;1"].
                getService(Ci.nsISessionStore);
    let js = Cc["@mozilla.org/dom/json;1"]
                 .createInstance(Ci.nsIJSON);

    /* The event.target.value is two items comma-separated: "clientId,tabId"
     * as set by doInitTabMenu above.  Read this out and use it to get
     * the tab data:
     */
    let values = event.target.value.split(",");
    let clientId = values[0];
    let tabId = values[1];
    let clients = Weave.Engines.get("tabs").getAllClients();
    let remoteClient = clients[clientId];
    let tabData = remoteClient.getAllTabs()[tabId];

    // Open the new tab:
    let urlHistory = tabData.urlHistory;
    let newTab = gBrowser.addTab(urlHistory[0]);

    /* Turn url history into a json string that we can pass to sessionStore
     * in order to restore the tab's history. */
    let json = {
      entries:[]
    };
    for (let i = urlHistory.length-1; i > -1; i--) {
      json.entries.push({url: urlHistory[i]});
    }
    ss.setTabState(newTab, js.encode(json));

    // Switch to the newly opened tab:
    gBrowser.selectedTab = newTab;

    // FIXME: update a notification that lists the opened tab, if any.
  },

  shutdown: function FxWeaveGlue__shutdown() {
  }
}

let gFxWeaveGlue;

window.addEventListener("load", function(e) { gFxWeaveGlue = new FxWeaveGlue(); }, false);
window.addEventListener("unload", function (e) { gFxWeaveGlue.shutdown(e); }, false);
