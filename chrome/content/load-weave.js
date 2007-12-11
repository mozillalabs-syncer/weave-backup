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

Components.utils.import("resource://weave/weave.js");
Components.utils.import("resource://weave/log4moz.js");

