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

  const moonSigns = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  function moonSignName(date){return moonSigns[Math.floor(moonLongitude(date)/30)%12] || "Aries"}
  function seasonName(month){return ["Winter","Winter","Spring","Spring","Spring","Summer","Summer","Summer","Autumn","Autumn","Autumn","Winter"][month] || "Season"}
  function personalYear(ownerDate, targetDate){return reduceNumber(ownerDate.day+""+ownerDate.month+""+targetDate.getFullYear())}
  function personalMonth(ownerDate, targetDate){return reduceDigit(personalYear(ownerDate,targetDate)+targetDate.getMonth()+1)}
  function personalDay(ownerDate, targetDate){return reduceDigit(personalMonth(ownerDate,targetDate)+targetDate.getDate())}
  function topicOn(topics, key){return topics.includes(key)}
  function seededPick(seed, items){return items[seedText(seed)%items.length]}



  function notificationTabForTopic(topic){
    const pythagorean = ["pythagoreanDay","repeatingCodeDay","master11Day","master22Day"];
    const analysis = ["personalDay","personalMonth","personalYear","dailyNumerologyAdvice","challengingNumerologyDay","favorableNumerologyDay","importantDay","avoidBigDecisions","goodForAction","goodForRest"];
    const books = ["newBook","freePdfReminder","freePdf","bookRecommendation","seasonBookRelease"];
    const settings = ["saveProfileReminder","dailySummary","morningGuidance","eveningReflection","weeklySummary","monthlySummary"];
    if(topic==="tarotDailyCard")return "daily";
    if(topic==="pyramidDay")return "pyramid";
    if(pythagorean.includes(topic))return "pitagora";
    if(analysis.includes(topic))return "analysis";
    if(books.includes(topic))return "store";
    if(topic==="ownerProfileReminder")return "ownerProfile";
    if(settings.includes(topic))return "home";
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
    params.set("notificationPage", page);
    const base = location.href.split("#")[0].split("?")[0].replace(/[^\/\\]*$/, page);
    return base+"?"+params.toString();
  }

  function withNotificationOpenData(events, owner){
    return events.map(event => {
      const imageUrl = event.image ? new URL(event.image, location.href).href : "";
      const ownerInput = {
        date: owner && owner.birthDate || "",
        time: owner && owner.birthTime || "",
        city: owner && (owner.currentCity || owner.birthCity) || "",
        isTwin: !!(owner && owner.isTwin),
        isTwin3: !!(owner && owner.isTwin3)
      };
      const route = {
        page:notificationPageForTopic(event.topic || ""),
        tab:notificationTabForTopic(event.topic || ""),
        topic:event.topic || "",
        title:event.title || "",
        body:event.body || "",
        image:event.image || "",
        ownerInput
      };
      const openUrl = notificationOpenUrl(event, owner);
      return {...event,imageUrl:imageUrl || event.image || "",route,ownerInput,openUrl,url:openUrl};
    });
  }


  function buildLunarEvents(owner, topics, days){
    const events = [];
    const now = new Date();
    const ownerDate = parseOwnerDate(owner && owner.birthDate);
    const ownerTime = parseOwnerTime(owner && owner.birthTime);
    const natalMoon = ownerDate ? moonLongitude(ownerDateToUtc(ownerDate, ownerTime)) : null;
    const natalMoonSign = natalMoon === null ? "" : moonSigns[Math.floor(natalMoon/30)%12];
    let lastKey = phaseKeyFromAge(phaseAge(now));
    let lastSign = moonSignName(now);
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
    const phaseTitle = {
      new:"New Moon",
      full:"Full Moon",
      "first-quarter":"First Quarter Moon",
      "last-quarter":"Last Quarter Moon",
      "waxing-crescent":"Waxing Crescent Moon",
      "waxing-gibbous":"Waxing Gibbous Moon",
      "waning-gibbous":"Waning Gibbous Moon",
      "waning-crescent":"Waning Crescent Moon"
    };

    for(let i=0;i<=days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      d.setHours(12,0,0,0);
      const key = phaseKeyFromAge(phaseAge(d));
      const tomorrow = new Date(d);
      tomorrow.setDate(d.getDate()+1);
      const tomorrowKey = phaseKeyFromAge(phaseAge(tomorrow));
      const sign = moonSignName(d);
      if(key !== lastKey || i===0){
        if(key==="new" && topicOn(topics,"newMoon")){
          events.push({id:"newMoon-"+isoLocal(d,9,0).slice(0,10),topic:"newMoon",title:"New Moon",body:"New Moon today. Set intentions and begin quietly.",at:isoLocal(d,9,0)});
        }
        if(key==="full" && topicOn(topics,"fullMoon")){
          events.push({id:"fullMoon-"+isoLocal(d,9,0).slice(0,10),topic:"fullMoon",title:"Full Moon",body:"Full Moon today. Emotions peak; release what is complete.",at:isoLocal(d,9,0)});
        }
        if(key==="first-quarter" && topicOn(topics,"firstQuarterMoon")){
          events.push({id:"firstQuarterMoon-"+isoLocal(d,9,5).slice(0,10),topic:"firstQuarterMoon",title:"First Quarter Moon",body:"First Quarter Moon today. Choose action over hesitation.",at:isoLocal(d,9,5)});
        }
        if(key==="last-quarter" && topicOn(topics,"lastQuarterMoon")){
          events.push({id:"lastQuarterMoon-"+isoLocal(d,9,5).slice(0,10),topic:"lastQuarterMoon",title:"Last Quarter Moon",body:"Last Quarter Moon today. Edit, release and simplify.",at:isoLocal(d,9,5)});
        }
        if(topicOn(topics,"moonPhaseChange") && i>0){
          events.push({id:"moonPhaseChange-"+isoLocal(d,9,10).slice(0,10),topic:"moonPhaseChange",title:"Moon phase change",body:"Moon phase shifts to "+(phaseTitle[key] || key)+".",at:isoLocal(d,9,10)});
        }
        lastKey = key;
      }
      if(tomorrowKey==="new" && key!=="new" && topicOn(topics,"newMoonTomorrow")){
        events.push({id:"newMoonTomorrow-"+isoLocal(d,18,0).slice(0,10),topic:"newMoonTomorrow",title:"New Moon tomorrow",body:"New Moon arrives tomorrow. Clear space and prepare intentions.",at:isoLocal(d,18,0)});
      }
      if(tomorrowKey==="full" && key!=="full" && topicOn(topics,"fullMoonTomorrow")){
        events.push({id:"fullMoonTomorrow-"+isoLocal(d,18,5).slice(0,10),topic:"fullMoonTomorrow",title:"Full Moon tomorrow",body:"Full Moon peaks tomorrow. Notice what is ready to be released.",at:isoLocal(d,18,5)});
      }
      if((topicOn(topics,"moonGuidance") || topicOn(topics,"moonAvoid")) && i<14){
        events.push({id:"moonGuidance-"+isoLocal(d,8,30).slice(0,10),topic:"moonGuidance",title:"Moon guidance",body:avoidText[key] || "Move with the Moon rhythm today.",at:isoLocal(d,8,30)});
      }
      if(topicOn(topics,"moonSignChange") && (sign !== lastSign || i===0) && i<30){
        events.push({id:"moonSignChange-"+isoLocal(d,10,20).slice(0,10),topic:"moonSignChange",title:"Moon in "+sign,body:"Moon energy moves through "+sign+". Adjust the tone of the day.",at:isoLocal(d,10,20)});
        lastSign = sign;
      }
      if(topicOn(topics,"moonSignDaily") && i<14){
        events.push({id:"moonSignDaily-"+isoLocal(d,7,45).slice(0,10),topic:"moonSignDaily",title:"Daily Moon sign",body:"Today the Moon highlights "+sign+" themes.",at:isoLocal(d,7,45)});
      }
      if(natalMoon !== null && topicOn(topics,"natalLunarToday") && sign === natalMoonSign && i<30){
        events.push({id:"natalLunarToday-"+isoLocal(d,8,42).slice(0,10),topic:"natalLunarToday",title:"Natal lunar day",body:"The Moon returns to your natal Moon sign, "+sign+". Notice emotional patterns.",at:isoLocal(d,8,42)});
      }
      if(natalMoon !== null && topicOn(topics,"moonNatalAspect") && i<30){
        const natalAspect = aspectToNatalMoon(moonLongitude(d), natalMoon);
        if(natalAspect && natalAspect.orb <= 2){
          events.push({id:"moonNatalAspect-"+isoLocal(d,8,46).slice(0,10),topic:"moonNatalAspect",title:"Moon natal aspect",body:"Moon forms a "+natalAspect.name+" to your natal Moon today.",at:isoLocal(d,8,46)});
        }
      }
      if(topicOn(topics,"voidMoon") && i<14 && i%2===0){
        const startHour = 8 + (i % 4) * 3;
        events.push({id:"voidMoon-"+isoLocal(d,startHour,15).slice(0,10),topic:"voidMoon",title:"Void of Course Moon",body:"Void Moon window today. Avoid forcing launches, signatures and major purchases.",at:isoLocal(d,startHour,15)});
        if(topicOn(topics,"voidMoonEnd")){
          events.push({id:"voidMoonEnd-"+isoLocal(d,startHour+2,45).slice(0,10),topic:"voidMoonEnd",title:"Void Moon ends",body:"The Void Moon window is ending. Momentum can return gradually.",at:isoLocal(d,startHour+2,45)});
        }
      }
      if(topicOn(topics,"eclipseReminder") && (key==="new" || key==="full") && [2,3,8,9].includes(d.getMonth())){
        events.push({id:"eclipseReminder-"+isoLocal(d,11,0).slice(0,10),topic:"eclipseReminder",title:"Eclipse season reminder",body:"This lunation falls in eclipse season. Move gently and watch turning points.",at:isoLocal(d,11,0)});
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
    const retroTopics = ["retroStart","retroDirect","stationRetroToday","stationDirectToday","retroStartTomorrow","retroDirectTomorrow","activeRetroSummary","natalRetroReminder","mercuryRetroSpecial","venusRetroSpecial","marsRetroSpecial"];
    if(!retroTopics.some(topic => topics.includes(topic)))return [];
    try{
      const {mod,swe} = await getSwe();
      const now = new Date();
      const events = [];
      const activeToday = [];
      for(const planet of retroPlanets){
        let prev = await retroSpeedAt(swe, mod, now, planet.key);
        if(prev < 0)activeToday.push(planet.key);
        for(let i=0;i<=days;i++){
          const d = new Date(now);
          d.setDate(now.getDate()+i);
          d.setHours(12,0,0,0);
          const speed = await retroSpeedAt(swe, mod, d, planet.key);
          const station = Math.abs(speed) < 0.025;
          if(i===0 && station && speed < 0 && topicOn(topics,"stationRetroToday")){
            events.push({id:"stationRetroToday-"+planet.key+"-"+isoLocal(d,10,5).slice(0,10),topic:"stationRetroToday",title:planet.symbol+" "+planet.key+" station retrograde",body:planet.key+" is stationing retrograde today. Slow down and review.",at:isoLocal(d,10,5)});
          }
          if(i===0 && station && speed >= 0 && topicOn(topics,"stationDirectToday")){
            events.push({id:"stationDirectToday-"+planet.key+"-"+isoLocal(d,10,8).slice(0,10),topic:"stationDirectToday",title:planet.symbol+" "+planet.key+" station direct",body:planet.key+" is stationing direct today. Let momentum return gradually.",at:isoLocal(d,10,8)});
          }
          if(i===1 && station && speed < 0 && topicOn(topics,"retroStartTomorrow")){
            events.push({id:"retroStartTomorrow-"+planet.key+"-"+isoLocal(now,18,10).slice(0,10),topic:"retroStartTomorrow",title:planet.key+" retrograde tomorrow",body:planet.key+" is close to retrograde motion tomorrow.",at:isoLocal(now,18,10)});
          }
          if(i===1 && station && speed >= 0 && topicOn(topics,"retroDirectTomorrow")){
            events.push({id:"retroDirectTomorrow-"+planet.key+"-"+isoLocal(now,18,15).slice(0,10),topic:"retroDirectTomorrow",title:planet.key+" direct tomorrow",body:planet.key+" is close to direct motion tomorrow.",at:isoLocal(now,18,15)});
          }
          if(i>0 && topicOn(topics,"retroStart") && prev >= 0 && speed < 0){
            events.push({id:"retroStart-"+planet.key+"-"+isoLocal(d,10,0).slice(0,10),topic:"retroStart",title:planet.symbol+" "+planet.key+" retrograde",body:planet.key+" starts retrograde. Slow down, review and revise.",at:isoLocal(d,10,0)});
            if(i===1 && topicOn(topics,"retroStartTomorrow"))events.push({id:"retroStartTomorrow-"+planet.key+"-"+isoLocal(now,18,20).slice(0,10),topic:"retroStartTomorrow",title:planet.key+" retrograde tomorrow",body:planet.key+" starts retrograde tomorrow. Prepare to review.",at:isoLocal(now,18,20)});
            break;
          }
          if(i>0 && topicOn(topics,"retroDirect") && prev < 0 && speed >= 0){
            events.push({id:"retroDirect-"+planet.key+"-"+isoLocal(d,10,0).slice(0,10),topic:"retroDirect",title:planet.symbol+" "+planet.key+" direct",body:planet.key+" goes direct. The reviewed area can begin moving forward.",at:isoLocal(d,10,0)});
            if(i===1 && topicOn(topics,"retroDirectTomorrow"))events.push({id:"retroDirectTomorrow-"+planet.key+"-"+isoLocal(now,18,25).slice(0,10),topic:"retroDirectTomorrow",title:planet.key+" direct tomorrow",body:planet.key+" goes direct tomorrow. Momentum can return gradually.",at:isoLocal(now,18,25)});
            break;
          }
          prev = speed;
        }
      }
      if(topicOn(topics,"activeRetroSummary") && activeToday.length){
        events.push({id:"activeRetroSummary-"+isoLocal(now,9,15).slice(0,10),topic:"activeRetroSummary",title:"Active retrogrades",body:"Currently retrograde: "+activeToday.join(", ")+". Review before forcing forward motion.",at:isoLocal(now,9,15)});
      }
      if(topicOn(topics,"natalRetroReminder")){
        events.push({id:"natalRetroReminder-"+isoLocal(now,9,25).slice(0,10),topic:"natalRetroReminder",title:"Natal retrograde reminder",body:"Check how retrograde themes connect with your natal chart pattern.",at:isoLocal(now,9,25)});
      }
      if(topicOn(topics,"mercuryRetroSpecial") && activeToday.includes("Mercury")){
        events.push({id:"mercuryRetroSpecial-"+isoLocal(now,9,35).slice(0,10),topic:"mercuryRetroSpecial",title:"Mercury retrograde special",body:"Review messages, plans, documents and travel details.",at:isoLocal(now,9,35)});
      }
      if(topicOn(topics,"venusRetroSpecial") && activeToday.includes("Venus")){
        events.push({id:"venusRetroSpecial-"+isoLocal(now,9,40).slice(0,10),topic:"venusRetroSpecial",title:"Venus retrograde special",body:"Review relationships, values, money and aesthetic choices.",at:isoLocal(now,9,40)});
      }
      if(topicOn(topics,"marsRetroSpecial") && activeToday.includes("Mars")){
        events.push({id:"marsRetroSpecial-"+isoLocal(now,9,45).slice(0,10),topic:"marsRetroSpecial",title:"Mars retrograde special",body:"Review action, anger, drive and energy management.",at:isoLocal(now,9,45)});
      }
      if(typeof swe.close==="function")swe.close();
      return events;
    }catch(e){
      if(!e || e.code !== "SWISSEPH_UNAVAILABLE") console.warn("Notification retrograde calculation failed", e);
      return [];
    }
  }


  function buildImportantTransitEvents(owner, topics, days){
    const transitTopics = ["importantTransit","exactTransit","challengingTransit","positiveTransit","majorTransit","moonTransitNatalMoon","saturnTransitWarning","jupiterTransitOpportunity","marsTransitEnergy","venusTransitRelationship","transitTomorrow","weeklyTransitSummary"];
    if(!transitTopics.some(topic => topics.includes(topic)))return [];
    const birthDate = parseOwnerDate(owner.birthDate);
    if(!birthDate)return [];
    const birthTime = parseOwnerTime(owner.birthTime);
    const natalMoon = moonLongitude(ownerDateToUtc(birthDate,birthTime));
    const events = [];
    const now = new Date();
    const good = ["trine","sextile"];
    const hard = ["square","opposition"];
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      d.setHours(12,0,0,0);
      const aspect = aspectToNatalMoon(moonLongitude(d), natalMoon);
      if(aspect && aspect.orb <= 2){
        const body = "Current Moon forms a "+aspect.name+" to your natal Moon. Notice mood, timing and emotional reactions.";
        if(topicOn(topics,"importantTransit"))events.push({id:"importantTransit-"+isoLocal(d,9,30).slice(0,10),topic:"importantTransit",title:"Important transit",body,at:isoLocal(d,9,30)});
        if(topicOn(topics,"moonTransitNatalMoon"))events.push({id:"moonTransitNatalMoon-"+isoLocal(d,9,35).slice(0,10),topic:"moonTransitNatalMoon",title:"Moon to natal Moon",body,at:isoLocal(d,9,35)});
        if(topicOn(topics,"exactTransit") && aspect.orb <= .7)events.push({id:"exactTransit-"+isoLocal(d,9,40).slice(0,10),topic:"exactTransit",title:"Exact transit",body:"A Moon transit is close to exact today: "+aspect.name+".",at:isoLocal(d,9,40)});
        if(topicOn(topics,"challengingTransit") && hard.includes(aspect.name))events.push({id:"challengingTransit-"+isoLocal(d,9,45).slice(0,10),topic:"challengingTransit",title:"Challenging transit",body:"Moon "+aspect.name+" natal Moon. Keep reactions measured.",at:isoLocal(d,9,45)});
        if(topicOn(topics,"positiveTransit") && good.includes(aspect.name))events.push({id:"positiveTransit-"+isoLocal(d,9,50).slice(0,10),topic:"positiveTransit",title:"Supportive transit",body:"Moon "+aspect.name+" natal Moon. Use the softer timing.",at:isoLocal(d,9,50)});
        if(topicOn(topics,"majorTransit") && ["conjunction","opposition"].includes(aspect.name))events.push({id:"majorTransit-"+isoLocal(d,9,55).slice(0,10),topic:"majorTransit",title:"Major transit",body:"Moon "+aspect.name+" natal Moon marks an emotional timing point.",at:isoLocal(d,9,55)});
      }
      if(i===1 && topicOn(topics,"transitTomorrow"))events.push({id:"transitTomorrow-"+isoLocal(now,18,30).slice(0,10),topic:"transitTomorrow",title:"Tomorrow's transit",body:"Tomorrow's Moon timing is ready in your transit view.",at:isoLocal(now,18,30)});
      if(i===0 && topicOn(topics,"weeklyTransitSummary"))events.push({id:"weeklyTransitSummary-"+isoLocal(d,19,0).slice(0,10),topic:"weeklyTransitSummary",title:"Weekly transit summary",body:"Your weekly transit rhythm is ready. Review the main emotional timing.",at:isoLocal(d,19,0)});
      if(i<7 && topicOn(topics,"saturnTransitWarning") && i%6===0)events.push({id:"saturnTransitWarning-"+isoLocal(d,10,10).slice(0,10),topic:"saturnTransitWarning",title:"Saturn timing",body:"Good day for discipline, boundaries and serious choices.",at:isoLocal(d,10,10)});
      if(i<7 && topicOn(topics,"jupiterTransitOpportunity") && i%5===0)events.push({id:"jupiterTransitOpportunity-"+isoLocal(d,10,15).slice(0,10),topic:"jupiterTransitOpportunity",title:"Jupiter opportunity",body:"Look for growth, teaching, travel or expansion opportunities.",at:isoLocal(d,10,15)});
      if(i<7 && topicOn(topics,"marsTransitEnergy") && i%4===0)events.push({id:"marsTransitEnergy-"+isoLocal(d,10,20).slice(0,10),topic:"marsTransitEnergy",title:"Mars energy",body:"Use extra drive carefully. Move, act, but avoid needless conflict.",at:isoLocal(d,10,20)});
      if(i<7 && topicOn(topics,"venusTransitRelationship") && i%3===0)events.push({id:"venusTransitRelationship-"+isoLocal(d,10,25).slice(0,10),topic:"venusTransitRelationship",title:"Venus relationship timing",body:"Good moment to soften communication and notice attraction or harmony.",at:isoLocal(d,10,25)});
    }
    return events;
  }


  function buildDailyNumerologyEvents(owner, topics, days){
    const events = [];
    const now = new Date();
    const ownerDate = parseOwnerDate(owner && owner.birthDate);
    if(!ownerDate)return events;
    const advice = {
      1:"Start one clean action.",
      2:"Listen, cooperate and keep balance.",
      3:"Speak, create and make room for joy.",
      4:"Organize, build and finish practical work.",
      5:"Stay flexible and choose freedom wisely.",
      6:"Care for home, body and relationships.",
      7:"Study, reflect and trust quiet insight.",
      8:"Handle power, money and responsibility.",
      9:"Complete, forgive and release what is done."
    };
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      const pDay = personalDay(ownerDate, d);
      const pMonth = personalMonth(ownerDate, d);
      const pYear = personalYear(ownerDate, d);
      if(topicOn(topics,"pythagoreanDay")){
        const code = pythagoreanCodeForDate(ownerDate, d);
        events.push({id:"pythagoreanDay-"+isoLocal(d,8,0).slice(0,10),topic:"pythagoreanDay",title:"Pythagorean day code",body:"Your Pythagorean code for today is "+code+".",at:isoLocal(d,8,0)});
      }
      if(topicOn(topics,"pyramidDay")){
        const code = pyramidDayCodeForDate(ownerDate, owner, d);
        events.push({id:"pyramidDay-"+isoLocal(d,8,5).slice(0,10),topic:"pyramidDay",title:"Pyramidal day code",body:"Your pyramidal day code is "+code+".",at:isoLocal(d,8,5)});
      }
      if(topicOn(topics,"personalDay"))events.push({id:"personalDay-"+isoLocal(d,8,12).slice(0,10),topic:"personalDay",title:"Personal day "+pDay,body:advice[pDay] || "Follow today's number.",at:isoLocal(d,8,12)});
      if(topicOn(topics,"dailyNumerologyAdvice"))events.push({id:"dailyNumerologyAdvice-"+isoLocal(d,8,18).slice(0,10),topic:"dailyNumerologyAdvice",title:"Daily numerology advice",body:"Personal day "+pDay+": "+(advice[pDay] || "Move with today's number."),at:isoLocal(d,8,18)});
      if(i===0 && topicOn(topics,"personalMonth"))events.push({id:"personalMonth-"+isoLocal(d,8,22).slice(0,10),topic:"personalMonth",title:"Personal month "+pMonth,body:"This month carries personal month "+pMonth+" energy.",at:isoLocal(d,8,22)});
      if(i===0 && topicOn(topics,"personalYear"))events.push({id:"personalYear-"+isoLocal(d,8,24).slice(0,10),topic:"personalYear",title:"Personal year "+pYear,body:"This year carries personal year "+pYear+" energy.",at:isoLocal(d,8,24)});
      if(topicOn(topics,"challengingNumerologyDay") && [4,7,8,9].includes(pDay))events.push({id:"challengingNumerologyDay-"+isoLocal(d,8,28).slice(0,10),topic:"challengingNumerologyDay",title:"Careful numerology day",body:"Personal day "+pDay+" asks for patience and clean choices.",at:isoLocal(d,8,28)});
      if(topicOn(topics,"favorableNumerologyDay") && [1,3,5,6].includes(pDay))events.push({id:"favorableNumerologyDay-"+isoLocal(d,8,32).slice(0,10),topic:"favorableNumerologyDay",title:"Favorable numerology day",body:"Personal day "+pDay+" supports useful movement.",at:isoLocal(d,8,32)});
      if(topicOn(topics,"master11Day") && reduceNumber(d.getDate()+""+(d.getMonth()+1)+""+d.getFullYear())===11)events.push({id:"master11Day-"+isoLocal(d,8,36).slice(0,10),topic:"master11Day",title:"Master 11 day",body:"Heightened intuition and sensitivity today. Stay clear and inspired.",at:isoLocal(d,8,36)});
      if(topicOn(topics,"master22Day") && reduceNumber(d.getDate()+""+(d.getMonth()+1)+""+d.getFullYear())===22)events.push({id:"master22Day-"+isoLocal(d,8,40).slice(0,10),topic:"master22Day",title:"Master 22 day",body:"Builder energy is strong. Put vision into practical form.",at:isoLocal(d,8,40)});
      if(topicOn(topics,"repeatingCodeDay")){
        const code = pythagoreanCodeForDate(ownerDate, d);
        if(/(.)\1/.test(code))events.push({id:"repeatingCodeDay-"+isoLocal(d,8,44).slice(0,10),topic:"repeatingCodeDay",title:"Repeating code day",body:"Repeating code appears today: "+code+". Notice the pattern.",at:isoLocal(d,8,44)});
      }
      if(topicOn(topics,"importantDay") && [1,8,9,11,22].includes(reduceNumber(d.getDate()+""+(d.getMonth()+1)+""+d.getFullYear())))events.push({id:"importantDay-"+isoLocal(d,8,48).slice(0,10),topic:"importantDay",title:"Important day",body:"Today's number pattern is stronger than usual. Move consciously.",at:isoLocal(d,8,48)});
      if(topicOn(topics,"avoidBigDecisions") && [7,9].includes(pDay))events.push({id:"avoidBigDecisions-"+isoLocal(d,18,15).slice(0,10),topic:"avoidBigDecisions",title:"Avoid big decisions",body:"Personal day "+pDay+" favors reflection over pressure.",at:isoLocal(d,18,15)});
      if(topicOn(topics,"goodForAction") && [1,3,5,8].includes(pDay))events.push({id:"goodForAction-"+isoLocal(d,8,52).slice(0,10),topic:"goodForAction",title:"Good for action",body:"Personal day "+pDay+" supports action and progress.",at:isoLocal(d,8,52)});
      if(topicOn(topics,"goodForRest") && [2,6,7,9].includes(pDay))events.push({id:"goodForRest-"+isoLocal(d,20,20).slice(0,10),topic:"goodForRest",title:"Good for rest",body:"Personal day "+pDay+" supports recovery, care and integration.",at:isoLocal(d,20,20)});
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



  function buildChartEvents(owner, topics, days){
    const chartTopics = ["birthdayReminder","sunSeasonStart","ascendantDaily","natalChartReminder","houseActivation","planetFocus"];
    if(!chartTopics.some(topic => topics.includes(topic)))return [];
    const events = [];
    const now = new Date();
    const ownerDate = parseOwnerDate(owner && owner.birthDate);
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      if(ownerDate && topicOn(topics,"birthdayReminder") && d.getDate()===ownerDate.day && d.getMonth()+1===ownerDate.month){
        events.push({id:"birthdayReminder-"+isoLocal(d,9,0).slice(0,10),topic:"birthdayReminder",title:"Birthday reminder",body:"Your solar return season is here. Review the year and set a clean intention.",at:isoLocal(d,9,0)});
      }
      if(topicOn(topics,"sunSeasonStart") && [20,21,22,23].includes(d.getDate())){
        events.push({id:"sunSeasonStart-"+isoLocal(d,9,20).slice(0,10),topic:"sunSeasonStart",title:seasonName(d.getMonth())+" shift",body:"A new seasonal rhythm is starting. Notice what wants attention.",at:isoLocal(d,9,20)});
      }
      if(i<14 && topicOn(topics,"ascendantDaily"))events.push({id:"ascendantDaily-"+isoLocal(d,7,35).slice(0,10),topic:"ascendantDaily",title:"Daily Ascendant focus",body:"Start the day by aligning your outer action with your inner intention.",at:isoLocal(d,7,35)});
      if(i===0 && topicOn(topics,"natalChartReminder"))events.push({id:"natalChartReminder-"+isoLocal(d,12,0).slice(0,10),topic:"natalChartReminder",title:"Natal chart reminder",body:"Open your natal chart and review the main pattern for this period.",at:isoLocal(d,12,0)});
      if(i<14 && topicOn(topics,"houseActivation") && i%3===0)events.push({id:"houseActivation-"+isoLocal(d,11,15).slice(0,10),topic:"houseActivation",title:"House activation",body:"A life area is asking for attention. Check your chart houses today.",at:isoLocal(d,11,15)});
      if(i<14 && topicOn(topics,"planetFocus") && i%2===0)events.push({id:"planetFocus-"+isoLocal(d,11,30).slice(0,10),topic:"planetFocus",title:"Planet focus",body:"Choose one planet in your chart and observe how it appears today.",at:isoLocal(d,11,30)});
    }
    return events;
  }

  function buildRelationshipEvents(owner, topics, days){
    const relationTopics = ["synastryReminder","partnerTransit","relationshipTalkDay","relationshipChallengeDay","venusMarsRelationship","moonCompatibility"];
    if(!relationTopics.some(topic => topics.includes(topic)))return [];
    const events = [];
    const now = new Date();
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      const seed = seedText((owner && owner.birthDate || "")+"|rel|"+i);
      if(i===0 && topicOn(topics,"synastryReminder"))events.push({id:"synastryReminder-"+isoLocal(d,18,0).slice(0,10),topic:"synastryReminder",title:"Synastry reminder",body:"Review an important relationship pattern with calm attention.",at:isoLocal(d,18,0)});
      if(topicOn(topics,"partnerTransit") && i%5===0)events.push({id:"partnerTransit-"+isoLocal(d,18,10).slice(0,10),topic:"partnerTransit",title:"Partner transit",body:"Relationship timing is active. Listen before interpreting.",at:isoLocal(d,18,10)});
      if(topicOn(topics,"relationshipTalkDay") && seed%4===0)events.push({id:"relationshipTalkDay-"+isoLocal(d,18,20).slice(0,10),topic:"relationshipTalkDay",title:"Relationship talk day",body:"Good day for honest, simple conversation.",at:isoLocal(d,18,20)});
      if(topicOn(topics,"relationshipChallengeDay") && seed%7===0)events.push({id:"relationshipChallengeDay-"+isoLocal(d,18,25).slice(0,10),topic:"relationshipChallengeDay",title:"Relationship challenge day",body:"Move slowly in emotional exchanges. Clarity beats reaction.",at:isoLocal(d,18,25)});
      if(topicOn(topics,"venusMarsRelationship") && i%6===0)events.push({id:"venusMarsRelationship-"+isoLocal(d,18,30).slice(0,10),topic:"venusMarsRelationship",title:"Venus/Mars relationship",body:"Attraction and action themes are highlighted today.",at:isoLocal(d,18,30)});
      if(topicOn(topics,"moonCompatibility") && i%3===0)events.push({id:"moonCompatibility-"+isoLocal(d,18,35).slice(0,10),topic:"moonCompatibility",title:"Moon compatibility",body:"Notice emotional rhythm and needs in close relationships.",at:isoLocal(d,18,35)});
    }
    return events;
  }

  function buildLocationEvents(owner, topics, days){
    const locationTopics = ["astrocartographyCity","travelLineGood","travelLineCaution","venusLineOpportunity","jupiterLineOpportunity","saturnPlutoLineCaution","locationEnergyReminder"];
    if(!locationTopics.some(topic => topics.includes(topic)))return [];
    const events = [];
    const now = new Date();
    const city = owner && (owner.currentCity || owner.birthCity) || "your city";
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      if(i===0 && topicOn(topics,"astrocartographyCity"))events.push({id:"astrocartographyCity-"+isoLocal(d,13,0).slice(0,10),topic:"astrocartographyCity",title:"Astrocartography city",body:"Review the energy of "+city+" in your location map.",at:isoLocal(d,13,0)});
      if(topicOn(topics,"travelLineGood") && i%7===1)events.push({id:"travelLineGood-"+isoLocal(d,13,10).slice(0,10),topic:"travelLineGood",title:"Good travel line",body:"Check supportive travel lines before planning movement.",at:isoLocal(d,13,10)});
      if(topicOn(topics,"travelLineCaution") && i%9===2)events.push({id:"travelLineCaution-"+isoLocal(d,13,15).slice(0,10),topic:"travelLineCaution",title:"Caution travel line",body:"Review pressure lines and timing before committing to travel.",at:isoLocal(d,13,15)});
      if(topicOn(topics,"venusLineOpportunity") && i%8===3)events.push({id:"venusLineOpportunity-"+isoLocal(d,13,20).slice(0,10),topic:"venusLineOpportunity",title:"Venus line opportunity",body:"Venus lines may support art, love, ease or visibility.",at:isoLocal(d,13,20)});
      if(topicOn(topics,"jupiterLineOpportunity") && i%10===4)events.push({id:"jupiterLineOpportunity-"+isoLocal(d,13,25).slice(0,10),topic:"jupiterLineOpportunity",title:"Jupiter line opportunity",body:"Jupiter lines may support growth, teaching and expansion.",at:isoLocal(d,13,25)});
      if(topicOn(topics,"saturnPlutoLineCaution") && i%11===5)events.push({id:"saturnPlutoLineCaution-"+isoLocal(d,13,30).slice(0,10),topic:"saturnPlutoLineCaution",title:"Saturn/Pluto line caution",body:"Strong location lines ask for maturity, boundaries and patience.",at:isoLocal(d,13,30)});
      if(topicOn(topics,"locationEnergyReminder") && i%4===0)events.push({id:"locationEnergyReminder-"+isoLocal(d,13,35).slice(0,10),topic:"locationEnergyReminder",title:"Location energy reminder",body:"Notice how "+city+" affects your focus, mood and direction.",at:isoLocal(d,13,35)});
    }
    return events;
  }

  function buildAppAndBookEvents(owner, topics, days){
    const appTopics = ["newBook","freePdfReminder","freePdf","bookRecommendation","seasonBookRelease","ownerProfileReminder","saveProfileReminder","dailySummary","morningGuidance","eveningReflection","weeklySummary","monthlySummary"];
    if(!appTopics.some(topic => topics.includes(topic)))return [];
    const events = [];
    const now = new Date();
    const bookTitles = ["Power Nobody Sees","How to Discover His Type","Numerology guide"];
    for(let i=0;i<days;i++){
      const d = new Date(now);
      d.setDate(now.getDate()+i);
      if(i===0 && topicOn(topics,"freePdfReminder"))events.push({id:"freePdfReminder-"+isoLocal(d,10,45).slice(0,10),topic:"freePdfReminder",title:"Free PDF reminder",body:"Your free PDF is available in the app.",at:isoLocal(d,10,45)});
      if(i===0 && topicOn(topics,"freePdf"))events.push({id:"freePdf-"+isoLocal(d,10,48).slice(0,10),topic:"freePdf",title:"Free PDF",body:"Open the free PDF from the app library.",at:isoLocal(d,10,48)});
      if(topicOn(topics,"bookRecommendation") && i%7===0)events.push({id:"bookRecommendation-"+isoLocal(d,10,50).slice(0,10),topic:"bookRecommendation",title:"Book recommendation",body:"Recommended today: "+seededPick(String(i), bookTitles)+".",at:isoLocal(d,10,50)});
      if(topicOn(topics,"newBook") && i===1)events.push({id:"newBook-"+isoLocal(d,10,55).slice(0,10),topic:"newBook",title:"New book",body:"Check the store area for the latest book updates.",at:isoLocal(d,10,55)});
      if(topicOn(topics,"seasonBookRelease") && [0,3,6,9].includes(d.getMonth()) && d.getDate()<=7)events.push({id:"seasonBookRelease-"+isoLocal(d,11,0).slice(0,10),topic:"seasonBookRelease",title:"Season book release",body:"Seasonal book timing is active. Check the store.",at:isoLocal(d,11,0)});
      if(i===0 && topicOn(topics,"ownerProfileReminder"))events.push({id:"ownerProfileReminder-"+isoLocal(d,11,10).slice(0,10),topic:"ownerProfileReminder",title:"Owner profile",body:"Keep your owner birth data and city updated for accurate notifications.",at:isoLocal(d,11,10)});
      if(i===0 && topicOn(topics,"saveProfileReminder"))events.push({id:"saveProfileReminder-"+isoLocal(d,11,15).slice(0,10),topic:"saveProfileReminder",title:"Save profile reminder",body:"Save important birth profiles so readings stay easy to open.",at:isoLocal(d,11,15)});
      if(topicOn(topics,"morningGuidance") && i<14)events.push({id:"morningGuidance-"+isoLocal(d,7,30).slice(0,10),topic:"morningGuidance",title:"Morning guidance",body:"Start with one clear intention and one useful action.",at:isoLocal(d,7,30)});
      if(topicOn(topics,"dailySummary") && i<14)events.push({id:"dailySummary-"+isoLocal(d,12,30).slice(0,10),topic:"dailySummary",title:"Daily summary",body:"Your daily numerology, Moon and tarot timing is ready.",at:isoLocal(d,12,30)});
      if(topicOn(topics,"eveningReflection") && i<14)events.push({id:"eveningReflection-"+isoLocal(d,20,45).slice(0,10),topic:"eveningReflection",title:"Evening reflection",body:"Review what repeated today and what can be released.",at:isoLocal(d,20,45)});
      if(topicOn(topics,"weeklySummary") && i%7===0)events.push({id:"weeklySummary-"+isoLocal(d,19,30).slice(0,10),topic:"weeklySummary",title:"Weekly summary",body:"Review the next week's number, Moon and transit rhythm.",at:isoLocal(d,19,30)});
      if(topicOn(topics,"monthlySummary") && d.getDate()===1)events.push({id:"monthlySummary-"+isoLocal(d,19,40).slice(0,10),topic:"monthlySummary",title:"Monthly summary",body:"A new month begins. Review your personal month and priorities.",at:isoLocal(d,19,40)});
    }
    return events;
  }

  async function buildNotificationSchedule(owner){
    const topics = owner && owner.notificationsEnabled ? (owner.notificationTopics || []) : [];
    if(!owner || !topics.length)return [];
    const events = [
      ...buildLunarEvents(owner, topics, 90),
      ...buildDailyNumerologyEvents(owner, topics, 30),
      ...(await buildDailyTarotEvents(owner, topics, 30)),
      ...buildImportantTransitEvents(owner, topics, 30),
      ...(await buildRetroEvents(topics, 90)),
      ...buildChartEvents(owner, topics, 60),
      ...buildRelationshipEvents(owner, topics, 30),
      ...buildLocationEvents(owner, topics, 30),
      ...buildAppAndBookEvents(owner, topics, 30)
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
        if(typeof window.Capacitor.Plugins.LocalNotifications.requestPermissions === "function"){
          await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
        }
        if(typeof window.Capacitor.Plugins.LocalNotifications.cancel === "function"){
          try{await window.Capacitor.Plugins.LocalNotifications.cancel({notifications:events.map(event => ({id:Math.abs(hashCode(event.id)) % 2147483647}))})}catch(e){}
        }
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
