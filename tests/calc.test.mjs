import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, sanitizeConfig, isDefaultConfig, cloneDefaults, shareText, fmtKg, drinkLines, DEFAULTS } from "../public/assets/js/calc.js";

const party = (over = {}) => ({ adults: 8, kids: 4, veg: 2, hunger: "normal", anlass: "party", beilagen: "normal", ...over });
const counts = (r) => Object.fromEntries(r.lines.map((l) => [l.id, l.count]));

test("Standardparty: 8 Erwachsene (2 veg.), 4 Kinder", () => {
  const r = calculate(party());
  // Fleisch 6 × 250 g nach Anteilen 35/30/20, Kinder 4 × 120 g zu 70/30 auf Bratwurst/Hähnchen
  assert.deepEqual(counts(r), { wurst: 10, nacken: 3, haehnchen: 3, grillkaese: 3, gemuese: 2 });
  assert.equal(r.grillGrams, 2650);
  assert.equal(Math.round(r.price * 10) / 10, 28.2);
  assert.equal(r.ruleGrams, 3600); // 6 × 400 + 4 × 150 + 2 × 300
  assert.equal(r.lessGrams, 950);
  const sides = Object.fromEntries(r.sides.map((s) => [s.id, s]));
  assert.equal(sides.broetchen.count, 16);
  assert.equal(sides.salat.grams, 1800);
  assert.equal(sides.saucen.ml, 600);
});

test("Kinder ohne Hähnchen bekommen nur Bratwurst", () => {
  const r = calculate(party({ adults: 0, kids: 5, veg: 0, selected: ["wurst", "nacken"] }));
  assert.deepEqual(counts(r), { wurst: 6 });
});

test("Kinder ohne Bratwurst/Hähnchen bekommen das erste gewählte Fleisch", () => {
  const r = calculate(party({ adults: 0, kids: 2, veg: 0, selected: ["nacken"] }));
  // 240 g Bedarf: 1 Steak (200 g) wäre zu wenig, also 2
  assert.deepEqual(counts(r), { nacken: 2 });
});

test("Ohne Fleisch-Auswahl gibt es Warnungen statt stiller Fehler", () => {
  const r = calculate(party({ selected: ["grillkaese"] }));
  assert.ok(r.warnings.includes("kids-no-meat"));
  assert.ok(r.warnings.includes("adults-no-meat"));
  const r2 = calculate(party({ selected: ["wurst"] }));
  assert.ok(r2.warnings.includes("veg-no-items"));
});

test("Faktoren werden multipliziert", () => {
  // 250 × 1,25 × 1,3 × 1,12 = 455 g → 5 Bratwürste
  const r = calculate({ adults: 1, kids: 0, veg: 0, hunger: "gross", anlass: "ganztags", beilagen: "wenig", selected: ["wurst"] });
  assert.deepEqual(counts(r), { wurst: 5 });
  assert.equal(r.lessGrams, 0, "über der Faustregel wird nichts als weniger ausgewiesen");
});

test("Mindestens ein Stück pro gewähltem Artikel mit Bedarf", () => {
  const r = calculate({ adults: 1, kids: 0, veg: 0, hunger: "wenig", anlass: "feierabend", beilagen: "viel", selected: ["rumpsteak"] });
  assert.deepEqual(counts(r), { rumpsteak: 1 });
});

test("Gästezahlen werden begrenzt, Vegetarier höchstens so viele wie Erwachsene", () => {
  const r = calculate(party({ adults: 3, veg: 7, kids: -2 }));
  assert.equal(r.guests.veg, 3);
  assert.equal(r.guests.kids, 0);
  assert.equal(calculate(party({ adults: 500 })).guests.adults, 99);
});

test("Keine Gäste: leere Liste", () => {
  const r = calculate(party({ adults: 0, kids: 0, veg: 0 }));
  assert.equal(r.lines.length, 0);
  assert.equal(r.sides.length, 0);
  assert.equal(r.lessGrams, 0);
});

test("sanitizeConfig übernimmt nur gültige Zahlen", () => {
  const cfg = sanitizeConfig({ items: [{ id: "wurst", piece: 130, price: "teuer", name: "<b>x</b>" }], base: { adult: 300, kid: -5 } });
  const wurst = cfg.items.find((i) => i.id === "wurst");
  assert.equal(wurst.piece, 130);
  assert.equal(wurst.price, 9);
  assert.equal(wurst.name, "Bratwurst");
  assert.equal(cfg.base.adult, 300);
  assert.equal(cfg.base.kid, 120);
  assert.equal(isDefaultConfig(cfg), false);
  assert.equal(isDefaultConfig(sanitizeConfig(null)), true);
  assert.equal(isDefaultConfig(cloneDefaults()), true);
});

