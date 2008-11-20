var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

let Login = {
  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);
    return this.__os;
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle; });
    return this._stringBundle;
  },

  get _loginDialog() {
    delete this._loginDialog;
    return this._loginDialog = document.getElementById("login-dialog");
  },

  get _loginStatus() {
    delete this._loginStatus;
    return this._loginStatus = document.getElementById("loginStatus");
  },

  get _loginStatusIcon() {
    delete this._loginStatusIcon;
    return this._loginStatusIcon = document.getElementById("loginStatusIcon");
  },

 onLoad: function Login_onLoad() {
    this._log = Log4Moz.repository.getLogger("Chrome.Login");
    this._log.trace("Sync login window opened");

    this._os.addObserver(this, "weave:service:login:start", false);
    this._os.addObserver(this, "weave:service:login:error", false);
    this._os.addObserver(this, "weave:service:login:success", false);

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
  },

  shutDown: function Login_shutDown() {
    this._os.removeObserver(this, "weave:service:login:start");
    this._os.removeObserver(this, "weave:service:login:error");
    this._os.removeObserver(this, "weave:service:login:success");

    this._log.trace("Sync login window closed");
  },

  observe: function Login__observer(subject, topic, data) {
    switch(topic) {
    case "weave:service:login:start":
    this._loginStatusIcon.setAttribute("status", "active");
    this._loginStatus.value = this._stringBundle.getString("loginStart.label");
    this._loginStatus.style.color = "-moz-dialogtext";
    this._loginDialog.getButton("extra2").setAttribute("disabled", "true");

    break;
    case "weave:service:login:error":
    this._loginStatusIcon.setAttribute("status", "error");
    this._loginStatus.value = this._stringBundle.getString("loginError.label");
    this._loginStatus.style.color = "red";
    this._loginDialog.getButton("extra2").setAttribute("disabled", "false");
    document.getElementById("username").focus();

    break;
    case "weave:service:login:success":
    this._loginStatusIcon.setAttribute("status", "success");
    this._loginStatus.value = this._stringBundle.getString("loginSuccess.label");
    this._loginStatus.style.color = "blue";
    window.setTimeout(window.close, 1500);
    break;
    }
  },

  doHelp: function Login_doHelp() {
    let url = "https://services.mozilla.com/help/login/";
    window.open(url);
  },

  doOK: function Login_doOK() {
    let username = document.getElementById("username");
    let password = document.getElementById("password");
    let passphrase = document.getElementById("passphrase");

    let savePass = document.getElementById("save-password-checkbox");
    let autoconnect = document.getElementById("autoconnect-checkbox");

    Weave.Utils.prefs.setBoolPref("rememberpassword", savePass.checked);
    Weave.Utils.prefs.setBoolPref("autoconnect", autoconnect.checked);

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

    Weave.Service.login(null, username.value, password.value, 
                        passphrase.value);
    return true;
  },

  doCancel: function Login_doCancel() { return true; }

};

window.addEventListener("load", function(e) { Login.onLoad(); }, false);
window.addEventListener("unload", function(e) { Login.shutDown(e); }, false);
