(function(){
  function ensureModal(){
    if(document.getElementById("notificationInfoModal"))return;
    const style = document.createElement("style");
    style.textContent = [
      ".notification-info-modal{display:none;position:fixed;inset:0;background:rgba(2,6,23,.82);align-items:center;justify-content:center;z-index:100001;padding:18px}",
      ".notification-info-panel{width:min(92vw,380px);background:#0f172a;border:1px solid rgba(56,189,248,.45);border-radius:12px;box-shadow:0 0 26px rgba(56,189,248,.28);color:white;padding:16px;position:relative}",
      ".notification-info-close{position:absolute;top:8px;right:8px;width:30px;height:30px;border:1px solid rgba(148,163,184,.36);border-radius:8px;background:#1e293b;color:white;cursor:pointer;font-weight:bold}",
      ".notification-info-title{color:#38bdf8;font-size:15px;font-weight:bold;padding-right:34px;margin-bottom:8px}",
      ".notification-info-body{color:#e2e8f0;font-size:13px;line-height:1.5;white-space:pre-line}"
    ].join("\n");
    document.head.appendChild(style);
    const modal = document.createElement("div");
    modal.id = "notificationInfoModal";
    modal.className = "notification-info-modal";
    modal.innerHTML = '<div class="notification-info-panel"><button class="notification-info-close" type="button" aria-label="Close">X</button><div id="notificationInfoTitle" class="notification-info-title">Notification</div><div id="notificationInfoBody" class="notification-info-body"></div></div>';
    modal.querySelector("button").addEventListener("click", closeNotificationInfo);
    document.body.appendChild(modal);
  }

  function showNotificationInfo(title, body){
    ensureModal();
    const modal = document.getElementById("notificationInfoModal");
    const titleEl = document.getElementById("notificationInfoTitle");
    const bodyEl = document.getElementById("notificationInfoBody");
    if(titleEl)titleEl.textContent = title || "Notification";
    if(bodyEl)bodyEl.textContent = body || "";
    if(modal)modal.style.display = "flex";
  }

  function closeNotificationInfo(){
    const modal = document.getElementById("notificationInfoModal");
    if(modal)modal.style.display = "none";
  }

  function openNotificationFromParams(){
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("notificationTopic");
    if(topic){
      window.__pendingNotificationInfo = {
        topic,
        title: params.get("notificationTitle") || "Notification",
        body: params.get("notificationBody") || "Open the related section for more details.",
        tab: params.get("notificationTab") || ""
      };
    }
    const pending = window.__pendingNotificationInfo;
    if(!pending || !pending.topic)return;
    if(pending.tab && typeof window.showTab === "function"){
      try{ window.showTab(pending.tab); }catch(e){}
    }
    showNotificationInfo(pending.title, pending.body);
    if(topic && history.replaceState){
      const cleanParams = new URLSearchParams(window.location.search);
      ["notificationTopic","notificationTitle","notificationBody","notificationTab"].forEach(key => cleanParams.delete(key));
      const query = cleanParams.toString();
      history.replaceState({}, document.title, window.location.pathname + (query ? "?"+query : "") + (window.location.hash || ""));
    }
  }

  window.showNotificationInfo = window.showNotificationInfo || showNotificationInfo;
  window.closeNotificationInfo = window.closeNotificationInfo || closeNotificationInfo;
  window.openNotificationFromParams = openNotificationFromParams;
  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(openNotificationFromParams, 180);
    setTimeout(openNotificationFromParams, 900);
  });
})();
