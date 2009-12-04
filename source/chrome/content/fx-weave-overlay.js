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
}
FxWeaveGlue.prototype = {

  doInitTabsMenu: function FxWeaveGlue__doInitTabsMenu() {
    // Don't do anything if the tabs engine isn't ready
    if (!Weave.Engines.get("tabs"))
      return;

    this._populateTabs();
    this._refetchTabs();
  },

  _refetchTabs: function _refetchTabs() {
    // Don't bother refetching tabs if we already did so recently
    let lastFetch = Weave.Svc.Prefs.get("lastTabFetch", 0);
    let now = Math.floor(Date.now() / 1000);
    if (now - lastFetch < 30)
      return;

    // Asynchronously fetch the tabs
    setTimeout(function() {
      let engine = Weave.Engines.get("tabs");
      let lastSync = engine.lastSync;

      // Force a sync only for the tabs engine
      engine.lastModified = null;
      engine.sync();
      Weave.Svc.Prefs.set("lastTabFetch", now);

      // XXX Can't seem to force the menu to redraw ? :(
    }, 0);
  },

  _populateTabs: function _populateTabs() {
    // Lazily add the listener to show the selected item's uri
    let menu = document.getElementById("sync-tabs-menu");
    if (!menu.hasStatusListener) {
      menu.hasStatusListener = true;

      menu.addEventListener("DOMMenuItemActive", function(event) {
        XULBrowserWindow.setOverLink(event.target.weaveUrls.toString());
      }, false);
      menu.addEventListener("DOMMenuItemInactive", function() {
        XULBrowserWindow.setOverLink("");
      }, false);
    }

    // Clear out old menu contents
    while (menu.itemCount > 1)
      menu.removeItemAt(menu.itemCount - 1);

    let engine = Weave.Engines.get("tabs");
    let localTabs = engine._store.getAllTabs();
    for (let [guid, client] in Iterator(engine.getAllClients())) {
      // Remember if we need to append the client name
      let appendClient = true;
      let pageUrls = [];

      client.tabs.forEach(function({title, urlHistory, icon}) {
        // Skip tabs that are already open
        let pageUrl = urlHistory[0];
        if (localTabs.some(function(tab) tab.urlHistory[0] == pageUrl))
          return;

        // Add the client once and point it to the array of urls to open
        if (appendClient) {
          appendClient = false;
          let item = menu.appendItem(client.clientName);
          item.className = "menuitem-iconic";
          item.style.listStyleImage = "url(chrome://weave/skin/tab.png)";
          item.weaveUrls = pageUrls;
        }

        let iconUrl = Weave.Utils.getIcon(icon, "chrome://weave/skin/tab.png");
        title = title == "" ? pageUrl : title;

        // Add a menuitem that knows what url to open
        let item = menu.appendItem("   " + title);
        item.className = "menuitem-iconic";
        item.style.listStyleImage = "url(" + iconUrl + ")";
        item.weaveUrls = [pageUrl];

        // Add this to the list of urls to open for the client name
        pageUrls.push(pageUrl);
      });
    }

    // Show/hide the "no tabs available" if necessary
    document.getElementById("sync-no-tabs-menu-item").hidden =
      (menu.itemCount > 1);
  },

  onCommandTabsMenu: function FxWeaveGlue_onCommandTabsMenu(event) {
    // Open each url in its own tab
    let lastTab;
    event.target.weaveUrls.forEach(function(url) {
      lastTab = openUILinkIn(url, "tab")
    });

    // Switch to the last opened tab
    gBrowser.selectedTab = lastTab;
  },

  shutdown: function FxWeaveGlue__shutdown() {
  }
}

let gFxWeaveGlue;

window.addEventListener("load", function(e) { gFxWeaveGlue = new FxWeaveGlue(); }, false);
window.addEventListener("unload", function (e) { gFxWeaveGlue.shutdown(e); }, false);
