let gWeaveCommon = {
  // opens in a new window if we're in a modal prefwindow world, in a new tab otherwise
  _openLink: function (url) {
    if (document.documentElement.id == "accountSetup" &&
        window.opener &&
        window.opener.document.documentElement.id == "BrowserPreferences" &&
        !window.opener.document.documentElement.instantApply)
      openUILinkIn(url, "window");
    else if (document.documentElement.id == "BrowserPreferences" &&
             !document.documentElement.instantApply)
      openUILinkIn(url, "window");
    else
      openUILinkIn(url, "tab");
  },

  changePassword: function () {
    Weave.Utils.openGenericDialog("ChangePassword");
  },

  resetPassphrase: function () {
    Weave.Utils.openGenericDialog("ResetPassphrase");
  },

  updatePassphrase: function () {
    Weave.Utils.openGenericDialog("UpdatePassphrase");
  },

  resetPassword: function () {
    this._openLink(Weave.Service.pwResetURL);
  },

  openToS: function () {
    this._openLink(Weave.Svc.Prefs.get("termsURL"));
  },

  openPP: function () {
    this._openLink(Weave.Svc.Prefs.get("privacyURL"));
  },

  /**
   * validatePassword / validatePassphrase
   *
   * @param el1 : the first textbox element in the form
   * @param el2 : the second textbox element, if omitted it's an update form
   * 
   * returns [valid, errorString]
   */

  validatePassword: function (el1, el2) {
    return this._validate(el1, el2, true);
  },

  validatePassphrase: function (el1, el2) {
    return this._validate(el1, el2, false);
  },

  _validate: function (el1, el2, isPassword) {
    let valid = false;
    let val1 = el1.value;
    let val2 = el2.value;
    let error = "";

    if (isPassword) {
      if (!el2)
        valid = val1.length >= Weave.MIN_PASS_LENGTH;
      else if (val1 && val1 == Weave.Service.username)
        error = "change.password.pwSameAsUsername";
      else if (val1 && val1 == Weave.Service.password)
        error = "change.password.pwSameAsPassword";
      else if (val1 && val1 == Weave.Service.passphrase)
        error = "change.password.pwSameAsPassphrase";
      else if (val1 && val2) {
        if (val1 == val2 && val1.length >= Weave.MIN_PASS_LENGTH)
          valid = true;
        else if (val1.length < Weave.MIN_PASS_LENGTH)
          error = "change.password.tooShort";
        else if (val1 != val2)
          error = "change.password.mismatch";
      }
    }
    else {
      if (!el2)
        valid = val1.length >= Weave.MIN_PP_LENGTH;
      else if (val1 == Weave.Service.username)
        error = "change.passphrase.ppSameAsUsername";
      else if (val1 == Weave.Service.password)
        error = "change.passphrase.ppSameAsPassword";
      else if (val1 == Weave.Service.passphrase)
        error = "change.passphrase.ppSameAsPassphrase";
      else if (val1 && val2) {
        if (val1 == val2 && val1.length >= Weave.MIN_PP_LENGTH)
          valid = true;
        else if (val1.length < Weave.MIN_PP_LENGTH)
          error = "change.passphrase.tooShort";
        else if (val1 != val2)
          error = "change.passphrase.mismatch";
      }
    }
    let errorString = error ? Weave.Utils.getErrorString(error) : "";
    dump("valid: " + valid + " error: " + errorString + "\n");
    return [valid, errorString];
  }
}

