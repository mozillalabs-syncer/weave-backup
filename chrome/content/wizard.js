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
 * The Original Code is Bookmarks Sync.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
 *  Chris Beard <cbeard@mozilla.com>
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

const SYNC_NS_ERROR_LOGIN_ALREADY_EXISTS = 2153185310;

function SyncWizard() {
  this._init();
}

SyncWizard.prototype = {

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle",
                          function() { return stringBundle; });
    return this._stringBundle;
  },

  _init : function SyncWizard__init() {
    this._log = Log4Moz.Service.getLogger("Chrome.Wizard");

    this._log.info("Initializing setup wizard");

    this._os.addObserver(this, "weave:service:login:success", false);
    this._os.addObserver(this, "weave:service:login:error", false);
    this._os.addObserver(this, "weave:service:logout:success", false);
    this._os.addObserver(this, "weave:service:sync:start", false);
    this._os.addObserver(this, "weave:service:sync:success", false);
    this._os.addObserver(this, "weave:service:sync:error", false);
  },

  onWizardShutdown: function SyncWizard_onWizardshutdown() {
    this._log.info("Shutting down setup wizard");

    this._os.removeObserver(this, "weave:service:login:success");
    this._os.removeObserver(this, "weave:service:login:error");
    this._os.removeObserver(this, "weave:service:logout:success");
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
  },


  onPageShow: function SyncWizard_onPageShow(pageId) {
    let wizard = document.getElementById('sync-wizard');
    let status1, sync1;

    switch(pageId) {
    case "sync-wizard-welcome":
      this._log.info("Showing welcome page");
      wizard.canAdvance = true;
      break;
    case "sync-wizard-backup":
      this._log.info("Showing backup page");
      wizard.canAdvance = true;
      break;
    case "sync-wizard-account": {
      this._log.info("Showing account page");
      let branch = Cc["@mozilla.org/preferences-service;1"].
        getService(Ci.nsIPrefBranch);
      let serverURL = branch.getCharPref("extensions.weave.serverURL");
      let uri = Utils.makeURI(serverURL);
      let lm = Cc["@mozilla.org/login-manager;1"].
               getService(Ci.nsILoginManager);
      let logins = lm.findLogins({}, uri.hostPort, null,
                                 'services.mozilla.com - proxy');
      status1 = document.getElementById('sync-wizard-verify-status');
      status1.setAttribute("value",
        this._stringBundle.getString("verifyStatusUnverified.label"));
      if(logins.length) {
        let username = document.getElementById('sync-username-field');
        let password = document.getElementById('sync-password-field');
	username.setAttribute("value", logins[0].username);
	password.setAttribute("value", logins[0].password);
      }
      wizard.canAdvance = false;
    } break;
    case "sync-wizard-initialization":
      this._log.info("Showing initialization page");
      status1 = document.getElementById('sync-wizard-initialization-status');
      sync1 = document.getElementById('sync-wizard-initialization-button');
      status1.setAttribute("value",
        this._stringBundle.getString("initStatusReadyToSync.label"));
      sync1.setAttribute("disabled", false);
      wizard.canAdvance = false;
      break;
    default:
      this._log.warn("Unknown wizard page requested: " + pageId);
      break;
    }
  },

  onBookmarksBackup: function SyncWizard_onBookmarksBackup() {
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    fp.init(window, PlacesUIUtils.getString("bookmarksBackupTitle"),
            Ci.nsIFilePicker.modeSave);
    fp.appendFilters(Ci.nsIFilePicker.filterHTML);

    let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
      getService(Ci.nsIProperties);
    let backupsDir = dirSvc.get("Desk", Ci.nsILocalFile);
    fp.displayDirectory = backupsDir;

    // Use YYYY-MM-DD (ISO 8601) as it doesn't contain illegal characters
    // and makes the alphabetical order of multiple backup files more useful.
    let date = (new Date).toLocaleFormat("%Y-%m-%d");
    fp.defaultString = PlacesUIUtils.getFormattedString(
      "bookmarksBackupFilename",
      [date]
    );

    if (fp.show() != Ci.nsIFilePicker.returnCancel) {
      let ieSvc = Cc["@mozilla.org/browser/places/import-export-service;1"].
        getService(Ci.nsIPlacesImportExportService);
      ieSvc.exportHTMLToFile(fp.file);
    }
  },

  onVerify: function SyncWizard_onVerify() {
    this._log.info("Verifying login");
    let username = document.getElementById('sync-username-field');
    let password = document.getElementById('sync-password-field');
    let passphrase = document.getElementById('sync-passphrase-field');

    if (!(username && password && username.value && password.value &&
          username.value != 'nobody@mozilla.com')) {
      alert(this._stringBundle.getString("invalidCredentials.alert"));
      // FIXME: What boolean value should we return here?  We're returning
      // a boolean in other return statements here, so I assume we should
      // be returning one here too. -AV
      return;
    }

    if (!passphrase.value) {
      alert(this._stringBundle.getString("noPassphrase.alert"));
      return false;
    }
    if (password.value == passphrase.value) {
      alert(this._stringBundle.getString("samePasswordAndPassphrase.alert"));
      return false;
    }

    this._log.info("Adding user login/password to password manager");
    Weave.Service.username = username.value;
    Weave.Service.password = password.value;
    Weave.Service.passphrase = passphrase.value;

    Weave.Service.logout();
    Weave.Service.login();
  },

  onSync: function SyncWizard_onSync() {
    Weave.Service.sync();
  },

  observe: function(subject, topic, data) {
    if (!document) {
      this._log.warn("XXX FIXME: wizard observer called after wizard went away");
      return;
    }
    let wizard = document.getElementById('sync-wizard');
    let verifyStatus, initStatus, throbber1, throbber2, sync1;

    switch(topic) {
    case "weave:service:login:success":
      this._log.info("Login verified");
      verifyStatus = document.getElementById('sync-wizard-verify-status');
      verifyStatus.setAttribute("value",
        this._stringBundle.getString("verifyStatusLoginVerified.label"));
      wizard.canAdvance = true;
      break;
    case "weave:service:login:error":
      this._log.info("Login failed");
      verifyStatus = document.getElementById('sync-wizard-verify-status');
      verifyStatus.setAttribute("value",
        this._stringBundle.getString("verifyStatusLoginFailed.label"));
      wizard.canAdvance = false;
      break;
    case "weave:service:logout:success":
      this._log.info("Logged out");
      break;
    case "weave:service:sync:start":
      this._log.info("Sync started");
      initStatus = document.getElementById('sync-wizard-initialization-status');
      throbber1 = document.getElementById('sync-wizard-initialization-throbber-active');
      throbber2 = document.getElementById('sync-wizard-initialization-throbber');
      throbber1.setAttribute("hidden", false);
      throbber2.setAttribute("hidden", true);
      initStatus.setAttribute("value",
        this._stringBundle.getString("initStatusSyncing.label"));
      break;
    case "weave:service:sync:success":
      this._log.info("Sync complete");
      initStatus = document.getElementById('sync-wizard-initialization-status');
      throbber1 = document.getElementById('sync-wizard-initialization-throbber-active');
      throbber2 = document.getElementById('sync-wizard-initialization-throbber');
      sync1 = document.getElementById('sync-wizard-initialization-button');
      sync1.setAttribute("disabled", true);
      throbber1.setAttribute("hidden", true);
      throbber2.setAttribute("hidden", false);
      initStatus.setAttribute("value",
        this._stringBundle.getString("initStatusSyncComplete.label"));
      wizard.canAdvance = true;
      break;
    case "weave:service:sync:error":
      this._log.info("Sync failed");
      initStatus = document.getElementById('sync-wizard-initialization-status');
      throbber1 = document.getElementById('sync-wizard-initialization-throbber-active');
      throbber2 = document.getElementById('sync-wizard-initialization-throbber');
      sync1 = document.getElementById('sync-wizard-initialization-button');
      sync1.setAttribute("disabled", true);
      throbber1.setAttribute("hidden", true);
      throbber2.setAttribute("hidden", false);
      initStatus.setAttribute("value",
        this._stringBundle.getString("initStatusSyncFailed.label"));
      break;
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gSyncWizard = new SyncWizard();
