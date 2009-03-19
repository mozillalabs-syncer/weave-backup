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
 *  Jono DiCarlo <jdicarlo@mozilla.com>
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

// Annotation to use for shared bookmark folders, incoming and outgoing:
const INCOMING_SHARED_ANNO = "weave/shared-incoming";
const OUTGOING_SHARED_ANNO = "weave/shared-outgoing";
const INCOMING_SHARE_ROOT_ANNO = "weave/mounted-shares-folder";

const UNSHARE_FOLDER_ICON = "chrome://weave/skin/unshare-folder-16x16.png";
const SHARE_FOLDER_ICON = "chrome://weave/skin/shared-folder-16x16.png";
const SHARED_FOLDER_ICON = "chrome://weave/skin/shared-folder-16x16.png";


var oldOnPopupShowingFunc = BookmarksEventHandler.onPopupShowing;

function isFolderSharedOutgoing( menuFolder ) {
  let menuFolderId = menuFolder.node.itemId;
  let annotations = PlacesUtils.getAnnotationsForItem( menuFolderId );
  for ( var x in annotations ) {
    if ( annotations[x].name == OUTGOING_SHARED_ANNO ) {
      return ( annotations[x].value != '' );
    }
  }
  return false;
}

function isFolderSharedIncoming( menuFolder ) {
  let menuFolderId = menuFolder.node.itemId;
  let annotations = PlacesUtils.getAnnotationsForItem( menuFolderId );
  for ( var x in annotations ) {
    if ( annotations[x].name == INCOMING_SHARED_ANNO ||
       annotations[x].name == INCOMING_SHARE_ROOT_ANNO ) {
      return ( annotations[x].value != '' );
    }
  }
  return false;
}

function getUsernameFromSharedFolder( menuFolder ) {
  // TODO this is almost the same code as isFolderSharedOutgoing, refactor!
  let menuFolderId = menuFolder.node.itemId;
  let annotations = PlacesUtils.getAnnotationsForItem( menuFolderId );
  for ( var x in annotations ) {
    if ( annotations[x].name == OUTGOING_SHARED_ANNO ) {
      return ( annotations[x].value );
    }
  }
  return false;
}

function adjustBookmarkMenuIcons() {
  let bookmarkMenu = document.getElementById( "bookmarksMenuPopup" );
  let currentChild = bookmarkMenu.firstChild;
  while (currentChild) {
    if (currentChild.localName != "menuitem" && currentChild.node) {
      let label = currentChild.getAttribute( "label" );
      if ( label ) { // a crude way of skipping the separators
	if ( isFolderSharedOutgoing( currentChild ) ) {
	  currentChild.setAttribute( "image", SHARED_FOLDER_ICON );
	}
      }

    }
    currentChild = currentChild.nextSibling;
  }
}

BookmarksEventHandler.onPopupShowing = function BT_onPopupShowing_new(event) {

  /* Call the original version, to put all the stuff into the menu that
     we expect to be there: */
  oldOnPopupShowingFunc.call( BookmarksEventHandler, event );

  /* Get the global extensions.weave.ui.sharebookmarks preference,
     don't add anything to the menu unless it's turned on! */
  let prefs = Cc["@mozilla.org/preferences-service;1"].
              getService(Ci.nsIPrefService).getBranch("extensions.weave.");
  if ( prefs.getBoolPref( "ui.sharebookmarks" ) == false ) {
    return;
  }

  /* Try to set the icons of shared folders...
  Problem: this only works on the second, and subsequent, time that the
  bookmark menu pops up.  The first time after firefox starts, it seems that
  the expected bookmark folder items aren't even in the menu yet.*/
  adjustBookmarkMenuIcons();

  // Get the menu...
  let target = event.originalTarget;
  let stringBundle = document.getElementById("weaveStringBundle");

  /* Don't add the command if this menu is the main bookmark menu;
   Also not if it's one of the magic folders like "recently bookmarked"
   or "bookmarks toolbar" or "recently tagged".  Normal folders only. */
  if ( event.target.parentNode.node == undefined ) {
    return;
  }
  let node = event.target.parentNode.node;
  if ( node.type != node.RESULT_TYPE_FOLDER ) {
    return;
  }

  /* Don't add the command if this menu is part of one of the incoming
   * bookmark folder shares!  That would be all kinds of weird recursion
   * that make my head hurt. */
  if (isFolderSharedIncoming( event.target.parentNode)) {
    return;
  }

  // put a separator line if there isn't one already.
  /* TODO the separator line moves between the first and second menu view
     of a submenu with only one bookmark in it.  Weird. */
  if (!target._endOptSeparator) {
    // create a separator before options
    target._endOptSeparator = document.createElement("menuseparator");
    target._endOptSeparator.setAttribute("builder", "end");
    target._endMarker = target.childNodes.length;
    target.appendChild(target._endOptSeparator);
  }

  function doShareMenuItem( event ) {
    let selectedMenuFolder = event.target.parentNode.parentNode;
    if ( isFolderSharedOutgoing( selectedMenuFolder ) ) {
      // Un-share the selected folder:
      let username = getUsernameFromSharedFolder(selectedMenuFolder);
      dump( "In bookmark-menu-overlay.js: type of selectedMenuFolder is ");
      dump( typeof selectedMenuFolder );
      Weave.Service.shareData("bookmarks",
			      false, // turn share off
                              null, // no callback needed
                              selectedMenuFolder.node.itemId,
                              username);
    }
    else
      Weave.Utils.openShare();
  }

  // add an item for "share folder", only if it's not already there
  if ( !target._endOptShareFolder ) {
    target._endOptShareFolder = document.createElement("menuitem");
    /* Set mini-icon on the menu item: */
    target._endOptShareFolder.setAttribute( "class", "menu-iconic" );
    target._endOptShareFolder.addEventListener( "command",
                                                doShareMenuItem,
                                                false );
    target.appendChild( target._endOptShareFolder );
  }

  /* Grey out the share folder item if we're not logged into weave or
     if weave is disabled: */
  if ( !Weave.Service.enabled || !Weave.Service.isInitialized) {
    target._endOptShareFolder.setAttribute( "disabled", "true" );
    if (!Weave.Service.enabled) {
      dump( "Menu item disabled because weave not enabled.\n");
    }
    if (!Weave.Service.isInitialized){
      dump( "Menu item disabled because weave not logged in.\n");
    }
  }

  // Set name and icon of menu item based on shared status:
  let isShared = isFolderSharedOutgoing( event.target.parentNode );
  if ( isShared ) {
    /* If the folder is shared already, the menu item is Un-Share Folder */
    let label = stringBundle.getString("unShareBookmark.menuItem");
    target._endOptShareFolder.setAttribute( "label", label );
    target._endOptShareFolder.setAttribute( "image", UNSHARE_FOLDER_ICON );
  } else {
    /* If the folder is not shared already, the menu item is Share Folder */
    let label = stringBundle.getString("shareBookmark.menuItem");
    target._endOptShareFolder.setAttribute( "label", label );
    target._endOptShareFolder.setAttribute( "image", SHARE_FOLDER_ICON );
  }

}
