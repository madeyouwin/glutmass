// GLUTMASS Rechenlogik: reine Funktionen ohne DOM, laeuft im Browser und in Node (tests/).
// Alle Werte sind dokumentiert auf /so-rechnen-wir.html – bei Aenderungen dort mitpflegen
// (tests/methode.test.mjs prueft, dass beide uebereinstimmen).

export const DEFAULTS = Object.freeze({
  // piece = Stueckgewicht (g), share = Anteil am Fleisch bzw. Veggie-Mix,
  // kidShare = Anteil an der Kinderportion, price = Richtwert in €/kg, group = Gruppe in der Auswahl
  items: [
    { id: "wurst", group: "schwein", name: "Bratwurst", note: "grob", piece: 100, share: 35, kidShare: 70, price: 9, veg: false, on: true },
    { id: "nacken", group: "schwein", name: "Nackensteak", note: "Schwein, mariniert", piece: 200, share: 30, kidShare: 0, price: 10, veg: false, on: true },
    { id: "haehnchen", group: "schwein", name: "Hähnchenspieß", note: "Brustfilet", piece: 150, share: 20, kidShare: 30, price: 14, veg: false, on: true },
    { id: "bauch", group: "schwein", name: "Bauchscheiben", note: "Schwein", piece: 120, share: 15, kidShare: 0, price: 9, veg: false, on: false },
    { id: "rumpsteak", group: "rind", name: "Rumpsteak", note: "Rind, 2,5 cm dick", piece: 250, share: 15, kidShare: 0, price: 29, veg: false, on: false },
    { id: "huefte", group: "rind", name: "Hüftsteak", note: "Rind", piece: 200, share: 15, kidShare: 0, price: 25, veg: false, on: false },
    { id: "entrecote", group: "rind", name: "Entrecôte", note: "Rind, auch Ribeye", piece: 300, share: 10, kidShare: 0, price: 35, veg: false, on: false },
    { id: "patty", group: "rind", name: "Burger-Patty", note: "Rind, mit Brötchen extra", piece: 150, share: 25, kidShare: 0, price: 15, veg: false, on: false },
    { id: "lammkotelett", group: "lamm", name: "Lammkotelett", note: "mit Knochen", piece: 80, share: 15, kidShare: 0, price: 28, veg: false, on: false },
    { id: "merguez", group: "lamm", name: "Merguez", note: "Lamm-Rind-Bratwurst, scharf", piece: 70, share: 15, kidShare: 0, price: 22, veg: false, on: false },
    { id: "lachs", group: "fisch", name: "Lachsfilet", note: "mit Haut, für die Grillschale", piece: 150, share: 15, kidShare: 0, price: 22, veg: false, on: false },
    { id: "garnelen", group: "fisch", name: "Garnelenspieß", note: "roh, geschält", piece: 100, share: 10, kidShare: 0, price: 32, veg: false, on: false },
    { id: "forelle", group: "fisch", name: "Forelle", note: "ganz, ausgenommen", piece: 300, share: 15, kidShare: 0, price: 15, veg: false, on: false },
    { id: "grillkaese", group: "veg", name: "Grillkäse", note: "Halloumi o. ä.", piece: 100, share: 50, kidShare: 0, price: 17, veg: true, on: true },
    { id: "gemuese", group: "veg", name: "Gemüsespieß", note: "Paprika, Zucchini, Pilze", piece: 150, share: 50, kidShare: 0, price: 6, veg: true, on: true },
  ],
  // Getraenke: ml pro Person bei einer Party (4–5 Std.), bottle = Flaschengroesse in ml, price = €/l ohne Pfand.
  // Preise: Richtwerte zwischen Discounter-Eigenmarke und Markenware (ALDI SÜD, Netto, Knuspr, Stand Okt. 2026).
  // group: alkoholfrei teilen sich die gewaehlten Getraenke die Gruppenmenge; Bier + Wein zusammen je 2/3.
  drinks: [
    { id: "wasser", group: "alkfrei", name: "Wasser", note: "Flaschen à 1,5 l", bottle: 1500, adult: 750, kid: 500, price: 0.4 },
    { id: "softdrinks", group: "alkfrei", name: "Softdrinks & Schorle", note: "Flaschen à 1,5 l", bottle: 1500, adult: 500, kid: 750, price: 1 },
    { id: "bier", group: "alkohol", name: "Bier", note: "Flaschen à 0,5 l, gern auch alkoholfrei", bottle: 500, adult: 1500, kid: 0, price: 1.8 },
    { id: "wein", group: "alkohol", name: "Wein", note: "Flaschen à 0,75 l", bottle: 750, adult: 375, kid: 0, price: 6 },
  ],
  drinkFactor: { feierabend: 0.6, party: 1, ganztags: 1.5 },
  base: {
    adult: 250,     // g Fleisch roh pro Erwachsenem (normaler Hunger, Party, normale Beilagen)
    kid: 120,       // g pro Kind bis 12
    vegP: 250,      // g Grillkaese + Gemuese pro vegetarischem Erwachsenem
    bread: 1.5,     // Broetchen pro Erwachsenem
    breadKid: 1,    // Broetchen pro Kind
    salad: 150,     // g Salat pro Person
    sauce: 50,      // ml Saucen & Dips pro Person
  },
  // Vergleichsbasis "weniger eingekauft": verbreitete Faustregel
  rule: { adult: 400, kid: 150, vegShare: 0.75 },
  factors: {
    hunger: { wenig: 0.8, normal: 1, gross: 1.25 },
    anlass: { feierabend: 0.85, party: 1, ganztags: 1.3 },
    beilagen: { wenig: 1.12, normal: 1, viel: 0.85 },
  },
  // Salatmenge passt sich gegenlaeufig zur Beilagen-Wahl an
  saladFactor: { wenig: 0.7, normal: 1, viel: 1.35 },
});

