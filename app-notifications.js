(function(){
  const STORE_KEY = "numerology_notification_schedule";
  const OWNER_KEY = "numerology_owner_profile";
  const synodicMonth = 29.530588853;
  const retroPlanets = [
    { key:"Mercury", symbol:"\u263F" },
    { key:"Venus", symbol:"\u2640" },
    { key:"Mars", symbol:"\u2642" },
    { key:"Jupiter", symbol:"\u2643" },
    { key:"Saturn", symbol:"\u2644" },
    { key:"Uranus", symbol:"\u2645" },
    { key:"Neptune", symbol:"\u2646" },
    { key:"Pluto", symbol:"\u2647" }
  ];

  function readOwnerProfile(){
    try{return JSON.parse(localStorage.getItem(OWNER_KEY) || "null")}catch(e){return null}
  }

  function pad(n){return String(n).padStart(2,"0")}
  function isoLocal(date, hour, minute){
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())+":00";
  }
  function julianDay(date){return date.getTime()/86400000+2440587.5}
  function toRad(deg){return deg*Math.PI/180}
  function normalize(deg){deg%=360;return deg<0?deg+360:deg}
  function fallbackLongitude(jd,key){
    const T=(jd-2451545.0)/36525;
    let M=0,L=0;
    if(key==="sun"){
      M=357.52911+35999.05029*T;
      L=280.46646+36000.76983*T+1.914602*Math.sin(toRad(M))+.019993*Math.sin(toRad(2*M));
    }else{
      M=134.963+477198.867*T;
      L=218.316+481267.881*T+6.289*Math.sin(toRad(M));
    }
    return normalize(L);
  }
  function phaseAge(date){
    const jd=julianDay(date);
    return normalize(fallbackLongitude(jd,"moon")-fallbackLongitude(jd,"sun"))/360*synodicMonth;
  }
  function phaseKeyFromAge(age){
    if(age<1.85||age>=27.68)return"new";
    if(age<5.54)return"waxing-crescent";
    if(age<9.23)return"first-quarter";
    if(age<12.92)return"waxing-gibbous";
    if(age<16.61)return"full";
    if(age<20.30)return"waning-gibbous";
    if(age<23.99)return"last-quarter";
    return"waning-crescent";
  }
  function reduceNumber(value){
    let n = String(value).replace(/\D/g,"").split("").reduce((sum,d)=>sum+Number(d),0);
    while(n>9 && n!==11 && n!==22)n=String(n).split("").reduce((sum,d)=>sum+Number(d),0);
    return n;
  }
  function ownerBirthDigits(owner){
    return String(owner.birthDate||"").replace(/\D/g,"");
  }
  function parseOwnerDate(value){
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value||""));
    return m ? {day:+m[1],month:+m[2],year:+m[3]} : null;
  }
  function parseOwnerTime(value){
    const m = /^(\d{2}):(\d{2})$/.exec(String(value||"12:00"));
    return m ? {hours:+m[1],minutes:+m[2]} : {hours:12,minutes:0};
  }
  function ownerDateToUtc(date,time){
    return new Date(Date.UTC(date.year,date.month-1,date.day,time.hours,time.minutes));
  }
  function moonLongitude(date){
    return fallbackLongitude(julianDay(date),"moon");
  }
  function aspectToNatalMoon(currentMoon,natalMoon){
    const aspects = [
      {name:"conjunction",angle:0},
      {name:"sextile",angle:60},
      {name:"square",angle:90},
      {name:"trine",angle:120},
      {name:"opposition",angle:180}
    ];
    const raw = Math.abs(normalize(currentMoon-natalMoon));
    const diff = raw > 180 ? 360 - raw : raw;
    return aspects.map(a => ({...a,orb:Math.abs(diff-a.angle)})).sort((a,b)=>a.orb-b.orb)[0];
  }

  function buildLunarEvents(owner, topics, days){
    const events = [];
    const now = new Date();
    let lastKey = phaseKeyFromAge(phaseAge(now));
    const avoidText = {
      new:"Avoid forcing big decisions. Keep the day quiet and set intentions.",
      full:"Avoid emotional overreaction and unnecessary conflict. Release instead of pushing.",
      "first-quarter":"Avoid hesitation. Choose one action and move.",
      "last-quarter":"Avoid clinging to old plans. Clear, forgive and simplify.",
      "waxing-crescent":"Avoid giving up too early. Small steps matter.",
      "waxing-gibbous":"Avoid perfectionism. Refine without obsessing.",
      "waning-gibbous":"Avoid overexplaining. Share what is useful and let the rest go.",
      "waning-crescent":"Avoid starting heavy commitments. Rest and restore."
    };

    for(let i=1;i<=days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      d.setHours(12,0,0,0);
      const key = phaseKeyFromAge(phaseAge(d));
      if(key !== lastKey){
        if(key==="new" && topics.includes("newMoon")){
          events.push({id:"newMoon-"+isoLocal(d,9,0).slice(0,10),topic:"newMoon",title:"New Moon",body:"New Moon today. Set intentions and begin quietly.",at:isoLocal(d,9,0)});
        }
        if(key==="full" && topics.includes("fullMoon")){
          events.push({id:"fullMoon-"+isoLocal(d,9,0).slice(0,10),topic:"fullMoon",title:"Full Moon",body:"Full Moon today. Emotions peak; release what is complete.",at:isoLocal(d,9,0)});
        }
        lastKey = key;
      }
      if((topics.includes("moonGuidance") || topics.includes("moonAvoid")) && i<=14){
        events.push({id:"moonGuidance-"+isoLocal(d,8,30).slice(0,10),topic:"moonGuidance",title:"Moon guidance",body:avoidText[key] || "Move with the Moon rhythm today.",at:isoLocal(d,8,30)});
      }
      if(topics.includes("voidMoon") && i<=14 && i%2===0){
        const startHour = 8 + (i % 4) * 3;
        events.push({id:"voidMoon-"+isoLocal(d,startHour,15).slice(0,10),topic:"voidMoon",title:"Void of Course Moon",body:"Void Moon window today. Avoid forcing launches, signatures and major purchases.",at:isoLocal(d,startHour,15)});
      }
    }
    return events;
  }

  async function getSwe(){
    if(location.protocol === "file:"){
      const err = new Error("swisseph-unavailable");
      err.code = "SWISSEPH_UNAVAILABLE";
      throw err;
    }
    const mod = await import("./vendor/swisseph/swisseph-local.js");
    const swe = new mod.SwissEphemeris();
    await swe.init();
    return {mod,swe};
  }
  async function retroSpeedAt(swe, mod, date, key){
    const jd = julianDay(date);
    const pos = swe.calculatePosition(jd, mod.Planet[key], mod.CalculationFlag.SwissEphemeris | mod.CalculationFlag.Speed);
    return Number(pos.longitudeSpeed ?? pos.speed ?? 0);
  }
  async function buildRetroEvents(topics, days){
    if(!topics.includes("retroStart") && !topics.includes("retroDirect"))return [];
    try{
      const {mod,swe} = await getSwe();
      const now = new Date();
      const events = [];
      for(const planet of retroPlanets){
        let prev = await retroSpeedAt(swe, mod, now, planet.key);
        for(let i=1;i<=days;i++){
          const d = new Date(now);
          d.setDate(now.getDate()+i);
          d.setHours(12,0,0,0);
          const speed = await retroSpeedAt(swe, mod, d, planet.key);
          if(topics.includes("retroStart") && prev >= 0 && speed < 0){
            events.push({id:"retroStart-"+planet.key+"-"+isoLocal(d,10,0).slice(0,10),topic:"retroStart",title:planet.symbol+" "+planet.key+" retrograde",body:planet.key+" starts retrograde. Slow down, review and revise.",at:isoLocal(d,10,0)});
            break;
          }
          if(topics.includes("retroDirect") && prev < 0 && speed >= 0){
            events.push({id:"retroDirect-"+planet.key+"-"+isoLocal(d,10,0).slice(0,10),topic:"retroDirect",title:planet.symbol+" "+planet.key+" direct",body:planet.key+" goes direct. The reviewed area can begin moving forward.",at:isoLocal(d,10,0)});
            break;
          }
          prev = speed;
        }
      }
      if(typeof swe.close==="function")swe.close();
      return events;
    }catch(e){
      if(!e || e.code !== "SWISSEPH_UNAVAILABLE") console.warn("Notification retrograde calculation failed", e);
      return [];
    }
  }

  function buildImportantTransitEvents(owner, topics, days){
    if(!topics.includes("importantTransit"))return [];
    const birthDate = parseOwnerDate(owner.birthDate);
    if(!birthDate)return [];
    const birthTime = parseOwnerTime(owner.birthTime);
    const natalMoon = moonLongitude(ownerDateToUtc(birthDate,birthTime));
    const events = [];
    const now = new Date();
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      d.setHours(12,0,0,0);
      const aspect = aspectToNatalMoon(moonLongitude(d), natalMoon);
      if(aspect && aspect.orb <= 2){
        events.push({id:"importantTransit-"+isoLocal(d,9,30).slice(0,10),topic:"importantTransit",title:"Important transit",body:"Current Moon forms a "+aspect.name+" to your natal Moon. Notice mood, timing and emotional reactions.",at:isoLocal(d,9,30)});
      }
    }
    return events;
  }

  function buildDailyNumerologyEvents(owner, topics, days){
    const events = [];
    const now = new Date();
    const birthDigits = ownerBirthDigits(owner);
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      const dateDigits = pad(d.getDate())+pad(d.getMonth()+1)+d.getFullYear();
      if(topics.includes("pythagoreanDay")){
        const num = reduceNumber(birthDigits + dateDigits);
        events.push({id:"pythagoreanDay-"+isoLocal(d,8,0).slice(0,10),topic:"pythagoreanDay",title:"Pythagorean day number",body:"Your Pythagorean number for today is "+num+".",at:isoLocal(d,8,0)});
      }
      if(topics.includes("pyramidDay")){
        const num = reduceNumber(dateDigits + birthDigits.split("").reverse().join(""));
        events.push({id:"pyramidDay-"+isoLocal(d,8,5).slice(0,10),topic:"pyramidDay",title:"Pyramid day number",body:"Your pyramid number for today is "+num+".",at:isoLocal(d,8,5)});
      }
    }
    return events;
  }

  async function buildNotificationSchedule(owner){
    const topics = owner && owner.notificationsEnabled ? (owner.notificationTopics || []) : [];
    if(!owner || !topics.length)return [];
    const events = [
      ...buildLunarEvents(owner, topics, 90),
      ...buildDailyNumerologyEvents(owner, topics, 14),
      ...buildImportantTransitEvents(owner, topics, 30),
      ...(await buildRetroEvents(topics, 90))
    ];
    return events
      .filter(event => new Date(event.at).getTime() > Date.now() - 60000)
      .sort((a,b)=>new Date(a.at)-new Date(b.at));
  }

  async function requestWebPermission(){
    const api = window.Notification;
    if(typeof api !== "function")return "unsupported";
    if(api.permission === "granted")return "granted";
    if(api.permission === "denied")return "denied";
    try{return await api.requestPermission()}catch(e){return api.permission}
  }

  async function deliverToNative(events){
    const payload = {type:"scheduleNotifications",events};
    try{
      if(window.AndroidNotifications && typeof window.AndroidNotifications.scheduleAll === "function"){
        window.AndroidNotifications.scheduleAll(JSON.stringify(events));
        return "android-scheduleAll";
      }
      if(window.Android && typeof window.Android.scheduleNotifications === "function"){
        window.Android.scheduleNotifications(JSON.stringify(events));
        return "android-scheduleNotifications";
      }
      if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.notifications){
        window.webkit.messageHandlers.notifications.postMessage(payload);
        return "ios-messageHandler";
      }
      if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications){
        await window.Capacitor.Plugins.LocalNotifications.schedule({
          notifications: events.map(event => ({
            id: Math.abs(hashCode(event.id)) % 2147483647,
            title: event.title,
            body: event.body,
            schedule: {at:new Date(event.at)},
            extra: {topic:event.topic, notificationId:event.id}
          }))
        });
        return "capacitor";
      }
    }catch(e){
      console.warn("Native notification bridge failed", e);
    }
    await requestWebPermission();
    return "stored";
  }

  function hashCode(value){
    let h=0;
    for(let i=0;i<value.length;i++)h=((h<<5)-h)+value.charCodeAt(i)|0;
    return h;
  }

  async function refreshAppNotifications(){
    const owner = readOwnerProfile();
    const events = await buildNotificationSchedule(owner);
    localStorage.setItem(STORE_KEY, JSON.stringify({updatedAt:new Date().toISOString(),owner:owner ? [owner.firstName,owner.lastName].filter(Boolean).join(" ") : "",events}));
    const bridge = events.length ? await deliverToNative(events) : "none";
    window.dispatchEvent(new CustomEvent("appNotificationsUpdated",{detail:{events,bridge}}));
    return {events,bridge};
  }

  window.AppNotifications = {
    refresh: refreshAppNotifications,
    build: buildNotificationSchedule,
    readOwner: readOwnerProfile,
    storeKey: STORE_KEY
  };
  window.refreshAppNotifications = refreshAppNotifications;
})();
