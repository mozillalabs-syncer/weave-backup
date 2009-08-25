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

  this._os.addObserver(this, "weave:service:sync:start", false);
  this._os.addObserver(this, "weave:service:sync:finish", false);
  this._os.addObserver(this, "weave:service:sync:error", false);
  Observers.add("weave:engine:sync:start", this.onEngineStart, this);
  Observers.add("weave:engine:sync:status", this.onEngineStatus, this);

  /* Generating keypairs is an expensive operation, and we should never
   have to do it on Fennec because we don't support creating a Weave
   account from Fennec (yet). */
  Weave.Service.keyGenEnabled = false;

  /* Figure out what weave's status is, and set the status message
   * appropriately:
   */
  if (this._pfs.getBoolPref("extensions.weave.enabled")) {
    this.setWeaveStatusField("fennec.logging-in");
  } else {
    this.setWeaveStatusField("fennec.turned-off");
  }

  this._setPreferenceDefaults();
  this._checkFirstRun();

  /* startup Weave service after a delay, so that it will happen after the
   * UI is loaded. */
   let self = this;
   setTimeout(function() {
     self._log.info("Timeout done, starting Weave service.\n");
     Weave.Service.onStartup();
     self.showLoginErrors();
   }, 3000);

   /* Add remote tabs tab */
   Browser.addTab("chrome://weave/content/fennec-tabs.html");
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

  get _username() {
    if (this._pfs.prefHasUserValue("extensions.weave.username")) {
      return this._pfs.getCharPref("extensions.weave.username");
    } else {
      return null;
    }
  },

  get _hasBeenConfigured() {
    /* Weave has been configured if the username, password, and passphrase
     * are all defined.
     */
    var password = Weave.Service.password;
    var passphrase = Weave.Service.passphrase;
    return (this._username && password && passphrase);
  },

  __stringBundle: null,
  _getString: function FennecWeaveGlue__getString(id) {
    if (!this.__stringBundle) {
      this.__stringBundle = document.getElementById("weaveStringBundle");
    }
    return this.__stringBundle.getString(id);
  },

  _getFormattedString: function FennecWeaveGlue__getFormatStr(id, args) {
    if (!this.__stringBundle) {
      this.__stringBundle = document.getElementById("weaveStringBundle");
    }
    return this.__stringBundle.getFormattedString(id, args);
  },

  _setPreferenceDefaults: function FennecWeaveGlue__setPrefDefaults() {
    // Some prefs need different defaults in Fennec than they have in
    // Firefox.  Set them here and they'll only apply to Fennec.
    if (!this._pfs.prefHasUserValue("extensions.weave.client.type")) {
      this._pfs.setCharPref("extensions.weave.client.type",
                            this._getString("fennec.default.client.type"));
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

  _enableButtons: function FennecWeaveGlue__enableButtons(status) {
    // enable/disable the buttons that should not be clicked while sync
    // is in progress
    let buttonIds = ["weave-on-off-button",
		     "change-account-button",
		     "sync-now-button"];
    for each (let buttonId in buttonIds) {
      let elem = document.getElementById(buttonId);
      if (elem)
	elem.setAttribute("disabled", !status);
    }
  },

  shutdown: function FennecWeaveGlue__shutdown() {
    // Anything that needs shutting down can go here.
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:finish");
    this._os.removeObserver(this, "weave:service:sync:error");
  },

  observe: function FennecWeaveGlue__observe(subject, topic, data) {
    // observe for "sync", "foo-engine:sync", and...
    // weave:service:sync:start
    // Event: weave:service:sync:finish

    switch (topic) {
      case "weave:service:sync:start":
        this.setWeaveStatusField("fennec.sync.start");
        this._enableButtons(false);
      break;
      case "weave:service:sync:finish":
        let now = new Date();
        let time = now.toLocaleTimeString();
        let date = now.toLocaleDateString();
        this.setWeaveStatusField("fennec.sync.complete.time", [time, date]);
        this._enableButtons(true);
      break;
      case "weave:service:sync:error":
        let err = Weave.Utils.getErrorString(Weave.Service.detailedStatus.sync);
        if (err) {
          this.setWeaveStatusField("fennec.sync.error.detail", [err]);
        } else {
          this.setWeaveStatusField("fennec.sync.error.generic");
	      }
        this._enableButtons(true);
      break;
    }
  },

  // TODO: we're using a different method to register these two observers
  // than to register observe() above.  Pick one method and stick with it.
  onEngineStart: function FennecWeaveGlue_onEngineStart(subject, data) {
    this.setWeaveStatusField("fennec.sync.status", [subject]);
    this._lastRunningEngine = subject;
  },

  onEngineStatus: function FennecWeaveGlue_onEngineStatus(subject, data) {
    this.setWeaveStatusField("fennec.sync.status.detail",
                             [subject, this._lastRunningEngine]);
  },

  openConnectPane: function FennecWeaveGlue__openConnectPane() {
    var password = Weave.Service.password;
    var passphrase = Weave.Service.passphrase;

    BrowserUI.switchPane("weave-detail-connect-pane");
    if (this._username)
      document.getElementById("username-input").value = this._username;
    if (password) {
      let input = document.getElementById("password-input");
      input.value = password;
      input.setAttribute("type", "password");
    }
    if (passphrase) {
      let input = document.getElementById("passphrase-input");
      input.value = passphrase;
      input.setAttribute("type", "password");
    }
  },

  openPrefsPane: function FennecWeaveGlue__openPrefsPane() {
    // this works with the prefs stuff defined in the overlay to
    // deck id="panel-items" in fennec-preferences.xul.
    BrowserUI.switchPane("weave-detail-prefs-pane");
    var theButton = document.getElementById("weave-on-off-button");
    if (this._pfs.getBoolPref("extensions.weave.enabled")) {
      theButton.label = this._getString("fennec.turn.weave.off");
    } else {
      theButton.label = this._getString("fennec.turn.weave.on");
    }

    let status = document.getElementById("username-status");
    if (status && this._username)
      status.setAttribute("desc", this._getFormattedString("fennec.username.is",
        [this._username]));
  },

  openWeavePane: function FennecWeaveGlue__openWeavePane() {
    /* Looks at whether username/password/
     * passphrase are set and uses that to determine whether setup is
     * required; opens connect pane if setup is required, prefs pane
     * if not.*/
    if (this._hasBeenConfigured) {
      this.openPrefsPane();
    } else {
      this.openConnectPane();
    }
  },

  submitConnectForm: function FennecWeaveGlue__submitConnect(errFieldId) {
    this._log.info("connection form submitted...");

    var usernameInput = document.getElementById("username-input").value;
    var passwordInput = document.getElementById("password-input").value;
    var passphraseInput = document.getElementById("passphrase-input").value;
    var errField = document.getElementById(errFieldId);
    if (usernameInput == "") {
      errField.value = this._getString("fennec.need.username");
      return;
    }
    if (passwordInput == "") {
      errField.value = this._getString("fennec.need.password");
      return;
    }
    if (passphraseInput == "") {
      errField.value = this._getString("fennec.need.passphrase");
      return;
    }

    this._turnWeaveOff();
    this._pfs.setCharPref("extensions.weave.username", usernameInput);
    Weave.Service.username = usernameInput;
    Weave.Service.password = passwordInput;
    Weave.Service.passphrase = passphraseInput;
    dump("Turning Weave on...\n");

    // redirect you to the full prefs page if login succeeds.
    if (this._turnWeaveOn())
      this.openPrefsPane();
  },

  _turnWeaveOff: function FennecWeaveGlue__turnWeaveOff() {
    this._log.info("Turning Weave off...");
    this._pfs.setBoolPref("extensions.weave.enabled", false);
    if (Weave.Service.isLoggedIn) {
      Weave.Service.logout();
    }
    this.setWeaveStatusField("fennec.turned-off");
  },

  _turnWeaveOn: function FennecWeaveGlue__turnWeaveOn() {
    this._log.info("Turning Weave on...");
    this._pfs.setBoolPref("extensions.weave.enabled", true);

    this.setWeaveStatusField("fennec.logging-in");
    if (!Weave.Service.isLoggedIn) {
      // Report on success or failure...
      if (Weave.Service.login()) {
        this.setWeaveStatusField("fennec.logged-in");
        return true;
      }

      let err = Weave.Service.detailedStatus.sync;
      // TODO do localization based on constants instead of using the bare error
      // string
      if (err)
        this.setWeaveStatusField("fennec.login.error.detail", [err]);
      else
        this.setWeaveStatusField("fennec.login.error");
    }
  },

  showLoginErrors: function FennecWeaveGlue__showLoginErrors() {
    // If weave is not logged in, set the status field to show why not.
    // If it is logged in, do nothing.
    if (!Weave.Service.isLoggedIn) {
      var pass = Weave.Service.password;
      var phrase = Weave.Service.passphrase;
      if (!pass || pass == "" || !this._username ||
	  this._username == "" || !phrase || phrase == "") {
	this.setWeaveStatusField("fennec.need.credentials");
      } else {
	// TODO display more specifics depending on what the error was
	this.setWeaveStatusField("fennec.login.error");
      }
    }
  },

  setWeaveStatusField: function FennecWeaveGlue_setStatusField(msg, args) {
    var text;
    if (args) {
      text = this._getFormattedString(msg, args);
    } else {
      text = this._getString(msg);
    }
    var elem = document.getElementById("fennec-weave-quick-status");
    if (elem) {
      elem.setAttribute("desc", text);
    }
    var elem2 = document.getElementById("fennec-weave-full-status");
    if (elem2) {
      elem2.setAttribute("title", text);
    }
    var elem3 = document.getElementById("fennec-weave-login-status");
    if (elem3) {
      elem3.value = text;
    }
  },

  toggleWeaveOnOff: function FennecWeaveGlue_toggleWeave() {
    var theButton = document.getElementById("weave-on-off-button");
    if (this._pfs.getBoolPref("extensions.weave.enabled")) {
      this._turnWeaveOff();
      theButton.label = this._getString("fennec.turn.weave.on");
    } else {
      theButton.label = this._getString("fennec.logging-in");
      theButton.enabled = false;
      if (this._turnWeaveOn()) {
        theButton.enabled = true;
        theButton.label = this._getString("fennec.turn.weave.off");
      }
    }
  },

  syncNow: function FennecWeaveGlue_syncNow() {
    if (Weave.Service.isLoggedIn) {
      if (!Weave.Service.isQuitting) {
	setTimeout(function() Weave.Service.sync(true), 0);
      } else {
	this.setWeaveStatusField("fennec.quitting");
      }
    } else {
      this.setWeaveStatusField("fennec.no.sync");
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
