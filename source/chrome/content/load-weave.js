// = load-weave =

// These are the only ones we *really* need in this file.
// We import them into the global namespace because the symbols they export
// are carefully named to minimize the risk of conflicts.

// Lazily load the service (and all its files) only when it's needed
__defineGetter__("Weave", function() {
  delete this.Weave;
  Components.utils.import("resource://weave/service.js");
  return Weave;
});
