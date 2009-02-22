const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

let WeaveStatus = {
  __enginesCompleted: 0,
  get _enginesCompleted() {
    return this.__enginesCompleted;
  },
  set _enginesCompleted(count) {
    this.__enginesCompleted = count;
  },

  get _log() {
    delete this._log;
    return this._log = Log4Moz.repository.getLogger("Sync.Status");
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

  onLoad: function WeaveStatus_onLoad() {
    Observers.add("weave:service:sync:start", this.onSyncStart, this);
    Observers.add("weave:service:sync:finish", this.onSyncFinish, this);
    Observers.add("weave:service:sync:error", this.onSyncError, this);
    Observers.add("weave:engine:sync:start", this.onEngineStart, this);
    Observers.add("weave:engine:sync:status", this.onEngineStatus, this);

    // FIXME: we should set a timer to force quit in case there is a
    // stale local lock
    // FIXME: abort any running sync here, once we have support for that
    if (Weave.Service.locked) {
      this._log.info("Waiting for current sync to finish");
      this._existingSync = true;
      this._statusIcon.setAttribute("status", "active");
      this._statusText.value = this._stringBundle.getString("status.wait");
      this._statusEngine.value = "";
    } else {
      this.doSync();
    }
  },

  onUnload: function WeaveStatus_onUnload() {},

  doCancel: function WeaveStatus_doCancel() {
    this._statusText.value = this._stringBundle.getString("status.cancel");
    this._statusDialog.getButton("cancel").setAttribute("disabled", "true");
    Weave.Service.cancelRequested = true;
    return false;
  },

  doSync: function WeaveStatus_doSync() {
    try {
      // XXX Should we set a timeout to cancel sync if it takes too long?
      if(Weave.Service.isLoggedIn && !Weave.Service.isQuitting) {
        Weave.Service.sync();
      } else if(Weave.Service.isLoggedIn && Weave.Service.isQuitting &&
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

  // notification handlers

  onSyncStart: function WeaveStatus_onSyncStart(subject, data) {
    this._statusIcon.setAttribute("status", "active");
  },

  onSyncFinish: function WeaveStatus_onSyncFinish(subject, data) {
    if (this._existingSync) {
      if (!Weave.Service.locked) {
        this._log.info("Existing action finished, starting modal sync.");
        this._existingSync = false;
        this.doSync();
      }
      return;
    }

    this._statusDialog.getButton("cancel").setAttribute("disabled", "true");

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
  },

  onSyncError: function WeaveStatus_onSyncError(subject, data) {
    if (this._existingSync) {
      if (!Weave.Service.locked) {
        this._log.info("Existing action finished, starting modal sync.");
        this._existingSync = false;
        this.doSync();
      }
      return;
    }

    this._statusDialog.getButton("cancel").setAttribute("disabled", "true");

    if (Weave.Service.cancelRequested)
      Weave.Service.cancelRequested = false;

    if (Weave.FaultTolerance.Service.lastException == "Could not acquire lock") {
      this._statusIcon.setAttribute("status", "info");
      this._statusEngine.value = this._stringBundle.getString("status.locked");
      if (Weave.Service.isQuitting)
        this._statusText.value = this._stringBundle.getString("status.closing");
      else
        this._statusText.value = this._stringBundle.getString("status.tryagain");
    } else {
      this._statusIcon.setAttribute("status", "error");
      this._statusEngine.value = this._stringBundle.getString("status.error") + " (" + Weave.FaultTolerance.Service.lastException + ")";
      this._statusText.value = this._stringBundle.getString("status.closing");
      this._statusEngine.style.color = "red";
    }

    // Delay closing the window for a couple seconds to give the user time
    // to see the result of the sync.
    window.setTimeout(window.close, 2000);

    // FIXME: send a growl or other low-priority notification, or don't exit
    // and let the user try again.
  },

  onEngineStart: function WeaveStatus_onEngineStart(subject, data) {
    this._statusText.value = this._stringBundle.getString("status.engine.start");
    this._statusEngine.value = subject;
    this._enginesCompleted++;
    this._statusProgress.value = this._enginesCompleted / (Weave.Engines.getEnabled().length + 1) * 100;
  },

  onEngineStatus: function WeaveStatus_onEngineStatus(subject, data) {
    this._statusText.value = this._stringBundle.getString("status.engine." + subject);
  },

  onCancelRequested: function WeaveStatus_onCancelRequested(subject, data) {
    // if(!Weave.Service.cancelRequested)
    //   this._statusText.value = this._stringBundle.getString(data);
  }
};
