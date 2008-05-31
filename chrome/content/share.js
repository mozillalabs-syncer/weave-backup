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
    let fullString = this._stringBundle.getFormattedString( "folder.message",
							    window.arguments );
    document.getElementById("folder-msg").setAttribute("value", fullString);
  },

  get _stringBundle() {
    let stringBundle = document.getElementById("weaveStringBundle");
    this.__defineGetter__("_stringBundle",
                          function() { return stringBundle; });
    return this._stringBundle;
  },
  doShare: function Share_doShare(event) {
    let labelStr = this._stringBundle.getString("status.working");
    let label = document.getElementById("status.label");
    label.setAttribute("value", labelStr);
    label.setAttribute("hidden", false);
    document.getElementById("throbber").setAttribute("hidden", true);
    document.getElementById("throbber-active").setAttribute("hidden", false);
    let self = this;
    let user = document.getElementById("username").value;
    Weave.Service.shareBookmarks(function(ret) { self.shareCb(ret); }, user);
  },
  shareCb: function Share_Callback(ret) {
    document.getElementById("throbber").setAttribute("hidden", false);
    document.getElementById("throbber-active").setAttribute("hidden", true);
    let label = ret?
      this._stringBundle.getString("status.ok") :
      this._stringBundle.getString("status.error");
    document.getElementById("status.label").setAttribute("value", label);
  },
  doCancel: function Share_doCancel(event) { return true; },
  shutDown: function Share_shutDown(event) {}
};

let gShare;
window.addEventListener("load", function(e) { gShare = new Share(); }, false);
window.addEventListener("unload", function(e) { gShare.shutDown(e); }, false);
