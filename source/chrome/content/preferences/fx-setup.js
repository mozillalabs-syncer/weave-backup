const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;

// page consts

const INTRO_PAGE                    = 0;
const NEW_ACCOUNT_START_PAGE        = 1;
const NEW_ACCOUNT_PP_PAGE           = 2;
const NEW_ACCOUNT_PREFS_PAGE        = 3;
const NEW_ACCOUNT_CAPTCHA_PAGE      = 4;
const EXISTING_ACCOUNT_LOGIN_PAGE   = 5;
const EXISTING_ACCOUNT_PP_PAGE      = 6;
const EXISTING_ACCOUNT_MERGE_PAGE   = 7;
const EXISTING_ACCOUNT_CONFIRM_PAGE = 8;
const SETUP_SUCCESS_PAGE            = 9;

var gWeaveSetup = {
  get _usingMainServers() {
    if (this._settingUpNew)
      return document.getElementById("serverType").selectedItem.value == "main";

    return document.getElementById("existingServerType").selectedItem.value == "main";
  },

  status: { username: false, password: false, email: false, server: false},

  get captchaBrowser() {
    delete this.captchaBrowser;
    return this.captchaBrowser =document.getElementById("captcha");
  },

  get bundle() {
    delete this.bundle;
    return this.bundle = document.getElementById("weavePrefStrings");
  },

  get wizard() {
    delete this.wizard;
    return this.wizard = document.getElementById("accountSetup");
  },

  init: function () {
    let obs = [
      ["weave:service:changepph:finish", "onResetPP"],
      ["weave:service:login:start",   "onLoginStart"],
      ["weave:service:login:error",   "onLoginEnd"],
      ["weave:service:login:finish",  "onLoginEnd"]];

    // Add the observers now and remove them on unload
    let weavePrefs = this;
    let addRem = function(add) obs.forEach(function([topic, func])
      Weave.Svc.Obs[add ? "add" : "remove"](topic, weavePrefs[func], weavePrefs));
    addRem(true);
    window.addEventListener("unload", function() addRem(false), false);
    
    if (window.arguments && window.arguments[0] == true) {
      // we're resetting sync
      this._resettingSync = true;
      this.wizard.pageIndex = EXISTING_ACCOUNT_MERGE_PAGE;
    }
    else {
      this.wizard.canAdvance = false;
      this.captchaBrowser.addProgressListener(this);
      Weave.Svc.Prefs.set("firstSync", "notReady");
    }
  },

  updateSyncPrefs: function () {
    let syncEverything = document.getElementById("weaveSyncMode").selectedItem.value == "syncEverything";
    document.getElementById("syncModeOptions").selectedIndex = syncEverything ? 0 : 1;

    if (syncEverything) {
      document.getElementById("engine.bookmarks").checked = true;
      document.getElementById("engine.passwords").checked = true;
      document.getElementById("engine.history").checked   = true;
      document.getElementById("engine.tabs").checked      = true;
      document.getElementById("engine.prefs").checked     = true;
    }
  },
  
  startNewAccountSetup: function () {
    this._settingUpNew = true;
    this.wizard.pageIndex = NEW_ACCOUNT_START_PAGE;
    this.wizard.getButton("cancel").label = this.bundle.getString("cancelSetup.label");
  },

  useExistingAccount: function () {
    this._settingUpNew = false;
    this.wizard.pageIndex = EXISTING_ACCOUNT_LOGIN_PAGE;
    this.wizard.getButton("cancel").label = this.bundle.getString("cancelSetup.label");
  },

  onResetPP: function () {
    document.getElementById("existingPassphrase").value = Weave.Service.passphrase;
    this.wizard.advance();
  },

  onLoginStart: function () {
    this.toggleLoginFeedback(false);
  },

  onLoginEnd: function () {
    this.toggleLoginFeedback(true);
  },

  toggleLoginFeedback: function (stop) {
    switch (this.wizard.pageIndex) {
      case EXISTING_ACCOUNT_LOGIN_PAGE:
        document.getElementById("connect-throbber").hidden = stop;
        let feedback = document.getElementById("existingPasswordFeedbackRow");
        if (stop) {
          let success = Weave.Status.login == Weave.LOGIN_SUCCEEDED || Weave.Status.login == Weave.LOGIN_FAILED_INVALID_PASSPHRASE;
          this._setFeedbackMessage(feedback, success, Weave.Status.login);
        }
        else
          this._setFeedbackMessage(feedback, true);
        break;
      case EXISTING_ACCOUNT_PP_PAGE:
        document.getElementById("passphrase-throbber").hidden = stop;
        feedback = document.getElementById("existingPassphraseFeedbackBox");
        if (stop) {
          let success = Weave.Status.login == Weave.LOGIN_SUCCEEDED;
          this._setFeedbackMessage(feedback, success, Weave.Status.login);
          document.getElementById("passphraseHelpBox").hidden = success;
        }
        else
          this._setFeedbackMessage(feedback, true);

        break;
    }
  },

  handleExpanderClick: function (event) {
    let expander = document.getElementById("setupAccountExpander");
    let expand = expander.className == "expander-down";
    expander.className =
       expand ? "expander-up" : "expander-down";
    document.getElementById("signInBox").hidden = !expand;
  },

  setupInitialSync: function () {
    let action = document.getElementById("mergeChoiceRadio").selectedItem.id;
    switch (action) {
      case "resetClient":
        // if we're not resetting sync, we don't need to explicitly
        // call resetClient
        if (!this._resettingSync)
          return;
        // otherwise, fall through
      case "wipeClient":
      case "wipeRemote":
        Weave.Svc.Prefs.set("firstSync", action);
        break;
    }
  },

  // fun with validation!
  checkFields: function () {
    this.wizard.canAdvance = this.readyToAdvance();
  },

  readyToAdvance: function () {
    switch (this.wizard.pageIndex) {
      case INTRO_PAGE:
        return false;
      case NEW_ACCOUNT_START_PAGE:
        for (i in this.status) {
          if (!this.status[i])
            return false;
        }
        if (this._usingMainServers)
          return document.getElementById("tos").checked;

        return true;
      case NEW_ACCOUNT_PP_PAGE:
        return this.onPassphraseChange();
      case EXISTING_ACCOUNT_LOGIN_PAGE:
        let hasUser = document.getElementById("existingUsername").value != "";
        let hasPass = document.getElementById("existingPassword").value != "";
        if (hasUser && hasPass) {
          if (this._usingMainServers)
            return true;

          if (this._validateServer(document.getElementById("existingServerURL"), false))
            return true;
        }
        return false;
      case EXISTING_ACCOUNT_PP_PAGE:
        return document.getElementById("existingPassphrase").value != "";
    }
    // we probably shouldn't get here
    return true;
  },

  onUsernameChange: function () {
    let feedback = document.getElementById("usernameFeedbackRow");
    let val = document.getElementById("weaveUsername").value;
    let availCheck = "", str = "";
    let available = true;
    if (val) {
      availCheck = Weave.Service.checkUsername(val);
      available = availCheck == "available"; 
    }      

    if (!available) {
      if (availCheck == "notAvailable")
        str = "usernameNotAvailable.label";
      else
        str = availCheck;
    }

    this._setFeedbackMessage(feedback, available, str);

    this.status.username = val && available;
    if (available)
      Weave.Service.username = val;

    this.checkFields();
  },

  onPasswordChange: function () {
    let feedback = document.getElementById("passwordFeedbackRow");
    let password = document.getElementById("weavePassword");
    let pwconfirm = document.getElementById("weavePasswordConfirm");

    let [valid, errorString] = gWeaveCommon.validatePassword(password, pwconfirm);
    this._setFeedback(feedback, valid, errorString);

    this.status.password = valid;
    this.checkFields();
  },

  onEmailChange: function () {
    let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    this.status.email = re.test(document.getElementById("weaveEmail").value);

    this._setFeedbackMessage(document.getElementById("emailFeedbackRow"),
                             this.status.email,
                             "invalidEmail.label");

    this.checkFields();
  },

  onPassphraseChange: function () {
    // state values: 0 = valid, 1 = invalid, no warn, 2 = invalid, warn
    let el1 = document.getElementById("weavePassphrase");
    let el2 = document.getElementById("weavePassphraseConfirm");
    let [valid, str] = gWeaveCommon.validatePassphrase(el1, el2);

    let feedback = document.getElementById("passphraseFeedbackRow");
    this._setFeedback(feedback, valid, str);
    return valid;
  },

  onPageShow: function() {
    switch (this.wizard.pageIndex) {
      case INTRO_PAGE:
        this.wizard.getButton("next").hidden = true;
        this.wizard.getButton("back").hidden = true;
        this.wizard.getButton("cancel").label = this.bundle.getString("later.label");
        break;
      case NEW_ACCOUNT_START_PAGE:
        this.onServerChange();
        this.checkFields(); // fall through
      case EXISTING_ACCOUNT_LOGIN_PAGE:
      case EXISTING_ACCOUNT_MERGE_PAGE:
        this.wizard.getButton("next").hidden = false;
        this.wizard.getButton("back").hidden = false;
        this.wizard.canRewind = !this._resettingSync;
        break;
      case SETUP_SUCCESS_PAGE:
        this.wizard.canRewind = false;
        this.wizard.getButton("back").hidden = true;
        this.wizard.getButton("cancel").hidden = true;
        break;
    }
  },

  onWizardAdvance: function () {
    if (!this.wizard.pageIndex)
      return true;

    switch (this.wizard.pageIndex) {
      case NEW_ACCOUNT_PREFS_PAGE:
        if (this._settingUpNew) {
          // time to load the captcha
          // first check for NoScript and whitelist the right sites
          this._handleNoScript(true);
          this.captchaBrowser.loadURI(Weave.Service.miscAPI + "captcha_html");
          return true;
        }

        this.wizard.pageIndex = SETUP_SUCCESS_PAGE;
        return false;
      case NEW_ACCOUNT_CAPTCHA_PAGE:
        let doc = this.captchaBrowser.contentDocument;
        let getField = function getField(field) {
          let node = doc.getElementById("recaptcha_" + field + "_field");
          return node && node.value;
        };

        this.startThrobber(true);
        let username = document.getElementById("weaveUsername").value;
        let password = document.getElementById("weavePassword").value;
        let email    = document.getElementById("weaveEmail").value;
        let challenge = getField("challenge");
        let response = getField("response");

        let error = Weave.Service.createAccount(username, password, email,
                                                challenge, response);
        this.startThrobber(false);

        if (error == null) {
          Weave.Service.username = username;
          Weave.Service.password = password;
          this._handleNoScript(false);
          this.wizard.pageIndex = SETUP_SUCCESS_PAGE;
          return true;
        }

        // this could be nicer, but it'll do for now
        Weave.Svc.Prompt.alert(window,
                               this.bundle.getString("errorCreatingAccount.title"),
                               Weave.Utils.getErrorString(error));
        return false;
      case NEW_ACCOUNT_PP_PAGE:
        Weave.Service.passphrase = document.getElementById("weavePassphrase").value;
        break;
      case EXISTING_ACCOUNT_LOGIN_PAGE:
        Weave.Service.username = document.getElementById("existingUsername").value;
        Weave.Service.password = document.getElementById("existingPassword").value;
        Weave.Service.passphrase = document.getElementById("existingPassphrase").value || "foo";
        if (Weave.Service.login()) {
          // jump to merge screen
          this.wizard.pageIndex = EXISTING_ACCOUNT_MERGE_PAGE;
          return false;
        }
        else {
          if (Weave.Status.login == Weave.LOGIN_FAILED_INVALID_PASSPHRASE ||
              Weave.Status.login == Weave.LOGIN_FAILED_NO_PASSPHRASE) {
            Weave.Service.passphrase = "";
          }
          else {
            let feedback = document.getElementById("existingPasswordFeedbackRow");
            this._setFeedbackMessage(feedback, false, Weave.Status.login);
            return false;
          }
        }
        break;
      case EXISTING_ACCOUNT_PP_PAGE:
        Weave.Service.passphrase = document.getElementById("existingPassphrase").value;
        if (Weave.Service.login())
          return true;

        return false;
      case EXISTING_ACCOUNT_MERGE_PAGE:
        return this._handleChoice();
      case EXISTING_ACCOUNT_CONFIRM_PAGE:
        this.setupInitialSync();
        if (this._resettingSync) {
          this.onWizardFinish();
          window.close();
          return false;
        }
        
        this.wizard.pageIndex = NEW_ACCOUNT_PREFS_PAGE;
        return false;
    }
    return true;
  },

  onWizardBack: function () {
    switch (this.wizard.pageIndex) {
      case NEW_ACCOUNT_START_PAGE:
      case EXISTING_ACCOUNT_LOGIN_PAGE:
        this.wizard.pageIndex = INTRO_PAGE;
        return false;
      case EXISTING_ACCOUNT_PP_PAGE: // no idea wtf is up here, but meh!
        this.wizard.pageIndex = EXISTING_ACCOUNT_LOGIN_PAGE;
        return false;
      case NEW_ACCOUNT_PREFS_PAGE:
        if (this._settingUpNew)
          return true;

        this.wizard.pageIndex = EXISTING_ACCOUNT_CONFIRM_PAGE;
        return false;
    }
    return true;
  },

  onWizardFinish: function () {
    function isChecked(element) {
      return document.getElementById(element).hasAttribute("checked");
    }

    let prefs = ["engine.bookmarks", "engine.passwords", "engine.history", "engine.tabs", "engine.prefs"];
    for (let i = 0;i < prefs.length;i++) {
      Weave.Svc.Prefs.set(prefs[i], isChecked(prefs[i]));
    }

    this._handleNoScript(false);
    Weave.Status.service == Weave.STATUS_OK;
    if (Weave.Svc.Prefs.get("firstSync", "") == "notReady")
      Weave.Svc.Prefs.reset("firstSync");

    if (!Weave.Service.isLoggedIn)
      Weave.Service.login();

    Weave.Service.persistLogin();
    Weave.Svc.Obs.notify("weave:service:setup-complete");
    Weave.Service.syncOnIdle(1);
  },

  onWizardCancel: function () {
    if (this._resettingSync)
      return;

    if (this.wizard.pageIndex == 9) {
      this.onWizardFinish();
      return;
    }
    this._handleNoScript(false);
    Weave.Service.startOver();
  },

  _disabledSites: [],
  get _remoteSites() {
    return [Weave.Service.serverURL, "https://api-secure.recaptcha.net"];
  },

  _handleNoScript: function (addExceptions) {
    // if NoScript isn't installed, or is disabled, bail out.
    let ns = Cc["@maone.net/noscript-service;1"];
    if (ns == null)
      return;

    ns = ns.getService().wrappedJSObject;
    if (addExceptions) {
      this._remoteSites.forEach(function(site) {
        site = ns.getSite(site);
        if (!ns.isJSEnabled(site)) {
          this._disabledSites.push(site); // save status
          ns.setJSEnabled(site, true); // allow site
        }
      }, this);
    }
    else {
      this._disabledSites.forEach(function(site) {
        ns.setJSEnabled(site, false);
      });
      this._disabledSites = [];
    }
  },

  startThrobber: function (start) {
    // FIXME: stubbed
  },

  onServerChange: function () {
    if (this.wizard.pageIndex == EXISTING_ACCOUNT_LOGIN_PAGE) {
      if (this._usingMainServers)
        Weave.Svc.Prefs.reset("serverURL");
      document.getElementById("existingServerRow").hidden = this._usingMainServers;
      this.checkFields();
      return;
    }

    document.getElementById("serverRow").hidden = this._usingMainServers;
    document.getElementById("TOSRow").hidden = !this._usingMainServers;
    let valid = false;
    let feedback = document.getElementById("serverFeedbackRow");

    if (this._usingMainServers) {
      Weave.Svc.Prefs.reset("serverURL");
      valid = true;
      feedback.hidden = true;
    }
    else {
      let el = document.getElementById("weaveServerURL");
      let str = "";
      if (el.value) {
        valid = this._validateServer(el, true);
        let str = valid ? "" : "serverInvalid.label";
        this._setFeedbackMessage(feedback, valid, str);
      }
      else
        this._setFeedbackMessage(feedback, true);
    }

    // recheck username against the new server
    if (valid) 
      this.onUsernameChange();

    this.status.server = valid;
    this.checkFields();
  },

  // xxxmpc - checkRemote is a hack, we can't verify a minimal server is live
  // without auth, so we won't validate in the existing-server case.
  _validateServer: function (element, checkRemote) {
    let valid = false;
    let uri = Weave.Utils.makeURI(element.value);
    
    if (!uri)
      uri = Weave.Utils.makeURI("https://" + element.value);

    if (uri && checkRemote) {
      function isValid(uri) {
        Weave.Service.serverURL = uri.spec;
        let check = Weave.Service.checkUsername("a");
        return (check == "available" || check == "notAvailable");
      }

      if (uri.schemeIs("http")) {
        let uri2 = uri;
        uri2.scheme = "https";
        if (isValid(uri2))
          valid = true;
      }
      if (!valid)
        valid = isValid(uri);
    }
    else if (uri) {
      valid = true;
      Weave.Service.serverURL = uri.spec;
    }

    if (valid)
      element.value = Weave.Service.serverURL;
    else
      Weave.Svc.Prefs.reset("serverURL");

    return valid;
  },

  _handleChoice: function () {
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

    return true;
  },

  // sets class and string on a feedback element
  // if no property string is passed in, we clear label/style
  _setFeedback: function (element, success, string) {
    element.hidden = success || !string;
    let class = success ? "success" : "error";
    let image = element.firstChild.nextSibling.firstChild;
    image.setAttribute("status", class);
    let label = image.nextSibling;
    label.value = string;
  },

  // shim
  _setFeedbackMessage: function (element, success, string) {
    let str = "";
    if (string) {
      try {
        str = this.bundle.getString(string);
      } catch(e) {}
  
      if (!str)
        str = Weave.Utils.getErrorString(string);
    }
    this._setFeedback(element, success, str);
  },

  QueryInterface: function (aIID) {
    if (aIID.equals(Ci.nsIWebProgressListener) ||
        aIID.equals(Ci.nsISupportsWeakReference) ||
        aIID.equals(Ci.nsISupports))
      return this;
    throw Cr.NS_NOINTERFACE;
  },

  onStateChange: function(webProgress, request, stateFlags, status) {
    // We're only looking for the end of the frame load
    if ((stateFlags & Ci.nsIWebProgressListener.STATE_STOP) == 0)
      return;
    if ((stateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK) == 0)
      return;
    if ((stateFlags & Ci.nsIWebProgressListener.STATE_IS_WINDOW) == 0)
      return;

    // If we didn't find the captcha, assume it's not needed and move on
    if (request.QueryInterface(Ci.nsIHttpChannel).responseStatus == 404)
      this.onWizardAdvance();
  },
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLocationChange: function () {}
}
