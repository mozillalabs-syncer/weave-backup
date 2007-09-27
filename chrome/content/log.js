var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

const MODE_RDONLY   = 0x01;
const MODE_WRONLY   = 0x02;
const MODE_CREATE   = 0x08;
const MODE_APPEND   = 0x10;
const MODE_TRUNCATE = 0x20;

const PERMS_FILE      = 0644;
const PERMS_DIRECTORY = 0755;

function onLoad() {
  let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
  getService(Ci.nsIProperties);

  let file = dirSvc.get("ProfD", Ci.nsIFile);
  file.append("bm-sync.log");

  if (!file.exists()) {
    document.getElementById("sync-log-frame").
      setAttribute("src", "chrome://sync/content/default-log.txt");
    return;
  }

  document.getElementById("sync-log-frame").
    setAttribute("src", "file://" + file.path);
}

function saveAs() {
  let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
  getService(Ci.nsIProperties);

  let file = dirSvc.get("ProfD", Ci.nsIFile);
  file.append("bm-sync.log");
  file.QueryInterface(Ci.nsILocalFile);

  if (!file.exists()) {
    alert("No log available");
    return;
  }

  let backupsDir = dirSvc.get("Desk", Ci.nsILocalFile);
  let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  fp.init(window, "Choose Destination File", Ci.nsIFilePicker.modeSave);
  fp.appendFilters(Ci.nsIFilePicker.filterAll);
  fp.displayDirectory = backupsDir;
  fp.defaultString = "Bookmarks Sync.log";

  if (fp.show() != Ci.nsIFilePicker.returnCancel) {
    if (fp.file.exists())
      fp.file.remove(false);
    file.copyTo(fp.file.parent, fp.file.leafName);
  }
}

window.addEventListener("load", function(e) { onLoad(e); }, false);
