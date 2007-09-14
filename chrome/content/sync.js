var login_state_changed = false; 
var current_user = null;
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

var saved_status;
function syncUISetup() {
  var throbber1 = document.getElementById("sync-throbber-online");
  if(throbber1) {
    throbber1.setAttribute("hidden","true");
  }
  var throbber2 = document.getElementById("sync-throbber-active");
  if(throbber2) {
    throbber2.setAttribute("hidden", "false");
  }
  var status1 = document.getElementById("sync-menu-status");
  if(status1) {
    saved_status = status1.getAttribute("value");
    status1.setAttribute("value", "Synchronizing...");
  }	
}

function syncUICallback() {
 var pref = Components.classes["@mozilla.org/preferences-service;1"].
   getService(Components.interfaces.nsIPrefBranch);
  var endTime = new Date().getTime();
  pref.setCharPref("extensions.sync.lastsync", endTime);
  var status1 = document.getElementById("sync-menu-status");
  if(status1) {
	status1.setAttribute("value", saved_status);
  }	
  var throbber1 = document.getElementById("sync-throbber-online");
  if(throbber1) {
	  throbber1.setAttribute("hidden", "false");
  }
  var throbber2 = document.getElementById("sync-throbber-active");
  if(throbber2) {
	  throbber2.setAttribute("hidden", "true");
  }
}

function doSync() {
  if (!syncsvc)
    init();
	
  syncUISetup();
  try {
    syncsvc.sync();
  } catch (e) {
    dump("Error: " + e + "\n");
  }
  syncUICallback();
}

function doLogin() {
  var req = new XMLHttpRequest();
  req.open('GET', 'http://dotmoz.mozilla.org/', false);
  req.send(null);

  if(req.status == 200) {
    var reg = /Hello (.+)@mozilla.com/;
    if((ar = reg.exec(req.responseText)) != null) {
      current_user = ar[1];	
      var pref = Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefBranch);
      pref.setCharPref("browser.places.sync.serverUrl",
                       "http://dotmoz.mozilla.org/~" + current_user + "/");
      login_state_changed = true;
      var status1 = document.getElementById("sync-menu-status");
      if(status1) {
	status1.setAttribute("value", current_user+" signed in");
	status1.setAttribute("hidden", "false");
      }
      var throbber1 = document.getElementById("sync-throbber-online");
      if(throbber1) {
        throbber1.setAttribute("hidden","false");
      }
      var throbber2 = document.getElementById("sync-throbber-offline");
      if(throbber2) {
        throbber2.setAttribute("hidden", "true");
      }
    } else {
      alert("Login failed.  Bad response from the server.");
    }
  }
}

function doLogout() {
  current_user = null;
  login_state_changed = true;
  alert("You've been logged out.");

  var throbber1 = document.getElementById("sync-throbber-online");
  if(throbber1) {
     throbber1.setAttribute("hidden","true");
  }
  var throbber2 = document.getElementById("sync-throbber-offline");
  if(throbber2) {
     throbber2.setAttribute("hidden", "false");
  }
  var status1 = document.getElementById("sync-menu-status");
  if(status1) {
	status1.setAttribute("hidden", "true");
  }	

}

function doCancelSync() {
}

function onPopup(event) { 
  if(login_state_changed) {
    if(!current_user) { // logout
      doCancelSync();
      var loginitem = document.getElementById("sync-loginitem");
      var logoutitem = document.getElementById("sync-logoutitem");
      if(loginitem && logoutitem) {
        loginitem.setAttribute("hidden", "false");
        logoutitem.setAttribute("hidden", "true");
      }
      var syncnowitem = document.getElementById("sync-syncnowitem");
      if(syncnowitem) {
        syncnowitem.setAttribute("disabled", "true");
      }
      var cancelsyncitem = document.getElementById("sync-cancelsyncitem");
      if(cancelsyncitem) {
        cancelsyncitem.setAttribute("disabled", "true");
      }
    } else { // login
      var loginitem = document.getElementById("sync-loginitem");
      var logoutitem = document.getElementById("sync-logoutitem");
      if(loginitem && logoutitem) {
        loginitem.setAttribute("hidden", "true");
        logoutitem.setAttribute("hidden", "false");
        logoutitem.setAttribute("label", "Sign Out (" + current_user + ")");
      }
      var syncnowitem = document.getElementById("sync-syncnowitem");
      if(syncnowitem) {
        syncnowitem.setAttribute("disabled", "false");
      }
    }
    login_state_changed = false;
  }
  var pref = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefBranch);
  lastSync = pref.getCharPref("extensions.sync.lastsync");
  if(lastSync) {
    var lastsyncitem = document.getElementById("sync-lastsyncitem");
    if(lastsyncitem) {
      var syncDate = new Date(parseInt(lastSync));
      lastsyncitem.setAttribute("label", "Last Sync: " +
                                syncDate.toLocaleString());
      lastsyncitem.setAttribute("hidden", "false");
    }
  }
}

function startUp() {
}

function openActivityLog() {
  window.openDialog('chrome://sync/content/log.xul', '',
                    'chrome, dialog, modal, resizable=yes', null).focus();
}

window.addEventListener("load", function(e) { startUp(e); }, false);
