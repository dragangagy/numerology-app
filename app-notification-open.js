(function(){
  function ensureModal(){
    if(document.getElementById("notificationInfoModal"))return;
    const style = document.createElement("style");
    style.textContent = [
      ".notification-info-modal{display:none;position:fixed;inset:0;background:rgba(2,6,23,.82);align-items:center;justify-content:center;z-index:100001;padding:18px}",
      ".notification-info-panel{width:min(92vw,380px);background:#0f172a;border:1px solid rgba(56,189,248,.45);border-radius:12px;box-shadow:0 0 26px rgba(56,189,248,.28);color:white;padding:16px;position:relative}",
      ".notification-info-close{position:absolute;top:8px;right:8px;width:30px;height:30px;border:1px solid rgba(148,163,184,.36);border-radius:8px;background:#1e293b;color:white;cursor:pointer;font-weight:bold}",
      ".notification-info-title{color:#38bdf8;font-size:15px;font-weight:bold;padding-right:34px;margin-bottom:8px}",
      ".notification-info-image{display:none;width:min(48vw,150px);max-height:240px;object-fit:contain;margin:0 auto 10px;border-radius:8px;box-shadow:0 0 16px rgba(56,189,248,.2)}",
      ".notification-info-body{color:#e2e8f0;font-size:13px;line-height:1.5;white-space:pre-line}"
    ].join("\n");
    document.head.appendChild(style);
    const modal = document.createElement("div");
    modal.id = "notificationInfoModal";
    modal.className = "notification-info-modal";
    modal.innerHTML = '<div class="notification-info-panel"><button class="notification-info-close" type="button" aria-label="Close">X</button><div id="notificationInfoTitle" class="notification-info-title">Notification</div><img id="notificationInfoImage" class="notification-info-image" alt=""><div id="notificationInfoBody" class="notification-info-body"></div></div>';
    modal.querySelector("button").addEventListener("click", closeNotificationInfo);
    document.body.appendChild(modal);
  }

  function showNotificationInfo(title, body, image){
    ensureModal();
    const modal = document.getElementById("notificationInfoModal");
    const titleEl = document.getElementById("notificationInfoTitle");
    const bodyEl = document.getElementById("notificationInfoBody");
    const imageEl = document.getElementById("notificationInfoImage");
    if(titleEl)titleEl.textContent = title || "Notification";
    if(bodyEl)bodyEl.textContent = body || "";
    if(imageEl){
      if(image){imageEl.src = image; imageEl.style.display = "block"}
      else{imageEl.removeAttribute("src"); imageEl.style.display = "none"}
    }
    if(modal)modal.style.display = "flex";
  }

  function closeNotificationInfo(){
    const modal = document.getElementById("notificationInfoModal");
    if(modal)modal.style.display = "none";
  }

  function currentPageName(){
    const path = String(window.location.pathname || "");
    return (path.split(/[\/\\]/).pop() || "index.html").toLowerCase();
  }

  function saveOwnerInputFromParams(params){
    const state = {
      date: params.get("date") || "",
      time: params.get("time") || "",
      city: params.get("city") || "",
      isTwin: params.get("isTwin") === "true",
      isTwin3: params.get("isTwin3") === "true"
    };
    if((state.date || state.time || state.city) && window.AppSharedState && typeof AppSharedState.saveLastAstroInput === "function"){
      try{ AppSharedState.saveLastAstroInput(state); }catch(e){}
    }
  }

  function activateNotificationSource(pending){
    if(!pending)return false;
    if(pending.tab === "ownerProfile"){
      setTimeout(function(){
        if(typeof window.openOwnerProfile === "function")window.openOwnerProfile();
      }, 240);
      return true;
    }
    if(pending.tab && typeof window.showTab === "function"){
      try{
        window.showTab(pending.tab);
        return true;
      }catch(e){}
    }
    return false;
  }

  function cleanNotificationParams(){
    if(!history.replaceState)return;
    const cleanParams = new URLSearchParams(window.location.search);
    ["notificationTopic","notificationTitle","notificationBody","notificationImage","notificationTab","notificationPage"].forEach(key => cleanParams.delete(key));
    const query = cleanParams.toString();
    history.replaceState({}, document.title, window.location.pathname + (query ? "?"+query : "") + (window.location.hash || ""));
  }

  function openNotificationFromParams(){
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("notificationTopic");
    saveOwnerInputFromParams(params);
    if(topic){
      const targetPage = (params.get("notificationPage") || "").toLowerCase();
      if(targetPage && targetPage !== currentPageName()){
        window.location.href = targetPage + "?" + params.toString();
        return;
      }
      window.__pendingNotificationInfo = {
        topic,
        title: params.get("notificationTitle") || "Notification",
        body: params.get("notificationBody") || "Open the related section for more details.",
        image: params.get("notificationImage") || "",
        tab: params.get("notificationTab") || "",
        page: params.get("notificationPage") || ""
      };
    }
    const pending = window.__pendingNotificationInfo;
    if(!pending || !pending.topic)return;
    const activated = activateNotificationSource(pending);
    if(!activated && !pending.page)showNotificationInfo(pending.title, pending.body, pending.image);
    if(topic)cleanNotificationParams();
  }

  function openAppNotification(payload){
    let data = payload;
    if(typeof data === "string"){
      try{data = JSON.parse(data)}catch(e){data = {openUrl:data,url:data}}
    }
    data = data || {};
    const directUrl = data.openUrl || data.url;
    if(directUrl){
      window.location.href = directUrl;
      return;
    }
    const route = data.route || {};
    const params = new URLSearchParams();
    const topic = data.topic || route.topic || "";
    const page = data.page || route.page || "";
    const tab = data.tab || route.tab || "";
    if(topic)params.set("notificationTopic", topic);
    if(data.title || route.title)params.set("notificationTitle", data.title || route.title);
    if(data.body || route.body)params.set("notificationBody", data.body || route.body);
    if(data.image || data.imageUrl || route.image)params.set("notificationImage", data.image || data.imageUrl || route.image);
    if(tab)params.set("notificationTab", tab);
    if(page)params.set("notificationPage", page);
    const ownerState = data.ownerInput || route.ownerInput || (window.AppSharedState && typeof AppSharedState.lastAstroInput === "function" ? AppSharedState.lastAstroInput() : null);
    if(ownerState){
      if(ownerState.date)params.set("date", ownerState.date);
      if(ownerState.time)params.set("time", ownerState.time);
      if(ownerState.city)params.set("city", ownerState.city);
      if(ownerState.isTwin)params.set("isTwin", "true");
      if(ownerState.isTwin3)params.set("isTwin3", "true");
    }
    window.location.href = (page || currentPageName() || "index.html") + (params.toString() ? "?" + params.toString() : "");
  }

  window.showNotificationInfo = window.showNotificationInfo || showNotificationInfo;
  window.closeNotificationInfo = window.closeNotificationInfo || closeNotificationInfo;
  window.openNotificationFromParams = openNotificationFromParams;
  window.openAppNotification = openAppNotification;
  window.handleNotificationOpen = openAppNotification;
  window.onNotificationOpen = openAppNotification;
  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(openNotificationFromParams, 180);
    setTimeout(openNotificationFromParams, 900);
  });
})();
