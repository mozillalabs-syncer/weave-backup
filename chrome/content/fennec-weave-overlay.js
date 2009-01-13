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
  //this._pfs.addObserver("", this, false);
  this._os.addObserver(this, "weave:service:sync:start", false);
  this._os.addObserver(this, "weave:service:sync:success", false);
  this._os.addObserver(this, "weave:service:sync:error", false);

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

  /* Figure out what weave's status is, and set the status message
   * appropriately:
   */
  if (this._pfs.getBoolPref("extensions.weave.enabled")) {
    this.setWeaveStatusField("Weave is trying to log in...");
  } else {
    this.setWeaveStatusField("Weave is turned off.");
  }

  // startup Weave service after a delay, so that it will happen after the
  // UI is loaded.
  let self = this;
  setTimeout( function() {
		self._log.info("Timeout done, starting Weave service.\n");
		Weave.Service.onStartup();
	      }, 3000);
  // TODO: after onStartup succeeds or fails, set the status field to
  // "logged in", "errored", or "needs info from you".

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

  _passwordsHidden: false,

  shutdown: function FennecWeaveGlue__shutdown() {
    // Anything that needs shutting down can go here.
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
  },

  observe: function FennecWeaveGlue__observe(subject, topic, data) {
    // observe for "sync", "foo-engine:sync", and...
    // weave:service:sync:start
    // Event: weave:service:sync:success

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
      case "weave:service:sync:start":
	this.setWeaveStatusField("Syncing Now!");
      break;
      case "weave:service:sync:success":
	this.setWeaveStatusField("Sync completed successfully!");
      break;
      case "weave:service:sync:success":
	this.setWeaveStatusField("Hit an error while syncing!");
      break;
    }
  },

  showHidePasswordFields: function FennecWeaveGlue__showHidePassFields() {
    var passwordField = document.getElementById("password-input");
    var passphraseField = document.getElementById("passphrase-input");
    var lockIcon = document.getElementById("hide-password-button");

    this._passwordsHidden = !this._passwordsHidden;
    if (this._passwordsHidden) {
      passwordField.type = "password";
      passphraseField.type = "password";
      lockIcon.src="chrome://weave/skin/lock-closed.png";
    } else {
      passwordField.type = "";
      passphraseField.type = "";
      lockIcon.src="chrome://weave/skin/lock-open.png";
    }
  },

  openPrefs: function FennecWeaveGlue__openPrefs() {
    /* See richpref.xml ( an XBL document) for the semantics of the
     richpref tags in browser.xul, and browser.css to see how this
     definition is associated with the tags.  One approach would be
     to define a richpref-text to go along with the others (there
     is currently no richpref-text) and then use that for all the
     fields we need. */

    //try BrowserUI.show() and BrowserUI.switchPane() and BrowserUI.goToURI

    // this works with the prefs stuff defined in the overlay to
    // deck id="panel-items" in fennec-preferences.xul.
    // Let's move all of the js to here

    var username = this._pfs.getCharPref("extensions.weave.username");
    var password = Weave.Service.password;
    var passphrase = Weave.Service.passphrase;

    BrowserUI.switchPane("weave-detail-connect-pane");
    if (username && username != "nobody") {
      document.getElementById("username-input").value = username;
    } else {
      document.getElementById("username-input").value = "Your Username Here";
    }
    if (password) {
      document.getElementById("password-input").value = password;
    } else {
      document.getElementById("password-input").value = "Your Password Here";
    }
    if (passphrase) {
      document.getElementById("passphrase-input").value = passphrase;
    } else {
      document.getElementById("passphrase-input").value = "Your Passphrase Here";
    }


    // or weave-detail-prefs-pane

    /*var serverUrl = this._pfs.getCharPref("extensions.weave.serverURL");

    if (username && password && passphrase && username != "nobody") {
      Browser.currentBrowser.loadURI("chrome://weave/content/fennec-prefs.html");
    } else {
      Browser.currentBrowser.loadURI("chrome://weave/content/fennec-connect.html");
    }*/

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

  submitConnectForm: function FennecWeaveGlue__submitConnect(errFieldId) {
    this._log.info("connection form submitted...");

    var usernameInput = document.getElementById("username-input").value;
    var passwordInput = document.getElementById("password-input").value;
    var passphraseInput = document.getElementById("passphrase-input").value;
    var errField = document.getElementById(errFieldId);
    if (usernameInput == "") {
      errField.value = "You must enter a Weave username.";
      return;
    }
    if (passwordInput == "") {
      errField.value = "You must enter a Weave password.";
      return;
    }
    if (passphraseInput == "") {
      errField.value = "You must enter a Weave passphrase.";
      return;
    }

    errField.innerHTML = "Logging you in...";

    if (Weave.Service.isLoggedIn)
      Weave.Service.logout();

    this._pfs.setCharPref("extensions.weave.username", usernameInput);
    Weave.Service.password = passwordInput;
    Weave.Service.passphrase = passphraseInput;

    Weave.Service.login( function(success) {
                         if (success) {
                           errField.value = "Login Succeeded!";
			   // TODO and then redirect to the prefs...
                         } else {
                           errField.value = "Login Failed!  Double-check your username and password.";
                         }
                       });
  },

  _turnWeaveOff: function FennecWeaveGlue__turnWeaveOff() {
    this._log.info("Turning Weave off...");
    if (Weave.Service.isLoggedIn) {
      Weave.Service.logout();
    }
    this.setWeaveStatusField("Weave is turned off.");
  },

  _turnWeaveOn: function FennecWeaveGlue__turnWeaveOn() {
    this._log.info("Turning Weave on...");
    var log = this._log;
    var setStatus = this.setWeaveStatusField;
    if (!Weave.Service.isLoggedIn) {
      try {
	// Report on success or failure...
        Weave.Service.login( function(success) {
			       if (success)
				 setStatus("Weave is logged in.");
			       else
				 setStatus("Weave had an error when trying to log in.");
			     } );
      } catch(e) {
	log.warn("Exception caught when logging in: " + e);
	setStatus("Weave had an error when trying to log in.");
      }

    }
  },

  selectField: function FennecWeaveGlue__selectField(id) {
    var field = document.getElementById(id);
    field.focus();
    field.select();
  },

  setWeaveStatusField: function FennecWeaveGlue__setWeaveStatusField(text) {
    var elem = document.getElementById("fennec-weave-quick-status");
    if (elem) {
      elem.value = text;
    }
  }

};

let gFennecWeaveGlue;
window.addEventListener("load", function(e) {
			  gFennecWeaveGlue = new FennecWeaveGlue();
			}, false );
window.addEventListener("unload", function(e) {
			  gFennecWeaveGlue.shutdown(e);
			}, false );