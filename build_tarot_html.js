const fs = require("fs");
const path = require("path");

const tarotDir = "C:/Users/Korisnik/Desktop/tarot";
const outFile = path.join(tarotDir, "tarot.html");

function readJson(name){
  return JSON.parse(fs.readFileSync(path.join(tarotDir, name), "utf8"));
}

const appReady = readJson("tarot_cards_app_ready_english.json");
const complete = readJson("tarot_database_complete.json");
const premiumFiles = [
  "Major_Arcana_Premium.json",
  "Wands_Premium.json",
  "Cups_Premium.json",
  "Swords_Premium.json",
  "Pentacles_Premium.json"
];
const premium = Object.fromEntries(
  premiumFiles.flatMap(file => readJson(file)).map(card => [card.name, card])
);

const visualIdeas = {
  Major: {
    palette: "deep slate, silver light, soft stars",
    prompt: "symbolic Major Arcana scene, central archetype, dramatic light, mystic frame"
  },
  Wands: {
    palette: "ember red, orange, gold",
    prompt: "wooden staffs, fire sparks, active movement, warm glow"
  },
  Cups: {
    palette: "blue, silver, moonlit water",
    prompt: "chalices, flowing water, emotional atmosphere, reflective light"
  },
  Swords: {
    palette: "cool blue, steel gray, clouds",
    prompt: "swords, air, sharp light, clouds and truth"
  },
  Pentacles: {
    palette: "green, gold, earth tones",
    prompt: "gold pentacles, leaves, stone, material abundance"
  }
};

const suitFromName = name => {
  if(name.includes("Wands"))return "Wands";
  if(name.includes("Cups"))return "Cups";
  if(name.includes("Swords"))return "Swords";
  if(name.includes("Pentacles"))return "Pentacles";
  return "Major";
};
const rankFromName = name => {
  const first = name.split(" of ")[0];
  return name.includes(" of ") ? first : "";
};
const symbolForSuit = suit => ({Major:"M",Wands:"W",Cups:"C",Swords:"S",Pentacles:"P"}[suit] || "T");

const deck = appReady.map((base, index) => {
  const meta = complete.find(card => card.name === base.name) || {};
  const extra = premium[base.name] || {};
  const suit = meta.arcana === "Major" ? "Major" : suitFromName(base.name);
  const arcana = meta.arcana || (suit === "Major" ? "Major" : "Minor");
  const visual = visualIdeas[suit] || visualIdeas.Major;
  const keywords = Array.isArray(base.keywords) ? base.keywords.join(", ") : String(base.keywords || extra.upright || "");
  return {
    id: index,
    name: base.name,
    arcana,
    suit,
    rank: rankFromName(base.name),
    symbol: symbolForSuit(suit),
    keywords,
    upright: extra.upright || base.general || meta.description || "",
    reversed: extra.reversed || base.reversed || "",
    love: extra.love || base.love || "",
    career: extra.career || base.career || "",
    money: extra.money || base.career || "",
    health: base.health || "General wellness message: keep balance, rest, and emotional clarity. This is not medical advice.",
    spirituality: extra.spirituality || "Use this card for self-reflection and symbolic guidance.",
    image: meta.image || "",
    temporary_image: true,
    visual_palette: visual.palette,
    visual_prompt: `${base.name}: ${visual.prompt}. Use a consistent dark mystical tarot style with a clean border.`
  };
});

