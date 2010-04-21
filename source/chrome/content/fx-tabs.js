Components.utils.import("resource://weave/service.js");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

let RemoteTabViewer = {
  get _tabsList() document.getElementById("tabsList"),

  init: function () {
    Weave.Svc.Obs.add("weave:service:login:finish", this);
    Weave.Svc.Obs.add("weave:engine:sync:finish",   this);

    this.buildList(true);

    let win = getTopWin();
    let i = win.gFxWeaveGlue.getPageIndex();
    win.gBrowser.setIcon(win.gBrowser.mTabs[i], "chrome://weave/skin/sync-16x16.png");
  },

  buildList: function(force) {
    if (!Weave.Service.isLoggedIn ||
        this._refetchTabs(force))
      return;

    this._generateTabList();
  },

  createItem: function(attrs) {
    let item = document.createElement("richlistitem");

    // Copy the attributes from the argument into the item
    for (let attr in attrs)
      item.setAttribute(attr, attrs[attr]);

    if (attrs["type"] == "tab")
      item.label = attrs.title != "" ? attrs.title : attrs.url;

    return item;
  },

  filterTabs: function(event) {
    let val = event.target.value.toLowerCase();
    let numTabs = this._tabsList.getRowCount();
    let clientTabs = 0;
    let currentClient = null;
    for (let i = 0;i < numTabs;i++) {
      let item = this._tabsList.getItemAtIndex(i);
      let hide = false;
      if (item.getAttribute("type") == "tab") {
        if (item.getAttribute("url").toLowerCase().indexOf(val) == -1 &&
            item.getAttribute("title").toLowerCase().indexOf(val) == -1)
          hide = true;
        else
          clientTabs++;
      }
      else if (item.getAttribute("type") == "client") {
        if (currentClient) {
          if (clientTabs == 0)
            currentClient.hidden = true;
        }
        currentClient = item;
        clientTabs = 0;
      }
      item.hidden = hide;
    }
    if (clientTabs == 0)
      currentClient.hidden = true;
  },

  openSelected: function() {
    let items = this._tabsList.selectedItems;
    let urls = [];
    for (let i = 0;i < items.length;i++) {
      if (items[i].getAttribute("type") == "tab") {
        urls.push(items[i].getAttribute("url"));
        let index = this._tabsList.getIndexOfItem(items[i]);
        this._tabsList.removeItemAt(index);
      }
    }
    if (urls.length) {
      getTopWin().gBrowser.loadTabs(urls);
      this._tabsList.clearSelection();
    }
  },

  bookmarkSingleTab: function() {
    let item = this._tabsList.selectedItems[0];
    let uri = Weave.Utils.makeURI(item.getAttribute("url"));
    let title = item.getAttribute("title");
    PlacesUIUtils.showMinimalAddBookmarkUI(uri, title);
  },

  bookmarkSelectedTabs: function() {
    let items = this._tabsList.selectedItems;
    let URIs = [];
    for (let i = 0;i < items.length;i++) {
      if (items[i].getAttribute("type") == "tab") {
        let uri = Weave.Utils.makeURI(items[i].getAttribute("url"));
        if (!uri)
          continue;

        URIs.push(uri);
      }
    }
    if (URIs.length)
      PlacesUIUtils.showMinimalAddMultiBookmarkUI(URIs);
  },

  _generateTabList: function() {
    let engine = Weave.Engines.get("tabs");
    let list = this._tabsList;

    // clear out existing richlistitems
    let count = list.getRowCount();
    if (count > 0) {
      for (i = count - 1;i >= 0;i--)
        list.removeItemAt(i);
    }

    for (let [guid, client] in Iterator(engine.getAllClients())) {
      // Create the client node, but don't add it in-case we don't show any tabs
      let appendClient = true;
      let seenURLs = {};
      client.tabs.forEach(function({title, urlHistory, icon}) {
        let url = urlHistory[0];
        if (engine.locallyOpenTabMatchesURL(url) || url in seenURLs)
          return;

        seenURLs[url] = null;

        if (appendClient) {
          let attrs = {
            type: "client",
            clientName: client.clientName,
            icon: Weave.Clients.isMobile(client.id) ? "chrome://weave/skin/mobile-icon.png"
                                                    : "chrome://weave/skin/desktop-icon.png",
          };
          let clientEnt = RemoteTabViewer.createItem(attrs);
          list.appendChild(clientEnt);
          appendClient = false;
          clientEnt.disabled = true;
        }
        let attrs = {
          type:  "tab",
          title: title || url,
          url:   url,
          icon:  Weave.Utils.getIcon(icon)
        }
        let tab = RemoteTabViewer.createItem(attrs);
        list.appendChild(tab);
      });
    }
  },

  adjustContextMenu: function(event) {
    let mode = "all";
    switch (this._tabsList.selectedItems.length) {
      case 0:
        break;
      case 1:
        mode = "single"
        break;
      default:
        mode = "multiple";
        break;
    }
    let menu = document.getElementById("tabListContext");
    let el = menu.firstChild;
    while (el) {
      let sf = el.getAttribute("showFor");
      if (sf)
        el.hidden = sf != mode && sf != "all";

      el = el.nextSibling;
    }
  },

  _refetchTabs: function(force) {
    if (!force) {
      // Don't bother refetching tabs if we already did so recently
      let lastFetch = Weave.Svc.Prefs.get("lastTabFetch", 0);
      let now = Math.floor(Date.now() / 1000);
      if (now - lastFetch < 30)
        return false;
    }

    // if Clients hasn't synced yet this session, need to sync it as well
    if (Weave.Clients.lastSync == 0)
      Weave.Clients.sync();

    // Force a sync only for the tabs engine
    let engine = Weave.Engines.get("tabs");
    engine.lastModified = null;
    engine.sync();
    Weave.Svc.Prefs.set("lastTabFetch", Math.floor(Date.now() / 1000));

    return true;
  },

  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIObserver,
                                         Components.interfaces.nsISupportsWeakReference]),

  observe: function(subject, topic, data) {
    switch (topic) {
      case "weave:service:login:finish":
        this.buildList(true);
        break;
      case "weave:engine:sync:finish":
        if (subject == "tabs")
          this._generateTabList();
        break;
    }
  },

  handleClick: function(event) {
    if (event.target.getAttribute("type") != "tab")
      return;

    if (event.button == 1) {
      let url = event.target.getAttribute("url");
      openUILink(url, event);
      let index = this._tabsList.getIndexOfItem(event.target);
      this._tabsList.removeItemAt(index);
    }
  }
}
