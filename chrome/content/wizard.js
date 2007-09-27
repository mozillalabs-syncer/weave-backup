const Ci = Components.interfaces;
const Cc = Components.classes;

function SyncWizard() {
  this._init();
}

SyncWizard.prototype = {
  _init : function SyncWizard__init() {
  },

 _addUserLogin: function SyncWizard__addUserLogin(username, password) {
    let branch = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefBranch);
    branch.setCharPref("browser.places.sync.username", username);
    
    let serverURL = branch.getCharPref("browser.places.sync.serverURL");
    let ioservice = Cc["@mozilla.org/network/io-service;1"].
                    getService(Ci.nsIIOService);
    let uri = ioservice.newURI(serverURL, null, null);
  
    // fixme: make a request and get the realm
    let nsLoginInfo = new Components.Constructor(
      "@mozilla.org/login-manager/loginInfo;1", Ci.nsILoginInfo, "init");
    let login = new nsLoginInfo(uri.hostPort, null,
                                'Use your ldap username/password - dotmoz',
                                username, password, null, null);
    let pm = Cc["@mozilla.org/login-manager;1"]. getService(Ci.nsILoginManager);
    pm.addLogin(login);
  },

  onBack : function SyncWizard_onBack() {
    return true;
  },

  onCancel : function SyncWizard_onCancel() {
    return true;
  },

  onFinish : function SyncWizard_onFinish() {
    return true;
  },

  onNext : function SyncWizard_onNext () {
    let wizard = document.getElementById('sync-wizard');

    if(!wizard || !wizard.currentPage) return true;
        
    switch(wizard.currentPage.pageid) {
      case "sync-wizard-welcome":
      case "sync-wizard-privacy":
       break;
      case "sync-wizard-account":
        let username = document.getElementById('sync-username-field');
        let password = document.getElementById('sync-password-field');

	LOG("got username="+username.value);
	LOG("got password="+password.value);
        
        if((!username || !password) || (!username.value || !password.value) || username.value == "nobody@mozilla.com") {
          alert("You must provide a valid user name and password to continue.");
          return false;
        }

	// XXX verify that the login works before adding?
	this._addUserLogin(username.value, password.value);
        break;
        
      case "sync-wizard-initialization":
	// XXX do initial sync with progress dialog
        break;
    }
    return true;
  }
};

let gSyncWizard = new SyncWizard();

function LOG(aText) {
  dump(aText + "\n");
  var consoleService = Cc["@mozilla.org/consoleservice;1"].
                       getService(Ci.nsIConsoleService);
  consoleService.logStringMessage(aText);
}
