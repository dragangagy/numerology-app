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
  function reduceDigit(value){
    let n = Number(value) || 0;
    while(n>9)n=String(n).split("").reduce((sum,d)=>sum+Number(d),0);
    return n;
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
  function pythagoreanBaseFromDate(date){
    if(!date)return [0,0,0];
    const p1 = reduceDigit(date.day + date.month);
    const p2 = reduceDigit(date.year);
    const p3 = reduceDigit(p1 + p2);
    return [p1,p2,p3];
  }
  function seedText(value){
    let h=0;
    value=String(value||"");
    for(let i=0;i<value.length;i++)h=((h<<5)-h)+value.charCodeAt(i)|0;
    return Math.abs(h);
  }
  async function loadTarotDeck(){
    try{
      const response = await fetch("tarot_deck_master.json",{cache:"no-store"});
      const data = await response.json();
      return Array.isArray(data.cards) ? data.cards : [];
    }catch(e){
      return [
        {id:0,name:"The Fool",upright:"New beginnings, freedom, adventure.",keywords:"new beginnings, innocence, freedom",image:"images/tarot/0.jpg"},
        {id:1,name:"The Magician",upright:"Manifestation and skill.",keywords:"manifestation, skill, power",image:"images/tarot/I.jpg"},
        {id:2,name:"The High Priestess",upright:"Intuition and inner wisdom.",keywords:"intuition, mystery, wisdom",image:"images/tarot/II.jpg"},
        {id:20,name:"Judgement",upright:"Awakening and renewal.",keywords:"awakening, evaluation, calling",image:"images/tarot/XX.jpg"}
      ];
    }
  }
  function pythagoreanCodeForDate(ownerDate, targetDate){
    const base = pythagoreanBaseFromDate(ownerDate);
    if(base[0] === 0 && base[1] === 0 && base[2] === 0)return "0";
    const yr = reduceDigit(targetDate.getFullYear());
    const mn = reduceDigit(targetDate.getMonth() + 1);
    const dy = reduceDigit(targetDate.getDate());
    return [
      reduceDigit(base[0] + yr + mn + dy),
      reduceDigit(base[1] + yr + mn + dy),
      reduceDigit(base[2] + yr + mn + dy)
    ].join("");
  }
  function buildPyramidRows(ownerDate, owner){
    if(!ownerDate)return [];
    const raw = pad(ownerDate.day)+pad(ownerDate.month)+ownerDate.year;
    const numbers = raw.split("").map(Number);
    const originalRows = [];
    let tempOriginal = [...numbers];
    while(tempOriginal.length > 0){
      originalRows.push([...tempOriginal]);
      const next = [];
      for(let i=0;i<tempOriginal.length-1;i++){
        next.push(reduceDigit(tempOriginal[i]+tempOriginal[i+1]));
      }
      tempOriginal = next;
    }

    let twinFirstRow = null;
    let twin3FirstRow = null;
    if((owner && owner.isTwin) || (owner && owner.isTwin3)){
      const secondRow = originalRows[1] || [];
      const thirdRow = originalRows[2] || [];
      twinFirstRow = secondRow.slice(2).concat(thirdRow.slice(0,2));
    }
    if(owner && owner.isTwin3 && twinFirstRow){
      const twin2Rows = [];
      twin2Rows.push([...twinFirstRow]);
      let tempTwin = [...twinFirstRow];
      while(tempTwin.length > 0){
        twin2Rows.push([...tempTwin]);
        const next = [];
        for(let i=0;i<tempTwin.length-1;i++){
          next.push(reduceDigit(tempTwin[i]+tempTwin[i+1]));
        }
        tempTwin = next;
      }
      const twin2SecondRow = twin2Rows[1] || [];
      const twin2ThirdRow = twin2Rows[2] || [];
      twin3FirstRow = twin2SecondRow.slice(2).concat(twin2ThirdRow.slice(0,2));
    }

    const rows = [[...numbers]];
    let secondRowSource;
    if(owner && owner.isTwin3 && twin3FirstRow){
      secondRowSource = [...twin3FirstRow];
    }else if(owner && owner.isTwin && twinFirstRow){
      secondRowSource = [...twinFirstRow];
    }else{
      secondRowSource = [];
      for(let i=0;i<numbers.length-1;i++){
        secondRowSource.push(reduceDigit(numbers[i]+numbers[i+1]));
      }
    }

    let temp = [...secondRowSource];
    while(temp.length > 0){
      rows.push([...temp]);
      const next = [];
      for(let i=0;i<temp.length-1;i++){
        next.push(reduceDigit(temp[i]+temp[i+1]));
      }
      temp = next;
    }
    return rows;
  }
  function dateDifferenceParts(first, second){
    let d1 = new Date(first.year, first.month-1, first.day);
    let d2 = new Date(second.getFullYear(), second.getMonth(), second.getDate());
    if(d2 < d1){
      const temp = d1;
      d1 = d2;
      d2 = temp;
    }
    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();
    if(days < 0){
      months--;
      days += new Date(d2.getFullYear(), d2.getMonth(), 0).getDate();
    }
    if(months < 0){
      years--;
      months += 12;
    }
    return {years,months,days};
  }
  function pyramidDayCodeForDate(ownerDate, owner, targetDate){
    const rows = buildPyramidRows(ownerDate, owner);
    const spans = rows.slice(1).flat();
    if(spans.length < 2)return "0";
    const diff = dateDifferenceParts(ownerDate, targetDate);
    let currentIndex = -1;
    function markPosition(steps, skipFirst){
      let index = currentIndex;
      for(let i=0;i<steps;i++){
        index++;
        if(skipFirst && index === 0)index++;
        if(index >= spans.length)index = 0;
      }
      currentIndex = index;
      const current = Number(spans[index]) || 0;
      const next = Number(spans[(index + 1) % spans.length]) || 0;
      return {current,next,sum:reduceDigit(current + next)};
    }
    markPosition(diff.years, true);
    markPosition(diff.months, false);
    const day = markPosition(diff.days, false);
    return ""+day.current+day.next+day.sum;
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

  function notificationTabForTopic(topic){
    if(topic==="pythagoreanDay")return "pitagora";
    if(topic==="pyramidDay")return "analysis";
    if(topic==="tarotDailyCard")return "daily";
    if(/^newBook|freePdf|bookRecommendation|seasonBook/.test(topic))return "store";
    return "home";
  }

  function notificationPageForTopic(topic){
    const lunar = ["newMoon","fullMoon","moonGuidance","moonAvoid","voidMoon","firstQuarterMoon","lastQuarterMoon","moonPhaseChange","natalLunarToday","moonNatalAspect","voidMoonEnd","moonSignChange","eclipseReminder","newMoonTomorrow","fullMoonTomorrow"];
    const retro = ["retroStart","retroDirect","stationRetroToday","stationDirectToday","retroStartTomorrow","retroDirectTomorrow","activeRetroSummary","natalRetroReminder","mercuryRetroSpecial","venusRetroSpecial","marsRetroSpecial"];
    const transit = ["importantTransit","exactTransit","challengingTransit","positiveTransit","majorTransit","moonTransitNatalMoon","saturnTransitWarning","jupiterTransitOpportunity","marsTransitEnergy","venusTransitRelationship","transitTomorrow","weeklyTransitSummary"];
    const relation = ["synastryReminder","partnerTransit","relationshipTalkDay","relationshipChallengeDay","venusMarsRelationship","moonCompatibility"];
    const location = ["astrocartographyCity","travelLineGood","travelLineCaution","venusLineOpportunity","jupiterLineOpportunity","saturnPlutoLineCaution","locationEnergyReminder"];
    const chart = ["birthdayReminder","sunSeasonStart","moonSignDaily","ascendantDaily","natalChartReminder","houseActivation","planetFocus"];
    const tarot = ["tarotDailyCard"];
    if(tarot.includes(topic))return "tarot.html";
    if(lunar.includes(topic))return "lunarphases.html";
    if(retro.includes(topic))return "retrogradnost.html";
    if(transit.includes(topic))return "transit.html";
    if(relation.includes(topic))return "sinastrija.html";
    if(location.includes(topic))return "astrocartography.html";
    if(chart.includes(topic))return "chart.html";
    return "index.html";
  }

  function ownerQuery(owner){
    const params = new URLSearchParams();
    if(owner && owner.birthDate)params.set("date", owner.birthDate);
    if(owner && owner.birthTime)params.set("time", owner.birthTime);
    if(owner && (owner.currentCity || owner.birthCity))params.set("city", owner.currentCity || owner.birthCity);
    if(owner && owner.isTwin)params.set("isTwin", "true");
    if(owner && owner.isTwin3)params.set("isTwin3", "true");
    return params;
  }

  function notificationOpenUrl(event, owner){
    const params = ownerQuery(owner);
    params.set("notificationTopic", event.topic || "");
    params.set("notificationTitle", event.title || "Notification");
    params.set("notificationBody", event.body || "");
    if(event.image)params.set("notificationImage", event.image);
    params.set("notificationTab", notificationTabForTopic(event.topic || ""));
    const page = notificationPageForTopic(event.topic || "");
    const base = location.href.split("#")[0].split("?")[0].replace(/[^\/\\]*$/, page);
    return base+"?"+params.toString();
  }

  function withNotificationOpenData(events, owner){
    return events.map(event => {
      const imageUrl = event.image ? new URL(event.image, location.href).href : "";
      const route = {
        page:notificationPageForTopic(event.topic || ""),
        tab:notificationTabForTopic(event.topic || ""),
        topic:event.topic || "",
        title:event.title || "",
        body:event.body || "",
        image:event.image || ""
      };
      const openUrl = notificationOpenUrl(event, owner);
      return {...event,imageUrl:imageUrl || event.image || "",route,openUrl,url:openUrl};
    });
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
    let mod;
    try{
      mod = await import("./vendor/swisseph/swisseph-local.js");
    }catch(firstError){
      try{
        mod = await import("vendor/swisseph/swisseph-local.js");
      }catch(secondError){
        const err = secondError || firstError || new Error("swisseph-unavailable");
        err.code = "SWISSEPH_UNAVAILABLE";
        throw err;
      }
    }
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
    const ownerDate = parseOwnerDate(owner && owner.birthDate);
    if(!ownerDate)return events;
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      if(topics.includes("pythagoreanDay")){
        const code = pythagoreanCodeForDate(ownerDate, d);
        events.push({id:"pythagoreanDay-"+isoLocal(d,8,0).slice(0,10),topic:"pythagoreanDay",title:"Pythagorean day code",body:"Your Pythagorean code for today is "+code+".",at:isoLocal(d,8,0)});
      }
      if(topics.includes("pyramidDay")){
        const code = pyramidDayCodeForDate(ownerDate, owner, d);
        events.push({id:"pyramidDay-"+isoLocal(d,8,5).slice(0,10),topic:"pyramidDay",title:"Pyramidal day code",body:"Your pyramidal day code is "+code+".",at:isoLocal(d,8,5)});
      }
    }
    return events;
  }
  async function buildDailyTarotEvents(owner, topics, days){
    if(!topics.includes("tarotDailyCard"))return [];
    const deck = await loadTarotDeck();
    if(!deck.length)return [];
    const events = [];
    const now = new Date();
    const ownerKey = [owner && owner.birthDate, owner && owner.birthTime, owner && (owner.birthCity || owner.currentCity)].filter(Boolean).join("|") || "owner";
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      const dayKey = d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
      const card = deck[seedText(ownerKey+"|"+dayKey+"|daily") % deck.length];
      const image = card && card.image ? card.image : "images/tarot/back.png";
      events.push({
        id:"tarotDailyCard-"+isoLocal(d,8,10).slice(0,10),
        topic:"tarotDailyCard",
        title:"Daily Tarot Card",
        body:"Your card for today is "+(card.name || "ready")+". "+(card.upright || "Tap to open your daily tarot card."),
        at:isoLocal(d,8,10),
        image,
        icon:image,
        largeIcon:image,
        bigPicture:image
      });
    }
    return events;
  }

  async function buildNotificationSchedule(owner){
    const topics = owner && owner.notificationsEnabled ? (owner.notificationTopics || []) : [];
    if(!owner || !topics.length)return [];
    const events = [
      ...buildLunarEvents(owner, topics, 90),
      ...buildDailyNumerologyEvents(owner, topics, 14),
      ...(await buildDailyTarotEvents(owner, topics, 14)),
      ...buildImportantTransitEvents(owner, topics, 30),
      ...(await buildRetroEvents(topics, 90))
    ];
    return withNotificationOpenData(events
      .filter(event => new Date(event.at).getTime() > Date.now() - 60000)
      .sort((a,b)=>new Date(a.at)-new Date(b.at)), owner);
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
            attachments: event.imageUrl ? [{id:"image",url:event.imageUrl}] : undefined,
            largeIcon: event.imageUrl || event.largeIcon || event.image,
            smallIcon: event.icon,
            extra: {topic:event.topic, notificationId:event.id, route:event.route, url:event.openUrl, openUrl:event.openUrl, image:event.image || "", imageUrl:event.imageUrl || ""}
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