export const EDITABLE_ITEM_FIELDS = ["piece", "share", "price"];
export const EDITABLE_BASE_FIELDS = ["adult", "kid", "vegP", "bread", "breadKid", "salad", "sauce"];
export const MAX_GUESTS = 99;

export function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

// Uebernimmt aus gespeicherten (moeglicherweise kaputten) Daten nur gueltige Zahlenwerte.
export function sanitizeConfig(stored) {
  const cfg = cloneDefaults();
  if (!stored || typeof stored !== "object") return cfg;
  const num = (v, min, max) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);
  if (Array.isArray(stored.items)) {
    for (const item of cfg.items) {
      const s = stored.items.find((x) => x && x.id === item.id);
      if (!s) continue;
      const piece = num(s.piece, 10, 2000), share = num(s.share, 0, 1000), price = num(s.price, 0, 500);
      if (piece !== null) item.piece = piece;
      if (share !== null) item.share = share;
      if (price !== null) item.price = price;
    }
  }
  if (stored.base && typeof stored.base === "object") {
    for (const k of EDITABLE_BASE_FIELDS) {
      const v = num(stored.base[k], 0, 5000);
      if (v !== null) cfg.base[k] = v;
    }
  }
  return cfg;
}

export function isDefaultConfig(cfg) {
  return cfg.items.every((item) => {
    const d = DEFAULTS.items.find((x) => x.id === item.id);
    return d && EDITABLE_ITEM_FIELDS.every((f) => item[f] === d[f]);
  }) && EDITABLE_BASE_FIELDS.every((k) => cfg.base[k] === DEFAULTS.base[k]);
}

export function defaultSelection(cfg = DEFAULTS) {
  return cfg.items.filter((i) => i.on).map((i) => i.id);
}

const clampInt = (v) => Math.max(0, Math.min(MAX_GUESTS, Math.floor(Number(v) || 0)));
const pieces = (grams, piece) => (grams > 0 ? Math.max(1, Math.round(grams / piece)) : 0);

// Rundung mit Mindestmengen-Garantie: erst jedes Stueck normal runden; liegt eine Gruppe
// (Fleisch bzw. Vegetarisch) danach unter dem Bedarf, bekommt der Artikel mit der groessten
// Luecke ein Stueck dazu, bis der Bedarf gedeckt ist. So steht nie weniger auf dem Zettel als berechnet.
function roundPieces(grams, items) {
  const counts = new Map(items.map((i) => [i, pieces(grams.get(i) || 0, i.piece)]));
  const need = items.reduce((s, i) => s + (grams.get(i) || 0), 0);
  let have = items.reduce((s, i) => s + counts.get(i) * i.piece, 0);
  const active = items.filter((i) => (grams.get(i) || 0) > 0);
  while (active.length && have < need - 0.5) {
    const pick = active.reduce((a, i) => ((grams.get(i) - counts.get(i) * i.piece) > (grams.get(a) - counts.get(a) * a.piece) ? i : a));
    counts.set(pick, counts.get(pick) + 1);
    have += pick.piece;
  }
  return counts;
}

