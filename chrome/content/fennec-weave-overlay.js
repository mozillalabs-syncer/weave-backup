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
  // Yes, Log4Moz works fine on fennec.
  this._log = Log4Moz.repository.getLogger("Chrome.Window");
  this._pfs.addObserver("", this, false);

  try {
    Cu.import("resource://weave/engines/bookmarks.js");
    Cu.import("resource://weave/engines/history.js");
    Cu.import("resource://weave/engines/forms.js");
    /*Cu.import("resource://weave/engines/passwords.js");
    Cu.import("resource://weave/engines/cookies.js");
    Cu.import("resource://weave/engines/input.js");
    Cu.import("resource://weave/engines/tabs.js");*/

    Weave.Engines.register(new HistoryEngine());
    Weave.Engines.register(new BookmarksEngine());
    Weave.Engines.register(new FormEngine());
    /*Weave.Engines.register(new PasswordEngine());
    Weave.Engines.register(new CookieEngine());
    Weave.Engines.register(new InputEngine());
    Weave.Engines.register(new TabEngine());*/
  } catch (e) {
    dump("Could not initialize engine!\n");
    this._log.error("Could not initialize engine: " + (e.message? e.message : e));
  }

  /* Generating keypairs is an expensive operation, and we should never
   have to do it on Fennec because we don't support creating a Weave account
   from Fennec (yet). */
  Weave.Service.keyGenEnabled = false;

  // startup Weave service after a delay, so that it will happen after the
  // UI is loaded.
  let self = this;
  setTimeout( function() {
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

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  shutdown: function FennecWeaveGlue__shutdown() {
    // Anything that needs shutting down can go here.
  },

  observe: function FennecWeaveGlue__observe(subject, topic, data) {
    switch (topic) {
      case "nsPref:changed":
        switch (data) {
          case "extensions.weave.enabled":
	  if (this._pfs.getBoolPref("extensions.weave.enabled")) {
	    this._turnWeaveOn();
	  } else {
	    this._turnWeaveOff();
	  }
            break;
        }
        break;
    }
  },

  openPrefs: function FennecWeaveGlue__openPrefs() {
    //try BrowserUI.show() and BrowserUI.switchPane() and BrowserUI.goToURI
    //BrowserUI.switchPane("weave-detail-prefs-pane");
    // overlay #panel-items with #weave-detail-prefs-pane.
    //  <deck id="panel-items" flex="1" selectedIndex="2">

    var serverUrl = this._pfs.getCharPref("extensions.weave.serverURL");
    var username = this._pfs.getCharPref("extensions.weave.username");
    var password = Weave.Service.password;
    var passphrase = Weave.Service.passphrase;

    if (username && password && passphrase && username != "nobody") {
      Browser.currentBrowser.loadURI("chrome://weave/content/fennec-prefs.html");
    } else {
      Browser.currentBrowser.loadURI("chrome://weave/content/fennec-connect.html");
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
  },

  onSignupComplete: function FennecWeaveGlue__onSignupComplete(callback) {
    this._log.info("onSignupComplete called.");
    this._turnWeaveOff();
    // turnWeaveOff completes immediately and doesn't do any
    // asynchronous trickery.
    this._turnWeaveOn();
  },

  _turnWeaveOff: function FennecWeaveGlue__turnWeaveOff() {
    this._log.info("Turning Weave off...");
    if (Weave.Service.isLoggedIn) {
      Weave.Service.logout();
    }
  },

  _turnWeaveOn: function FennecWeaveGlue__turnWeaveOn() {
    this._log.info("Turning Weave on...");
    var log = this._log;
    if (!Weave.Service.isLoggedIn) {
      try {
	// Report on success or failure...
        Weave.Service.login( function(success) {
			       // TODO make success or failure user-visible
			       log.info("Weave login callback called with x=");
			       log.info(success);
			     } );
      } catch(e) {
	log.info("Exception caught when calling Weave.Service.login:");
	log.info(e);
      }

    }
  },

  getWeaveStatus: function FennecWeaveGlue__getWeaveStatus() {
    //TODO implement this.
  }
};

let gFennecWeaveGlue;
window.addEventListener("load", function(e) {
			  gFennecWeaveGlue = new FennecWeaveGlue();
			}, false );
window.addEventListener("unload", function(e) {
			  gFennecWeaveGlue.shutdown(e);
			}, false );