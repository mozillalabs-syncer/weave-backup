var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

let Change = {
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

  get _dialog() {
    delete this._dialog;
    return this._dialog = document.getElementById("change-dialog");
  },

  get _title() {
    delete this._title;
    return this._title = document.getElementById("mainTitle");
  },

  get _status() {
    delete this._status;
    return this._status = document.getElementById("mainStatus");
  },

  get _statusIcon() {
    delete this._statusIcon;
    return this._statusIcon = document.getElementById("mainStatusIcon");
  },

  get _oldBoxRow() {
    delete this._oldBoxRow;
    return this._oldBoxRow = document.getElementById("oldBoxRow");
  },

  get _currentBox() {
    delete this._currentBox;
    return this._currentBox = document.getElementById("currentBoxText");
  },

  get _firstBox() {
    delete this._firstBox;
    return this._firstBox = document.getElementById("textBox1");
  },

  get _secondBox() {
    delete this._secondBox;
    return this._secondBox = document.getElementById("textBox2");
  },
  
  get _currentPasswordInvalid() {
    return Weave.Status.login == Weave.LOGIN_FAILED_LOGIN_REJECTED;
  },

  get _currentPassphraseInvalid() {
    return Weave.Status.login == Weave.LOGIN_FAILED_INVALID_PASSPHRASE;
  },

  onLoad: function Change_onLoad() {
    this._log = Log4Moz.repository.getLogger("Chrome.Change");
    this._log.trace("Sync login window opened");

    /* Load labels */
    let cboxlabel = document.getElementById("currentBoxLabel");
    let box1label = document.getElementById("textBox1Label");
    let box2label = document.getElementById("textBox2Label");

    switch (Weave.Utils._genericDialogType) {
      case "ResetPassphrase":
        this._title.value = this._str("reset.passphrase.title");
        box1label.value = this._str("new.passphrase.label");
        box2label.value = this._str("new.passphrase.confirm");
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doResetPassphrase();"
        );
        break;
      case "ChangePassphrase":
        this._title.value = this._str("change.passphrase.title");
        cboxlabel.value = this._str("new.passphrase.old");
        box1label.value = this._str("new.passphrase.label");
        box2label.value = this._str("new.passphrase.confirm");
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doChangePassphrase();"
        );
        this._oldBoxRow.setAttribute("hidden", this._currentPassphraseInvalid);
        break;
      case "ChangePassword":
        this._title.value = this._str("change.password.title");
        cboxlabel.value = this._str("new.password.old");
        box1label.value = this._str("new.password.label");
        box2label.value = this._str("new.password.confirm");
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doChangePassword();"
        );
        this._oldBoxRow.setAttribute("hidden", this._currentPasswordInvalid);
        break;
    }
    this._os.addObserver(this, "weave:service:changepwd:start", false);
    this._os.addObserver(this, "weave:service:changepwd:error", false);
    this._os.addObserver(this, "weave:service:changepwd:finish", false);
    this._os.addObserver(this, "weave:service:changepph:start", false);
    this._os.addObserver(this, "weave:service:changepph:error", false);
    this._os.addObserver(this, "weave:service:changepph:finish", false);
    this._os.addObserver(this, "weave:service:resetpph:start", false);
    this._os.addObserver(this, "weave:service:resetpph:error", false);
    this._os.addObserver(this, "weave:service:resetpph:finish", false);
  },

  shutDown: function Change_shutDown() {
    this._os.removeObserver(this, "weave:service:changepwd:start", false);
    this._os.removeObserver(this, "weave:service:changepwd:error", false);
    this._os.removeObserver(this, "weave:service:changepwd:finish", false);
    this._os.removeObserver(this, "weave:service:changepph:start", false);
    this._os.removeObserver(this, "weave:service:changepph:error", false);
    this._os.removeObserver(this, "weave:service:changepph:finish", false);
    this._os.removeObserver(this, "weave:service:resetpph:start", false);
    this._os.removeObserver(this, "weave:service:resetpph:error", false);
    this._os.removeObserver(this, "weave:service:resetpph:finish", false);

    this._log.trace("Change window closed");
  },

  observe: function Change_observer(subject, topic, data) {
    switch (topic) {
      case "weave:service:resetpph:start":
      case "weave:service:changepwd:start":
      case "weave:service:changepph:start":
        this._statusIcon.setAttribute("status", "active");
        this._status.style.color = "-moz-dialogtext";
        this._dialog.getButton("cancel").setAttribute("disabled", "true");
        this._dialog.getButton("accept").setAttribute("disabled", "true");
        break;
      case "weave:service:resetpph:error":
      case "weave:service:changepwd:error":
      case "weave:service:changepph:error":
        this._statusIcon.setAttribute("status", "error");
        this._status.style.color = "-moz-dialogtext";
        this._dialog.getButton("cancel").setAttribute("disabled", "false");
        this._dialog.getButton("accept").setAttribute("disabled", "false");
        break;
      case "weave:service:resetpph:finish":
      case "weave:service:changepwd:finish":
      case "weave:service:changepph:finish":
        this._statusIcon.setAttribute("status", "success");
        this._status.style.color = "-moz-dialogtext";
        this._dialog.getButton("cancel").setAttribute("disabled", "true");
        this._dialog.getButton("accept").setAttribute("disabled", "true");
        window.setTimeout(window.close, 1500);
        break;
    }
  },

  doResetPassphrase: function Change_doResetPassphrase() {
    if (!this._firstBox.value || !this._secondBox.value)
      alert(this._str("noPassphrase.alert"));
    else if (this._firstBox.value != this._secondBox.value)
      alert(this._str("passphraseNoMatch.alert"));
    else {
      this._status.value = this._str("reset.passphrase.label");

      if (Weave.Service.resetPassphrase(this._firstBox.value)) {
        this._status.value = this._str("reset.passphrase.success");
        this._loginDialog.cancelDialog();
      }
      else
        this._status.value = this._str("reset.passphrase.error");
    }

    return false;
  },

  doChangePassphrase: function Change_doChangePassphrase() {
    if (!this._firstBox.value || !this._secondBox.value)
      alert(this._str("noPassphrase.alert"));
    else if (this._firstBox.value != this._secondBox.value)
      alert(this._str("passphraseNoMatch.alert"));
    else if (this._currentPassphraseInvalid) {
      Weave.Service.passphrase = this._firstBox.value;
      Weave.Service.persistLogin();
      Weave.Service.login();
      window.setTimeout(window.close, 1500);
      this._status.value = this._str("change.passphrase.success");
    }
    else if (this._currentBox.value != Weave.Service.passphrase)
      alert(this._str("incorrectPassphrase.alert"));
    else {
      this._status.value = this._str("change.passphrase.label");

      if (Weave.Service.changePassphrase(this._firstBox.value))
        this._status.value = this._str("change.passphrase.success");
      else
        this._status.value = this._str("change.passphrase.error");
    }

    return false;
  },

  doChangePassword: function Change_doChangePassword() {
    if (!this._firstBox.value || !this._secondBox.value)
      alert(this._str("noPassword.alert"));
    else if (this._firstBox.value != this._secondBox.value)
      alert(this._str("passwordNoMatch.alert"));
    else if (this._firstBox.value == Weave.Service.username)
      alert(this._str("change.password.status.passwordSameAsUsername" ));
    else if (this._firstBox.value == Weave.Service.passphrase)
      alert(this._str("change.password.status.passwordSameAsPassphrase"));
    else if (this._currentPasswordInvalid) {
      Weave.Service.password = this._firstBox.value;
      Weave.Service.persistLogin();
      Weave.Service.login();
      window.setTimeout(window.close, 1500);
      this._status.value = this._str("change.password.status.success");
    }
    else if (this._currentBox.value != Weave.Service.password)
      alert(this._str("incorrectPassword.alert"));
    else {
      this._status.value = this._str("change.password.status.active");

      if (Weave.Service.changePassword(this._firstBox.value))
        this._status.value = this._str("change.password.status.success");
      else
        this._status.value = this._str("change.password.status.error");
    }

    return false;
  },
  
  _str: function Change__string(str) {
    return this._stringBundle.getString(str);
  }
};

window.addEventListener("load", function(e) { Change.onLoad(); }, false);
window.addEventListener("unload", function(e) { Change.shutDown(e); }, false);
