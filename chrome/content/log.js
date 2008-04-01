var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

let gSyncLog = {
  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    delete this._stringBundle;
    this._stringBundle = stringBundle;
    return this._stringBundle;
  },

  init: function() {
    let tabbox = document.getElementById("syncLogTabs");
    let index = document.getElementById("extensions.weave.log.selectedTabIndex");
    if (index.value != null)
      tabbox.selectedIndex = index.value;
    this.loadLogs();
  },

  onSelectionChanged: function() {
    let tabbox = document.getElementById("syncLogTabs");
    let index = document.getElementById("extensions.weave.log.selectedTabIndex");
    index.valueFromPreferences = tabbox.selectedIndex;
  },

  loadLogs: function() {
    let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
    getService(Ci.nsIProperties);

    let brief = dirSvc.get("ProfD", Ci.nsIFile);
    brief.QueryInterface(Ci.nsILocalFile);

    brief.append("weave");
    brief.append("logs");
    brief.append("brief-log.txt");

    if (brief.exists())
      document.getElementById("sync-log-frame").
        setAttribute("src", "file://" + brief.path);
    else
      document.getElementById("sync-log-frame").
        setAttribute("src", "chrome://weave/content/default-log.txt");

    let verbose = brief.parent.clone();
    verbose.append("verbose-log.txt");

    if (verbose.exists())
      document.getElementById("sync-log-verbose-frame").
        setAttribute("src", "file://" + verbose.path);
    else
      document.getElementById("sync-log-verbose-frame").
        setAttribute("src", "chrome://weave/content/default-log.txt");
  },

  saveAs: function() {
    let tabbox = document.getElementById("syncLogTabs");
    let index = tabbox.selectedIndex;
  
    let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
    getService(Ci.nsIProperties);
  
    let file = dirSvc.get("ProfD", Ci.nsIFile);
    file.QueryInterface(Ci.nsILocalFile);
  
    file.append("weave");
    file.append("logs");
  
    if (index == 0)
      file.append("brief-log.txt");
    else
      file.append("verbose-log.txt");
  
    if (!file.exists()) {
      alert(this._stringBundle.getString("noLogAvailable.alert"));
      return;
    }
  
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
    document.getElementById("sync-log-frame").
      setAttribute("src", "chrome://weave/content/default-log.txt");
    document.getElementById("sync-log-verbose-frame").
      setAttribute("src", "chrome://weave/content/default-log.txt");
  }
}

window.addEventListener("load", function(e) { gSyncLog.init(e); }, false);
