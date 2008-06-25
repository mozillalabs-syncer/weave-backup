let ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
  .getService(Components.interfaces.nsIIOService);
let resProt = ioSvc.getProtocolHandler("resource")
  .QueryInterface(Components.interfaces.nsIResProtocolHandler);

if (!resProt.hasSubstitution("weave")) {
  let extMgr = Components.classes["@mozilla.org/extensions/manager;1"]
    .getService(Components.interfaces.nsIExtensionManager);
  let loc = extMgr.getInstallLocation("{340c2bbc-ce74-4362-90b5-7c26312808ef}");
  let extD = loc.getItemLocation("{340c2bbc-ce74-4362-90b5-7c26312808ef}");
  extD.append("modules");
  resProt.setSubstitution("weave", ioSvc.newFileURI(extD));
}

// These are here because of bug 408412.
// Note: they are here depth-first so that it is *this* import() which
// triggers the first exception, otherwise it'll be obscured (see the bug).
// We import them into throwaway objects so they don't pollute the global
// namespace.
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", {});
Components.utils.import("resource://weave/constants.js", {});
Components.utils.import("resource://weave/log4moz.js", {});
Components.utils.import("resource://weave/util.js", {});
Components.utils.import("resource://weave/async.js", {});
Components.utils.import("resource://weave/crypto.js", {});
Components.utils.import("resource://weave/notifications.js", {});
Components.utils.import("resource://weave/identity.js", {});
Components.utils.import("resource://weave/dav.js", {});
Components.utils.import("resource://weave/remote.js", {});
Components.utils.import("resource://weave/wrap.js", {});
Components.utils.import("resource://weave/stores.js", {});
Components.utils.import("resource://weave/syncCores.js", {});
Components.utils.import("resource://weave/engines.js", {});
Components.utils.import("resource://weave/service.js", {});

// These are the only ones we *really* need in this file.
// We import them into the global namespace because the symbols they export
// are carefully named to minimize the risk of conflicts.
Components.utils.import("resource://weave/log4moz.js");
Components.utils.import("resource://weave/service.js");
