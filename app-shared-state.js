(function(){
  const CONTACTS_KEY = "numerology_dates";
  const OWNER_KEY = "numerology_owner_profile";
  const LAST_ASTRO_KEY = "numerology_last_astro_input";
  const memoryStore = {};

  function ensureAppAlert(){
    if(window.__appAlertInstalled)return;
    window.__appAlertInstalled = true;
    const nativeAlert = window.alert ? window.alert.bind(window) : null;

    function ensureAlertStyle(){
      if(document.getElementById("appAlertStyle"))return;
      const style = document.createElement("style");
      style.id = "appAlertStyle";
      style.textContent = ".app-alert-overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(3,7,18,.7);z-index:2147483647;padding:18px}.app-alert-panel{width:min(90vw,360px);background:#0f172a;color:#f8fafc;border:1px solid rgba(245,158,11,.45);border-radius:10px;box-shadow:0 18px 46px rgba(0,0,0,.46),0 0 20px rgba(245,158,11,.18);padding:16px;text-align:center}.app-alert-message{font-size:15px;line-height:1.45;white-space:pre-line;margin-bottom:14px}.app-alert-ok{min-width:96px;border:1px solid rgba(250,204,21,.72);border-radius:8px;background:linear-gradient(180deg,#facc15,#b45309);color:#111827;font-weight:800;padding:9px 16px;cursor:pointer}";
      document.head.appendChild(style);
    }

    function showAppAlert(message){
      if(!document.body){
        if(nativeAlert)nativeAlert(String(message || ""));
        return;
      }
      ensureAlertStyle();
      let overlay = document.getElementById("appAlertOverlay");
      if(!overlay){
        overlay = document.createElement("div");
        overlay.id = "appAlertOverlay";
        overlay.className = "app-alert-overlay";
        overlay.innerHTML = '<div class="app-alert-panel" role="dialog" aria-modal="true"><div id="appAlertMessage" class="app-alert-message"></div><button id="appAlertOk" class="app-alert-ok" type="button">OK</button></div>';
        document.body.appendChild(overlay);
        const ok = document.getElementById("appAlertOk");
        if(ok)ok.addEventListener("click", function(){overlay.style.display = "none"});
        overlay.addEventListener("click", function(event){if(event.target === overlay)overlay.style.display = "none"});
      }
      const messageEl = document.getElementById("appAlertMessage");
      if(messageEl)messageEl.textContent = String(message || "");
      overlay.style.display = "flex";
    }

    window.appAlert = showAppAlert;
    window.alert = showAppAlert;
  }

  ensureAppAlert();

  function appNavigate(url){
    const target = String(url || "").trim();
    if(!target)return false;
    if(/^(mailto:|tel:|sms:|https?:)/i.test(target)){
      window.location.href = target;
      return false;
    }
    window.location.href = target;
    return false;
  }

  function storageGet(key){
    try{
      if(window.localStorage)return window.localStorage.getItem(key);
    }catch(e){}
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }

  function storageSet(key, value){
    try{
      if(window.localStorage){
        window.localStorage.setItem(key, value);
        return;
      }
    }catch(e){}
    memoryStore[key] = value;
  }

  function readJson(key, fallback){
    try{return JSON.parse(storageGet(key) || JSON.stringify(fallback))}
    catch(e){return fallback}
  }

  function writeJson(key, value){
    storageSet(key, JSON.stringify(value));
  }

  function ownerProfile(){
    return readJson(OWNER_KEY, null);
  }

  function ownerName(profile){
    return [profile && profile.firstName, profile && profile.lastName].filter(Boolean).join(" ").trim();
  }

  function ownerContact(){
    const profile = ownerProfile();
    const name = ownerName(profile);
    if(!name)return null;
    return {
      id:"owner-profile",
      ownerProfile:true,
      locked:true,
      name,
      date:profile.birthDate || "",
      time:profile.birthTime || "",
      city:profile.birthCity || "",
      isTwin:!!profile.isTwin,
      isTwin3:!!profile.isTwin3
    };
  }

  function storedContacts(){
    const dates = readJson(CONTACTS_KEY, []);
    return Array.isArray(dates) ? dates.filter(item => item && item.id !== "owner-profile" && !item.ownerProfile) : [];
  }

  function contactsWithOwner(){
    const owner = ownerContact();
    const dates = storedContacts();
    return owner ? [owner, ...dates] : dates;
  }

  function saveContacts(dates){
    const clean = (Array.isArray(dates) ? dates : []).filter(item => item && item.id !== "owner-profile" && !item.ownerProfile);
    writeJson(CONTACTS_KEY, clean);
    return contactsWithOwner();
  }

  function deleteContact(id){
    if(id === "owner-profile")return false;
    saveContacts(storedContacts().filter(item => String(item.id) !== String(id)));
    return true;
  }

  function lastAstroInput(){
    const primary = readJson(LAST_ASTRO_KEY, null);
    const alias = readJson("lastAstroInput", null);
    const sessionLike = readJson("astroReturnState", null);
    const candidates = [primary, alias, sessionLike].filter(item => item && (item.date || item.time || item.city));
    if(candidates.length){
      candidates.sort((a,b) => (Date.parse(b.updatedAt || "") || 0) - (Date.parse(a.updatedAt || "") || 0));
      return candidates[0];
    }
    const owner = ownerContact();
    return owner ? {date:owner.date, time:owner.time, city:owner.city, isTwin:owner.isTwin, isTwin3:owner.isTwin3} : null;
  }

  function saveLastAstroInput(state){
    const existing = lastAstroInput() || {};
    const hasOwn = (key) => !!state && Object.prototype.hasOwnProperty.call(state, key);
    const clean = (value) => String(value || "").trim();
    const next = {
      date: clean(hasOwn("date") ? state.date : "") || clean(existing.date),
      time: clean(hasOwn("time") ? state.time : "") || clean(existing.time),
      city: clean(hasOwn("city") ? state.city : "") || clean(existing.city),
      isTwin: hasOwn("isTwin") ? !!state.isTwin : !!existing.isTwin,
      isTwin3: hasOwn("isTwin3") ? !!state.isTwin3 : !!existing.isTwin3,
      updatedAt: new Date().toISOString()
    };
    writeJson(LAST_ASTRO_KEY, next);
    writeJson("lastAstroInput", next);
    writeJson("astroReturnState", next);
    try{
      if(window.sessionStorage){
        window.sessionStorage.setItem("astroReturnState", JSON.stringify(next));
      }
    }catch(e){}
    return next;
  }

  function stateFromParams(params){
    const p = params || new URLSearchParams(location.search);
    return {
      date:p.get("date") || "",
      time:p.get("time") || "",
      city:p.get("city") || "",
      isTwin:p.get("isTwin") === "true",
      isTwin3:p.get("isTwin3") === "true"
    };
  }

  function preferredAstroInput(params){
    const fromParams = stateFromParams(params);
    if(fromParams.date || fromParams.time || fromParams.city)return fromParams;
    return lastAstroInput() || {date:"", time:"", city:"", isTwin:false, isTwin3:false};
  }

  function bindLastAstroInput(ids){
    if(!ids)return;
    const read = () => {
      const date = ids.dateId && document.getElementById(ids.dateId);
      const time = ids.timeId && document.getElementById(ids.timeId);
      const city = ids.cityId && document.getElementById(ids.cityId);
      const twin = ids.twinId && document.getElementById(ids.twinId);
      const twin3 = ids.twin3Id && document.getElementById(ids.twin3Id);
      const next = {};
      if(date)next.date = date.value;
      if(time)next.time = time.value;
      if(city)next.city = city.value;
      if(twin)next.isTwin = twin.checked;
      if(twin3)next.isTwin3 = twin3.checked;
      saveLastAstroInput(next);
    };
    [ids.dateId, ids.timeId, ids.cityId, ids.twinId, ids.twin3Id].forEach(id => {
      const el = id && document.getElementById(id);
      if(el && !el.dataset.lastAstroBound){
        el.dataset.lastAstroBound = "1";
        el.addEventListener("input", read);
        el.addEventListener("change", read);
      }
    });
  }
  function closeNativeApp(fallbackUrl){
    const fallback = fallbackUrl || "index.html";
    const platform = window.Capacitor && typeof window.Capacitor.getPlatform === "function" ? window.Capacitor.getPlatform() : "web";
    if(platform === "ios"){
      appNavigate(fallback);
      return false;
    }
    const attempts = [
      {ok:() => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && typeof window.Capacitor.Plugins.App.exitApp === "function", run:() => window.Capacitor.Plugins.App.exitApp()},
      {ok:() => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && typeof window.Capacitor.Plugins.App.minimizeApp === "function", run:() => window.Capacitor.Plugins.App.minimizeApp()},
      {ok:() => navigator.app && typeof navigator.app.exitApp === "function", run:() => navigator.app.exitApp()},
      {ok:() => window.Android && typeof window.Android.exitApp === "function", run:() => window.Android.exitApp()},
      {ok:() => window.Android && typeof window.Android.closeApp === "function", run:() => window.Android.closeApp()},
      {ok:() => window.Android && typeof window.Android.finish === "function", run:() => window.Android.finish()},
      {ok:() => window.AndroidInterface && typeof window.AndroidInterface.exitApp === "function", run:() => window.AndroidInterface.exitApp()},
      {ok:() => window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === "function", run:() => window.ReactNativeWebView.postMessage(JSON.stringify({type:"exitApp"}))},
      {ok:() => window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.appExit, run:() => window.webkit.messageHandlers.appExit.postMessage({type:"exitApp"})}
    ];
    for(const attempt of attempts){
      try{
        if(attempt.ok()){
          attempt.run();
          return true;
        }
      }catch(e){}
    }
    try{window.close()}catch(e){}
    setTimeout(function(){
      if(fallback === "about:blank")window.location.href = "about:blank";
      else if(fallback)appNavigate(fallback);
    }, 160);
    return false;
  }
  window.AppSharedState = {
    contactsWithOwner,
    saveContacts,
    deleteContact,
    ownerContact,
    lastAstroInput,
    saveLastAstroInput,
    preferredAstroInput,
    bindLastAstroInput,
    closeNativeApp,
    appNavigate,
  };
  window.closeNativeApp = closeNativeApp;
  window.appNavigate = appNavigate;
})();




