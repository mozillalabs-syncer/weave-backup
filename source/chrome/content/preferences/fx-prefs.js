let gWeavePane = {

  get bundle() {
    delete this.bundle; 
    return this.bundle = document.getElementById("weavePrefStrings");
  },

  onLoginError: function () {
    switch(Weave.Status.login) {
      case LOGIN_FAILED_NETWORK_ERROR:
        
        break; 
    }
    
  },

  onLoginFinish: function () {
    Weave.Service.persistLogin();
    document.getElementById("weaveUsername").reset();
    document.getElementById("weavePassword").reset();
    document.getElementById("weavePassphrase").reset();
    this.updateWeavePrefs();
  },

  initWeavePrefs: function () {
    let obs = [
      ["weave:service:login:error",   "onLoginError"],
      ["weave:service:login:finish",  "onLoginFinish"],
      ["weave:service:logout:finish", "updateWeavePrefs"]];

    // Add the observers now and remove them on unload
    let weavePrefs = this;
    let addRem = function(add) obs.forEach(function([topic, func])
      Observers[add ? "add" : "remove"](topic, weavePrefs[func], weavePrefs));
    addRem(true);
    window.addEventListener("unload", function() addRem(false), false);

    this.updateWeavePrefs();
  },

  updateWeavePrefs: function () {
    if (Weave.Service.username) {
      document.getElementById("weavePrefsDeck").selectedIndex = 2;
      document.getElementById("currentUser").value = Weave.Service.username;
    }
    else
      document.getElementById("weavePrefsDeck").selectedIndex = 0;

    this.updateConnectButton();

    let syncEverything = this._checkDefaultValues(this._prefsForDefault);
    document.getElementById("weaveSyncMode").selectedIndex = syncEverything ? 0 : 1;
    this.updateSyncPrefs();
  },

  onServerChange: function () {
    let usingMainServers = document.getElementById("serverType").selectedItem.value == "main";
    document.getElementById("serverRow").hidden = usingMainServers;
  },

  updateConnectButton: function () {
    let str = Weave.Service.isLoggedIn ? this.bundle.getString("disconnect.label")
                                       : this.bundle.getString("connect.label");
    document.getElementById("connectButton").label = str;
    let ready = Weave.Status.service == Weave.STATUS_DELAYED ? false : true;

    document.getElementById("connectButton").disabled = !ready;
  },

  handleConnectCommand: function () {
    Weave.Service.isLoggedIn ? Weave.Service.logout() : Weave.Service.login();
  },
  
  startOver: function () {
    Weave.Service.logout();
    Weave.Svc.Prefs.resetBranch("");
    this.updateWeavePrefs();
    document.getElementById("manageAccountExpander").className = "expander-down";
    document.getElementById("manageAccountControls").collapsed = true;
  },

  changePassword: function () {
    Weave.Utils.openGenericDialog("ChangePassword");
  },

  changePassphrase: function () {
    Weave.Utils.openGenericDialog("ChangePassphrase");
  },

  updateSyncPrefs: function () {
    let syncEverything = document.getElementById("weaveSyncMode").selectedItem.value == "syncEverything";
    document.getElementById("syncModeOptions").selectedIndex = syncEverything ? 0 : 1;

    if (syncEverything) {
      document.getElementById("engine.bookmarks").value = true;
      document.getElementById("engine.passwords").value = true;
      document.getElementById("engine.history").value   = true;
      document.getElementById("engine.tabs").value      = true;
      document.getElementById("engine.prefs").value     = true;    
    }
  },

  _prefsForDefault: [
    "engine.bookmarks",
    "engine.passwords",
    "engine.tabs",
    "engine.prefs",
    "engine.history",
  ],

  /**
   * Check whether all the preferences values are set to their default values
   *
   * @param aPrefs an array of pref names to check for
   * @returns boolean true if all of the prefs are set to their default values,
   *                  false otherwise
   */
  _checkDefaultValues: function (aPrefs) {
    for (let i = 0; i < aPrefs.length; ++i) {
      let pref = document.getElementById(aPrefs[i]);
      if (pref.value != pref.defaultValue)
        return false;
    }
    return true;
  },


  handleExpanderClick: function (event) {
    let expand = event.target.className == "expander-down";
    event.target.className = 
       expand ? "expander-up" : "expander-down";
    document.getElementById("manageAccountControls").collapsed = !expand;
  },
  
  startSignIn: function() {
    document.getElementById("weavePrefsDeck").selectedIndex = 1;
  },
  
  goBack: function () {
    document.getElementById("weavePrefsDeck").selectedIndex = 0;
  },
  
  doSignIn: function() {
    Weave.Service.username = document.getElementById("weaveUsername").value;
    Weave.Service.password = document.getElementById("weavePassword").value;
    Weave.Service.passphrase = document.getElementById("weavePassphrase").value;
    let serverURL = document.getElementById("weaveServerURL").value;
    if (serverURL)
      Weave.Service.serverURL = serverURL;

    Weave.Service.login();
  },
  
  startAccountSetup: function () {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("Weave:AccountSetup");
    if (win)
      win.focus();
    else {
      window.openDialog("chrome://weave/content/preferences/fx-setup.xul",
                        "migration", "centerscreen,chrome,resizable=no");
    }
  }
}
