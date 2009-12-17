// Make sure this is the only instance of the page
Components.utils.import("resource://weave/service.js");
Weave.Utils.ensureOneOpen(window);

const Cc = Components.classes;
const Ci = Components.interfaces;

let RemoteTabViewer = {
  show: function RemoteTabViewer_show() {
    // Don't do anything if the tabs engine isn't ready
    if (!Weave.Engines.get("tabs"))
      return;

    this._maybeNotify();
    this._populateTabs();
    this._refetchTabs();
  },

  _maybeNotify: function _maybeNotify() {
    // Don't notify if the tab engine has new tabs or the user dismissed it
    let prefs = Weave.Svc.Prefs;
    if (prefs.get("notifyTabState") == 0)
      return;

    let chromeWin = window.QueryInterface(Ci.nsIInterfaceRequestor).
      getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).
      rootTreeItem.QueryInterface(Ci.nsIInterfaceRequestor).
      getInterface(Ci.nsIDOMWindow).QueryInterface(Ci.nsIDOMChromeWindow);

    // No need to reshow the notification if it's still open
    let notifyBox = chromeWin.getNotificationBox(window);
    if (notifyBox.getNotificationWithValue("remote-tabs") != null)
      return;

    let message = Weave.Str.sync.get("remote.notification.label");
    let notification = notifyBox.appendNotification(message, "remote-tabs", "",
      notifyBox.PRIORITY_INFO_LOW);

    // Wrap the close function to find out if the user clicks the X
    let close = notification.close;
    notification.close = function() {
      // Once the user dismisses the dialog, remember that and don't show again
      prefs.set("notifyTabState", 0);
      close.apply(notification, arguments);
    };
  },

  _refetchTabs: function _refetchTabs() {
    // Don't bother refetching tabs if we already did so recently
    let lastFetch = Weave.Svc.Prefs.get("lastTabFetch", 0);
    let now = Math.floor(Date.now() / 1000);
    if (now - lastFetch < 30)
      return;

    // Asynchronously fetch the tabs
    setTimeout(function() {
      let engine = Weave.Engines.get("tabs");
      let lastSync = engine.lastSync;

      // Force a sync only for the tabs engine
      engine.lastModified = null;
      engine.sync();
      Weave.Svc.Prefs.set("lastTabFetch", now);

      // Only reload the page if something synced
      if (engine.lastSync != lastSync)
        location.reload();
    }, 0);
  },

  _populateTabs: function _populateTabs() {
    // Clear out all child elements from holder first, so we don't
    // end up adding duplicate rows.
    let engine = Weave.Engines.get("tabs");
    let holder = document.getElementById("tabList");
    if (holder.hasChildNodes()) {
      while (holder.childNodes.length >= 1)
        holder.removeChild(holder.firstChild);
    }

    // Generate the list of tabs
    let haveTabs = false;
    for (let [guid, client] in Iterator(engine.getAllClients())) {
      haveTabs = true;

      // Create the client node, but don't add it in-case we don't show any tabs
      let appendClient = true;
      let nameNode = document.createElement("h2");
      nameNode.textContent = client.clientName;

      client.tabs.forEach(function({title, urlHistory, icon}) {
        let pageUrl = urlHistory[0];

        // Skip tabs that are already open
        if (engine.locallyOpenTabMatchesURL(pageUrl))
          return;

        if (title == "")
          title = pageUrl;

        let item = document.createElement("div");
        item.addEventListener("click", function() {
          window.location = pageUrl;
        }, false)
        item.setAttribute("class", "tab");

        let img = document.createElement("img");
        img.setAttribute("class", "icon");
        img.src = Weave.Utils.getIcon(icon, "chrome://weave/skin/tab.png");

        let tabDiv = document.createElement("div");
        tabDiv.setAttribute("class", "info");
        let titleNode = document.createElement("div");
        titleNode.setAttribute("class", "title");
        titleNode.textContent = title;
        let urlNode = document.createElement("div");
        urlNode.setAttribute("class", "url");
        urlNode.textContent = pageUrl;
        tabDiv.appendChild(titleNode);
        tabDiv.appendChild(urlNode);

        item.appendChild(img);
        item.appendChild(tabDiv);

        // Append the client name if we haven't yet
        if (appendClient) {
          appendClient = false;
          holder.appendChild(nameNode);
        }

        holder.appendChild(item);
      });
    }

    if (holder.childNodes.length == 0) {
      // Assume we're pending, but we might already have tabs or have synced
      let text = Weave.Str.sync.get("remote.pending.label");
      if (haveTabs)
        text = Weave.Str.sync.get("remote.opened.label");
      else if (engine.lastSync != 0)
        text = Weave.Str.sync.get("remote.missing.label");

      let item = document.createElement("h1");
      item.textContent = text;
      document.getElementsByTagName('body')[0].appendChild(item);
    }
  }
};
