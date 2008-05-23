var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

function Login() {
  this._log = Log4Moz.Service.getLogger("Chrome.Login");
  this._log.trace("Sync login window opened");

  if (Weave.Utils.prefs.getBoolPref("rememberpassword"))
    document.getElementById("save-password-checkbox").checked = true;
  if (Weave.Utils.prefs.getBoolPref("autoconnect"))
    document.getElementById("autoconnect-checkbox").checked = true;

  document.getElementById("username").value = Weave.Service.username;

  if (Weave.Service.password) {
    let password = document.getElementById("password");
    password.value = Weave.Service.password;
  }

  let row = document.getElementById("passphrase-ui");

  if ("none" == Weave.Utils.prefs.getCharPref("encryption")) {
    row.setAttribute("hidden", "true");
  } else {
    row.setAttribute("hidden", "false");
    if (Weave.Service.passphrase) {
      let passphrase = document.getElementById("passphrase");
      passphrase.value = Weave.Service.passphrase;
    }
  }
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

  shutDown: function Login_shutDown() {
    this._log.trace("Sync login window closed");
  },

  doOK: function Login_doOK() {
    let username = document.getElementById("username");
    let password = document.getElementById("password");
    let passphrase = document.getElementById("passphrase");

    let savePass = document.getElementById("save-password-checkbox");
    let autoconnect = document.getElementById("autoconnect-checkbox");

    Weave.Utils.prefs.setBoolPref("rememberpassword", savePass.checked);
    Weave.Utils.prefs.setBoolPref("autoconnect", autoconnect.checked);

    Weave.Service.username = username.value;

    if (!password.value) {
      alert(this._stringBundle.getString("noPassword.alert"));
      return false;
    }

    if ("none" == Weave.Utils.prefs.getCharPref("encryption")) {
      passphrase.value = null;
    } else {
      if (!passphrase.value) {
        alert(this._stringBundle.getString("noPassphrase.alert"));
        return false;
      }

      if (password.value == passphrase.value) {
        alert(this._stringBundle.getString("samePasswordAndPassphrase.alert"));
        return false;
      }
    }

    if (Weave.Utils.prefs.getBoolPref("rememberpassword")) {
      Weave.Service.password = password.value;
      Weave.Service.passphrase = passphrase.value;
    } else {
      Weave.Service.password = null;
      Weave.Service.passphrase = null;
    }

    Weave.Service.login(null, password.value, passphrase.value);
    return true;
  },

  doCancel: function Login_doCancel() { return true; }

};

let gLogin;
window.addEventListener("load", function(e) { gLogin = new Login(); }, false);
window.addEventListener("unload", function(e) { gLogin.shutDown(e); }, false);
