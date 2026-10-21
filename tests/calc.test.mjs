import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, sanitizeConfig, isDefaultConfig, cloneDefaults, shareText, fmtKg } from "../public/assets/js/calc.js";

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
  assert.deepEqual(counts(r), { nacken: 1 });
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
