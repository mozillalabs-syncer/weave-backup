/* JONO TODO */

function FennecWeaveGlue() {
  // Log4Moz works on fennec?
  this._log = Log4Moz.repository.getLogger("Chrome.Window");
  this._log.info("Initializing Fennec Weave embedding");

  var engines = [
    new Weave.HistoryEngine()
  ];

  // check out this functional syntax!
  engines.forEach(Weave.Engines.register);
}
FennecWeaveGlue.prototype = {
  shutdown: function FennecWeaveGlue__shutdown() {
    // Anything that needs shutting down can go here.
  },

  debug: function FennecWeaveGlue__debug() {
    dump("I am getting as far as FennecWeaveGlue.debug().\n");
    // TODO dump out some goodies, like what's actually defined inside
    // the Weave namespace, and what the settings are for the relevant
    // preferences.
  }
};


let gFennecWeaveGlue;
window.addEventListener("load", function(e) {
			  gFennecWeaveGlue = new FennecWeaveGlue();
			  gFennecWeaveGlue.debug();
			}, false );
window.addEventListener("unload", function(e) {
			  gFennecWeaveGlue.shutdown(e);
			}, false );