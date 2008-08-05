/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Bookmarks Sync.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Anant Narayanan <anant@kix.in>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

function OAuthWizard() {
  this._init();
}
OAuthWizard.prototype = {
  __os: null,
  get _os() {
    if (!this.__os)
      this.__os = Components.classes["@mozilla.org/observer-service;1"]
                  .getService(Components.interfaces.nsIObserverService);
    return this.__os;
  },

  get _stringBundle() {
    let stringBundle = document.getElementById('weaveStringBundle');
    this.__defineGetter__("_stringBundle", function() {return stringBundle;});

    return this._stringBundle;
  },

  _init: function OAuthWizard__init() {
    this._log = Log4Moz.Service.getLogger("Chrome.OAuthWizard");
    this._log.info("Intializing OAuth wizard");
    
    this._os.addObserver(this, "weave:service:verify-passphrase:success", false);
    this._os.addObserver(this, "weave:service:login:success", false);
    this._os.addObserver(this, "weave:service:verify-passphrase:error", false);
    this._os.addObserver(this, "weave:service:login:error", false);
  },

  uninit: function OAuthWizard_uninit() {
    this._log.info("Shutting down OAuth wizard");

    this._os.removeObserver(this, "weave:service:passphrase:success");
    this._os.removeObserver(this, "weave:service:passphrase:error");
  },

  enableAuth: function OAuthWizard_enableAuth() {
    let aubut = document.getElementById('oauth-intro-aubut');
    let pass = document.getElementById('oauth-intro-phrase');
    aubut.disabled = true;

    if (!Weave.Service.isLoggedIn) {
      let uid = document.getElementById('oauth-intro-uid');
      let pwd = document.getElementById('oauth-intro-pwd');

      aubut.disabled = (uid.value.length == 0 || uid.value.length == 0 || pass.value.length == 0);
    } else {
      aubut.disabled = (pass.value.length == 0);
    }
  },
  
  checkLogin: function OAuthWizard_checkLogin() {
    document.getElementById('oauth-wizard').canAdvance = false;
    document.getElementById('oauth-intro-aubut').disabled = true;
    if (!Weave.Service.isLoggedIn) {
      let upbox = document.getElementById('oauth-intro-upbox');
      upbox.hidden = false;
    } else {
      let sbox = document.getElementById('oauth-intro-sin');
      let unam = document.getElementById('oauth-intro-pmsg');

      unam.value = this._stringBundle.getFormattedString('intro.uidmsg', [Weave.Service.username]);
      sbox.hidden = false;
    }
  },
  
  verifyLogin: function OAuthWizard_verifyLogin() {
    let aubox = document.getElementById('oauth-intro-aubox');
    let sibox = document.getElementById('oauth-intro-athing');
    let ssbox = document.getElementById('oauth-intro-success');
    let sebox = document.getElementById('oauth-intro-error');
    
    aubox.hidden = true;
    ssbox.hidden = true;
    sebox.hidden = true;
    sibox.hidden = false;
    
    let pas = document.getElementById('oauth-intro-phrase');
    if (!Weave.Service.isLoggedIn) {
      let uid = document.getElementById('oauth-intro-uid');
      let pwd = document.getElementById('oauth-intro-pwd');
      
      Weave.OAuth.setUser(uid.value, pwd.value, pas.value);
      Weave.Service.loginAndInit(null, uid.value, pwd.value, pas.value);
    } else {
      Weave.OAuth.setUser(Weave.Service.username, Weave.Service.password, pas.value);
      Weave.Service.verifyPassphrase(null, Weave.Service.username, Weave.Service.password, pas.value);
    }
  },
  
  authorize: function OAuthWizard_authorize() {
    document.getElementById('oauth-wizard').canAdvance = false;
    document.getElementById('oauth-wizard').canRewind = false;
    Weave.OAuth.validate(this._stringBundle, this._authUpdate);
  },

  _authUpdate: function OAuthWizard__authUpdate(bundle, name, rsakey, conskey) {
    document.getElementById('oauth-conf-loading').hidden = true;
    
    if (rsakey && conskey) {
      Weave.OAuth._rsaKey = rsakey;
      Weave.OAuth._consKey = conskey;
    }

    if (name == "1" || name == "2" || name == "3" || name == "4") {
      let err = document.getElementById('oauth-conf-error');
      let ela = document.getElementById('oauth-conf-error-msg');
      let msg = '';
      switch (name) {
        case "1":
          msg = bundle.getString('conf.error1');
          break;
        case "2":
          msg = bundle.getString('conf.error2');
          break;
        case "3":
          msg = bundle.getString('conf.error3');
          break;
        case "4":
          msg = bundle.getString('conf.error4');
          break;
      }
      let fin = bundle.getFormattedString('conf.error', [msg]);
      
      ela.value = fin;
      err.hidden = false;
    } else {
      let msg = document.getElementById('oauth-conf-msg');
      msg.value = bundle.getFormattedString('conf.conmsg', [name]);
      document.getElementById('oauth-conf-proceed').hidden = false;
      document.getElementById('oauth-wizard').canAdvance = true;
    }
  },
  
  finalize: function OAuthWizard_finalize() {
    document.getElementById('oauth-wizard').canRewind = false;
    document.getElementById('oauth-wizard').canAdvance = false;
    
    Weave.OAuth.finalize(this._final1, this._final2, this._stringBundle);
    document.getElementById('oauth-final-status').value = this._stringBundle.getString('final.step1');
  },

  _final1: function OAuth__final1(bundle) {
    document.getElementById('oauth-wizard').canAdvance = false;
    document.getElementById('oauth-final-status').value = bundle.getString('final.step2');
  },
  
  _final2: function OAuth__final2(bundle, succeded) {
    if (succeded) {
      document.getElementById('oauth-wizard').canAdvance = false;
      document.getElementById('oauth-final-processing').hidden = true;
      document.getElementById('oauth-final-status').value = bundle.getString('final.step3');
    
      if (Weave.OAuth._cback) {
        window.location = Weave.OAuth._cback;
      } else {
        document.getElementById('oauth-final-manual').hidden = false;
        document.getElementById('oauth-wizard').canAdvance = true;
      }
    }
  },
  
  observe: function OAuth_observe(subject, topic, data) {
    switch (topic) {
      case "weave:service:verify-passphrase:success":
        if (Weave.Service.isLoggedIn) {
          this._loginDone(true);
        } else {
          Weave.Service.username = Weave.OAuth._uid;
          Weave.Service.password = Weave.OAuth._pwd;
          Weave.Service.login();
        }
        break;
      case "weave:service:login:success":
        this._loginDone(true);
        break;
      case "weave:service:verify-passphrase:error":
        this._loginDone(false);
        break;
      case "weave:service:login:error":
        this._loginDone(false);
        break;
    }
  },
  
  _loginDone: function Oauth__loginDone(sure) {
    let wizard = document.getElementById('oauth-wizard');
    let aubox = document.getElementById('oauth-intro-aubox');
    let sibox = document.getElementById('oauth-intro-athing');
    let ssbox = document.getElementById('oauth-intro-success');
    let sebox = document.getElementById('oauth-intro-error');
    if (sure) {
      aubox.hidden = true;
      sibox.hidden = true;
      sebox.hidden = true;
      ssbox.hidden = false;
      wizard.canAdvance = true;
    } else {
      aubox.hidden = false;
      sibox.hidden = true;
      sebox.hidden = false;
      ssbox.hidden = true;
      wizard.canAdvance = false;
    }
  }
};

let gOAuthWizard = new OAuthWizard();