(function(){
  const STORE_KEY = "numerology_app_settings";
  const helpCss = "html.hide-help-buttons .position-help-btn,html.hide-help-buttons .transit-help-btn,html.hide-help-buttons .retro-help-btn,html.hide-help-buttons .carto-help-btn,html.hide-help-buttons .syn-help-btn,html.hide-help-buttons .lunar-help-btn,html.hide-help-buttons .chinese-help-btn{display:none!important}html.hide-help-buttons .section-title{padding-left:0!important}html.hide-help-buttons #phaseInfo .info-card{display:block!important;padding:12px!important}html.hide-help-buttons .lunar-day-info,html.hide-help-buttons .personal-lunar-card{display:block!important;padding:13px!important}";
  function settings(){
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch(e){ return {}; }
  }
  function showHelpButtons(){
    return settings().showHelpButtons !== false;
  }
  function ensureStyle(){
    if(document.getElementById("appHelpToggleStyle")) return;
    const style = document.createElement("style");
    style.id = "appHelpToggleStyle";
    style.textContent = helpCss;
    document.head.appendChild(style);
  }
  function apply(){
    ensureStyle();
    document.documentElement.classList.toggle("hide-help-buttons", !showHelpButtons());
  }
  window.AppHelpSettings = { apply, showHelpButtons };
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
  window.addEventListener("storage", function(event){
    if(event.key === STORE_KEY) apply();
  });
})();








