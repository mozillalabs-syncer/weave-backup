var Cc = Components.classes;
var Ci = Components.interfaces;

// BookmarksEventHandler is defined in browser.js as a singleton object.
// the onPopupShowing: function BM_onPopupShowing(event) method
// is what adds the "Open All In Tabs" to the bottom.
// Override this function to also add a "Share this folder..." or
// "Cancel/Stop sharing this folder..." depending on its status.

// Also change the favicon of the folder, if possible, to a "tiny people"
// icon to show that a folder's being shared?

var oldOnPopupShowingFunc = BookmarksEventHandler.onPopupShowing;

var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch( "extensions.weave." );

//I could add a onPopupShowing event handler to the bookmark menu?
// using bookmarkMenu.addEventListener( "popupshowing", myfunc, false );
// use getElementById to get bookmarkMenu.
BookmarksEventHandler.onPopupShowing = function BT_onPopupShowing_new(event) {
  /* Call the original version, to put all the stuff into the menu that
     we expect to be there: */
  oldOnPopupShowingFunc.call( BookmarksEventHandler, event );

  /* Get the global extensions.weave.ui.sharebookmarks preference,
     don't add anything to the menu unless it's turned on! */
  if ( prefs.getBoolPref( "ui.sharebookmarks" ) == false ) {
    return;
  }

  /* Get the menu... */
  let target = event.originalTarget;
  let stringBundle = document.getElementById("weaveStringBundle");

  // put a separator line if there isn't one already.
  if (!target._endOptSeparator) {
    // create a separator before options
    target._endOptSeparator = document.createElement("menuseparator");
    target._endOptSeparator.setAttribute("builder", "end");
    target._endMarker = target.childNodes.length;
    target.appendChild(target._endOptSeparator);
  }

  // the separator line is going in the wrong place??

  // have this file overlay the menu in chrome.manifest?
    //overlay browser.xul with xul that references the bookmarks menu
  // menu id = bookmark and includes my .js file
  // otherwise this file won't be in the context of the menu
  /*  function doNotification () {
    notifyObservers(null, "weave:service:logout:success", "");
    }*/
  function doMenuItem( event ) {
    // Get the bookmark folder name out of event?

    let type = "Sync:Share";
    let uri = "Chrome://weave/content/share.xul";
    let options = null;

    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
      getService(Ci.nsIWindowMediator);
    let window = wm.getMostRecentWindow(type);
    if (window) {
      window.focus();
    } else {
      var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
        getService(Ci.nsIWindowWatcher);
      if (!options)
         options = 'chrome,centerscreen,dialog,modal,resizable=yes';
      ww.activeWindow.openDialog(uri, '', options, null);
     }

  }
  // add an item for "share folder", only if it's not already there
  if (!target._endOptShareFolder ) {
    target._endOptShareFolder = document.createElement("menuitem");
    // add event listener to object instead of setting onCommand attr?

    target._endOptShareFolder.addEventListener( "command",
					        doMenuItem,
						false );
    

    // DO a notification to nsIObserverService
    // the guts of sharing are going to have to be in a component
   
    /* Note: gSync is defined in sync.js, and is initialized/shutdown
       in window "load" and "unload" event listeners. 
    When I try to call it from here, I get "gSync is undefined".
    Is that because 1. */
    /*Error: gSync is undefined
      Source File: chrome://browser/content/browser.xul
      Line: 1 */

    let label = "Share This Folder..."
    // label = stringBundle.getString("shareItem.label");
    // Not getting the right string out of shareItem.label?
    target._endOptShareFolder.setAttribute( "label", label );
    target.appendChild( target._endOptShareFolder );
  }
};




// An error I get on browser startup:
// Error: document.getElementById("sync-shareitem") is null
// Source File: chrome://weave/content/sync.js   Line: 54

/* Error: redeclaration of const LOAD_IN_SIDEBAR_ANNO
Source File: chrome://browser/content/places/utils.js
Line: 57 */
