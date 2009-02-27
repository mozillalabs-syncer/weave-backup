var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

let gSyncLog = {
  //////////////////////////////////////////////////////////////////////////////
  // Private Methods

  _file: function SyncLog__file(type) {
    let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
      getService(Ci.nsIProperties);

    let logFile = dirSvc.get("ProfD", Ci.nsIFile);
    logFile.QueryInterface(Ci.nsILocalFile);
    logFile.append("weave");
    logFile.append("logs");
    logFile.append(type + "-log.txt");

    return logFile;
  },

  _frame: function SyncLog__frame(type) {
    return document.getElementById("sync-log-" + type + "-frame");
  },

  get _logTypes() {
    return ["brief", "verbose"];
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    delete this._stringBundle;
    return this._stringBundle = stringBundle;
  },

  _uriLog: function SyncLog__uriLog(type) {
    if (type) {
      let file = this._file(type);
      if (file.exists())
        return "file://" + file.path;
    }

    return "chrome://weave/content/default-log.txt";
  },

  //////////////////////////////////////////////////////////////////////////////
  // Event Handlers

  init: function SyncLog_init(event) {
    let tabbox = document.getElementById("syncLogTabs");
    let index = document.getElementById("extensions.weave.log.selectedTabIndex");
    if (index.value != null)
      tabbox.selectedIndex = index.value;

    for each (let type in this._logTypes) {
      let frame = this._frame(type);
      frame.setAttribute("src", this._uriLog(type));
    }
  },

  onSelectionChanged: function SyncLog_onSelectionChanged(event) {
    let tabbox = document.getElementById("syncLogTabs");
    let index = document.getElementById("extensions.weave.log.selectedTabIndex");
    index.valueFromPreferences = tabbox.selectedIndex;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Public Methods

  saveAs: function SyncLog_saveAs() {
    let tabbox = document.getElementById("syncLogTabs");
    let file = this._file(this._logTypes[tabbox.selectedIndex]);

    if (!file.exists()) {
      alert(this._stringBundle.getString("noLogAvailable.alert"));
      return;
    }

    let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
      getService(Ci.nsIProperties);
    let backupsDir = dirSvc.get("Desk", Ci.nsILocalFile);
    let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    let filePickerTitle = this._stringBundle.getString("filePicker.title");
    fp.init(window, filePickerTitle, Ci.nsIFilePicker.modeSave);
    fp.appendFilters(Ci.nsIFilePicker.filterAll);
    fp.displayDirectory = backupsDir;
    fp.defaultString = "Weave Sync.log";

    if (fp.show() != Ci.nsIFilePicker.returnCancel) {
      if (fp.file.exists())
        fp.file.remove(false);
      file.copyTo(fp.file.parent, fp.file.leafName);
    }
  },

  clear: function SyncLog_clear() {
    Weave.Service.clearLogs();

    for each (let type in this._logTypes)
      this._frame(type).setAttribute("src", this._uriLog());
  }
}

window.addEventListener("load", function(e) gSyncLog.init(e), false);
