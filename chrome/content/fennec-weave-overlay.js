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

function FennecWeaveGlue() {
  // Yes, Log4Moz works fine on fennec.
  this._log = Log4Moz.repository.getLogger("Chrome.Window");
  this._log.info("Initializing Fennec Weave embedding");

  /* By this point, if we have the login info set correctly,
   the Weave Service should already have logged in to the server. */
  try {
    // TODO Use the preferences to decide which engines to
    // initialize.
    Cu.import("resource://weave/engines/bookmarks.js");
    Cu.import("resource://weave/engines/history.js");

    Weave.Engines.register(new HistoryEngine());
    Weave.Engines.register(new BookmarksEngine());
  } catch (e) {
    this._log.error("Could not initialize engine: " + (e.message? e.message : e));
  }

}
FennecWeaveGlue.prototype = {
  shutdown: function FennecWeaveGlue__shutdown() {
    // Anything that needs shutting down can go here.
  },


  openPrefs: function FennecWeaveGlue__openPrefs() {
    var prefService = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefBranch);
    var serverUrl = prefService.getCharPref("extensions.weave.serverURL");
    this._log.debug("Server URL is " + serverUrl);
    var username = prefService.getCharPref("extensions.weave.username");
    this._log.debug("Username is " + username);
    var password = Weave.Service.password;
    this._log.debug("Password is " + password);
    var passphrase = Weave.Service.passphrase;
    this._log.debug("Passphrase is " + passphrase);

    if (username && password && passphrase && username != "nobody") {
      Browser.currentBrowser.loadURI("chrome://weave/content/fennec-prefs.html");
    } else {
      Browser.currentBrowser.loadURI("chrome://weave/content/fennec-connect.html");
      // TODO ideally, it would log you in after you're done filling out the
      // connect page.
    }

   /* This gets an error like:
    Error: uncaught exception: [Exception... "Component returned failure code: 0x80070057 (NS_ERROR_ILLEGAL_VALUE) [nsIIOService.newURI]"  nsresult: "0x80070057 (NS_ERROR_ILLEGAL_VALUE)"  location: "JS frame :: chrome://browser/content/browser-ui.js :: anonymous :: line 155"  data: no]
    Possibly because 'weave' isn't a registered chrome package. */

    /*Also: defaults for prefs being different on fennec than on ffox?
       E.G. rememberpassword default to true, syncOnQuit default to false
       (but syncOnStart default to true...)  Pref defaults can be set
     programmatically (not affecting the actual current setting)
     with something like:
     defaults = this._prefSvc.getDefaultBranch(null);
     defaults.setCharPref(name, val);*/
  }
};


let gFennecWeaveGlue;
window.addEventListener("load", function(e) {
			  gFennecWeaveGlue = new FennecWeaveGlue();
			}, false );
window.addEventListener("unload", function(e) {
			  gFennecWeaveGlue.shutdown(e);
			}, false );