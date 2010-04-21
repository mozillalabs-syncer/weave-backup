var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;

let Change = {
  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle", function() { return stringBundle; });
    return this._stringBundle;
  },

  get _dialog() {
    delete this._dialog;
    return this._dialog = document.getElementById("change-dialog");
  },

  get _dialogType() {
    delete this._dialogType;
    return this._dialogType = Weave.Utils._genericDialogType;
  },

  get _title() {
    return document.getElementById("change-dialog").getAttribute("title");
  },

  set _title(val) {
    document.getElementById("change-dialog").setAttribute("title", val);
  },

  get _status() {
    delete this._status;
    return this._status = document.getElementById("status");
  },

  get _statusIcon() {
    delete this._statusIcon;
    return this._statusIcon = document.getElementById("statusIcon");
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

  onLoad: function Change_onLoad() {
    /* Load labels */
    let box1label = document.getElementById("textBox1Label");
    let box2label = document.getElementById("textBox2Label");
    let introText = document.getElementById("introText");
    let introText2 = document.getElementById("introText2");
    let warningText = document.getElementById("warningText");

    switch (this._dialogType) {
      case "ChangePassphrase":
        this._title = this._str("change.passphrase.title");
        box1label.value = this._str("new.passphrase.label");
        box2label.value = this._str("new.passphrase.confirm");
        introText.innerHTML = this._str("change.passphrase.introText");
        introText2.innerHTML = this._str("change.passphrase.introText2");
        warningText.innerHTML = this._str("change.passphrase.warningText");
        this._dialog.getButton("accept")
            .setAttribute("label", this._str("change.passphrase.acceptButton"));
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doChangePassphrase();"
        );
        break;
      case "ChangePassword":
        this._title = this._str("change.password.title");
        box1label.value = this._str("new.password.label");
        box2label.value = this._str("new.password.confirm");
        introText.innerHTML = this._str("change.password.introText");
        warningText.innerHTML = this._str("change.password.warningText");
        this._dialog.getButton("accept")
            .setAttribute("label", this._str("change.password.acceptButton"));
        this._dialog.setAttribute(
          "ondialogaccept",
          "return Change.doChangePassword();"
        );
        break;
    }
  },

  _clearStatus: function _clearStatus() {
    this._status.value = "";
    this._statusIcon.removeAttribute("status");
  },

  _updateStatus: function Change__updateStatus(str, state) {
    this._status.value = this._str(str);
    this._statusIcon.setAttribute("status", state);

    let error = state == "error";
    this._dialog.getButton("cancel").setAttribute("disabled", !error);
    this._dialog.getButton("accept").setAttribute("disabled", !error);

    if (state == "success")
      window.setTimeout(window.close, 1500);
  },

  doChangePassphrase: function Change_doChangePassphrase() {
    this._updateStatus("change.passphrase.label", "active");

    if (Weave.Service.changePassphrase(this._firstBox.value))
      this._updateStatus("change.passphrase.success", "success");
    else
      this._updateStatus("change.passphrase.error", "error");

    return false;
  },

  doChangePassword: function Change_doChangePassword() {
    if (this._currentPasswordInvalid) {
      Weave.Service.password = this._firstBox.value;
      Weave.Service.persistLogin();
      Weave.Service.login();
      this._updateStatus("change.password.status.success", "success");
    }
    else {
      this._updateStatus("change.password.status.active", "active");

      if (Weave.Service.changePassword(this._firstBox.value))
        this._updateStatus("change.password.status.success", "success");
      else
        this._updateStatus("change.password.status.error", "error");
    }

    return false;
  },

  validate: function (event) {
    let valid = false;
    let val1 = this._firstBox.value;
    let val2 = this._secondBox.value;
    let errorStatus = "";

    if (this._dialogType == "ChangePassword") {
      if (val1 == Weave.Service.username)
        errorStatus = "change.password.status.pwSameAsUsername";
      else if (val1 == Weave.Service.password)
        errorStatus = "change.password.status.pwSameAsPassword";
      else if (val1 == Weave.Service.passphrase)
        errorStatus = "change.password.status.pwSameAsPassphrase";
      else if (val1 && val2 && val1 == val2 &&
               val1.length >= Weave.MIN_PASS_LENGTH)
        valid = true;
    }
    else {
      if (val1 == Weave.Service.username)
        errorStatus = "change.passphrase.status.ppSameAsUsername";
      else if (val1 == Weave.Service.password)
        errorStatus = "change.passphrase.status.ppSameAsPassword";
      else if (val1 == Weave.Service.passphrase)
        errorStatus = "change.passphrase.status.ppSameAsPassphrase";
      else if (val1 && val2 && val1 == val2 &&
               val1.length >= Weave.MIN_PP_LENGTH)
        valid = true;
    }

    if (errorStatus == "")
      this._clearStatus();
    else
      this._updateStatus(errorStatus, "error");
    this._dialog.getButton("accept").disabled = !valid;
  },

  _str: function Change__string(str) {
    return this._stringBundle.getString(str);
  }
};
