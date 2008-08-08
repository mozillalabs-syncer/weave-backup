// Listen for OAuth URLs and do the neccessary redirects
var Weave_urlBarListener = {
  QueryInterface: function(aIID) {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onLocationChange: function(aProgress, aRequest, aURI) {
    gOAuth.processNewURL(aURI);
  },

  onStateChange: function() {},
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLinkIconAvailable: function() {}
};

var gOAuth = {
  oldURL: null,
  
  init: function() {
    // Listen for webpage loads
    if (typeof(gBrowser) != "undefined")
	    gBrowser.addProgressListener(Weave_urlBarListener,
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  },
  
  uninit: function() {
    if (typeof(gBrowser) != "undefined")
      gBrowser.removeProgressListener(Weave_urlBarListener);
  },

  processNewURL: function(aURI) {
    if (aURI.spec == this.oldURL)
      return;
    
    // now we know the url is new...
    if (aURI.spec.substr(0, 49) == 'https://services.mozilla.com/api/oauth/authorize?') {
      let token = null;
      let cback = null;
      
      let pstring = aURI.spec.substr(49);
      let params = pstring.split('&');
      let tstring = params[0].split('=');

      if (params.length > 1) {
        let cstring = params[1].split('=');

        if (cstring[0] == 'oauth_callback' && tstring[0] == 'oauth_token') {
          cback = decodeURIComponent(cstring[1]);
          token = tstring[1];
        }
        if (tstring[0] == 'oauth_callback' && cstring[0] == 'oauth_token') {
          cback = decodeURIComponent(tstring[1]);
          token = cstring[1];
        }
      } else if (tstring[0] == 'oauth_token') {
        token = tstring[1];
      }
      
      this.oldURL = aURI.spec;

      if (token == null) {
        window.content.location = 'http://services.mozilla.com/api/oauth/error';
      } else {
        Weave.OAuth.setToken(token, cback);
        window.content.location = 'chrome://weave/content/oauth.xul';
      }
    }
  }
};

window.addEventListener("load", function() {gOAuth.init()}, false);
window.addEventListener("unload", function() {gOAuth.uninit()}, false);
