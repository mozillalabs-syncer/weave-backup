/* Look at incoming pages for OpenID forms and munge them.
   This is hacky and makes a lot of unjustified assumptions about forms. */

/* Listen for URLs that point to Weave OpenID provider and intercept */
var gOpenIDProviderListener = {
    QueryInterface: function(aIID) {
       if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
           aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
           aIID.equals(Components.interfaces.nsISupports))
         return this;
       throw Components.results.NS_NOINTERFACE;
      },

      onLocationChange: function(aProgress, aRequest, aURI) {
        gOpenIdMunger.processNewURL(aURI);
      },

      onStateChange: function() {},
      onProgressChange: function() {},
      onStatusChange: function() {},
      onSecurityChange: function() {},
      onLinkIconAvailable: function() {}
}
/* According to OpenID docs at
 http://openid.net/specs/openid-authentication-2_0.html#initiation
 the form SHOULD have an input field with name = "openid_identifier". */
const OPENID_FIELD_NAME = "openid_identifier";
const OPENID_SERVICE_URI = "services.mozilla.com/openid/";
const OPENID_PREF = "extensions.weave.openId.enabled";

/* When we find an openID field, grey it out and put the user's Weave-based openID URI into
 * it, while changing the submit button to say "Sign In with Weave".  But only do this if
 * OPENID_PREF is turned on.
 */

var gOpenIdMunger = {
  _prefs: null,
  get _prefs() {
      return Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
  },

  init: function() {
    /* Listen for webpage loads */
    if ( gOpenIdMunger._prefs.getBoolPref( OPENID_PREF ) ) {
      if (typeof(gBrowser) != "undefined") {
        var appcontent = document.getElementById("appcontent");   // browser
        if(appcontent) {
          appcontent.addEventListener("DOMContentLoaded",
                                      gOpenIdMunger.detectForm, true);
        }
      }
    }
    
    /* Listen for redirects to Weave OpenID provider regardless of pref */
    if (typeof(gBrowser) != "undefined") {
        gBrowser.addProgressListener(gOpenIDProviderListener,
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    }
  },

  uninit: function() {
    if ( gOpenIdMunger._prefs.getBoolPref( OPENID_PREF ) ) {
      if (typeof(gBrowser) != "undefined") {
        var appcontent = document.getElementById("appcontent");   // browser
        if(appcontent) {
          appcontent.removeEventListener("DOMContentLoaded",
                                      gOpenIdMunger.detectForm, true);
        }
      }
    }
  },

  detectForm: function(aEvent) {
    var theDoc = aEvent.originalTarget;
    let inputs = theDoc.getElementsByTagName("input");
    let i;
    let weaveUsername = gOpenIdMunger._prefs.getCharPref("extensions.weave.username");
    for (i = 0; i < inputs.length; i++) {
      let elem = inputs.item(i);
      if (elem.name == OPENID_FIELD_NAME ) {
        elem.value = OPENID_SERVICE_URI + weaveUsername;
        elem.disabled = true;
        let form = elem.form;
        let formChildren = form.getElementsByTagName("input");
        for (let j=0; j < formChildren.length; j++) {
          if (formChildren[j].type == "submit") {
            formChildren[j].value = "Sign In Using Weave";
          }
        }
      }
    }
  },
  
  processNewURL: function(aURI) {
    if (aURI.spec == this.oldURL)
      return;

    // now we know the url is new...
    if (aURI.spec.substr(0, 49) == 
        'https://services.mozilla.com/openid-api/provider?') {
      let token = null;
      let cback = null;

      let pstring = aURI.spec.substr(49);
      let params = pstring.split('&');
      let tstring = params[0].split('=');
      /* Parse token etc... */
      
      window.content.location = 'chrome://weave/content/openid.xul';
    }
  }
};

window.addEventListener("load", function() {gOpenIdMunger.init();}, false);
window.addEventListener("unload", function() {gOpenIdMunger.uninit();}, false);
