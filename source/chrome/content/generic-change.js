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
  
  get _firstBox() {
    delete this._firstBox;
    return this._firstBox = document.getElementById("textBox1");
  },
  
  get _secondBox() {
    delete this._secondBox;
    return this._secondBox = document.getElementById("textBox2");
  },
  
  onLoad: function Change_onLoad() {
    this._log = Log4Moz.repository.getLogger("Chrome.Change");
    this._log.trace("Sync login window opened");

    /* Load labels */
    let box1label = document.getElementById("textBox1Label");
    let box2label = document.getElementById("textBox2Label");
    
    switch (Weave.Utils._genericDialogType) {
      case "ResetPassphrase":
        this._title.value = this._stringBundle.getString(
          "reset.passphrase.title"
        );
        box1label.value = this._stringBundle.getString(
          "new.passphrase.label"
        );
        box2label.value = this._stringBundle.getString(
          "new.passphrase.confirm"
        );
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doResetPassphrase();"
        );
        break;
      case "ChangePassphrase":
        this._title.value = this._stringBundle.getString(
          "change.passphrase.title"
        );
        box1label.value = this._stringBundle.getString(
          "new.passphrase.label"
        );
        box2label.value = this._stringBundle.getString(
          "new.passphrase.confirm"
        );
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doChangePassphrase();"
        );
        break;
    }
    this._os.addObserver(this, "weave:service:changepph:start", false);
    this._os.addObserver(this, "weave:service:changepph:error", false);
    this._os.addObserver(this, "weave:service:changepph:finish", false);
    this._os.addObserver(this, "weave:service:resetpph:start", false);
    this._os.addObserver(this, "weave:service:resetpph:error", false);
    this._os.addObserver(this, "weave:service:resetpph:finish", false);
  },
  
  shutDown: function Change_shutDown() {
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
      case "weave:service:changepph:start":
        this._statusIcon.setAttribute("status", "active");
        this._status.style.color = "-moz-dialogtext";
        this._dialog.getButton("cancel").setAttribute("disabled", "true");
        this._dialog.getButton("accept").setAttribute("disabled", "true");
        break;
      case "weave:service:resetpph:error":
      case "weave:service:changepph:error":
        this._statusIcon.setAttribute("status", "error");
        this._status.style.color = "-moz-dialogtext";
        this._dialog.getButton("cancel").setAttribute("disabled", "true");
        this._dialog.getButton("accept").setAttribute("disabled", "true");
        break;
      case "weave:service:resetpph:finish":
      case "weave:service:changepph:finish":
        this._statusIcon.setAttribute("status", "success");
        this._status.style.color = "-moz-dialogtext";
        this._dialog.getButton("cancel").setAttribute("disabled", "true");
        this._dialog.getButton("accept").setAttribute("disabled", "true");
        window.setTimeout(window.close, 1500);
        break;
    }
  },
  
  doResetPassphrase: function Login_doResetPassphrase() {
    if (!this._firstBox.value || !this._secondBox.value) {
      alert(this._stringBundle.getString("noPassphrase.alert"));
    } else if (this._firstBox.value != this._secondBox.value) {
      alert(this._stringBundle.getString("passphraseNoMatch.alert"));
    } else {
      this._status.value = this._stringBundle.getString(
        "reset.passphrase.label"
      );
      
      if (Weave.Service.resetPassphrase(this._firstBox.value)) {
        this._status.value = this._stringBundle.getString(
          "reset.passphrase.success"
        );
        this._loginDialog.cancelDialog();
        return true;
      } else {
        this._status.value = this._stringBundle.getString(
          "reset.passphrase.error"
        );
      }
    }

    return false;
  },
  
  doChangePassphrase: function WeavePrefs_doChangePassphrase() {
    if (!this._firstBox.value || !this._secondBox.value) {
      alert(this._stringBundle.getString("noPassphrase.alert"));
    } else if (this._firstBox.value != this._secondBox.value) {
      alert(this._stringBundle.getString("passphraseNoMatch.alert"));
    } else {
      this._status.value = this._stringBundle.getString(
        "change.passphrase.label"
      );

      if (Weave.Service.changePassphrase(this._firstBox.value)) {
        this._status.value = this._stringBundle.getString(
          "change.passphrase.success"
        );
        return true;
      } else {
        this._status.value = this._stringBundle.getString(
          "change.passphrase.error"
        );
      }
    }

    return false;
  }
};

window.addEventListener("load", function(e) { Change.onLoad(); }, false);
window.addEventListener("unload", function(e) { Change.shutDown(e); }, false);
