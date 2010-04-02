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
  setTimeout(this.init, 0);
}
FxWeaveGlue.prototype = {
  WEAVE_TABS_URL: "about:weave-tabs",

  init: function () {
    let popup = document.getElementById("goPopup");
    popup.addEventListener("popupshowing", gFxWeaveGlue, true);

    if (!gBrowser)
      return;

    popup = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", "alltabs-popup");
    popup.addEventListener("popupshowing", gFxWeaveGlue, true);
    popup.addEventListener("popuphiding",  gFxWeaveGlue, true);
  },

  getStr: function (str, args) {
    return Weave.Str.sync.get(str, args);
  },

  insertTabsUI: function () {
    if (!Weave.Service.isLoggedIn || !Weave.Engines.get("tabs").enabled)
      return;

    let popup = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", "alltabs-popup");
    let menuitem = document.createElement("menuitem");
    menuitem.setAttribute("anonid", "sync-tabs-menuitem");
    menuitem.setAttribute("label", this.getStr("tabs.fromOtherComputers.label"));
    menuitem.setAttribute("class", "menuitem-iconic alltabs-item");
    menuitem.setAttribute("image", "chrome://weave/skin/sync-16x16.png");
    menuitem.setAttribute("oncommand", "gFxWeaveGlue.openTabsPage();");

    let sep = document.createElement("menuseparator");
    sep.setAttribute("anonid", "sync-tabs-sep");
    popup.insertBefore(sep, popup.firstChild);
    popup.insertBefore(menuitem, sep);
  },

  removeTabsUI: function () {
    // we need to do this manually because the tabbrowser cleanup chokes here
    let popup = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", "alltabs-popup");
    let sep = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", "sync-tabs-sep");
    if (sep)
      popup.removeChild(sep);

    let menuitem = document.getAnonymousElementByAttribute(gBrowser.mTabContainer, "anonid", "sync-tabs-menuitem");
    if (menuitem)
      popup.removeChild(menuitem);
  },

  handleEvent: function (event) {
    switch (event.type) {
      case "popupshowing":
        if (event.target.id == "goPopup") {
          let enabled = Weave.Service.isLoggedIn &&
                        Weave.Engines.get("tabs").enabled;
          document.getElementById("sync-tabs-menuitem").hidden = !enabled;
        }
        else if (this.getPageIndex() == -1)
          this.insertTabsUI();
        break;
      case "popuphiding":
        this.removeTabsUI();
        break;
    }
  },

  getPageIndex: function () {
    let tabs = gBrowser.mTabs;
    let uri = Weave.Utils.makeURI(this.WEAVE_TABS_URL);
    for (let i = 0;i < tabs.length;i++) {
      if (gBrowser.getBrowserForTab(tabs[i]).currentURI.equals(uri))
        return i;
    }
    return -1;
  },

  openTabsPage: function () {
    if (gBrowser) {
      let i = this.getPageIndex();
      if (i != -1) {
        gBrowser.selectTabAtIndex(i);
        return;
      }
      gBrowser.loadOneTab(this.WEAVE_TABS_URL, null, null, null, false);
    }
    else { // not in a browser window
      let win = getTopWin();
      if (win) {
        win.gFxWeaveGlue.openTabsPage();
        win.focus();
      }
      else {
        window.openDialog("chrome://browser/content/", "_blank",
                          "chrome,all,dialog=no", this.WEAVE_TABS_URL);

      }
    }
  },

  shutdown: function FxWeaveGlue__shutdown() {
  }
}

let gFxWeaveGlue;

window.addEventListener("load", function(e) { gFxWeaveGlue = new FxWeaveGlue(); }, false);
window.addEventListener("unload", function (e) { gFxWeaveGlue.shutdown(e); }, false);
