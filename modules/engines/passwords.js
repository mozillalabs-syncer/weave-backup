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
 *  Justin Dolske <dolske@mozilla.com>
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

const EXPORTED_SYMBOLS = ['PasswordEngine'];

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

Cu.import("resource://weave/log4moz.js");
Cu.import("resource://weave/util.js");
Cu.import("resource://weave/engines.js");
Cu.import("resource://weave/stores.js");
Cu.import("resource://weave/trackers.js");
Cu.import("resource://weave/async.js");
Cu.import("resource://weave/ext/Observers.js");
Cu.import("resource://weave/type_records/passwords.js");

Function.prototype.async = Async.sugar;

function PasswordEngine() {
  this._init();
}
PasswordEngine.prototype = {
  __proto__: SyncEngine.prototype,
  name: "passwords",
  displayName: "Passwords",
  logName: "Passwords",
  _storeObj: PasswordStore,
  _trackerObj: PasswordTracker,
  _recordObj: LoginRec,

  _syncStartup: function PasswordEngine__syncStartup() {
    let self = yield;
    this._store.cacheLogins();
    yield SyncEngine.prototype._syncStartup.async(this, self.cb);
  },

  /* Wipe cache when sync finishes */
  _syncFinish: function PasswordEngine__syncFinish() {
    let self = yield;
    this._store.clearLoginCache();
    yield SyncEngine.prototype._syncFinish.async(this, self.cb);
  }
};

function PasswordStore() {
  this._init();
}
PasswordStore.prototype = {
  __proto__: Store.prototype,
  _logName: "PasswordStore",

  get _loginManager() {
    let loginManager = Utils.getLoginManager();
    this.__defineGetter__("_loginManager", function() loginManager);
    return loginManager;
  },

  _nsLoginInfo: null,
  _init: function PasswordStore_init() {
    Store.prototype._init.call(this);
    this._nsLoginInfo = new Components.Constructor(
      "@mozilla.org/login-manager/loginInfo;1",
      Ci.nsILoginInfo,
      "init"
    );
  },

  _nsLoginInfoFromRecord: function PasswordStore__nsLoginInfoRec(record) {
    return new this._nsLoginInfo(record.hostname,
                                  record.formSubmitURL,
                                  record.httpRealm,
                                  record.username,
                                  record.password,
                                  record.usernameField,
                                  record.passwordField);
  },

  cacheLogins: function PasswordStore_cacheLogins() {
    this._loginItems = this.getAllIDs();
  },

  clearLoginCache: function PasswordStore_clearLoginCache() {
    this._loginItems = null;
  },

  getAllIDs: function PasswordStore__getAllIDs() {
    let items = {};
    let logins = this._loginManager.getAllLogins({});

    for (let i = 0; i < logins.length; i++) {
      let metaInfo = logins[i].QueryInterface(Ci.nsILoginMetaInfo);
      items[metaInfo.guid] = logins[i].hostname;
    }

    return items;
  },

  changeItemID: function PasswordStore__changeItemID(oldID, newID) {
    if (!(oldID in this._loginItems)) {
      this._log.warn("Can't change GUID " + oldID + " to " +
                     newID + ": Item does not exist");
      return;
    }
    let info = this._loginItems[oldID];

    if (newID in this._loginItems) {
      this._log.warn("Can't change GUID " + oldID + " to " +
                     newID + ": new ID already in use");
      return;
    }

    this._log.debug("Changing GUID " + oldID + " to " + newID);

    let prop = Cc["@mozilla.org/hash-property-bag;1"].
               createInstance(Ci.nsIWritablePropertyBag2);
    prop.setPropertyAsAUTF8String("guid", newID);

    this._loginManager.modifyLogin(info, prop);
  },

  itemExists: function PasswordStore__itemExists(id) {
    return ((id in this._loginItems) == true);
  },

  createRecord: function PasswordStore__createRecord(guid, cryptoMetaURL) {
    let record = new LoginRec();
    record.id = guid;
    if (guid in this._loginItems) {
      let login = this._loginItems[guid];
      record.encryption = cryptoMetaURL;
      record.hostname = login.hostname;
      record.formSubmitURL = login.formSubmitURL;
      record.httpRealm = login.httpRealm;
      record.username = login.username;
      record.password = login.password;
      record.usernameField = login.usernameField;
      record.passwordField = login.passwordField;
    } else {
      /* Deleted item */
      record.cleartext = null;
    }
    return record;
  },

  create: function PasswordStore__create(record) {
    this._loginManager.addLogin(this._nsLoginInfoFromRecord(record));
  },

  remove: function PasswordStore__remove(record) {
    if (record.id in this._loginItems) {
      this._loginManager.removeLogin(this._loginItems[record.id]);
      return;
    }

    this._log.debug("Asked to remove record that doesn't exist, ignoring!");
  },

  update: function PasswordStore__update(record) {
    if (!(record.id in this._loginItems)) {
      this._log.debug("Skipping update for unknown item: " + record.id);
      return;
    }
    let login = this._loginItems[record.id];
    this._log.trace("Updating " + record.id + " (" + itemId + ")");

    let newinfo = this._nsLoginInfoFromRecord(record);
    this._loginManager.modifyLogin(login, newinfo);
  },

  wipe: function PasswordStore_wipe() {
    this._loginManager.removeAllLogins();
  }
};

function PasswordTracker() {
  this._init();
}
PasswordTracker.prototype = {
  __proto__: Tracker.prototype,
  _logName: "PasswordTracker",

  _init: function PasswordTracker_init() {
    Tracker.prototype._init.call(this);
    Observers.add("passwordmgr-storage-changed", this);
  },

  /* A single add, remove or change is 15 points, all items removed is 50 */
  observe: function PasswordTracker_observe(aSubject, aTopic, aData) {
    if (this.ignoreAll)
      return;

    this._log.debug("Received notification " + aData);

    switch (aData) {
    case 'addLogin':
    case 'modifyLogin':
    case 'removeLogin':
      let metaInfo = aSubject.QueryInterface(Ci.nsILoginMetaInfo);
      this._score += 15;
      this.addChangedID(metaInfo.guid);
      break;
    case 'removeAllLogins':
      this._score += 50;
      break;
    }
  }
};
