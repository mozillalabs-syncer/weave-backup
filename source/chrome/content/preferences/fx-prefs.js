let gWeavePane = {
  get bundle() {
    delete this.bundle;
    return this.bundle = document.getElementById("weavePrefStrings");
  },

  get page() {
    return document.getElementById("weavePrefsDeck").selectedIndex;
  },

  set page(val) {
    document.getElementById("weavePrefsDeck").selectedIndex = val;
  },

  get prefArray() {
    return ["engine.bookmarks", "engine.passwords", "engine.prefs",
      "engine.tabs", "engine.history"];
  },
  
  get _usingCustomServer() {
    return Weave.Svc.Prefs.isSet("serverURL");
  },

  onLoginStart: function () {
    if (this.page == 0)
      return;

    document.getElementById("loginFeedbackRow").hidden = true;
    document.getElementById("connect-throbber").hidden = false;
  },

  onLoginError: function () {
    if (this.page == 0)
      return;

    document.getElementById("connect-throbber").hidden = true;
    document.getElementById("loginFeedbackRow").hidden = false;
    let label = document.getElementById("loginError");
    label.value = Weave.Utils.getErrorString(Weave.Status.login);
    label.className = "error";
  },

  onLoginFinish: function () {
    document.getElementById("connect-throbber").hidden = true;
    this.updateWeavePrefs();
  },

  onPBModeChange: function () {
    this.updateConnectButton();
    this.updateSetupButtons();
    this.checkFields();
  },

  initWeavePrefs: function () {
    let obs = [
      ["weave:service:login:start",   "onLoginStart"],
      ["weave:service:login:error",   "onLoginError"],
      ["weave:service:login:finish",  "onLoginFinish"],
      ["private-browsing",            "onPBModeChange"],
      ["weave:service:start-over",    "updateWeavePrefs"],
      ["weave:service:setup-complete","updateWeavePrefs"],
      ["weave:service:logout:finish", "updateWeavePrefs"]];

    // Add the observers now and remove them on unload
    let weavePrefs = this;
    let addRem = function(add) obs.forEach(function([topic, func])
      Weave.Svc.Obs[add ? "add" : "remove"](topic, weavePrefs[func], weavePrefs));
    addRem(true);
    window.addEventListener("unload", function() addRem(false), false);

    this.updateWeavePrefs();
  },

  updateWeavePrefs: function () {
    if (Weave.Status.service == Weave.CLIENT_NOT_CONFIGURED ||
        Weave.Svc.Prefs.get("firstSync", "") == "notReady")
      this.page = 0;
    else {
      this.page = 1;
      document.getElementById("currentUser").value = Weave.Service.username;
      if (Weave.Status.service == Weave.LOGIN_FAILED)
        this.onLoginError();
      this.updateConnectButton();
      this.updateSetupButtons();
      let syncEverything = this._checkDefaultValues();
      document.getElementById("weaveSyncMode").selectedIndex = syncEverything ? 0 : 1;
      document.getElementById("syncModeOptions").selectedIndex = syncEverything ? 0 : 1;
      document.getElementById("tosPP").hidden = this._usingCustomServer;
    }
  },

  updateSetupButtons: function () {
    let elems = [ "manageAccountExpander"];
    let pbEnabled = Weave.Svc.Private.privateBrowsingEnabled;
    for (let i = 0;i < elems.length;i++)
      document.getElementById(elems[i]).disabled = pbEnabled;

    if (document.getElementById("manageAccountExpander")
                .className == "expander-up" && pbEnabled)
      this.handleExpanderClick();
  },


  updateConnectButton: function () {
    let str = Weave.Service.isLoggedIn ? this.bundle.getString("disconnect.label")
                                       : this.bundle.getString("connect.label");
    document.getElementById("connectButton").label = str;
    let pbEnabled = Weave.Svc.Private.privateBrowsingEnabled;
    document.getElementById("connectButton").disabled = pbEnabled;
  },

  handleConnectCommand: function () {
    Weave.Service.isLoggedIn ? Weave.Service.logout() : Weave.Service.login();
  },

  startOver: function (showDialog) {
    if (showDialog) {
      let flags = Weave.Svc.Prompt.BUTTON_POS_0 * Weave.Svc.Prompt.BUTTON_TITLE_IS_STRING +
                  Weave.Svc.Prompt.BUTTON_POS_1 * Weave.Svc.Prompt.BUTTON_TITLE_CANCEL;
      let buttonChoice =
        Weave.Svc.Prompt.confirmEx(window,
                                   this.bundle.getString("differentAccount.title"),
                                   this.bundle.getString("differentAccount.label"),
                                   flags,
                                   this.bundle.getString("differentAccountConfirm.label"),
                                   null, null, null, {});

      // If the user selects cancel, just bail
      if (buttonChoice == 1)
        return;
    }

    this.handleExpanderClick();
    Weave.Service.startOver();
    this.updateWeavePrefs();
    document.getElementById("manageAccountExpander").className = "expander-down";
    document.getElementById("manageAccountControls").hidden = true;
  },

  updatePass: function () {
    if (Weave.Status.login == Weave.LOGIN_FAILED_LOGIN_REJECTED)
      gWeaveCommon.changePassword();
    else
      gWeaveCommon.updatePassphrase();
  },

  resetPass: function () {
    if (Weave.Status.login == Weave.LOGIN_FAILED_LOGIN_REJECTED)
      gWeaveCommon.resetPassword();
    else
      gWeaveCommon.resetPassphrase();
  },

  updateSyncPrefs: function () {
    let syncEverything = document.getElementById("weaveSyncMode").selectedItem.value == "syncEverything";
    document.getElementById("syncModeOptions").selectedIndex = syncEverything ? 0 : 1;

    if (syncEverything) {
      let prefs = this.prefArray;
      for (let i = 0; i < prefs.length; ++i)
        document.getElementById(prefs[i]).value = true;
    }
  },

  /**
   * Check whether all the preferences values are set to their default values
   *
   * @param aPrefs an array of pref names to check for
   * @returns boolean true if all of the prefs are set to their default values,
   *                  false otherwise
   */
  _checkDefaultValues: function () {
    let prefs = this.prefArray;
    for (let i = 0; i < prefs.length; ++i) {
      let pref = document.getElementById(prefs[i]);
      if (pref.value != pref.defaultValue)
        return false;
    }
    return true;
  },


  handleExpanderClick: function () {
    // ok, this is pretty evil, and likely fragile if the prefwindow
    // binding changes, but that won't happen in 3.6 *fingers crossed*
    let prefwindow = document.documentElement;
    let pane = document.getElementById("paneWeaveServices");
    if (prefwindow._shouldAnimate)
      prefwindow._currentHeight = pane.contentHeight;

    let expander = document.getElementById("manageAccountExpander");
    let expand = expander.className == "expander-down";
    expander.className =
       expand ? "expander-up" : "expander-down";
    document.getElementById("manageAccountControls").hidden = !expand;

    // and... shazam
    if (prefwindow._shouldAnimate)
      prefwindow.animate("null", pane);
  },

  openSetup: function (resetSync) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var win = wm.getMostRecentWindow("Weave:AccountSetup");
    if (win)
      win.focus();
    else {
      window.openDialog("chrome://weave/content/preferences/fx-setup.xul",
                        "weaveSetup", "centerscreen,chrome,resizable=no", resetSync);
    }
  },
  
  resetSync: function () {
    this.openSetup(true);
  }
}
