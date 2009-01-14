// These are here because of bug 408412.
// Note: they are here depth-first so that it is *this* import() which
// triggers the first exception, otherwise it'll be obscured (see the bug).
// We import them into throwaway objects so they don't pollute the global
// namespace.
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", {});

Components.utils.import("resource://weave/Observers.js", {});
Components.utils.import("resource://weave/Preferences.js", {});
Components.utils.import("resource://weave/log4moz.js", {});

Components.utils.import("resource://weave/constants.js", {});
Components.utils.import("resource://weave/util.js", {});
Components.utils.import("resource://weave/async.js", {});
Components.utils.import("resource://weave/auth.js", {});
Components.utils.import("resource://weave/identity.js", {});
Components.utils.import("resource://weave/resource.js", {});
Components.utils.import("resource://weave/base_records/wbo.js", {});
Components.utils.import("resource://weave/base_records/crypto.js", {});
Components.utils.import("resource://weave/base_records/keys.js", {});
Components.utils.import("resource://weave/base_records/collection.js", {});
Components.utils.import("resource://weave/stores.js", {});
Components.utils.import("resource://weave/trackers.js", {});
Components.utils.import("resource://weave/sharing.js", {});
Components.utils.import("resource://weave/engines.js", {});
Components.utils.import("resource://weave/engines/bookmarks.js", {});
//Components.utils.import("resource://weave/engines/cookies.js", {});
Components.utils.import("resource://weave/engines/forms.js", {});
Components.utils.import("resource://weave/engines/history.js", {});
//Components.utils.import("resource://weave/engines/input.js", {});
//Components.utils.import("resource://weave/engines/passwords.js", {});
//Components.utils.import("resource://weave/engines/tabs.js", {});
Components.utils.import("resource://weave/faultTolerance.js", {});
Components.utils.import("resource://weave/notifications.js", {});
Components.utils.import("resource://weave/oauth.js", {});
Components.utils.import("resource://weave/wrap.js", {});
Components.utils.import("resource://weave/service.js", {});
//Components.utils.import("resource://weave/xmpp/authenticationLayer.js", {});
//Components.utils.import("resource://weave/xmpp/transportLayer.js", {});
//Components.utils.import("resource://weave/xmpp/xmppClient.js", {});

// These are the only ones we *really* need in this file.
// We import them into the global namespace because the symbols they export
// are carefully named to minimize the risk of conflicts.
Components.utils.import("resource://weave/log4moz.js");
Components.utils.import("resource://weave/service.js");
