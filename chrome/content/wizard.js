 
const SYNC_NS_ERROR_LOGIN_ALREADY_EXISTS = 2153185310;

function SyncWizard() {
  this._init();
}

SyncWizard.prototype = {

 __ss: null,
  get _ss() {
    if (!this.__ss)
      this.__ss = Cc["@mozilla.org/places/sync-service;1"].
        getService(Ci.IBookmarksSyncService);
    return this.__ss;
  },

  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },    

  _init : function SyncWizard__init() {
    this._os.addObserver(this, "bookmarks-sync:login", false);
    this._os.addObserver(this, "bookmarks-sync:login-error", false);
    this._os.addObserver(this, "bookmarks-sync:logout", false);
    this._os.addObserver(this, "bookmarks-sync:start", false);
    this._os.addObserver(this, "bookmarks-sync:end", false);
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
                                'services.mozilla.com',
                                username, password, null, null);
    let pm = Cc["@mozilla.org/login-manager;1"]. getService(Ci.nsILoginManager);
	
	let logins = pm.findLogins({}, uri.hostPort, null,
                                 'services.mozilla.com');
    	   
    let found = 0;
    for(let i = 0; i < logins.length; i++) {
          if(logins[i].username == username && logins[i].password == password) {
			// nothing to do here, username/password already in the nsLoginInfo store
            found = 1;
			continue;
		  }
		  
		  if(logins[i].username == username) {
		    // password has changed, update it
			pm.modifyLogin(logins[i], login);
			found = 1;
			continue;
		  }

		  // remove the cruft
		  pm.removeLogin(logins[i]);
    }		  

    if(!found) 
  	   pm.addLogin(login);
  },

  onPageShow : function SyncWizard_onPageShow(pageId) {
    let wizard = document.getElementById('sync-wizard');
		        
    switch(pageId) {
      case "sync-wizard-welcome": 
		wizard.canAdvance = true;
		break;
      case "sync-wizard-account":
        let branch = Cc["@mozilla.org/preferences-service;1"].
                  getService(Ci.nsIPrefBranch);
        let serverURL = branch.getCharPref("browser.places.sync.serverURL");
 		let uri = makeURI(serverURL);
        let lm = Cc["@mozilla.org/login-manager;1"].getService(Ci.nsILoginManager);
        let logins = lm.findLogins({}, uri.hostPort, null, 'services.mozilla.com');
	   var status1 = document.getElementById('sync-wizard-verify-status');
       status1.setAttribute("value", "Status: Unverified.");
        if(logins.length) {
          let username = document.getElementById('sync-username-field');
          let password = document.getElementById('sync-password-field');
	      username.setAttribute("value", logins[0].username);
	      password.setAttribute("value", logins[0].password);
	    }
	    wizard.canAdvance = false;
        break;
	  case "sync-wizard-initialization":
	   var status1 = document.getElementById('sync-wizard-initialization-status');
       var sync1 = document.getElementById('sync-wizard-initialization-button');
	   status1.setAttribute("value", "Status: Ready to Sync.");
	   sync1.setAttribute("disabled", false);
	   wizard.canAdvance = false;
	   break;	   
      case "sync-wizard-privacy":
	    wizard.canAdvance = false;
		break;
	  case "sync-wizard-backup":
	    wizard.canAdvance = true;
		break;
	}
  },

  onAcceptTerms : function SyncWizard_onAcceptTerms() {
  	let wizard = document.getElementById('sync-wizard');
	wizard.canAdvance = true;
  },

  onDeclineTerms : function SyncWizard_onDeclineTerms() {
  	let wizard = document.getElementById('sync-wizard');
	wizard.canAdvance = false;
  },

  onBookmarksBackup : function SyncWizard_onBookmarksBackup() {
      var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      fp.init(window, PlacesUtils.getString("bookmarksBackupTitle"),
              Ci.nsIFilePicker.modeSave);
      fp.appendFilters(Ci.nsIFilePicker.filterHTML);
 
      var dirSvc = Cc["@mozilla.org/file/directory_service;1"].
                   getService(Ci.nsIProperties);
      var backupsDir = dirSvc.get("Desk", Ci.nsILocalFile);
      fp.displayDirectory = backupsDir;
  
      // Use YYYY-MM-DD (ISO 8601) as it doesn't contain illegal characters
      // and makes the alphabetical order of multiple backup files more useful.
      var date = (new Date).toLocaleFormat("%Y-%m-%d");
      fp.defaultString = PlacesUtils.getFormattedString("bookmarksBackupFilename",
                                                        [date]);
  
      if (fp.show() != Ci.nsIFilePicker.returnCancel) {
        var ieSvc = Cc["@mozilla.org/browser/places/import-export-service;1"].
                    getService(Ci.nsIPlacesImportExportService);
        ieSvc.exportHTMLToFile(fp.file);
     }	
  },
   
  onVerify : function SyncWizard_onVerify() {
    let username = document.getElementById('sync-username-field');
    let password = document.getElementById('sync-password-field');

    if (!(username && password && username.value && password.value &&
          username.value != 'nobody@mozilla.com')) {
      alert("You must provide a valid user name and password to continue.");
      return;
    }

    this._addUserLogin(username.value, password.value);
    this._ss.logout();
    this._ss.login();
  },
  
  onSync: function SyncWizard_onSync() {
  	this._ss.sync();
  },

  observe: function(subject, topic, data) {
    let wizard = document.getElementById('sync-wizard');
    let verifyStatus, initStatus, throbber1, throbber2;

    switch(topic) {
    case "bookmarks-sync:login":
      verifyStatus = document.getElementById('sync-wizard-verify-status');
      verifyStatus.setAttribute("value", "Status: Login Verified");
      wizard.canAdvance = true;
      break;
    case "bookmarks-sync:logout":
      break;
    case "bookmarks-sync:login-error":
      verifyStatus = document.getElementById('sync-wizard-verify-status');
      verifyStatus.setAttribute("value", "Status: Login Failed");
      wizard.canAdvance = false;
      break;
    case "bookmarks-sync:start":
      initStatus = document.getElementById('sync-wizard-initialization-status');
      throbber1 = document.getElementById('sync-wizard-initialization-throbber-active');
      throbber2 = document.getElementById('sync-wizard-initialization-throbber');
      throbber1.setAttribute("hidden", false);
      throbber2.setAttribute("hidden", true);
      initStatus.setAttribute("value", "Status: Syncing...");
      break;
    case "bookmarks-sync:end":
      initStatus = document.getElementById('sync-wizard-initialization-status');
      throbber1 = document.getElementById('sync-wizard-initialization-throbber-active');
      throbber2 = document.getElementById('sync-wizard-initialization-throbber');
      let sync1 = document.getElementById('sync-wizard-initialization-button');
      sync1.setAttribute("disabled", true);
      throbber1.setAttribute("hidden", true);
      throbber2.setAttribute("hidden", false);
      initStatus.setAttribute("value", "Status: Sync Complete");
      wizard.canAdvance = true;
      break;                                      
    }
  }
};

let gSyncWizard = new SyncWizard();

function makeURI(uriString) {
  var ioservice = Cc["@mozilla.org/network/io-service;1"].
                  getService(Ci.nsIIOService);
  return ioservice.newURI(uriString, null, null);
}
