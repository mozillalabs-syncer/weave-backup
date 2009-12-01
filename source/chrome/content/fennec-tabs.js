// Make sure this is the only instance of the page
Weave.Utils.ensureOneOpen(window);

const Cc = Components.classes;
const Ci = Components.interfaces;

let RemoteTabViewer = {
  show: function RemoteTabViewer_show() {
    this._populateTabs();
    this._refetchTabs();
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
    for (let [guid, client] in Iterator(engine.getAllClients())) {
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
      let item = document.createElement("h1");
      item.textContent = "No remote tabs synced!";
      document.getElementsByTagName('body')[0].appendChild(item);
    }
  }
};