export function drinkLines(adults, kids, anlass, selectedDrinks = [], cfg = DEFAULTS) {
  const list = cfg.drinks || DEFAULTS.drinks;
  const f = (cfg.drinkFactor || DEFAULTS.drinkFactor)[anlass] ?? 1;
  const chosen = list.filter((d) => selectedDrinks.includes(d.id));
  const out = [];
  for (const d of chosen) {
    // Ist aus einer Gruppe nur ein Getraenk gewaehlt, uebernimmt es die Menge der ganzen Gruppe.
    const group = list.filter((x) => x.group === d.group);
    const groupChosen = chosen.filter((x) => x.group === d.group);
    const sum = (key) => group.reduce((s, x) => s + x[key], 0);
    const chosenSum = (key) => groupChosen.reduce((s, x) => s + x[key], 0);
    // Alkoholfrei: ist nur eins gewaehlt, uebernimmt es die ganze Menge der Gruppe.
    // Alkohol: Bier und Wein lassen sich nicht 1:1 in Litern tauschen; sind beide gewaehlt, je zwei Drittel.
    const per = (key) => d.group === "alkohol"
      ? d[key] * (groupChosen.length > 1 ? 2 / 3 : 1)
      : (chosenSum(key) ? (d[key] / chosenSum(key)) * sum(key) : 0);
    const ml = (adults * per("adult") + kids * per("kid")) * f;
    if (ml <= 0) continue;
    const count = Math.ceil(ml / d.bottle);
    out.push({ id: d.id, name: d.name, note: d.note, count, bottle: d.bottle, ml: count * d.bottle, price: (count * d.bottle / 1000) * d.price });
  }
  return out;
}

/**
 * input: { adults, kids, veg, hunger, anlass, beilagen, selected: [ids] }
 * Liefert Einkaufsliste mit Stueckzahlen, Preis-Richtwert und Vergleich zur Faustregel.
 */
