const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://weave/log4moz.js");
Cu.import("resource://weave/service.js");

let WeaveStatus = {
  get _os() {
    delete this._os;
    return this._os = Cc["@mozilla.org/observer-service;1"].
                                       getService(Ci.nsIObserverService);
  },

  __enginesCompleted: 0,
  get _enginesCompleted() {
    return this.__enginesCompleted;
  },
  set _enginesCompleted(count) {
    this.__enginesCompleted = count;
  },

  get _log() {
    delete this._log;
    return this._log = Log4Moz.Service.getLogger("Sync.Status");
  },

  get _stringBundle() {
    delete this._stringBundle;
    return this._stringBundle = document.getElementById("weaveStringBundle");
  },

  get _statusDialog() {
    delete this._statusDialog;
    return this._statusDialog = document.getElementById("sync-status-dialog");
  },

  get _statusIcon() {
    delete this._statusIcon;
    return this._statusIcon = document.getElementById("statusIcon");
  },

  get _statusProgress() {
    delete this._statusProgress;
    return this._statusProgress = document.getElementById("statusProgress");
  },

  get _statusEngine() {
    delete this._statusEngine;
    return this._statusEngine = document.getElementById("statusEngine");
  },

  get _statusText() {
    delete this._statusText;
    return this._statusText = document.getElementById("statusText");
  },

  get _statusTitle() {
    delete this._statusTitle;
    return this._statusTitle = document.getElementById("statusTitle");
  },

  get _statusError() {
    delete this._statusError;
    return this._statusError = document.getElementById("statusError");
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  onLoad: function WeaveStatus_onLoad() {
    this._os.addObserver(this, "weave:service:sync:start", true);
    this._os.addObserver(this, "weave:service:sync:engine:start", true);
    this._os.addObserver(this, "weave:service:sync:status", true);
    this._os.addObserver(this, "weave:service:sync:success", true);
    this._os.addObserver(this, "weave:service:sync:error", true);

    this._os.addObserver(this, "weave:service:global:success", true);
    this._os.addObserver(this, "weave:service:global:error", true);

    // FIXME: we should set a timer to force quit in case there is a
    // stale local lock
    // FIXME: abort any running sync here, once we have support for that
    if (Weave.DAV.locked) {
      this._log.info("Waiting for current sync to finish");
      this._existingSync = true;
      this._statusIcon.setAttribute("status", "active");
      this._statusText.value = this._stringBundle.getString("status.wait");
      this._statusEngine.value = "";
    } else {
      this.doSync();
    }
  },

  onUnload: function WeaveStatus_onUnload() {
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:engine:start");
    this._os.removeObserver(this, "weave:service:sync:status");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");

    this._os.removeObserver(this, "weave:service:global:success");
    this._os.removeObserver(this, "weave:service:global:error");
  },

  doCancel: function WeaveStatus_doCancel() {
    this._statusText.value = this._stringBundle.getString("status.cancel");
    this._statusDialog.getButton("cancel").setAttribute("disabled", "true");
    Weave.Service.cancelRequested = true;
    return false;
  },

  doSync: function WeaveStatus_doSync() {
    try {
      // XXX Should we set a timeout to cancel sync if it takes too long?
      if(Weave.Service.isInitialized && !Weave.Service.isQuitting) {
        Weave.Service.sync();
      } else if(Weave.Service.isInitialized && Weave.Service.isQuitting &&
                Weave.Utils.prefs.getBoolPref("syncOnQuit.enabled")) {
        Weave.Service.sync();
      } else {
        this._log.info("Skipping modal sync");
        window.close();
      }
    }
    catch(ex) {
      this._log.error("Error starting modal sync: " + ex);
      window.close();
    }
  },

  // nsIObserver

  observe: function WeaveSync__observe(subject, topic, data) {
    switch (topic) {

    case "weave:service:sync:start":
    this._statusIcon.setAttribute("status", "active");
    break;

    case "weave:service:sync:status":
    if(!Weave.Service.cancelRequested)
      this._statusText.value = this._stringBundle.getString(data);
    break;

    case "weave:service:sync:engine:start":
    this._statusText.value = this._stringBundle.getString("status.engine_start");
    this._statusEngine.value = data;
    this._enginesCompleted++;
    this._statusProgress.value = this._enginesCompleted / (Weave.Engines.getEnabled().length + 1) * 100;
    break;

    case "weave:service:sync:success":
    if (this._existingSync)
      break;

    if (Weave.Service.cancelRequested) {
      Weave.Service.cancelRequested = false;
      this._statusIcon.setAttribute("status", "cancelled");
      this._statusText.value = this._stringBundle.getString("status.cancelled");
    } else {
      this._statusIcon.setAttribute("status", "success");
      this._statusProgress.value = "100";
      this._statusEngine.value = this._stringBundle.getString("status.success");
      this._statusEngine.style.color = "blue";
      this._statusText.value = this._stringBundle.getString("status.closing");
    }
    // Delay closing the window for a couple seconds to give the user time
    // to see the result of the sync.
    window.setTimeout(window.close, 2000);

    // FIXME: send a growl or other low-priority notification.
    break;

    case "weave:service:sync:error":
    if (this._existingSync)
      break;

    if (Weave.Service.cancelRequested)
      Weave.Service.cancelRequested = false;

    this._statusIcon.setAttribute("status", "error");
    this._statusText.value = this._stringBundle.getString("status.error");
    this._statusText.style.color = "red";

    // Delay closing the window for a couple seconds to give the user time
    // to see the result of the sync.
    window.setTimeout(window.close, 2000);

    // FIXME: send a growl or other low-priority notification, or don't exit
    // and let the user try again.
    break;

    case "weave:service:global:success":
    case "weave:service:global:error":
    if (this._existingSync && !Weave.DAV.locked) {
      this._log.info("Existing action finished, starting modal sync.");
      this._existingSync = false;
      this.doSync();
    }
    break;
    }
  }

};