if(deck.length !== 78){
  throw new Error(`Expected 78 tarot cards, got ${deck.length}`);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tarot Cards</title>
<script src="app-shared-state.js"><\/script>
<script src="app-notification-open.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#0f172a;color:white;text-align:center;margin:0;padding:5px;overflow-x:hidden}
.header-bar{position:relative;width:100%;padding:10px 12px;display:flex;align-items:center;justify-content:center;min-height:50px}
.left-bar{position:absolute;top:10px;left:12px;z-index:20;display:flex;align-items:center;gap:6px}
.left-btn,.action-btn{width:30px;height:30px;border-radius:8px;background:#1e293b;border:1px solid rgba(148,163,184,.32);color:#cbd5e1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s;padding:0;flex:none}
.left-btn:hover,.action-btn:hover{color:#f8fafc;border-color:#cbd5e1;box-shadow:0 0 12px rgba(148,163,184,.3)}
.left-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.action-btn svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.header-title{font-size:clamp(14px,5vw,23px);font-weight:bold;color:#e2e8f0;letter-spacing:1px;text-shadow:0 0 14px rgba(148,163,184,.34);padding:0 72px;white-space:nowrap;overflow:hidden;line-height:30px}
.top-bar{position:absolute;top:10px;right:12px;z-index:20}.action-group{display:flex;align-items:center;gap:6px}
.subtitle{margin-top:3px;color:#94a3b8;font-size:12px;opacity:.82}
.container{width:100%;max-width:940px;margin:auto;padding:12px}
.tabs{display:flex;justify-content:center;gap:6px;margin:10px auto 6px;max-width:720px;padding:0 8px;flex-wrap:wrap}
.tab{min-height:34px;border-radius:8px;background:#1e293b;border:1px solid rgba(148,163,184,.22);color:#cbd5e1;font-size:11px;font-weight:800;letter-spacing:.4px;cursor:pointer;transition:.25s;padding:0 12px}
.tab:hover,.tab.active{color:white;border-color:#cbd5e1;box-shadow:0 0 12px rgba(148,163,184,.22);background:#334155}
.input-card{background:transparent;border:none;padding:4px 0 4px;margin-top:4px}
.input-line{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;flex-wrap:nowrap!important;width:100%!important;max-width:360px!important;margin:0 auto!important;padding:0 4px!important}
.input-line input{width:var(--birth-field-width,82px)!important;flex:0 0 var(--birth-field-width,82px)!important;height:var(--birth-field-height,30px)!important;min-height:var(--birth-field-height,30px)!important;background:#1e293b;border:1px solid #94a3b8;color:white;border-radius:8px!important;padding:0 6px!important;font-size:var(--birth-field-font,11px)!important;outline:none;box-shadow:0 0 10px rgba(148,163,184,.18);text-align:center;box-sizing:border-box!important}
.primary-btn{width:90%;max-width:340px;min-height:34px;border:none;border-radius:14px;background:linear-gradient(135deg,#cbd5e1,#64748b);color:#0f172a;font-size:13px;font-weight:800;letter-spacing:.5px;padding:10px;cursor:pointer;box-shadow:0 0 12px rgba(148,163,184,.24);display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.05;margin:0 auto}
.small-btn{min-height:30px;border-radius:8px;background:#1e293b;border:1px solid rgba(148,163,184,.28);color:#cbd5e1;font-size:10px;font-weight:800;padding:0 10px;cursor:pointer}
.main-action-row{display:flex;justify-content:center;margin-top:8px}
.savedIconBox{width:34px!important;height:34px!important;min-width:34px!important;flex:0 0 34px!important;background:#1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(148,163,184,.18);border:1px solid #94a3b8;position:relative;cursor:pointer;transition:.3s;color:#cbd5e1}
.savedCountBox{position:absolute;top:-8px;right:-8px;background:#cbd5e1;color:#0f172a;font-size:9px;width:16px;height:16px;border-radius:50%;display:none;align-items:center;justify-content:center;font-weight:bold;border:1px solid rgba(226,232,240,.8)}
.savedPanel{display:none;position:fixed;top:58px;right:0;width:280px;height:calc(100% - 58px);background:#1e293b;z-index:9000;padding:46px 15px 20px;overflow-y:auto;box-shadow:-5px 0 20px rgba(148,163,184,.16);border-left:1px solid rgba(148,163,184,.45)}
.savedPanelClose{position:absolute;top:14px;left:15px;font-size:20px;color:#e2e8f0;cursor:pointer}.savedPanelTitle{color:#e2e8f0;margin-bottom:15px;font-size:14px;text-shadow:0 0 10px rgba(148,163,184,.28)}
.savedItem{background:#0f172a;border:1px solid rgba(148,163,184,.24);border-radius:8px;padding:10px;margin-bottom:8px;text-align:left;cursor:pointer}
.panel{display:none}.panel.active{display:block}
.card{background:#1e293b;border-radius:10px;border:1px solid rgba(148,163,184,.22);padding:10px;margin-top:8px;box-shadow:0 0 22px rgba(0,0,0,.18)}
.section-title{color:#e2e8f0;font-size:17px;line-height:1.25;margin-bottom:12px;text-shadow:0 0 10px rgba(148,163,184,.22)}
.reading-layout{display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:12px;align-items:start}
.tarot-card{width:100%;min-height:340px;margin:0 auto;border-radius:14px;background:linear-gradient(160deg,#334155,#0f172a 45%,#1e293b);border:1px solid rgba(148,163,184,.48);box-shadow:0 0 28px rgba(148,163,184,.18);display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:14px;position:relative;overflow:hidden}
.tarot-card::before{content:"";position:absolute;inset:12px;border:1px solid rgba(226,232,240,.16);border-radius:10px;pointer-events:none}
.tarot-corner{align-self:stretch;display:flex;justify-content:space-between;color:#94a3b8;font-size:11px;font-weight:bold;letter-spacing:.8px}
.tarot-symbol{font-size:56px;color:#e2e8f0;text-shadow:0 0 18px rgba(148,163,184,.4);margin:18px 0 10px}
.tarot-name{font-size:24px;font-weight:900;color:#fff;line-height:1.15;padding:0 8px}
.tarot-sub{font-size:12px;color:#cbd5e1;margin-top:8px;padding:0 8px}
.temporary-badge{font-size:9px;color:#94a3b8;border:1px solid rgba(148,163,184,.22);border-radius:999px;padding:4px 8px;margin-top:10px}
.text-panel{text-align:left;background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:10px}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:8px}
.mini-card{background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:10px;text-align:left}
.label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}
.value{font-size:13px;color:#e2e8f0;line-height:1.45}.value b{color:white}
.spread{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px}
.spread-card{cursor:pointer;transition:.2s}.spread-card:hover{transform:translateY(-2px);border-color:#cbd5e1}
.deck-tools{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.deck-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:8px}
.deck-card{background:#0f172a;border:1px solid rgba(148,163,184,.18);border-radius:10px;padding:9px;text-align:left;cursor:pointer;min-height:86px}
.deck-card:hover{border-color:#cbd5e1}.deck-card .name{font-size:12px;color:#fff;font-weight:bold}.deck-card .meta{font-size:10px;color:#94a3b8;margin-top:4px}
.note{margin-top:10px;color:#94a3b8;font-size:11px;line-height:1.4;opacity:.82}
@media(max-width:700px){.reading-layout{grid-template-columns:1fr}.tarot-card{max-width:250px}.header-title{font-size:14px;padding:0 66px}.tab{flex:1;padding:0 6px}}
@media print{.header-bar,.tabs,.input-card,.savedPanel,.deck-tools,.main-action-row{display:none!important}body{background:white;color:#111}.card,.text-panel,.mini-card{box-shadow:none;border-color:#bbb;background:white;color:#111}.value,.section-title{color:#111}}
<\/style>
</head>
<body>
<div class="header-bar">
  <div class="left-bar">
    <button class="left-btn" onclick="goBack()" title="Back"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"></path></svg></button>
    <button class="left-btn" onclick="exitApp()" title="Exit"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg></button>
  </div>
  <div>
    <div class="header-title">TAROT CARDS</div>
    <div class="subtitle">78 cards, daily card, 3-card spread and Celtic Cross</div>
  </div>
  <div class="top-bar">
    <div class="action-group">
      <button class="action-btn" type="button" onclick="sharePage()" title="Share"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button>
      <button class="action-btn" type="button" onclick="window.print()" title="Print"><svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg></button>
    </div>
  </div>
</div>
<div class="container">
  <div class="tabs">
    <button class="tab active" data-tab="daily" onclick="showTab('daily')">Daily</button>
    <button class="tab" data-tab="spreadPanel" onclick="showTab('spreadPanel')">3 Cards</button>
    <button class="tab" data-tab="celticPanel" onclick="showTab('celticPanel')">Celtic</button>
    <button class="tab" data-tab="deckPanel" onclick="showTab('deckPanel')">Deck</button>
    <button class="tab" data-tab="meaning" onclick="showTab('meaning')">Meaning</button>
  </div>
  <div class="input-card">
    <div class="input-line">
      <input id="birthDate" type="text" placeholder="DD.MM.YYYY" maxlength="10">
      <input id="birthTime" type="text" placeholder="HH:MM" maxlength="5">
      <input id="birthCity" type="text" placeholder="City">
      <div class="savedIconBox" onclick="toggleSavedPanel()" title="Saved profiles">
        <svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:none;stroke:#cbd5e1;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 5px rgba(148,163,184,0.5))"><path d="M8 4h8"></path><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"></path><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M8 11h8"></path><path d="M8 16h5"></path></svg>
        <span id="savedCountBox" class="savedCountBox">0</span>
      </div>
    </div>
    <div class="main-action-row"><button class="primary-btn" onclick="drawDaily()">DRAW</button></div>
  </div>
  <div id="daily" class="panel active">
    <div class="card">
      <div class="section-title">Your Card For Today</div>
      <div class="reading-layout">
        <div id="dailyCardArt"></div>
        <div class="text-panel" id="dailyText"></div>
      </div>
    </div>
  </div>
  <div id="spreadPanel" class="panel">
    <div class="card">
      <div class="section-title">Past / Present / Future</div>
      <button class="primary-btn" onclick="drawSpread()">DRAW 3 CARDS</button>
      <div id="spread" class="spread"></div>
    </div>
  </div>
  <div id="celticPanel" class="panel">
    <div class="card">
      <div class="section-title">Celtic Cross</div>
      <button class="primary-btn" onclick="drawCeltic()">DRAW 10 CARDS</button>
      <div id="celticSpread" class="spread"></div>
    </div>
  </div>
  <div id="deckPanel" class="panel">
    <div class="card">
      <div class="section-title">Complete 78 Card Deck</div>
      <div class="deck-tools">
        <button class="small-btn" onclick="renderDeck('All')">All</button>
        <button class="small-btn" onclick="renderDeck('Major')">Major</button>
        <button class="small-btn" onclick="renderDeck('Wands')">Wands</button>
        <button class="small-btn" onclick="renderDeck('Cups')">Cups</button>
        <button class="small-btn" onclick="renderDeck('Swords')">Swords</button>
        <button class="small-btn" onclick="renderDeck('Pentacles')">Pentacles</button>
      </div>
      <div id="deckGrid" class="deck-grid"></div>
    </div>
  </div>
  <div id="meaning" class="panel">
    <div class="card">
      <div class="section-title">Selected Card Meaning</div>
      <div class="reading-layout">
        <div id="selectedCardArt"></div>
        <div class="text-panel" id="meaningText"></div>
      </div>
      <div class="note">Temporary cards are generated in-app. Replace the visual block later with real images while keeping the same card data.</div>
    </div>
  </div>
</div>
<div id="savedPanel" class="savedPanel">
  <div class="savedPanelClose" onclick="toggleSavedPanel()">X</div>
  <div class="savedPanelTitle">SAVED PROFILES</div>
  <div id="savedList"></div>
</div>
<script>
const deck=${JSON.stringify(deck)};
let selectedCard=deck[0];
let lastReading=[];
const spreadLabels=["Past","Present","Future"];
const celticLabels=["Present","Challenge","Foundation","Past","Goal","Near future","Self","Environment","Hopes/Fears","Outcome"];
function seed(extra=""){const d=new Date();const v=(birthDate.value||"owner")+"|"+d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate()+"|"+extra;let h=0;for(let i=0;i<v.length;i++)h=((h<<5)-h)+v.charCodeAt(i)|0;return Math.abs(h)}
function safe(v){return String(v||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function showTab(id){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id===id))}
function cardArt(card){return '<div class="tarot-card"><div class="tarot-corner"><span>'+safe(card.arcana)+'</span><span>'+safe(card.suit)+'</span></div><div><div class="tarot-symbol">'+safe(card.symbol)+'</div><div class="tarot-name">'+safe(card.name)+'</div><div class="tarot-sub">'+safe(card.keywords)+'</div></div><div><div class="temporary-badge">TEMPORARY CARD ART</div><div class="tarot-sub">'+safe(card.visual_palette)+'</div></div></div>'}
function meaningHtml(card){return '<div class="label">'+safe(card.arcana)+' / '+safe(card.suit)+'</div><div class="value"><b>'+safe(card.name)+'</b><br>'+safe(card.keywords)+'</div><div class="detail-grid"><div class="mini-card"><div class="label">Upright</div><div class="value">'+safe(card.upright)+'</div></div><div class="mini-card"><div class="label">Reversed</div><div class="value">'+safe(card.reversed)+'</div></div><div class="mini-card"><div class="label">Love</div><div class="value">'+safe(card.love)+'</div></div><div class="mini-card"><div class="label">Career</div><div class="value">'+safe(card.career)+'</div></div><div class="mini-card"><div class="label">Money</div><div class="value">'+safe(card.money)+'</div></div><div class="mini-card"><div class="label">Wellness</div><div class="value">'+safe(card.health)+'</div></div><div class="mini-card"><div class="label">Visual direction</div><div class="value">'+safe(card.visual_prompt)+'</div></div></div>'}
function selectCard(card, switchMeaning=true){selectedCard=card;selectedCardArt.innerHTML=cardArt(card);meaningText.innerHTML=meaningHtml(card);if(switchMeaning)showTab("meaning")}
function drawIndexes(count, extra){let s=seed(extra), used=[];while(used.length<count){const i=(s+used.length*17)%deck.length;if(!used.includes(i))used.push(i);else s++}return used}
function drawDaily(){const card=deck[drawIndexes(1,"daily")[0]];selectedCard=card;dailyCardArt.innerHTML=cardArt(card);dailyText.innerHTML=meaningHtml(card);selectCard(card,false);lastReading=[card];saveLast()}
function renderSpread(targetId, labels, extra){const indexes=drawIndexes(labels.length,extra);lastReading=indexes.map(i=>deck[i]);document.getElementById(targetId).innerHTML=lastReading.map((card,i)=>'<div class="mini-card spread-card" onclick="selectCard(deck['+card.id+'])"><div class="label">'+safe(labels[i])+'</div><div class="value"><b>'+safe(card.name)+'</b><br>'+safe(card.keywords)+'<br><br>'+safe(card.upright)+'</div></div>').join("");saveLast()}
function drawSpread(){renderSpread("spread",spreadLabels,"three");showTab("spreadPanel")}
function drawCeltic(){renderSpread("celticSpread",celticLabels,"celtic");showTab("celticPanel")}
function renderDeck(filter="All"){const cards=filter==="All"?deck:deck.filter(c=>c.arcana===filter||c.suit===filter);deckGrid.innerHTML=cards.map(card=>'<div class="deck-card" onclick="selectCard(deck['+card.id+'])"><div class="name">'+safe(card.name)+'</div><div class="meta">'+safe(card.arcana)+' / '+safe(card.suit)+'</div><div class="meta">'+safe(card.keywords)+'</div></div>').join("")}
function saveLast(){try{localStorage.setItem("tarot_last_reading",JSON.stringify({updatedAt:new Date().toISOString(),cards:lastReading.map(c=>c.name)}))}catch(e){}if(window.AppSharedState)AppSharedState.saveLastAstroInput({date:birthDate.value,time:birthTime.value,city:birthCity.value})}
function contacts(){return window.AppSharedState?AppSharedState.contactsWithOwner():JSON.parse(localStorage.getItem("numerology_dates")||"[]")}
function renderSavedList(){const list=contacts();const count=document.getElementById("savedCountBox");count.textContent=list.length;count.style.display=list.length?"flex":"none";savedList.innerHTML=list.length?list.map(item=>'<div class="savedItem" onclick="loadSaved(\\''+safe(item.id)+'\\')"><b>'+safe(item.name)+'</b><br><span style="color:#94a3b8;font-size:11px">'+safe(item.date||"")+' '+safe(item.time||"")+' '+safe(item.city||"")+'</span></div>').join(""):'<div class="note">No saved profiles yet.</div>'}
function loadSaved(id){const item=contacts().find(x=>String(x.id)===String(id));if(!item)return;birthDate.value=item.date||"";birthTime.value=item.time||"";birthCity.value=item.city||"";toggleSavedPanel(false);drawDaily()}
function toggleSavedPanel(force){const p=document.getElementById("savedPanel");p.style.display=force===false?"none":(p.style.display==="block"?"none":"block");if(p.style.display==="block")renderSavedList()}
function loadInitial(){const params=new URLSearchParams(location.search);const state=window.AppSharedState?AppSharedState.preferredAstroInput(params):{date:params.get("date")||"",time:params.get("time")||"",city:params.get("city")||""};birthDate.value=state.date||"";birthTime.value=state.time||"";birthCity.value=state.city||"";if(window.AppSharedState)AppSharedState.bindLastAstroInput({dateId:"birthDate",timeId:"birthTime",cityId:"birthCity"});renderSavedList();renderDeck("All");drawDaily()}
function goBack(){if(window.AppSharedState)AppSharedState.saveLastAstroInput({date:birthDate.value,time:birthTime.value,city:birthCity.value});window.location.href="index.html?astroReturn=1&date="+encodeURIComponent(birthDate.value)+"&time="+encodeURIComponent(birthTime.value)+"&city="+encodeURIComponent(birthCity.value)+"#astroEntry"}
function exitApp(){window.location.href="index.html"}
async function sharePage(){const text="Tarot reading: "+(lastReading.length?lastReading.map(c=>c.name).join(", "):selectedCard.name);if(navigator.share){try{await navigator.share({title:"Tarot Cards",text,url:location.href});return}catch(e){}}try{await navigator.clipboard.writeText(location.href);alert("Link copied.")}catch(e){alert(text)}}
window.addEventListener("DOMContentLoaded",loadInitial);
<\/script>
</body>
</html>`;

fs.writeFileSync(outFile, html, "utf8");
console.log(`Wrote ${outFile} with ${deck.length} cards.`);
