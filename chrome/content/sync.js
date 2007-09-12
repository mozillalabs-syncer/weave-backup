var syncsvc;

function init() {
  try {
    syncsvc = Cc["@mozilla.org/places/sync-service;1"].
      getService(Ci.nsIBookmarksSyncService);
  } catch (e) {
    dump("Error getting service: " + e + " \n");
    throw e;
  }
}

function doPopup() {
  if (!syncsvc)
    init();
  try {
    syncsvc.sync();
  } catch (e) {
    dump("Error: " + e + "\n");
  }
}
