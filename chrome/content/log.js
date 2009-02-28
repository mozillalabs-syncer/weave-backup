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

      // The first frame load is of the text log
      let handleLoad = function SyncLog__handleLoad(event) {
        frame.removeEventListener("load", handleLoad, true);
        gSyncLog.onFrameLoad(event, frame);
      };
      frame.addEventListener("load", handleLoad, true);
      frame.setAttribute("src", this._uriLog(type));
    }
  },

  onFrameLoad: function SyncLog_onFrameLoad(event, frame) {
    let text = frame.contentDocument.documentElement.lastChild.textContent;
    let re = "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\t([^\\s]+)\\s+([^\\s]+)\t.*";
    let matches = text.match(new RegExp(re, "g"));

    // No need to process the text if there's nothing to color
    if (!matches)
      return;

    // Define some colors for various levels/types of logging
    let textColors = {
      WARN:   "#f90",
      ERROR:  "#f30",
      FATAL:  "#f00",

      CONFIG: "#600",
      DEBUG:  "#060",
      INFO:   "#006",
      TRACE:  "#066",
    };

    let logPattern = new RegExp(re);
    // Color one line at a time on a timeout reverse-log-order
    let colorText = function SyncLog__colorText(doc) setTimeout(function() {
      let [line, source, type] = matches.pop().match(logPattern);

      // Generate a background color based on the source of the log
      let bgColor = [0, 0, 0];
      for (let i = source.length; --i >= 0; )
        bgColor[i % 3] += source.charCodeAt(i);
      bgColor = bgColor.map(function(v) v % 256);

      let pre = doc.body.appendChild(doc.createElement("pre"));
      pre.style.color = textColors[type];
      pre.style.backgroundColor = "rgba(" + bgColor + ", .2)";
      pre.appendChild(doc.createTextNode(line));

      // Color another line if there is more
      if (matches.length > 0)
        colorText(doc);
    }, 0);

    // The second frame load is for switching to html
    let handleHtmlLoad = function SyncLog__handleHtmlLoad(event) {
      frame.removeEventListener("load", handleHtmlLoad, true);
      colorText(event.target);
    };
    frame.addEventListener("load", handleHtmlLoad, true);

    let html = "<html><head><style>pre{margin:0}</style><body></body></html>";
    frame.setAttribute("src", "data:text/html," + html);
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