export function calculate(input, cfg = DEFAULTS) {
  const adults = clampInt(input.adults);
  const kids = clampInt(input.kids);
  const veg = Math.min(clampInt(input.veg), adults);
  const meatEaters = adults - veg;
  const total = adults + kids;

  const f = cfg.factors || DEFAULTS.factors;
  const hunger = f.hunger[input.hunger] ?? 1;
  const anlass = f.anlass[input.anlass] ?? 1;
  const beilagenKey = input.beilagen in f.beilagen ? input.beilagen : "normal";
  const beilagen = f.beilagen[beilagenKey];
  const factor = hunger * anlass * beilagen;

  const selected = new Set(input.selected ?? defaultSelection(cfg));
  const meat = cfg.items.filter((i) => !i.veg && selected.has(i.id));
  const vegs = cfg.items.filter((i) => i.veg && selected.has(i.id));
  const b = cfg.base;

  const grams = new Map();
  const add = (item, g) => grams.set(item, (grams.get(item) || 0) + g);
  const warnings = [];

  // Erwachsene mit Fleisch: Gesamtmenge nach Anteilen auf die gewaehlten Artikel
  const meatShare = meat.reduce((s, i) => s + i.share, 0);
  if (meatShare > 0) meat.forEach((i) => add(i, (meatEaters * b.adult * factor * i.share) / meatShare));

  // Kinder: ohne Beilagen-Faktor; Bratwurst + Haehnchen, sonst erstes gewaehltes Fleisch
  const kidGrams = kids * b.kid * hunger * anlass;
  if (kidGrams > 0) {
    const kidItems = meat.filter((i) => i.kidShare > 0);
    const kidShare = kidItems.reduce((s, i) => s + i.kidShare, 0);
    if (kidShare > 0) kidItems.forEach((i) => add(i, (kidGrams * i.kidShare) / kidShare));
    else if (meat.length) add(meat[0], kidGrams);
    else warnings.push("kids-no-meat");
  }

  // Vegetarier
  const vegShare = vegs.reduce((s, i) => s + i.share, 0);
  if (veg > 0) {
    if (vegShare > 0) vegs.forEach((i) => add(i, (veg * b.vegP * factor * i.share) / vegShare));
    else warnings.push("veg-no-items");
  }
  if (meatEaters > 0 && !meat.length) warnings.push("adults-no-meat");

  const counts = new Map([...roundPieces(grams, meat), ...roundPieces(grams, vegs)]);
  const lines = [];
  let grillGrams = 0, price = 0;
  for (const item of cfg.items) {
    const count = counts.get(item) || 0;
    if (!count) continue;
    const real = count * item.piece;
    const linePrice = (real / 1000) * item.price;
    lines.push({ id: item.id, kind: item.veg ? "veg" : "meat", count, name: item.name, note: item.note, piece: item.piece, grams: real, price: linePrice });
    grillGrams += real;
    price += linePrice;
  }

  const sides = [];
  if (total > 0) {
    sides.push({ id: "broetchen", count: Math.ceil(adults * b.bread + kids * b.breadKid), name: "Brötchen", note: "oder Baguette, 2 Scheiben je Brötchen" });
    const salad = Math.round((total * b.salad * (cfg.saladFactor || DEFAULTS.saladFactor)[beilagenKey]) / 100) * 100;
    sides.push({ id: "salat", grams: salad, name: "Salat", note: "gesamt, z. B. Kartoffel- und Nudelsalat" });
    sides.push({ id: "saucen", ml: Math.max(50, Math.round((total * b.sauce) / 50) * 50), name: "Saucen & Dips", note: "Ketchup, Senf, Kräuterquark" });
  }

  const drinks = drinkLines(adults, kids, input.anlass, input.drinks || [], cfg);
  const drinkPrice = drinks.reduce((s, d) => s + d.price, 0);

  const r = cfg.rule || DEFAULTS.rule;
  const ruleGrams = meatEaters * r.adult + kids * r.kid + veg * r.adult * r.vegShare;
  const lessGrams = Math.max(0, ruleGrams - grillGrams);
  const avgPerKg = grillGrams ? price / (grillGrams / 1000) : 0;
  const showLess = total > 0 && grillGrams > 0 && lessGrams >= 100;

  return {
    guests: { adults, kids, veg, meatEaters, total },
    lines, sides, warnings, drinks,
    grillGrams, price, drinkPrice,
    perPerson: total ? (price + drinkPrice) / total : 0,
    ruleGrams, lessGrams: showLess ? lessGrams : 0,
    lessEuro: showLess ? (lessGrams / 1000) * avgPerKg : 0,
  };
}

export const fmtKg = (g) => (g / 1000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg";
export const fmtEur = (e) => Math.round(e).toLocaleString("de-DE") + " €";
export const fmtEurCent = (e) => (Math.round(e * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
export const fmtL = (ml) => (ml / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " l";

export function sideAmount(side) {
  if (side.grams != null) return fmtKg(side.grams);
  if (side.ml != null) return fmtL(side.ml);
  return String(side.count);
}

export function shareText(result) {
  const { total } = result.guests;
  const rows = [
    ...result.lines.map((l) => `• ${l.count} × ${l.name} (à ${l.piece} g)`),
    ...result.sides.map((s) => (s.count != null ? `• ${s.count} × ${s.name}` : `• ${sideAmount(s)} ${s.name}`)),
    ...(result.drinks || []).map((d) => `• ${d.count} × ${d.name} (à ${fmtL(d.bottle)})`),
  ];
  let txt = `GLUTMASS-Einkaufsliste – Grillparty für ${total}\n` + rows.join("\n");
  if (result.perPerson) txt += `\n\nRichtpreis: ca. ${fmtEurCent(result.perPerson)} pro Person`;
  if (result.lessGrams) txt += `\n${fmtKg(result.lessGrams)} weniger eingekauft als nach der 400-g-Faustregel.`;
  return txt + "\nhttps://glutmass.de";
}
