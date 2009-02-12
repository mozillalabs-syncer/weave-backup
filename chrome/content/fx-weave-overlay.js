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

  this._os.addObserver(this, "weave:service:tabs-engine:sync:success", false);

  try {
    Cu.import("resource://weave/engines/bookmarks.js");
    Weave.Engines.register(new BookmarksEngine());

    Cu.import("resource://weave/engines/history.js");
    Weave.Engines.register(new HistoryEngine());

    Cu.reportError("Initializing tab engine now.");
    dump("INITIALIZING TAB ENGINE NOW.\n");
    Cu.import("resource://weave/engines/tabs.js");
    Weave.Engines.register(new TabEngine());
    Cu.reportError("SUCCEED.");
  } catch (e) {
    Cu.reportError("FAIL.");
    dump("Could not initialize engine: " + (e.message? e.message : e) + "\n");
    this._log.error("Could not initialize engine: " + (e.message? e.message : e));
  }

  // Display a tabs notification if there are any virtual tabs.
  // FIXME this won't do anything, because virtualTabs get loaded
  //this._onVirtualTabsChanged();

  return;
}
FxWeaveGlue.prototype = {
  _log: null,

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
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
/*
  // FIXME: refactor this function with the identical one in notification.xml.
  _getVirtualTabs: function FxWeaveGlue__getVirtualTabs() {
    let virtualTabs = Weave.Engines.get("tabs").virtualTabs;

    // Convert the hash of virtual tabs indexed by ID into an array
    // of virtual tabs whose ID is stored in an ID property.
    virtualTabs = [tab for each (tab in virtualTabs)];
    for (let i = 0; i < virtualTabs.length; i++)
      virtualTabs[i].id = i;

    // Sort virtual tabs by their position in their windows.
    // Note: we don't actually group by window first, so all first tabs
    // will appear first in the list, followed by all second tabs, and so on.
    // FIXME: group by window, even though we aren't opening them up that way,
    // so the list better resembles the pattern the user remembers.
    virtualTabs.sort(function(a, b) a.position > b.position ?  1 :
                                    a.position < b.position ? -1 : 0);

    return virtualTabs;
  },
*/

  doInitTabsMenu: function FxWeaveGlue__doInitTabsMenu() {
    let menu = document.getElementById("sync-tabs-menu");
    // virtual tabs no longer exist.
    //let virtualTabs = this._getVirtualTabs();

    // Clear out old menu contents
    while (menu.itemCount > 1)
      menu.removeItemAt(menu.itemCount - 1);

    dump("INITING TABS MENU.\n");
    let remoteClients = Weave.Engines.get("tabs").getAllClients();
    for each (remoteClient in remoteClients)  {
      let label = "Tabs from " + remoteClient.getClientName() + ":";
      let menuitem = menu.appendItem(label);
      menuitem.setAttribute( "disabled", true );
      let allTabs = remoteClient.getAllTabs();
      dump("There are " + allTabs.length + " tabs in this record.\n");
      for each (let tab in allTabs) {
	/* Note we're just sticking the last URL into the value of the
	 menu item; this is a limited approach that won't work when we
	 want to restore a whole urlHistory, so we'll need to assign some
	 id scheme to the tabs across all the remoteClients, then put IDs
	 into the menu values, then retrieve the record based on the ID.*/
	let url = tab.urlHistory[ tab.urlHistory.length -1 ];
	dump("Setting url to " + url + "\n");
	menuitem = menu.appendItem("  " + tab.title, url);
	menuitem.value = [url, "foo"];
      }
    }

      /*
    for each (let virtualTab in virtualTabs) {
      let currentEntry = virtualTab.state.entries[virtualTab.state.index - 1];
      if (!currentEntry)
        continue;
      let label = currentEntry.title ? currentEntry.title : currentEntry.url;
      let menuitem = menu.appendItem(label, virtualTab.id);
      menuitem.label = label;
      menuitem.value = virtualTab.id;

      // Make a tooltip that contains either or both of the title and URL.
      menuitem.tooltipText =
        [currentEntry.title, currentEntry.url].filter(function(v) v).join("\n");
    }*/

    document.getElementById("sync-no-tabs-menu-item").hidden =
      (menu.itemCount > 1);
  },

  onCommandTabsMenu: function FxWeaveGlue_onCommandTabsMenu(event) {
    /*let tabID = event.target.value;
    let virtualTabs = this._getVirtualTabs();
    let virtualTab = virtualTabs[tabID];
    let tab = gBrowser.addTab("about:blank");
    this._sessionStore.setTabState(tab, this._json.encode(virtualTab.state));*/
    dump("Event.target.value is " + event.target.value + "\n");
    let tab = gBrowser.addTab(event.target.value[0]);
    gBrowser.selectedTab = tab;
    //delete virtualTabs[tabID];

    // FIXME: update a notification that lists the opened tab, if any.
  },

  /*
  _onVirtualTabsChanged: function Sync__onVirtualTabsChanged() {
    let virtualTabs = this._getVirtualTabs();

    // Get the (first, which should also be the only) notification, if any.
    let [existingNotification] =
      Weave.Notifications.notifications.
      filter(function(v) v.constructor.name == "TabsNotification");

    // As long as there is at least one virtual tab that hasn't previously been
    // disposed of by the user, notify the user about available tabs.
    for each (let virtualTab in virtualTabs) {
      if (!virtualTab._disposed) {
        // If there's an existing tabs notification, update it.
        // FIXME: make tabs notifications automatically update themselves.
        let newNotification = new Weave.TabsNotification();
        if (existingNotification)
          Weave.Notifications.replace(existingNotification, newNotification);
        else
          Weave.Notifications.add(newNotification);

        return;
      }
    }

    // If we've gotten this far, it means there are no tabs left to notify
    // the user about, so remove the existing notification, if any.
    if (existingNotification)
      Weave.Notifications.remove(existingNotification);
  },
*/
  // nsIObserver
  observe: function FxWeaveGlue__observe(subject, topic, data) {
    switch(topic) {
    case "weave:service:tabs-engine:sync:success":
      //this._onVirtualTabsChanged();
      break;
    default:
      break;
    }
  },

  shutdown: function FxWeaveGlue__shutdown() {
    this._os.removeObserver(this, "weave:service:tabs-engine:sync:success");
  }
}

let gFxWeaveGlue;

window.addEventListener("load", function(e) { gFxWeaveGlue = new FxWeaveGlue(); }, false);
window.addEventListener("unload", function (e) { gFxWeaveGlue.shutdown(e); }, false);
