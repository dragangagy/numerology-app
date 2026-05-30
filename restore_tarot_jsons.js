const fs = require("fs");
const path = require("path");

const tarotDir = "C:/Users/Korisnik/Desktop/tarot";
const htmlPath = path.join(tarotDir, "tarot.html");
const html = fs.readFileSync(htmlPath, "utf8");
const match = html.match(/const deck=(\[[\s\S]*?\]);\nlet selectedCard/);

if(!match){
  throw new Error("Could not find embedded tarot deck in tarot.html");
}

const deck = JSON.parse(match[1]);

function writeJson(name, data){
  fs.writeFileSync(path.join(tarotDir, name), JSON.stringify(data, null, 2), "utf8");
}

function appReady(card){
  return {
    name: card.name,
    keywords: card.keywords,
    general: card.upright,
    love: card.love,
    career: card.career,
    health: card.health,
    reversed: card.reversed,
    ai_interpretation_prompt: "Interpret " + card.name + " in the context of the user's question, considering both opportunities and challenges."
  };
}

function complete(card){
  return {
    card_number: card.id,
    arcana: card.arcana,
    suit: card.suit,
    rank: card.rank,
    name: card.name,
    image: card.image,
    element: card.suit === "Wands" ? "Fire" : card.suit === "Cups" ? "Water" : card.suit === "Swords" ? "Air" : card.suit === "Pentacles" ? "Earth" : "Spirit",
    yes_no: "Maybe",
    keywords: String(card.keywords || "").split(",").map(v => v.trim()).filter(Boolean),
    description: card.upright,
    temporary_image: card.temporary_image,
    visual_palette: card.visual_palette,
    visual_prompt: card.visual_prompt
  };
}

function premium(card){
  return {
    name: card.name,
    upright: card.upright,
    reversed: card.reversed,
    love: card.love,
    career: card.career,
    money: card.money,
    health: card.health,
    spirituality: card.spirituality,
    image: card.image,
    temporary_image: card.temporary_image,
    visual_palette: card.visual_palette,
    visual_prompt: card.visual_prompt
  };
}

writeJson("tarot_cards_app_ready_english.json", deck.map(appReady));
writeJson("tarot_cards_detailed_english.json", deck.map(card => ({...appReady(card), ...premium(card), arcana: card.arcana, suit: card.suit, rank: card.rank})));
writeJson("tarot_cards_english.json", deck.map(card => ({name: card.name, arcana: card.arcana, suit: card.suit, keywords: card.keywords, upright: card.upright, reversed: card.reversed, image: card.image})));
writeJson("tarot_database_complete.json", deck.map(complete));
writeJson("tarot_master_database_english.json", deck);
writeJson("Major_Arcana_Premium.json", deck.filter(card => card.arcana === "Major").map(premium));
writeJson("Wands_Premium.json", deck.filter(card => card.suit === "Wands").map(premium));
writeJson("Cups_Premium.json", deck.filter(card => card.suit === "Cups").map(premium));
writeJson("Swords_Premium.json", deck.filter(card => card.suit === "Swords").map(premium));
writeJson("Pentacles_Premium.json", deck.filter(card => card.suit === "Pentacles").map(premium));
writeJson("tarot_database_pro_schema.json", {
  fields: ["id", "name", "arcana", "suit", "rank", "keywords", "upright", "reversed", "love", "career", "money", "health", "spirituality", "image", "temporary_image", "visual_palette", "visual_prompt"],
  spreads: {
    daily: 1,
    three_cards: ["Past", "Present", "Future"],
    celtic_cross: ["Present", "Challenge", "Foundation", "Past", "Goal", "Near future", "Self", "Environment", "Hopes/Fears", "Outcome"]
  }
});
writeJson("tarot_premium_structure_sample.json", premium(deck[0]));

console.log("Restored tarot JSON files:", deck.length, "cards");
