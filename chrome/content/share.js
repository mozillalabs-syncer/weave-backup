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

function Share() {
  this._init();
}
Share.prototype = {
  _init: function Share__init() {
    /* Immediately upon popping up the dialog box, set the folder-msg
       label in the dialog box to reflect the name of the folder that
       was selected for sharing: */
    this._selectedMenuFolder = window.arguments[0];
    let folderName = this._selectedMenuFolder.getAttribute("label");
    let fullString = this._stringBundle.getFormattedString( "folder.message",
							    [folderName] );
    document.getElementById("folder-msg").setAttribute("value", fullString);
  },
  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle",
                          function() { return stringBundle; });
    return this._stringBundle;
  },
  doShare: function Share_doShare(event) {
    /* This is called when the user clicks the Share button in the
       dialog box.*/

    /* Start the active display widgets (throbber, label) to let the user know 
       that something is happening: */
    let labelStr = this._stringBundle.getString("status.working");
    let label = document.getElementById("status.label");
    label.setAttribute("value", labelStr);
    label.setAttribute("hidden", false);
    document.getElementById("throbber").setAttribute("hidden", true);
    document.getElementById("throbber-active").setAttribute("hidden", false);
    let self = this;

    /* tell the weave service to share the chosen bookmark folder with
       the user specified in the "username' input field. */
    this._username = document.getElementById("username").value;
    Weave.Service.shareData("bookmarks",
                            function(ret) { self.shareCb(ret); },
                            this._selectedMenuFolder, // turn into GUID?
                            this._username);
  },
  shareCb: function Share_Callback(ret) {
    /* Called when share has either succeded or failed.
       First, set the active display widgets to stop spinning and show
       success or failure.

       LONGTERM TODO Consider redesign of the notification ui: a progress bar?
       Dismiss the window immediately and give a separate notification
       when we're done?
    */
    document.getElementById("throbber").setAttribute("hidden", false);
    document.getElementById("throbber-active").setAttribute("hidden", true);
    let label = ret?
      this._stringBundle.getString("status.ok") :
      this._stringBundle.getString("status.error");
    document.getElementById("status.label").setAttribute("value", label);

    if (ret ) {
      /* If we succeeded, set the annotation on the folder so we know
	 it's an outgoing share: */
      let folderItemId = this._selectedMenuFolder.node.itemId;
      let folderName = this._selectedMenuFolder.getAttribute( "label" );
      let annotation = { name: "weave/share/shared_outgoing",
                         value: this._username,
                         flags: 0,
                         mimeType: null,
                         type: PlacesUtils.TYPE_STRING,
                         expires: PlacesUtils.EXPIRE_NEVER };
      // TODO: does this clobber existing annotations?
      PlacesUtils.setAnnotationsForItem( folderItemId, [ annotation ] );
      /* LONGTERM TODO: in the future when we allow sharing one folder
         with many people, the value of the annotation can be a whole list
         of usernames instead of just one. */
      let log = Log4Moz.Service.getLogger("Share.Dialog");
      log.info( "Folder " + folderName + " annotated with " +
                PlacesUtils.getAnnotationsForItem( folderItemId ) );
    }
  },
  doCancel: function Share_doCancel(event) { return true; },
  shutDown: function Share_shutDown(event) {}
};

let gShare;
window.addEventListener("load", function(e) { gShare = new Share(); }, false);
window.addEventListener("unload", function(e) { gShare.shutDown(e); }, false);
