const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

let Sync = {
  //////////////////////////////////////////////////////////////////////////////
  // Public Methods

  onLoad: function Sync_onLoad() {
    let dialogStr = this._getString("dialog");
    this._set("syncDialog", "title", "syncTitle", "value", dialogStr("title"));
    this._set("syncButton", "label", dialogStr("accept"));

    this._set("dirCaption", "label", this._getString("dir.caption"));
    this._set("dataCaption", "label", this._getString("data.caption"));

    this.updateDir();
  },

  onUnload: function Sync_onUnload() {
  },

  doSync: function Sync_doSync() {
    let warning = this._getString("dir", this._syncType, "warning");
    let title = warning("title")();

    // If we have warning text, cancel closing the dialog if the user cancels
    if (title && !Weave.Svc.Prompt.confirm(null, title, warning()))
      return false;

    // Once we start, we won't stop, but we'll close the dialog soon
    this._set("syncButton", "disabled", "cancelButton", "disabled", "true");

    // Run the sync type then do the actual sync
    Weave.Service[this._syncType](Weave.Utils.openStatus);

    return true;
  },

  updateDir: function Sync_updateDir() {
    this._set("dirDesc", "value", this._getString("dir", this._syncType));
  },

  //////////////////////////////////////////////////////////////////////////////
  // Private Getters

  get _syncButton() this._syncDialog.getButton("accept"),
  get _cancelButton() this._syncDialog.getButton("cancel"),
  get _syncType() this._dirList.value,

  //////////////////////////////////////////////////////////////////////////////
  // Private Methods

  /**
   * Concat each argument to get a string from the string bundle by "curry"ing.
   *
   * @param args
   *        One argument for each dot-separated name
   * @return Function that gets the string if called with no arguments. With
   *         multiple arguments, it adds more words to the property name.
   * @usage Sync._getString("the.string.name")()
   * @usage Sync._getString("the", "string")("name")()
   * @usage Sync._getString("the")("string")("name")()
   */
  _getString: function Sync__getString(/* args */) {
    // Provide a way to get a string by name without throwing
    let bundle = this._syncStrings.stringBundle;
    let getString = function Sync___getString(name) {
      try {
        return bundle.GetStringFromName(name);
      }
      catch(ex) {
        // The string doesn't exist, just return empty
        return "";
      }
    };

    // Keep track of what name parts we have so far
    let parts = Array.slice(arguments);

    // Get the string with 0 args or curry in the new arguments
    return function() arguments.length == 0 ? getString(parts.join(".")) :
      Sync._getString.apply(Sync, parts.concat(Array.slice(arguments)));
  },

  /**
   * Wrapper to get an element by id and set an attribute to a value. It can
   * take as many id/attr pairs and the last argument will be the value to set.
   *
   * @param id
   *        Id of node to set
   * @param attr
   *        Attribute to set
   * @param val
   *        Value to set to the node's attribute. If this is a function, it'll
   *        be called with no arguments to get the value.
   * @usage Sync._set(id, attr, val)
   * @usage Sync._set(id, attr, function() val)
   * @usage Sync._set(id, attr, id2, attr2, val)
   */
  _set: function Sync__set(id, attr, val) {
    let args = Array.slice(arguments);

    // Take the last argument as the value; if it's a function, run it first
    val = args[args.length - 1];
    if (typeof val == "function")
      val = val();

    // Get the dom node and set the attribute
    for (let i = args.length - 2; --i >= 0; i--)
      this["_" + args[i]].setAttribute(args[i + 1], val);
  },
};

// Make each id a lazy getter for the element
for (let [prefix, items] in Iterator({
  sync: ["Dialog", "Strings", "Icon", "Title"],
  dir: ["Box", "Caption", "Device", "List", "Cloud", "Desc"],
  data: ["Box", "Caption", "List"],
})) items.forEach(function(item) let (id = prefix + item)
  Weave.Utils.lazy2(Sync, "_" + id, function() document.getElementById(id)));
