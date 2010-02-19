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
 * The Original Code is Weave
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
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

const EXPORTED_SYMBOLS = ['Clients'];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://weave/util.js");
Cu.import("resource://weave/engines.js");
Cu.import("resource://weave/stores.js");
Cu.import("resource://weave/trackers.js");
Cu.import("resource://weave/type_records/clientData.js");

Utils.lazy(this, 'Clients', ClientEngine);

function ClientEngine() {
  SyncEngine.call(this, "Clients");

  // Reset the client on every startup so that we fetch recent clients
  this._resetClient();
  Utils.prefs.addObserver("", this, false);
}
ClientEngine.prototype = {
  __proto__: SyncEngine.prototype,
  _storeObj: ClientStore,
  _trackerObj: ClientTracker,
  _recordObj: ClientRecord,

  // get and set info for clients

  // FIXME: callers must use the setInfo interface or changes won't get synced,
  // which is unintuitive

  getClients: function ClientEngine_getClients() {
    return this._store.clients;
  },

  getInfo: function ClientEngine_getInfo(id) {
    return this._store.getInfo(id);
  },

  setInfo: function ClientEngine_setInfo(id, info) {
    this._store.setInfo(id, info);
    this._tracker.addChangedID(id);
  },

  // helpers for getting/setting this client's info directly

  get clientID() {
    if (!Svc.Prefs.get("client.GUID"))
      Svc.Prefs.set("client.GUID", Utils.makeGUID());
    return Svc.Prefs.get("client.GUID");
  },

  get syncID() {
    if (!Svc.Prefs.get("client.syncID"))
      Svc.Prefs.set("client.syncID", Utils.makeGUID());
    return Svc.Prefs.get("client.syncID");
  },
  set syncID(value) {
    Svc.Prefs.set("client.syncID", value);
  },
  resetSyncID: function ClientEngine_resetSyncID() {
    Svc.Prefs.reset("client.syncID");
  },

  get clientName() {
    if (Svc.Prefs.isSet("client.name"))
      return Svc.Prefs.get("client.name");

    // Generate a client name if we don't have a useful one yet
    let user = Svc.Env.get("USER") || Svc.Env.get("USERNAME");
    let app = Svc.AppInfo.name;
    let host = Svc.SysInfo.get("host");

    // Try figuring out the name of the current profile
    let prof = Svc.Directory.get("ProfD", Components.interfaces.nsIFile).path;
    let profiles = Svc.Profiles.profiles;
    while (profiles.hasMoreElements()) {
      let profile = profiles.getNext().QueryInterface(Ci.nsIToolkitProfile);
      if (prof == profile.rootDir.path) {
        // Only bother adding the profile name if it's not "default"
        if (profile.name != "default")
          host = profile.name + "-" + host;
        break;
      }
    }

    return this.clientName = Str.sync.get("client.name", [user, app, host]);
  },
  set clientName(value) { Svc.Prefs.set("client.name", value); },

  get clientType() { return Svc.Prefs.get("client.type", "desktop"); },
  set clientType(value) { Svc.Prefs.set("client.type", value); },

  updateLocalInfo: function ClientEngine_updateLocalInfo(info) {
    // Grab data from the store if we weren't given something to start with
    if (!info)
      info = this.getInfo(this.clientID);

    // Overwrite any existing values with the ones from the pref
    info.name = this.clientName;
    info.type = this.clientType;

    return info;
  },

  observe: function ClientEngine_observe(subject, topic, data) {
    switch (topic) {
    case "nsPref:changed":
      switch (data) {
      case "client.name":
      case "client.type":
        // Update the store and tracker on pref changes
        this.setInfo(this.clientID, this.updateLocalInfo());
        break;
      }
      break;
    }
  },

  // Always process incoming items because they might have commands
  _reconcile: function _reconcile() {
    return true;
  },

  // Treat reset the same as wiping for locally cached clients
  _resetClient: function _resetClient() this._wipeClient(),

  _wipeClient: function _wipeClient() {
    SyncEngine.prototype._resetClient.call(this);
    this._store.wipe();

    // Make sure the local client exists after wiping
    this.setInfo(this.clientID, this.updateLocalInfo({}));
  }
};

function ClientStore(name) {
  Store.call(this, name);
}
ClientStore.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // ClientStore Attributes

  clients: {},

  __proto__: Store.prototype,

  //////////////////////////////////////////////////////////////////////////////
  // ClientStore Methods

  /**
   * Get the client by guid
   */
  getInfo: function ClientStore_getInfo(id) this.clients[id],

  /**
   * Set the client data for a guid. Use Engine.setInfo to update tracker.
   */
  setInfo: function ClientStore_setInfo(id, info) {
    this._log.debug("Setting client " + id + ": " + JSON.stringify(info));
    this.clients[id] = info;
  },

  //////////////////////////////////////////////////////////////////////////////
  // Store.prototype Methods

  changeItemID: function ClientStore_changeItemID(oldID, newID) {
    this._log.debug("Changing id from " + oldId + " to " + newID);
    this.clients[newID] = this.clients[oldID];
    delete this.clients[oldID];
  },

  create: function ClientStore_create(record) {
    this.update(record);
  },

  createRecord: function ClientStore_createRecord(id) {
    let record = new ClientRecord();
    record.id = id;
    record.payload = this.clients[id];
    return record;
  },

  getAllIDs: function ClientStore_getAllIDs() this.clients,

  itemExists: function ClientStore_itemExists(id) id in this.clients,

  remove: function ClientStore_remove(record) {
    this._log.debug("Removing client " + record.id);
    delete this.clients[record.id];
  },

  update: function ClientStore_update(record) {
    this._log.debug("Updating client " + record.id);
    this.clients[record.id] = record.payload;
  },

  wipe: function ClientStore_wipe() {
    this._log.debug("Wiping local clients store")
    this.clients = {};
  },
};

function ClientTracker(name) {
  Tracker.call(this, name);
}
ClientTracker.prototype = {
  __proto__: Tracker.prototype,
  get score() 100 // always sync
};
