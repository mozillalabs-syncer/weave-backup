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
 *  Jono DiCarlo <jdicarlo@mozilla.com>
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

let WeaveGlue = {
  init: function init() {
    this._handlePrefs();

    // Generating keypairs is expensive on mobile, so disable it
    Weave.Service.keyGenEnabled = false;
    Weave.Service.onStartup();
  },

  openRemoteTabs: function openRemoteTabs() {
    this._openTab("chrome://weave/content/fennec-tabs.html");
  },

  _openTab: function _openTab(url) {
    Browser.addTab(url, true);
  },

  _handlePrefs: function _handlePrefs() {
    // Some prefs have different defaults on mobile than desktop, so set them
    if (!Weave.Svc.Prefs.isSet("client.type"))
      Weave.Svc.Prefs.set("client.type", "mobile");

    // Open a tab if we're running for the first time or upgrading versions
    let version = Weave.WEAVE_VERSION;
    let lastVersion = Weave.Svc.Prefs.get("lastversion");
    if (lastVersion != version) {
      let url = "about:weave";
      if (lastVersion != "firstrun")
        url = "https://services.mozilla.com/updated/?version=" + version;

      setTimeout(this._openTab, 500, url);
      Weave.Svc.Prefs.set("lastversion", version);
    }
  }
};

window.addEventListener("load", function() WeaveGlue.init(), false);
