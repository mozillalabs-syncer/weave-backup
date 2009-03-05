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
  this._log = Log4Moz.repository.getLogger("Chrome.Window");
  this._os.addObserver(this, "weave:service:sync:start", false);
  this._os.addObserver(this, "weave:service:sync:finish", false);
  this._os.addObserver(this, "weave:service:sync:error", false);

  try {
    Cu.import("resource://weave/util.js");

    Cu.import("resource://weave/engines/bookmarks.js");
    Weave.Engines.register(new BookmarksEngine());

    Cu.import("resource://weave/engines/history.js");
    Weave.Engines.register(new HistoryEngine());

    Cu.import("resource://weave/engines/tabs.js");
    Weave.Engines.register(new TabEngine());

    Cu.import("resource://weave/engines/passwords.js");
    Weave.Engines.register(new PasswordEngine());

  } catch (e) {
    dump("Could not initialize engine!\n");
    dump("The error is: " + (e.message? e.message: e) + "\n");
    this._log.error("Could not initialize engine: " + (e.message? e.message : e));
  }

  /* Generating keypairs is an expensive operation, and we should never
   have to do it on Fennec because we don't support creating a Weave
   account from Fennec (yet). */
  Weave.Service.keyGenEnabled = false;

  /* Figure out what weave's status is, and set the status message
   * appropriately:
   */
  if (this._pfs.getBoolPref("extensions.weave.enabled")) {
    this.setWeaveStatusField("Weave is trying to log in...");
  } else {
    this.setWeaveStatusField("Weave is turned off.");
  }

  this._setPreferenceDefaults();

  /* startup Weave service after a delay, so that it will happen after the
   * UI is loaded. */
   let self = this;
   setTimeout( function() {
	         self._log.info("Timeout done, starting Weave service.\n");
		 Weave.Service.onStartup( function() {
					    self.showLoginStatus();
					  });
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

  _passwordsHidden: false,

  get _username() {
    if (this._pfs.prefHasUserValue("extensions.weave.username")) {
      return this._pfs.getCharPref("extensions.weave.username");
    } else {
      return null;
    }
  },

  _setPreferenceDefaults: function FennecWeaveGlue__setPrefDefaults() {
    // Some prefs need different defaults in Fennec than they have in
    // Firefox.  Set them here and they'll only apply to Fennec.
    if (!this._pfs.prefHasUserValue("extensions.weave.client.name")) {
      this._pfs.setCharPref("extensions.weave.client.name", "Fennec");
    }
    if (!this._pfs.prefHasUserValue("extensions.weave.client.type")) {
      this._pfs.setCharPref("extensions.weave.client.type", "Mobile");
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
	this.setWeaveStatusField("Syncing Now...");
      break;
      case "weave:service:sync:finish":
	this.setWeaveStatusField("Sync completed successfully!");
      break;
      case "weave:service:sync:error":
        let err = Weave.Service.mostRecentError;
        if (err)
          this.setWeaveStatusField("Login error: " + err);
        else
          this.setWeaveStatusField("Weave had an error when trying to sync.");
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

  openConnectPane: function FennecWeaveGlue__openConnectPane() {
    var password = Weave.Service.password;
    var passphrase = Weave.Service.passphrase;

    BrowserUI.switchPane("weave-detail-connect-pane");
    if (this._username) {
      document.getElementById("username-input").value = this._username;
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
  },

  openPrefsPane: function FennecWeaveGlue__openPrefsPane() {
    // this works with the prefs stuff defined in the overlay to
    // deck id="panel-items" in fennec-preferences.xul.
    BrowserUI.switchPane("weave-detail-prefs-pane");
    var theButton = document.getElementById("weave-on-off-button");
    if (this._pfs.getBoolPref("extensions.weave.enabled")) {
      theButton.label = "Turn Weave Off";
    } else {
      theButton.label = "Turn Weave On";
    }
    var usernameLabel =  document.getElementById("username-label");
    if (this._username) {
      usernameLabel.value = "You are user: " + this._username;
    } else {
      usernameLabel.value = "No username set."; // can't happen?
    }
  },

  openWeavePane: function FennecWeaveGlue__openWeavePane() {
    /* Looks at whether username/password/
     * passphrase are set and uses that to determine whether setup is
     * required; opens connect pane if setup is required, prefs pane
     * if not.*/
    var password = Weave.Service.password;
    var passphrase = Weave.Service.passphrase;
    if ( this._username && password && passphrase ) {
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

    this._turnWeaveOff();
    this._pfs.setCharPref("extensions.weave.username", usernameInput);
    Weave.Service.password = passwordInput;
    Weave.Service.passphrase = passphraseInput;

    dump("Turning Weave on...\n");
    // redirect you to the full prefs page if login succeeds.
    var self = this;
    this._turnWeaveOn( function() {
			 self.openPrefsPane();
		       });
  },

  _turnWeaveOff: function FennecWeaveGlue__turnWeaveOff() {
    this._log.info("Turning Weave off...");
    this._pfs.setBoolPref("extensions.weave.enabled", false);
    if (Weave.Service.isLoggedIn) {
      Weave.Service.logout();
    }
    this.setWeaveStatusField("Weave is turned off.");
  },

  _turnWeaveOn: function FennecWeaveGlue__turnWeaveOn( onSuccess ) {
    // TODO there are times when this runs and nothing happens.  We get:
    // Chrome.Window INFO Turning Weave on...
    // and then nothing.  It hangs there displaying the "logging in" message.
    // Clicking it off and back on again fixes it.
    // I wonder if that's because Weave.Service.isLoggedIn is already true
    // for some reason, and therefore the other stuff never runs??

    // onSuccess is an optional callback function that gets called
    // when login completes successfully.
    this._log.info("Turning Weave on...");
    this._pfs.setBoolPref("extensions.weave.enabled", true);
    var log = this._log;
    var setStatus = this.setWeaveStatusField;
    setStatus("Weave is logging in...");
    if (!Weave.Service.isLoggedIn) {
      // Report on success or failure...
      Weave.Service.login( function(success) {
                             if (success) {
			       setStatus("Weave is logged in.");
                               if (onSuccess) {
                                 onSuccess();
                               }
                             } else {
                               let err = Weave.Service.mostRecentError;
                               if (err)
				 setStatus("Login error: " + err);
			       else
				 setStatus("Weave had an error when trying to log in.");
			     }
			   });
    }
  },

  selectField: function FennecWeaveGlue__selectField(id) {
    var field = document.getElementById(id);
    field.focus();
    field.select();
  },

  showLoginStatus: function FennecWeaveGlue__updateStatusMessage() {
    if (Weave.Service.isLoggedIn) {
      this.setWeaveStatusField("Weave is logged in and idle.");
    } else {
      // Not logged in?  Why not?
      var pass = Weave.Service.password;
      var phrase = Weave.Service.passphrase;
      if (!pass || pass == "" || !this._username ||
	  this._username == "" || !phrase || phrase == "") {
	this.setWeaveStatusField("Weave needs more info from you to get started.");
      } else {
	// TODO display more specifics depending on what the error was
	this.setWeaveStatusField("Weave encountered an error when trying to log you in.");
      }
    }
  },

  setWeaveStatusField: function FennecWeaveGlue__setWeaveStatusField(text) {
    var elem = document.getElementById("fennec-weave-quick-status");
    if (elem) {
      elem.value = text;
    }
    var elem2 = document.getElementById("fennec-weave-full-status");
    if (elem2) {
      elem2.value = text;
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
      theButton.label = "Turn Weave On";
    } else {
      theButton.label = "Turning Weave On...";
      theButton.enabled = false;
      this._turnWeaveOn( function() {
			   theButton.enabled = true;
			   theButton.label = "Turn Weave Off";
			 });
    }
  },

  syncNow: function FennecWeaveGlue_syncNow() {
    if (Weave.Service.isLoggedIn) {
      if (!Weave.Service.isQuitting) {
	// Note: we can pass a function(success) {} in here if we need
	// to respond to success or failure... but the observer handles that.
	Weave.Service.sync();
      } else {
	this.setWeaveStatusField("Can't sync, Weave is quitting.");
      }
    } else {
      this.setWeaveStatusField("Can't sync, Weave is not logged in.");
    }
  },

  showSyncedTabs: function FennecWeaveGlue_showSyncedTabs() {
    RemoteTabViewer.show();
  },

  hideSyncedTabs: function FennecWeaveGlue_hideSyncedTabs() {
    RemoteTabViewer.close();
  }
};

var RemoteTabViewer = {
  _panel: null,
  _remoteClients: null,

  show: function() {
    let container = document.getElementById("browser-container");
    this._panel = document.getElementById("synced-tabs-panel");
    this._panel.hidden = false;
    this._panel.width = container.boxObject.width;
    this._panel.height = container.boxObject.height;
    /*  If we want the tab bar to still appear on the right side:
     *     let width = tabContainer.boxObject.width;
     * tabContainer.left = container.boxObject.width - width;
     * syncedTabPanel.hidden = false;
     * syncedTabPanel.width = container.boxObject.width - width;
     */
    let tabEngine = Weave.Engines.get("tabs");
    this._remoteClients = tabEngine.getAllClients();
    let richlist = document.getElementById("remote-tabs-richlist");
    let width = this._panel.width - 10;
    richlist.style.maxWidth = width + "px";
    richlist.style.maxHeight = (this._panel.height - 40) + "px";
    this._populateTabs(richlist, width - 5);
  },

  close: function() {
    this._panel.hidden = true;
  },

  _populateTabs: function FennecWeaveGlue_loadRemoteTabs(holder, width) {
    /* Clear out all child elements from holder first, so we don't
     * end up adding duplicate columns: */
    while (holder.firstChild) {
      holder.removeChild(holder.firstChild);
    }

    // Load up all of the remote tabs we can find, into the richlist:
    for each (let record in this._remoteClients) {
      let newRichList = holder;
      let tabs = record.getAllTabs();
      for each (let tab in tabs) {
	let newItem = document.createElement("richlistitem");
	newItem.setAttribute("type", "remotetab");
	newRichList.appendChild(newItem);
	newItem.setWidth(width);
	let url = tab.urlHistory[0];
	let domain = Utils.makeURI(url).prePath;
	let favicon = domain + "/favicon.ico";
	let sourceClient = "From " + record.getClientName();
	newItem.updatePreview(tab.title, favicon, sourceClient, url);
	newItem.setTabData(tab);
      }
    }
  },

  openSyncedTab: function FennecWeaveGlue_openSyncedTab(richlist, event) {
    let tabData = richlist.selectedItem.getTabData();
    this.close();
    try {
      // Newer versions of fennec do it this way:
      Browser.addTab(tabData.urlHistory[0], true);
      // TODO how to include back history in the tab?
    } catch (e) {
      // Older versions do it this way:
      // (This code can probably be removed...)
      Browser.newTab(true);
      BrowserUI.goToURI(tabData.urlHistory[0]);
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
