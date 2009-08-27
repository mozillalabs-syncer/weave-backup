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

    // Get a list of all tabs:
    let allTabs = [];
    for each (record in this._remoteClients) {
      let tabs = record.getAllTabs();
      let cname = record.getClientName();
      for each (tab in tabs) {
        if (!tab.title) {
          tab.title = tab.urlHistory[0];
        }
        if (!tab.lastUsed) {
          tab.lastUsed = 0;
        }
        if (cname in allTabs)
          allTabs[cname].push(tab);
        else
          allTabs[cname] = [tab];
      }
    }

    // Now actually add them to the list
    if (allTabs.__count__ > 0) {
      for (let client in allTabs) {
        let cname = document.createElement("h2");
        cname.innerHTML = client;
        holder.appendChild(cname);
        
        for each (let tab in allTabs[client]) {
          // Skip those that are already open:
          if ( engine.locallyOpenTabMatchesURL(tab.urlHistory[0]) ) {
            continue;
          }
          
          // Trim title and url to 80 chars
          let fTitle = tab.title;
          let uTitle = tab.urlHistory[0];
          if (fTitle.length > 80) fTitle = substr(fTitle, 0, 80);
          if (uTitle.length > 80) uTitle = substr(uTitle, 0, 80);
          
          let item = document.createElement("div");
          item.setAttribute("onClick",
            "window.open('" + tab.urlHistory[0] + "')");
          item.setAttribute("class", "tab");
        
          let imgDiv = document.createElement("div");
          imgDiv.setAttribute("class", "icon");
          let img = document.createElement("img");
          img.src = "chrome://weave/skin/tab.png";
          imgDiv.appendChild(img);
        
          let tabDiv = document.createElement("div");
          tabDiv.setAttribute("class", "info");
          let title = document.createElement("div");
          title.setAttribute("class", "title");
          title.innerHTML = fTitle;
          let url = document.createElement("div");
          url.setAttribute("class", "url");
          url.innerHTML = uTitle;
          tabDiv.appendChild(title);
          tabDiv.appendChild(url);
        
          item.appendChild(imgDiv);
          item.appendChild(tabDiv);
        
          holder.appendChild(item);
        }
      }
    } else {
      let item = document.createElement("h1");
      item.innerHTML = "No remote tabs synced!";
      document.getElementsByTagName('body')[0].appendChild(item);
    }
  }
};
