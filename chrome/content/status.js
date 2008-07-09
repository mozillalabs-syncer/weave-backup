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

  get _log() {
    delete this._log;
    return this._log = Log4Moz.Service.getLogger("Sync.Status");
  },

  get _stringBundle() {
    delete this._stringBundle;
    return this._stringBundle = document.getElementById("weaveStringBundle");
  },

  get _statusBox() {
    delete this._statusBox;
    return this._statusBox = document.getElementById("statusBox");
  },

  get _statusText() {
    delete this._statusText;
    return this._statusText = document.getElementById("statusText");
  },

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  onLoad: function WeaveStatus_onLoad() {
    this._os.addObserver(this, "weave:service:sync:start", true);
    this._os.addObserver(this, "weave:service:sync:success", true);
    this._os.addObserver(this, "weave:service:sync:error", true);
    this._os.addObserver(this, "weave:service:global:success", true);
    this._os.addObserver(this, "weave:service:global:error", true);

    // FIXME: we should set a timer to force quit in case there is a
    // stale local lock
    // FIXME: abort any running sync here, once we have support for that
    if (Weave.DAV.locked) {
      this._log.info("waiting for current action to finish");
      this._existingSync = true;
      this._statusBox.setAttribute("status", "active");
      this._statusText.value = this._stringBundle.getString("status.wait");
    } else {
      this.doSync();
    }
  },

  onUnload: function WeaveStatus_onUnload() {
    this._os.removeObserver(this, "weave:service:sync:start");
    this._os.removeObserver(this, "weave:service:sync:success");
    this._os.removeObserver(this, "weave:service:sync:error");
    this._os.removeObserver(this, "weave:service:global:success");
    this._os.removeObserver(this, "weave:service:global:error");
  },

  doSync: function WeaveStatus_doSync() {
    try {
      // XXX Should we set a timeout to cancel sync if it takes too long?
      if (Weave.Service.isLoggedIn && Weave.Utils.prefs.getBoolPref("syncOnQuit.enabled")) {
        this._statusText.value = this._stringBundle.getString("status.active");
        Weave.Service.sync();
      } else {
        this._log.info("Skipping quit sync");
        window.close();
      }
    }
    catch(ex) {
      this._log.error("error starting quit sync: " + ex);
      window.close();
    }
  },

  // nsIObserver

  observe: function WeaveSync__observe(subject, topic, data) {
    switch (topic) {
      case "weave:service:sync:start":
        this._log.info("starting quit sync");

        this._statusBox.setAttribute("status", "active");
        this._statusText.value = this._stringBundle.getString("status.active");

        break;

      case "weave:service:sync:success":
        if (this._existingSync)
          break;

        this._log.info("quit sync succeeded");

        this._statusBox.setAttribute("status", "success");
        this._statusText.value = this._stringBundle.getString("status.success");

        // Delay closing the window for a couple seconds to give the user time
        // to see the result of the sync.
        window.setTimeout(window.close, 2000);

        // FIXME: send a growl or other low-priority notification.

        break;

      case "weave:service:sync:error":
        if (this._existingSync)
          break;

        this._log.info("quit sync failed");

        this._statusBox.setAttribute("status", "error");
        this._statusText.value = this._stringBundle.getString("status.error");

        // Delay closing the window for a couple seconds to give the user time
        // to see the result of the sync.
        window.setTimeout(window.close, 2000);

        // FIXME: send a growl or other low-priority notification, or don't exit
        // and let the user try again.

        break;

      case "weave:service:global:success":
      case "weave:service:global:error":
        if (this._existingSync && !Weave.DAV.locked) {
          this._log.info("existing action finished, starting quit sync");
          this._existingSync = false;
          this.doSync();
        }
        break;
    }
  }

};
