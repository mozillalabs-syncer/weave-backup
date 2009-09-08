var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

let gSyncLog = {
  //////////////////////////////////////////////////////////////////////////////
  // Private Methods

  get _file() {
    let logFile = Weave.Svc.Directory.get("ProfD", Ci.nsIFile);
    logFile.QueryInterface(Ci.nsILocalFile);
    logFile.append("weave");
    logFile.append("logs");
    logFile.append("verbose-log.txt");
    return logFile;
  },

  get _frame() {
    return document.getElementById("sync-log-frame");
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    delete this._stringBundle;
    return this._stringBundle = stringBundle;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Public Methods

  updateLog: function updateLog() {
    let doc = this._frame.contentDocument;
    let win = doc.defaultView;
    let line = {};
    let log, file;

    // Read in every line from the log and append it to the display
    (function read() {
      // Make sure we have a file to read
      if (file == null || !file.exists()) {
        // Use the new file if it changed on us
        if (gSyncLog._file.exists()) {
          file = gSyncLog._file;
          log = Cc["@mozilla.org/network/file-input-stream;1"].
            createInstance(Ci.nsIFileInputStream);
          log.init(file, 1, 0, 0);
          log.QueryInterface(Ci.nsILineInputStream);
        }
        // No file yet, so try again later
        else {
          setTimeout(read, 1000);
          file = null;
          return;
        }
      }

      // Remember if the user is at the end of the log
      let autoScroll = win.scrollY == win.scrollMaxY;
      let more;
      do {
        more = log.readLine(line);
        let text = line.value;
        // Don't add anything if nothing was read
        if (text.length == 0 && more == false)
          break;

        let pre = doc.createElement("pre");
        pre.appendChild(doc.createTextNode(line.value));
        doc.body.appendChild(pre);
      } while (more);

      // Automatically scroll to the end if the user was at the end
      if (autoScroll)
        win.scrollTo(win.scrollX, win.scrollMaxY);

      // Prepare for an update to the log
      setTimeout(read, 100);
    })();
  },

  saveAs: function SyncLog_saveAs() {
    let file = this._file;
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
    this._frame.contentDocument.body.innerHTML = "";
  }
}

window.addEventListener("load", function(e) gSyncLog.updateLog(), false);
