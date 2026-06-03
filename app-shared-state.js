(function(){
  const CONTACTS_KEY = "numerology_dates";
  const OWNER_KEY = "numerology_owner_profile";
  const LAST_ASTRO_KEY = "numerology_last_astro_input";
  const memoryStore = {};

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
    const next = {
      date: state && state.date || "",
      time: state && state.time || "",
      city: state && state.city || "",
      isTwin: !!(state && state.isTwin),
      isTwin3: !!(state && state.isTwin3),
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
    return lastAstroInput() || {date:"", time:"", city:"Belgrade", isTwin:false, isTwin3:false};
  }

  function bindLastAstroInput(ids){
    if(!ids)return;
    const read = () => {
      const date = ids.dateId && document.getElementById(ids.dateId);
      const time = ids.timeId && document.getElementById(ids.timeId);
      const city = ids.cityId && document.getElementById(ids.cityId);
      const twin = ids.twinId && document.getElementById(ids.twinId);
      const twin3 = ids.twin3Id && document.getElementById(ids.twin3Id);
      saveLastAstroInput({
        date:date ? date.value : "",
        time:time ? time.value : "",
        city:city ? city.value : "",
        isTwin:twin ? twin.checked : false,
        isTwin3:twin3 ? twin3.checked : false
      });
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
      else if(fallback)window.location.href = fallback;
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
    closeNativeApp
  };
  window.closeNativeApp = closeNativeApp;
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
