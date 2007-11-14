var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function Login() {
  this._init();
}
Login.prototype = {
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

  _log: null,

  _init: function Login__init() {
    let logSvc = Cc["@mozilla.org/log4moz/service;1"].
      getService(Ci.ILog4MozService);
    this._log = logSvc.getLogger("Chrome.Login");
  },

  startUp: function Login_startUp() {
    this._log.info("Sync login window opened");
    this._os.addObserver(this, "bookmarks-sync:login", false);
    this._os.addObserver(this, "bookmarks-sync:login-error", false);

    let username = document.getElementById("username");
    let password = document.getElementById("password");
    username.value = this._ss.username;
    password.value = this._ss.password;

    let branch = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefBranch);
    let hbox = document.getElementById("passphrase-hbox");

    if ("none" == branch.getCharPref("browser.places.sync.encryption"))
      hbox.setAttribute("hidden", "true");
    else {
      hbox.setAttribute("hidden", "false");
      let passphrase = document.getElementById("passphrase");
      passphrase.value = this._ss.passphrase;
    }
  },

  shutDown: function Login_shutDown() {
    this._log.info("Sync login window closed");
    this._os.removeObserver(this, "bookmarks-sync:login");
    this._os.removeObserver(this, "bookmarks-sync:login-error");
  },

  doOK: function Login_doOK() {
    if (this._loggingIn) {
      this._log.warn("Dialog attempted to log in while login is in progress.");
      return;
    }
    this._loggingIn = true;
    let username = document.getElementById("username");
    this._ss.username = username.value;
    let password = document.getElementById("password");
    let passphrase = document.getElementById("passphrase");
    let savePass = document.getElementById("save-password");
    if (savePass.checked) {
      this._ss.password = password.value;
      this._ss.passphrase = passphrase.value;
    } else {
      this._ss.password = null;
      this._ss.passphrase = null;
    }
    this._ss.login(password.value, passphrase);
    return false; // don't close the dialog yet
  },

  _onLogin: function Login__onLogin() {
    let dialog = document.getElementById("login-dialog");
    this._loggingIn = false;
    dialog.cancelDialog();
  },

  _onLoginError: function Login__onLoginError() {
    alert("Login failed");
    this._loggingIn = false;
  },

  doCancel: function Login_doCancel() {
    this._loggingIn = false;
    return true;
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    switch(topic) {
    case "bookmarks-sync:login":
      this._onLogin();
      break;
    case "bookmarks-sync:login-error":
      this._onLoginError();
      break;
    default:
      this._log.warn("Unknown observer notification topic: " + topic);
      break;
    }
  }
};

let gLogin = new Login();

window.addEventListener("load", function(e) { gLogin.startUp(e); }, false);
window.addEventListener("unload", function(e) { gLogin.shutDown(e); }, false);
