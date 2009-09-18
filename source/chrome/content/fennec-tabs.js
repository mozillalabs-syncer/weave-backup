// Make sure this is the only instance of the page
Weave.Utils.ensureOneOpen(window);

const Cc = Components.classes;
const Ci = Components.interfaces;

let RemoteTabViewer = {
  _remoteClients: null,
  
  show: function RemoteTabViewer_show() {
    // Get all of the remote tabs and populate the list.
    let tabEngine = Weave.Engines.get("tabs");
    if (tabEngine) {
      this._remoteClients = tabEngine.getAllClients();
      let list = document.getElementById("tabList");
      this._populateTabs(list);
    } else {
      let item = document.createElement("img");
      item.setAttribute("class", "center");
      item.src = "chrome://weave/content/about/images/sync_active.png";
      document.getElementsByTagName('body')[0].appendChild(item);
      
      // Reload in 3 seconds
      setTimeout('document.location.reload()', 3000);
    }
  },
  
  _populateTabs: function RemoteTabViewer__populateTabs(holder) {
    // Clear out all child elements from holder first, so we don't
    // end up adding duplicate rows.
    let engine = Weave.Engines.get("tabs");
    if (holder.hasChildNodes()) {
      while (holder.childNodes.length >= 1)
        holder.removeChild(holder.firstChild);
    }

    let trim = function(s) s.length > 80 ? s.substr(0, 80) + "\u2026" : s;

    // Generate the list of tabs
    for (let [guid, client] in Iterator(this._remoteClients)) {
      // Create the client node, but don't add it in-case we don't show any tabs
      let appendClient = true;
      let nameNode = document.createElement("h2");
      nameNode.innerHTML = client.getClientName();

      client.getAllTabs().forEach(function({title, urlHistory}) {
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
        
        let imgDiv = document.createElement("div");
        imgDiv.setAttribute("class", "icon");
        let img = document.createElement("img");
        img.src = "chrome://weave/skin/tab.png";
        imgDiv.appendChild(img);
      
        let tabDiv = document.createElement("div");
        tabDiv.setAttribute("class", "info");
        let titleNode = document.createElement("div");
        titleNode.setAttribute("class", "title");
        titleNode.innerHTML = trim(title);
        let urlNode = document.createElement("div");
        urlNode.setAttribute("class", "url");
        urlNode.innerHTML = trim(pageUrl);
        tabDiv.appendChild(titleNode);
        tabDiv.appendChild(urlNode);
      
        item.appendChild(imgDiv);
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
      item.innerHTML = "No remote tabs synced!";
      document.getElementsByTagName('body')[0].appendChild(item);
    }
  }
};
