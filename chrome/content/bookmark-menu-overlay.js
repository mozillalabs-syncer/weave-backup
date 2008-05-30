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
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
 *  Chris Beard <cbeard@mozilla.com>
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

var Cc = Components.classes;
var Ci = Components.interfaces;

/* BookmarksEventHandler is defined in browser.js as a singleton object.
 the onPopupShowing: function BM_onPopupShowing(event) method
 is what adds the "Open All In Tabs" to the bottom.
 Override this function to also add a "Share this folder..." or
 "Cancel/Stop sharing this folder..." depending on its status. */

/* TODO: 
   1. change the favicon of the folder to a "tiny people"
      icon to show that a folder's being shared.
   2. Use annotations to keep track of when a folder is being shared, and
      change the text of the menu item appropriately.
   3. Use the event passed in to doMenuItem to tell the dialog box what
      folder it is that is being shared. 
   4. LONGTERM: might be healthier to add an onPopupShowing event handler to
      the bookmark menu to do this, instead of overriding the original
      handler.  ( Do this by using 
      bookmarkMenu.addEventListener( "popupshowing", myfunc, false );
      use getElementById to get bookmarkMenu. )

   5. LONGTERM: There's a race condition here in that if this override
      gets called before the handler is set up in the first place, it 
      won't work.  Might want to set up a timer callback (with timeout 0)
      to ensure this override gets called only after startup is otherwise
      complete.

   6. LONGTERM: The guts of the sharing are going to have to be in a
      component, accessed either through XPCom or by using the
      ObserverService to register listeners and pass messages around.
*/

var oldOnPopupShowingFunc = BookmarksEventHandler.onPopupShowing;

var prefs = Cc["@mozilla.org/preferences-service;1"].
            getService(Ci.nsIPrefService).getBranch( "extensions.weave." );

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

    let label = "Share This Folder...";
    // TODO 
    // label = stringBundle.getString("shareItem.label");
    // Not getting the right string out of shareItem.label?
    target._endOptShareFolder.setAttribute( "label", label );
    target.appendChild( target._endOptShareFolder );
  }
};

