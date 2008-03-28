var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function Login() {
  this._init();
}
Login.prototype = {
  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle });
    return this._stringBundle;
  },

  _log: null,

  _init: function Login__init() {
    this._log = Log4Moz.Service.getLogger("Chrome.Login");
  },

  startUp: function Login_startUp() {
    this._log.info("Sync login window opened");
    this._os.addObserver(this, "weave:service-login:success", false);
    this._os.addObserver(this, "weave:service-login:error", false);

    let username = document.getElementById("username");
    username.value = Weave.Service.username;
    if (Weave.Service.password) {
      let password = document.getElementById("password");
      password.value = Weave.Service.password;
    }

    let branch = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefBranch);
    let hbox = document.getElementById("passphrase-hbox");

    if ("none" == branch.getCharPref("extensions.weave.encryption"))
      hbox.setAttribute("hidden", "true");
    else {
      hbox.setAttribute("hidden", "false");
      if (Weave.Service.passphrase) {
	let passphrase = document.getElementById("passphrase");
	passphrase.value = Weave.Service.passphrase;
      }
    }
  },

  shutDown: function Login_shutDown() {
    this._log.info("Sync login window closed");
    this._os.removeObserver(this, "weave:service-login:success");
    this._os.removeObserver(this, "weave:service-login:error");
  },

  _onLogin: function Login__onLogin() {
    let dialog = document.getElementById("login-dialog");
    this._loggingIn = false;
    dialog.cancelDialog();
  },

  _onLoginError: function Login__onLoginError() {
    alert(this._stringBundle.getString("loginFailed.alert"));
    this._loggingIn = false;
  },

  doOK: function Login_doOK() {
    if (this._loggingIn) {
      this._log.warn("Dialog attempted to log in while login is in progress.");
      return;
    }
    this._loggingIn = true;
    let username = document.getElementById("username");
    Weave.Service.username = username.value;
    let password = document.getElementById("password");
    let passphrase = document.getElementById("passphrase");
    let savePass = document.getElementById("save-password");

    if (!password.value) {
      alert(this._stringBundle.getString("noPassword.alert"));
      return false;
    }
    if (!passphrase.value) {
      alert(this._stringBundle.getString("noPassphrase.alert"));
      return false;
    }
    if (password.value == passphrase.value) {
      alert(this._stringBundle.getString("samePasswordAndPassphrase.alert"));
      return false;
    }

    if (savePass.checked) {
      Weave.Service.password = password.value;
      Weave.Service.passphrase = passphrase.value;
    } else {
      Weave.Service.password = null;
      Weave.Service.passphrase = null;
    }
    Weave.Service.login(null, password.value, passphrase.value);
    return false; // don't close the dialog yet
  },

  doCancel: function Login_doCancel() {
    this._loggingIn = false;
    return true;
  },

  // nsIObserver
  observe: function(subject, topic, data) {
    switch(topic) {
    case "weave:service-login:success":
      this._onLogin();
      break;
    case "weave:service-login:error":
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
