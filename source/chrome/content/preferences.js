var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

Cu.import("resource://weave/base_records/wbo.js");
Cu.import("resource://weave/base_records/keys.js");

function WeavePrefs() {
  this._log = Log4Moz.repository.getLogger("Chrome.Prefs");
  this._log.level = Log4Moz.Level["Debug"];
  Observers.add("weave:service:sync:start", this._onSyncStart, this);
  Observers.add("weave:service:sync:finish", this._onSync, this);
  Observers.add("network:offline-status-changed", this._checkAccountInfo, this);
  Weave.Utils.prefs.addObserver("", this, false);

  window.addEventListener("unload", Weave.Utils.bind2(this, function() {
    Observers.remove("weave:service:sync:start", this._onSyncStart, this);
    Observers.remove("weave:service:sync:finish", this._onSync, this);
    Weave.Utils.prefs.removeObserver("", this);
  }), false);
}
WeavePrefs.prototype = {
  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle; });
    return this._stringBundle;
  },

  _checkClientInfo: function WeavePrefs__checkClientInfo() {
    let richlistbox = document.getElementById('sync-clients-list');
    let clients = Weave.Clients.getClients();

    while (richlistbox.firstChild) {
      richlistbox.removeChild(richlistbox.firstChild);
    }

    for (let guid in clients) {
      let richlistitem = document.createElement('richlistitem');
      let label = document.createElement('label');

      label.setAttribute("value", clients[guid].name + " (" + clients[guid].type + ")");

      richlistitem.appendChild(label);
      richlistbox.appendChild(richlistitem);
    }
  },

  _checkAccountInfo: function WeavePrefs__checkAccountInfo() {
    let syncNowButton = document.getElementById('sync-syncnow-button');
    syncNowButton.setAttribute("disabled", !Weave.Service.isLoggedIn ||
      Weave.Svc.IO.offline);
  },

  _loadEnginesList: function WeavePrefs__loadEnginesList() {
    let list = document.getElementById("sync-engines-list");

    // No need to add engines if we've already added them
    if (list.itemCount > 0)
      return;

    Weave.Engines.getAll().forEach(function(engine) {
      // Only show UI if the engine is functional
      if (engine.enabled == null)
        return;

      let item = document.createElement("richlistitem");
      let check = document.createElement("checkbox");
      item.appendChild(check);
      list.appendChild(item);

      // Check the box if the engine is enabled
      check.checked = engine.enabled;

      check.flex = 1;
      check.label = engine.displayName;

      // Handle toggling of the checkbox
      check.addEventListener("command", function(event) {
        engine.enabled = check.checked;
      }, false);
    });
  },

  onPaneLoad: function WeavePrefs_onPaneLoad() {
    this._checkAccountInfo();
    this._checkClientInfo();
    this._loadEnginesList();
  },

  _onSyncStart: function WeavePrefs__onSyncStart(subject, data) {
    document.getElementById("sync-syncnow-button").
      setAttribute("disabled", "true");
    document.getElementById("eraseserver-button").
      setAttribute("disabled", "true");
  },
  _onSync: function WeavePrefs__onSync(subject, data) {
    document.getElementById("sync-syncnow-button").
      setAttribute("disabled", "false");
    document.getElementById("eraseserver-button").
      setAttribute("disabled", "false");
    this.onPaneLoad();
  },

  openActivityLog: function WeavePrefs_openActivityLog() {
    Weave.Utils.openLog();
  },
  
  doSyncNow: function WeavePrefs_doSyncNow() {
    Weave.Utils.openSync();
  },

  resetServerURL: function WeavePrefs_resetServerURL() {
    Weave.Svc.Prefs.reset("serverURL");
    let serverURL = Weave.Svc.Prefs.get("serverURL");
    let serverField = document.getElementById('sync-server-field');
    serverField.setAttribute("value", serverURL);
    Weave.Service.logout();
  },

  eraseServer: function WeavePrefs_eraseServer() {
    if (Weave.Svc.Prompt.confirm(null,
                  this._stringBundle.getString("erase.server.warning.title"),
                  this._stringBundle.getString("erase.server.warning"))) {
      Weave.Service.wipeServer();
    }
  },

  observe: function WeaveSvc__observe(subject, topic, data) {
    switch (topic) {
    case "nsPref:changed":
      switch (data) {
      case "client.name":
      case "client.type":
        gWeavePrefs.onPaneLoad();
        break;
      }
      break;
    }
  }
};

let gWeavePrefs = new WeavePrefs();
