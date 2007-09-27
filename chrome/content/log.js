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
  loadLog();
}

function loadLog() {
  let dirSvc = Cc["@mozilla.org/file/directory_service;1"].
  getService(Ci.nsIProperties);

  let file = dirSvc.get("ProfD", Ci.nsIFile);
  file.append("bm-sync.log");

  if (!file.exists())
    return;

  let fis = Cc["@mozilla.org/network/file-input-stream;1"].
    createInstance(Ci.nsIFileInputStream);
  fis.init(file, MODE_RDONLY, PERMS_FILE, 0);
  fis.QueryInterface(Ci.nsILineInputStream);

  let log = "";
  let line = {value: ""};
  let hasmore;
  do {
    hasmore = fis.readLine(line)
    log += line.value + "\n";
  } while (hasmore);

  fis.close();

  let textbox = document.getElementById("logText");
  if (textbox) {
    textbox.value = log;
  }
}

window.addEventListener("load", function(e) { onLoad(e); }, false);
