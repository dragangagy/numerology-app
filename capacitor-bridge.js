(function(){
  function getPlugins(){
    return window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins : {};
  }

  function getPlatform(){
    try{
      if(window.Capacitor && typeof window.Capacitor.getPlatform === "function")return window.Capacitor.getPlatform();
    }catch(e){}
    return "web";
  }

  function isNativeMobile(){
    const platform = getPlatform();
    try{
      if(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function")return window.Capacitor.isNativePlatform() && (platform === "ios" || platform === "android");
    }catch(e){}
    return !!(window.Capacitor && (platform === "ios" || platform === "android"));
  }

  function installDarkTransitionBackground(){
    const css = "html,body{background:#0f172a!important;color-scheme:dark;} body::before{content:'';position:fixed;inset:0;background:#0f172a;z-index:-2147483647;pointer-events:none;}";
    function apply(){
      if(!document.documentElement)return;
      document.documentElement.style.backgroundColor = "#0f172a";
      if(document.body)document.body.style.backgroundColor = document.body.style.backgroundColor || "#0f172a";
      if(!document.getElementById("capacitorDarkTransitionBg")){
        const style=document.createElement("style");
        style.id="capacitorDarkTransitionBg";
        style.textContent=css;
        document.head.appendChild(style);
      }
    }
    if(document.readyState === "loading")document.addEventListener("DOMContentLoaded", apply);
    else apply();
  }

  function normalizeNotificationPayload(action){
    const notification = action && action.notification ? action.notification : action || {};
    const extra = notification.extra || notification.data || {};
    if(extra.openUrl || extra.url || extra.route || extra.page)return extra;
    return {
      title: notification.title || extra.title || "Notification",
      body: notification.body || extra.body || "",
      topic: extra.topic || "",
      page: extra.page || "",
      tab: extra.tab || "",
      image: extra.image || extra.imageUrl || ""
    };
  }

  function openNotificationPayload(payload){
    if(window.openAppNotification){
      window.openAppNotification(payload);
      return;
    }
    if(payload && (payload.openUrl || payload.url)){
      window.location.href = payload.openUrl || payload.url;
      return;
    }
    if(payload && payload.page){
      const params = new URLSearchParams();
      if(payload.topic)params.set("notificationTopic", payload.topic);
      if(payload.title)params.set("notificationTitle", payload.title);
      if(payload.body)params.set("notificationBody", payload.body);
      if(payload.image || payload.imageUrl)params.set("notificationImage", payload.image || payload.imageUrl);
      if(payload.tab)params.set("notificationTab", payload.tab);
      params.set("notificationPage", payload.page);
      window.location.href = payload.page + "?" + params.toString();
    }
  }

  async function initLocalNotifications(){
    const LocalNotifications = getPlugins().LocalNotifications;
    if(!LocalNotifications || !LocalNotifications.addListener)return;
    try{
      await LocalNotifications.addListener("localNotificationActionPerformed", function(action){
        openNotificationPayload(normalizeNotificationPayload(action));
      });
      await LocalNotifications.addListener("localNotificationReceived", function(notification){
        window.dispatchEvent(new CustomEvent("appLocalNotificationReceived", {detail: notification}));
      });
    }catch(error){
      console.warn("Local notification listeners unavailable", error);
    }
  }

  async function requestNotificationPermission(){
    const LocalNotifications = getPlugins().LocalNotifications;
    if(!LocalNotifications || !LocalNotifications.requestPermissions)return "unsupported";
    try{
      const result = await LocalNotifications.requestPermissions();
      return result && (result.display || result.receive) || "prompted";
    }catch(error){
      console.warn("Notification permission request failed", error);
      return "error";
    }
  }

  async function requireDeviceAuth(reason){
    if(!isNativeMobile())return {ok:true, skipped:true, platform:getPlatform()};
    const plugins = getPlugins();
    const promptReason = reason || "Unlock protected app action";

    try{
      const BiometricAuth = plugins.BiometricAuth || plugins.BiometricAuthentication;
      if(BiometricAuth && typeof BiometricAuth.authenticate === "function"){
        if(typeof BiometricAuth.checkBiometry === "function"){
          const info = await BiometricAuth.checkBiometry();
          if(info && info.deviceIsSecure === false)return {ok:false, error:"Set a phone passcode first to unlock this action."};
        }
        await BiometricAuth.authenticate({
          reason: promptReason,
          cancelTitle: "Cancel",
          allowDeviceCredential: true,
          iosFallbackTitle: "Use Passcode",
          androidTitle: "Unlock check",
          androidSubtitle: promptReason
        });
        return {ok:true, platform:getPlatform()};
      }
    }catch(error){
      return {ok:false, error:error && (error.message || error.code) || "Device authentication cancelled."};
    }

    try{
      const NativeBiometric = plugins.NativeBiometric || plugins.NativeBiometrics;
      if(NativeBiometric){
        if(typeof NativeBiometric.isAvailable === "function"){
          const available = await NativeBiometric.isAvailable({useFallback:true});
          if(available && available.isAvailable === false)return {ok:false, error:"Device lock is not available."};
        }
        if(typeof NativeBiometric.verifyIdentity === "function"){
          await NativeBiometric.verifyIdentity({
            reason: promptReason,
            title: "Unlock check",
            subtitle: "Device lock required",
            description: promptReason,
            useFallback: true,
            fallbackTitle: "Use passcode"
          });
          return {ok:true, platform:getPlatform()};
        }
      }
    }catch(error){
      return {ok:false, error:error && error.message || "Device authentication cancelled."};
    }

    return {ok:false, error:"Device lock plugin is missing. Rebuild the phone app after Capacitor sync."};
  }

  async function share(data){
    const Share = getPlugins().Share;
    if(Share && Share.share)return Share.share(data);
    if(navigator.share)return navigator.share(data);
    throw new Error("Share is not available");
  }

  installDarkTransitionBackground();

  window.NumerologyNative = {
    getPlatform,
    isNativeMobile,
    initLocalNotifications,
    openNotificationPayload,
    requireDeviceAuth,
    requestDeviceAuth: requireDeviceAuth,
    requestNotificationPermission,
    share
  };

  document.addEventListener("DOMContentLoaded", initLocalNotifications);
})();