let gWeavePane = {
  get _usingMainServers() {
    return document.getElementById("serverType").selectedItem.value == "main";
  },

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

  onLoginStart: function () {
    switch (this.page) {
      case "0":
        document.getElementById("signInFeedbackBox").hidden = false;
        break;
      case "1":
        let box = document.getElementById("passphraseFeedbackBox");
        this._setFeedbackMessage(box, true);
        box.hidden = false;
        document.getElementById("passphrase-throbber").hidden = false;
        break;
      case "4":
        document.getElementById("connect-throbber").hidden = false;
        break;
    }
  },

  onLoginError: function () {
    let errorString = Weave.Utils.getErrorString(Weave.Status.login);
    let feedback = null;

    switch (this.page) {
      case "0":
        document.getElementById("signInFeedbackBox").hidden = true;
        feedback = document.getElementById("passwordFeedbackRow");

        // Move on to the passphrase page if that's the only failure
        if (Weave.Status.login == Weave.LOGIN_FAILED_INVALID_PASSPHRASE ||
            Weave.Status.login == Weave.LOGIN_FAILED_NO_PASSPHRASE) {
          this.page = 1;
          document.getElementById("weavePassphrase").focus();
          return;
        }
        break;
      case "1":
        document.getElementById("passphrase-throbber").hidden = true;
        switch (Weave.Status.login) {
          case Weave.LOGIN_FAILED_LOGIN_REJECTED:
            feedback = document.getElementById("passwordFeedbackRow");
            this.page = 0;
            break;
          default:
            feedback = document.getElementById("passphraseFeedbackBox");
            document.getElementById("passphraseHelpBox").hidden = false;
            document.getElementById("weavePassphrase").select();
            break;
        }
        break;
      case "4":
        document.getElementById("connect-throbber").hidden = true;
        feedback = document.getElementById("loginFeedbackRow");
        this.updateWeavePrefs();
        break;
    }
    this._setFeedbackMessage(feedback, false, errorString);
  },

  onLoginFinish: function () {
    document.getElementById("passphrase-throbber").hidden = true;
    document.getElementById("connect-throbber").hidden = true;
    document.getElementById("signInFeedbackBox").hidden = true;
    Weave.Service.persistLogin();
    this._setFeedbackMessage(document.getElementById("loginFeedbackRow"), true);
    this._setFeedbackMessage(document.getElementById("passphraseFeedbackBox"), true);
    this._setFeedbackMessage(document.getElementById("passwordFeedbackRow"), true);
    document.getElementById("weaveUsername").reset();
    document.getElementById("weavePassword").reset();
    document.getElementById("weavePassphrase").reset();
    document.getElementById("weaveServerURL").reset();
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
    let self = this;
    function setupForm() {
      document.getElementById("weaveUsername").value = Weave.Service.username;
      document.getElementById("weaveServerURL").value = Weave.Service.serverURL;
      // Show the custom url field if we need to.
      document.getElementById("serverType").selectedIndex =
        Weave.Service.serverURL == Weave.DEFAULT_SERVER ? 0 : 1;
      self.onServerChange();
    }
    // The password changed or isn't saved by the app, so ask for a new one
    if (Weave.Status.login == Weave.LOGIN_FAILED_LOGIN_REJECTED ||
        Weave.Status.login == Weave.LOGIN_FAILED_NO_PASSWORD) {
      this.page = 0;
      setupForm();
      document.getElementById("weavePassphrase").value = Weave.Service.passphrase || "";
      this.onLoginError();
    }
    // The passphrase must have changed so ask for a new one
    else if (Weave.Status.login == Weave.LOGIN_FAILED_INVALID_PASSPHRASE ||
             Weave.Status.login == Weave.LOGIN_FAILED_NO_PASSPHRASE) {
      this.page = 1;
      setupForm();
      document.getElementById("weavePassword").value = Weave.Service.password;
      this.onLoginError();
    }
    else if (Weave.Service.username &&
        Weave.Svc.Prefs.get("firstSync", "") == "notReady") {
      this.page = 2;
      Weave.Clients.sync();
    }
    else if (Weave.Service.username) {
      document.getElementById("currentUser").value = Weave.Service.username;
      this.page = 4;
    }
    else {
      Weave.Svc.Prefs.set("firstSync", "notReady");
      this.page = 0;
    }

    this.updateConnectButton();
    this.updateSetupButtons();

    let syncEverything = this._checkDefaultValues();
    document.getElementById("weaveSyncMode").selectedIndex = syncEverything ? 0 : 1;
    document.getElementById("syncModeOptions").selectedIndex = syncEverything ? 0 : 1;
    this.checkFields();
  },

  onServerChange: function () {
    if (this._usingMainServers)
      document.getElementById("weaveServerURL").value = "";
    document.getElementById("serverRow").hidden = this._usingMainServers;
    this.checkFields();
  },

  updateSetupButtons: function () {
    let elems = ["weaveUsername", "weaveUsernameLabel",
                 "weavePassword", "weavePasswordLabel",
                 "weaveServerURL", "weaveServerURLLabel",
                 "signInButton", "createAccountButton", "serverType"]
    let pbEnabled = Weave.Svc.Private.privateBrowsingEnabled;
    for (let i = 0;i < elems.length;i++)
      document.getElementById(elems[i]).disabled = pbEnabled;
  },

  handleChoice: function () {
    let desc = document.getElementById("mergeChoiceRadio").selectedIndex;
    document.getElementById("chosenActionDeck").selectedIndex = desc;
    switch (desc) {
      case 1:
        if (this._case1Setup)
          break;

        // history
        let db = Weave.Svc.History.DBConnection;

        let daysOfHistory = 0;
        let stm = db.createStatement(
          "SELECT ROUND(( " +
            "strftime('%s','now','localtime','utc') - " +
            "( " +
              "SELECT visit_date FROM moz_historyvisits " +
              "UNION ALL " +
              "SELECT visit_date FROM moz_historyvisits_temp " +
              "ORDER BY visit_date ASC LIMIT 1 " +
              ")/1000000 " +
            ")/86400) AS daysOfHistory ");

        if (stm.step())
          daysOfHistory = stm.getInt32(0);
        document.getElementById("historyCount").value =
          this.bundle.getFormattedString("historyCount.label",  [daysOfHistory]);

        // bookmarks
        let bookmarks = 0;
        stm = db.createStatement(
          "SELECT count(*) AS bookmarks " +
          "FROM moz_bookmarks b " +
          "LEFT JOIN moz_bookmarks t ON " +
          "b.parent = t.id WHERE b.type = 1 AND t.parent <> :tag");
        stm.params.tag = Weave.Svc.Bookmark.tagsFolder;
        if (stm.executeStep())
          bookmarks = stm.row.bookmarks;
        document.getElementById("bookmarkCount").value =
          this.bundle.getFormattedString("bookmarkCount.label", [bookmarks]);

        // passwords
        let logins = Weave.Svc.Login.getAllLogins({});
        document.getElementById("passwordCount").value =
          this.bundle.getFormattedString("passwordCount.label",  [logins.length]);
        this._case1Setup = true;
        break;
      case 2:
        if (this._case2Setup)
          break;
        let count = 0;
        function appendNode(label) {
          let box = document.getElementById("clientList");
          let node = document.createElement("label");
          node.setAttribute("value", label);
          node.setAttribute("class", "data indent");
          box.appendChild(node);
        }

        for each (let name in Weave.Clients.stats.names) {
          // Don't list the current client
          if (name == Weave.Clients.localName)
            continue;

          // Only show the first several client names
          if (++count <= 5)
            appendNode(name);
        }
        if (count > 5) {
          let label =
            this.bundle.getFormattedString("additionalClients.label", [count - 5]);
          appendNode(label);
        }
        this._case2Setup = true;
        break;
    }

    this.page = 3;
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

  resetSync: function() {
    this.handleExpanderClick();
    // Trigger the move to page 2
    Weave.Svc.Prefs.set("firstSync", "notReady");
    // Hide the "start over" button
    document.getElementById("startOver").hidden = true;
    this.updateWeavePrefs();
  },

  recoverPassword: function () {
    openUILinkIn(Weave.Svc.Prefs.get("pwChangeURL"), "tab");
    return; // xxx: FIXME EWTF_PASSWORD_REQUEST_API_CHANGED
    let ok = Weave.Service.requestPasswordReset(Weave.Service.username);
    if (ok) { // xxxmpc: FIXME
      Weave.Svc.Prompt.alert(window,
                             this.bundle.getString("recoverPasswordSuccess.title"),
                             this.bundle.getString("recoverPasswordSuccess.label"));
    }
    else {
      // this should never ever get hit, so shouldn't get localized
      alert("Account name not on record, maybe it was deleted? EWTF_NO_ACCOUNT");
    }
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

  goBack: function () {
    this.page -= 1;
  },

  doSignIn: function () {
    Weave.Service.username = document.getElementById("weaveUsername").value;
    Weave.Service.password = document.getElementById("weavePassword").value;
    Weave.Service.passphrase = document.getElementById("weavePassphrase").value;
    let serverURI =
      Weave.Utils.makeURI(document.getElementById("weaveServerURL").value);
    if (serverURI)
      Weave.Service.serverURL = serverURI.spec;
    else
      Weave.Svc.Prefs.reset("serverURL");

    Weave.Service.login();
  },

  setupInitialSync: function (syncChoice) {
    switch (syncChoice) {
      case "wipeRemote":
      case "wipeClient":
        Weave.Svc.Prefs.set("firstSync", syncChoice);
        break;
      case "merge":
        Weave.Svc.Prefs.reset("firstSync");
        break;
    }
    Weave.Service.syncOnIdle(1); // shorter delay than normal
    // Make sure the "start over" button is shown again
    document.getElementById("startOver").hidden = false;
    window.close();
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
  },

  isReady: function () {
    let ready = false;
    switch (this.page) {
      case "0":
        let hasUser = document.getElementById("weaveUsername").value != "";
        let hasPass = document.getElementById("weavePassword").value != "";
        if (hasUser && hasPass) {
          if (this._usingMainServers)
            return true;

          let uri = Weave.Utils.makeURI(document.getElementById("weaveServerURL").value);
          if (uri &&
              (uri.schemeIs("http") || uri.schemeIs("https")) &&
              uri.host != "")
            ready = true;
        }
        break;
      case "1":
        if (document.getElementById("weavePassphrase").value != "")
          ready = true;
        break;
    }

    return ready;
  },

  checkFields: function () {
    switch (this.page) {
      case "0":
        document.getElementById("signInButton").setAttribute("disabled", !this.isReady());
        break;
      case "1":
        document.getElementById("continueButton").setAttribute("disabled", !this.isReady());
        break;
    }
  },

  handleKeypress: function (event) {
    this.checkFields();
    if (event.keyCode != Components.interfaces.nsIDOMKeyEvent.DOM_VK_RETURN)
      return true;

    event.preventDefault();
    if (this.isReady()) {
      this.doSignIn();
    }

    return false;
  },

  // sets class and string on a feedback element
  // if no property string is passed in, we clear label/style
  _setFeedbackMessage: function (element, success, string) {
    element.hidden = success;
    let label = element.firstChild.nextSibling;
    let classname = "";
    if (string) {
      classname = success ? "success" : "error";
    }
    label.value = string || "";
    label.className = classname;
  }
}
