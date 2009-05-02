Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let gWeaveAuthenticator = {
  //**************************************************************************//
  // Shortcuts

  // The Preferences service that is imported from the Preferences module below.
  get Preferences() {
    delete this.Preferences;
    Cu.import("resource://weave/ext/Preferences.js", this);
    return this.Preferences;
  },

  get _prefs() {
    delete this._prefs;
    return this._prefs = new this.Preferences("extensions.weave.");
  },

  get _icon() {
    delete this._icon;
    return this._icon = document.getElementById("sync-authenticator-icon");
  },

  get _popup() {
    delete this._popup;
    return this._popup = document.getElementById("sync-authenticator-popup");
  },


  //**************************************************************************//
  // XPCOM Glue

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener,
                                         Ci.nsIDOMEventListener,
                                         Ci.nsISupportsWeakReference]),


  //**************************************************************************//
  // Initialization/Destruction

  onLoad: function() {
    gBrowser.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
    gBrowser.addEventListener("DOMContentLoaded", this, true);
  },

  onUnload: function() {
    gBrowser.removeProgressListener(this);
    gBrowser.removeEventListener("DOMContentLoaded", this, true);
  },


  //**************************************************************************//
  // nsIWebProgressListener

  onLocationChange: function(progress, request, location) {
    // If there's a request, this is a page load or history traversal,
    // not a tab change, so we have to generate the model all over again.
    // (whereas on tab changes we can simply reuse the existing model
    // that we've cached in the browser).  Note that on page loads
    // we'll generate the model again on DOMContentLoaded, which is redundant,
    // but I don't know of a way to distinguish between page loads
    // and history traversals here so that we only do this on history
    // traversal (perhaps do this on pageshow/pagehide instead?).
    if (request) {
      let browser = gBrowser.mCurrentBrowser;
      let doc = browser.contentDocument;
      if (doc)
        this._updateModel(doc, browser);
    }

    this._updateView();
  },

  onStateChange: function() {},
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLinkIconAvailable: function() {},


  //**************************************************************************//
  // nsIDOMEventListener

  handleEvent: function(event) {
    switch (event.type) {
      case "DOMContentLoaded":
        this.onDOMContentLoaded(event);
    }
  },

  onDOMContentLoaded: function(event) {
    let doc = event.target;
    let browser = gBrowser.getBrowserForDocument(doc);
    if (browser)
      this._updateModel(doc, browser);
    if (browser == gBrowser.mCurrentBrowser)
      this._updateView();
  },


  //**************************************************************************//
  // Implementation

  _updateModel: function(doc, browser) {
    let inputs = doc.getElementsByTagName("input");
    browser.openIDInput = null;

    // Find the first OpenID input field.
    for (let i = 0; i < inputs.length; i++) {
      let element = inputs.item(i);
      if (element.name == OPENID_FIELD_NAME) {
        browser.openIDInput = element;
        break;
      }
    }
  },

  _updateView: function() {
    if (gBrowser.mCurrentBrowser.openIDInput)
      this._icon.setAttribute("state", "enabled");
    else
      this._icon.setAttribute("state", "disabled");
  },

  signIn: function() {
    let element = gBrowser.mCurrentBrowser.openIDInput;

    // Strangely, if submission goes to a file: URL that doesn't exist,
    // this throws NS_ERROR_FILE_NOT_FOUND, so we catch and ignore that error.
    try {
      element.form.submit();
    }
    catch(ex) {}

    this._popup.hidePopup();
  }
};

window.addEventListener("load",   function() { gWeaveAuthenticator.onLoad()   }, false);
window.addEventListener("unload", function() { gWeaveAuthenticator.onUnload() }, false);
