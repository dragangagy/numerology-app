const fs = require("fs");
const path = require("path");

const tarotDir = "C:/Users/Korisnik/Desktop/tarot";
const source = path.join(tarotDir, "tarot_master_database_english.json");
const fallbackHtml = path.join(tarotDir, "tarot.html");

let deck;
if(fs.existsSync(source)){
  deck = JSON.parse(fs.readFileSync(source, "utf8"));
}else{
  const html = fs.readFileSync(fallbackHtml, "utf8");
  const match = html.match(/const deck=(\[[\s\S]*?\]);\nlet selectedCard/);
  if(!match)throw new Error("No source deck found");
  deck = JSON.parse(match[1]);
}

const master = {
  version: "1.0.0",
  updated_at: new Date().toISOString(),
  purpose: "Single master tarot deck database for the app. Keep this file for future editing, image replacement, meanings, spreads and AI interpretation.",
  image_note: "Current image fields are placeholders. temporary_image=true means the app uses generated CSS card art until real image files are added.",
  card_count: deck.length,
  suits: {
    Major: { count: 22, theme: "life lessons, archetypes, major turning points" },
    Wands: { count: 14, element: "Fire", theme: "energy, action, work, ambition" },
    Cups: { count: 14, element: "Water", theme: "emotions, love, relationships" },
    Swords: { count: 14, element: "Air", theme: "thoughts, truth, conflict, decisions" },
    Pentacles: { count: 14, element: "Earth", theme: "money, work, body, material world" }
  },
  spreads: {
    daily_card: ["Card"],
    three_cards: ["Past", "Present", "Future"],
    celtic_cross: ["Present", "Challenge", "Foundation", "Past", "Goal", "Near future", "Self", "Environment", "Hopes/Fears", "Outcome"]
  },
  fields: [
    "id",
    "name",
    "arcana",
    "suit",
    "rank",
    "symbol",
    "keywords",
    "upright",
    "reversed",
    "love",
    "career",
    "money",
    "health",
    "spirituality",
    "image",
    "temporary_image",
    "visual_palette",
    "visual_prompt"
  ],
  cards: deck
};

fs.writeFileSync(path.join(tarotDir, "tarot_deck_master.json"), JSON.stringify(master, null, 2), "utf8");
console.log("Wrote tarot_deck_master.json with", master.cards.length, "cards.");
