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

const EXPORTED_SYMBOLS = ['gFennecWeaveGlue'];

function FennecWeaveGlue() {
  Cu.import("resource://weave/util.js");

  this._log = Log4Moz.repository.getLogger("Chrome.Window");

  /* Generating keypairs is an expensive operation, and we should never
   have to do it on Fennec because we don't support creating a Weave
   account from Fennec (yet). */
  Weave.Service.keyGenEnabled = false;

  this._setPreferenceDefaults();
  this._checkFirstRun();

  /* startup Weave service after a delay, so that it will happen after the
   * UI is loaded. */
   let self = this;
   setTimeout(function() {
     self._log.info("Timeout done, starting Weave service.\n");
     Weave.Service.onStartup();
   }, 3000);
}
FennecWeaveGlue.prototype = {
  __prefService: null,
  get _pfs() {
    if (!this.__prefService) {
      this.__prefService = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefBranch);
    }
    return this.__prefService;
  },

  _setPreferenceDefaults: function FennecWeaveGlue__setPrefDefaults() {
    // Some prefs need different defaults in Fennec than they have in
    // Firefox.  Set them here and they'll only apply to Fennec.
    if (!this._pfs.prefHasUserValue("extensions.weave.client.type")) {
      this._pfs.setCharPref("extensions.weave.client.type", "mobile");
    }
  },

  _checkFirstRun: function FennecWeaveGlue__checkFirstRun() {
    let url;
    let lastVersion = this._pfs.getCharPref("extensions.weave.lastversion");
    if (lastVersion != Weave.WEAVE_VERSION) {
      if (lastVersion == "firstrun")
	url = "about:weave";
      else
	url = "http://services.mozilla.com/updated/?version=" +
	Weave.WEAVE_VERSION;

      setTimeout(function() { Browser.addTab(url, true); }, 500);
      this._pfs.setCharPref("extensions.weave.lastversion",
			    Weave.WEAVE_VERSION);
    }
  },

  openRemoteTabs: function openRemoteTabs() {
    Browser.addTab("chrome://weave/content/fennec-tabs.html", true);
  },

  shutdown: function FennecWeaveGlue__shutdown() {
  }
};

let gFennecWeaveGlue;
window.addEventListener("load", function(e) {
			  gFennecWeaveGlue = new FennecWeaveGlue();
			}, false );
window.addEventListener("unload", function(e) {
			  gFennecWeaveGlue.shutdown(e);
			}, false );