test("Teilen-Text enthält Stückzahlen und Vergleich", () => {
  const txt = shareText(calculate(party()));
  assert.match(txt, /Grillparty für 12/);
  assert.match(txt, /10 × Bratwurst \(à 100 g\)/);
  assert.match(txt, /16 × Brötchen/);
  assert.match(txt, /1,8 kg Salat/);
  assert.match(txt, /1,0 kg weniger eingekauft/);
  assert.match(txt, /glutmass\.de$/);
  assert.equal(fmtKg(950), "1,0 kg");
});

test("Rundung: nie weniger als der berechnete Bedarf (3 Fleischesser)", () => {
  const r = calculate({ adults: 3, kids: 0, veg: 0, hunger: "normal", anlass: "party", beilagen: "normal", selected: ["wurst", "nacken", "haehnchen"] });
  // Bedarf 750 g: kaufmännisch gerundet wären es 3 + 1 + 1 = 650 g, mit Garantie 2 Nackensteaks
  assert.deepEqual(counts(r), { wurst: 3, nacken: 2, haehnchen: 1 });
  assert.ok(r.grillGrams >= 750);
});

test("Rundung garantiert den Bedarf für viele Gästezahlen", () => {
  for (let a = 1; a <= 40; a++) for (const sel of [["wurst", "nacken"], ["entrecote", "lachs"], ["lammkotelett", "patty", "forelle"]]) {
    const r = calculate({ adults: a, kids: 0, veg: 0, hunger: "normal", anlass: "party", beilagen: "normal", selected: sel });
    assert.ok(r.grillGrams >= a * 250 - 0.5, `${a} Erwachsene ${sel}`);
    const maxPiece = Math.max(...DEFAULTS.items.filter((i) => sel.includes(i.id)).map((i) => i.piece));
    assert.ok(r.grillGrams < a * 250 + sel.length * maxPiece, "höchstens wenige Stücke über Bedarf");
  }
});

test("Neue Artikel haben eine Gruppe und gültige Werte", () => {
  assert.equal(DEFAULTS.items.length, 15);
  for (const i of DEFAULTS.items) {
    assert.ok(["schwein", "rind", "lamm", "fisch", "veg"].includes(i.group), i.id);
    assert.ok(i.piece >= 10 && i.price > 0 && i.share > 0, i.id);
  }
});

test("Getränke: Flaschen aufgerundet, Gruppe teilt sich die Menge", () => {
  // 10 Erwachsene, Party: nur Wasser gewählt → ganze alkoholfreie Menge (1,25 l p. P.) = 12,5 l → 9 Flaschen à 1,5 l
  assert.deepEqual(drinkLines(10, 0, "party", ["wasser"]).map((d) => [d.id, d.count]), [["wasser", 9]]);
  // Bier allein: 1,5 l p. P. = 30 Flaschen à 0,5 l; Bier + Wein: 1,0 l Bier (20) + 0,25 l Wein (4 Flaschen)
  assert.deepEqual(drinkLines(10, 0, "party", ["bier"]).map((d) => d.count), [30]);
  assert.deepEqual(drinkLines(10, 0, "party", ["bier", "wein"]).map((d) => [d.id, d.count]), [["bier", 20], ["wein", 4]]);
  // Kinder bekommen keinen Alkohol
  assert.deepEqual(drinkLines(0, 5, "party", ["bier", "wein"]), []);
  // Feierabend kürzer → weniger
  assert.ok(drinkLines(10, 0, "feierabend", ["bier"])[0].count < 30);
});

test("Kosten pro Person = (Grillgut + Getränke) / Gäste", () => {
  const r = calculate({ ...party(), drinks: ["wasser"] });
  assert.ok(r.drinkPrice > 0);
  assert.equal(Math.round(r.perPerson * 100), Math.round(((r.price + r.drinkPrice) / 12) * 100));
  assert.match(shareText(r), /pro Person/);
  assert.match(shareText(r), /× Wasser \(à 1,5 l\)/);
});
